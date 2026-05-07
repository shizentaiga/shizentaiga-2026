/**
 * @file /src/db/repositories/booking-db.ts
 * @description Cloudflare D1 予約チップ取得（v5.9）
 * 
 * 1. 【絶対基準】SQLの strftime('%s', 'now') を使い、環境に依存せず現在時刻を取得。
 * 2. 【リードタイム】staffs.min_lead_time_min を考慮し、受付期限内のチップのみ抽出。
 */

import { Context } from 'hono'
import { calculatePossibleSlots } from '../../lib/slot-logic'

type Bindings = {
  shizentaiga_db: D1Database;
}

export interface AvailableChip {
  start_at_unix: number;
  date_string: string;
  grid_size_min: number; 
}

/**
 * DBから未予約のタイムチップを取得する
 * 💡 staffs テーブルの min_lead_time_min を加味してフィルタリング
 */
export const getAvailableChipsFromDB = async (
  c: Context<{ Bindings: Bindings }>, 
  dateString?: string
): Promise<AvailableChip[]> => {
  try {
    const db = c.env.shizentaiga_db;
    if (!db) return [];

    /**
     * 【ルールA適用：動的リードタイム判定】
     * 💡 start_at_unix は UTC基準。
     * 💡 strftime('%s', 'now') で現在のUTC UnixTimeを取得。
     * 💡 スタッフごとに設定された min_lead_time_min（分）を秒に換算して加算し、
     * その境界線より未来の枠のみを抽出する。
     */
    let query = `
      SELECT s.start_at_unix, s.date_string, s.grid_size_min
      FROM staff_schedules s
      INNER JOIN staffs st ON s.staff_id = st.staff_id
      LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
      WHERE s.start_at_unix > (strftime('%s', 'now') + (st.min_lead_time_min * 60))
        AND rg.slot_id IS NULL
    `;
    
    const params: string[] = [];

    if (dateString) {
      query += ` AND s.date_string = ?`;
      params.push(dateString);
    }

    query += ` ORDER BY s.start_at_unix ASC LIMIT 500`;

    const response = await db.prepare(query).bind(...params).all<AvailableChip>();
    return response.results || [];

  } catch (error) {
    console.error('[DB Error] Failed to fetch available chips:', error);
    return [];
  }
};

/**
 * プランの所要時間に基づき、連続した枠が確保できる日付のみを抽出する
 * 💡 calculatePossibleSlots には「生のUnixTime」を渡す（補正なし）
 */
export const getValidatedDatesByPlan = async (
  c: Context<{ Bindings: Bindings }>,
  planDuration: number,
  planBuffer: number
): Promise<{ date: string }[]> => {
  // 💡 getAvailableChipsFromDB が既にリードタイムで絞り込んでいるため、
  // ここで取得される allChips はすべて予約締切をクリアしているものになる。
  const allChips = await getAvailableChipsFromDB(c);
  if (allChips.length === 0) return [];

  const totalNeeded = planDuration + planBuffer;
  const gridSize = allChips[0].grid_size_min || 30;

  const chipsByDate = allChips.reduce((acc, chip) => {
    if (!acc[chip.date_string]) acc[chip.date_string] = [];
    acc[chip.date_string].push(chip.start_at_unix);
    return acc;
  }, {} as Record<string, number[]>);

  return Object.entries(chipsByDate)
    .filter(([_, unixTimes]) => {
      // 純粋な数値配列で判定
      const possible = calculatePossibleSlots(unixTimes, totalNeeded, gridSize);
      return possible.length > 0;
    })
    .map(([date]) => ({ date }));
};

/**
 * Services.tsx からの呼び出し専用ラッパー
 */
export const getAvailableDatesByTargetPlan = async (
  c: Context<{ Bindings: Bindings }>,
  shopName: string
): Promise<{ date: string }[]> => {
  const { getPlansFromDB } = await import('./plan-db');
  const plans = await getPlansFromDB(c, shopName);
  const defaultPlan = plans[0];
  
  if (!defaultPlan) return [];
  
  return getValidatedDatesByPlan(c, defaultPlan.duration_min, defaultPlan.buffer_min);
};

/**
 * Webhook経由で予約を確定させる
 * [v1.5 決済確定モデル：Atomic Transaction]
 */
export const confirmBooking = async (
  c: any,
  data: {
    plan_id: string;
    date: string;
    slot: string; // UnixTime文字列
    email: string;
    payment_intent_id: string;
  }
) => {
  const db = c.env.shizentaiga_db;
  const now = Math.floor(Date.now() / 1000);
  const slot_id = data.slot; // slot (UnixTime) を ID として使用

  try {
    /**
     * 1. 予約スロットの更新
     * pending かつ 期限内(expires_at > now) のものだけを booked に変更
     */
    const updateSlot = db.prepare(`
      UPDATE slots 
      SET 
        booking_status = 'booked',
        user_email = ?,
        payment_intent_id = ?,
        updated_at = ?
      WHERE slot_id = ? 
        AND booking_status = 'pending'
        AND expires_at > ?
    `).bind(data.email, data.payment_intent_id, now, slot_id, now);

    /**
     * 2. 予約グリッドへの挿入
     * ここで UNIQUE(schedule_id) 制約により、万が一の重複を物理的に阻止
     * schedule_id は slot_id (開始UnixTime) と 1対1 の関係として扱う前提
     */
    const insertGrid = db.prepare(`
      INSERT INTO reservation_grid (schedule_id, slot_id)
      VALUES (?, ?)
    `).bind(slot_id, slot_id);

    // バッチ実行（トランザクション）
    const results = await db.batch([
      updateSlot,
      insertGrid
    ]);

    // UPDATE文（results[0]）で変更された行数を確認
    // 0件の場合は、期限切れか既に他で booked になっている
    if (results[0].meta.changes === 0) {
      console.warn(`[Confirm] No rows updated. Slot might be expired or already booked: ${slot_id}`);
      return { success: false, reason: 'EXPIRED_OR_ALREADY_BOOKED' };
    }

    return { success: true };

  } catch (error: any) {
    // UNIQUE制約違反などで失敗した場合
    console.error('[DB Error] confirmBooking transaction failed:', error.message);
    return { success: false, error: error.message };
  }
};