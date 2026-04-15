/**
 * @file /src/db/repositories/booking-db.ts
 * @description Cloudflare D1 から予約チップを取得。
 * [v5.1 整合性再構築：SQL主導モデル]
 * * 根拠:
 * 1. 【ルールA】DBサーバー(SQL)の strftime('%s', 'now') を使い、
 * 実行環境のタイムゾーン設定に依存せず「現在のUnixTime」を絶対基準で取得して比較。
 * 2. TS側での時刻計算を廃止し、DBとの比較を「絶対値(UnixTime) vs 絶対値」で完結させる。
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
 */
export const getAvailableChipsFromDB = async (
  c: Context<{ Bindings: Bindings }>, 
  dateString?: string
): Promise<AvailableChip[]> => {
  try {
    const db = c.env.shizentaiga_db;
    if (!db) return [];

    /**
     * 【ルールA適用：SQL関数による比較】
     * 💡 TS側で new Date() を作らず、SQL内部で 'now' を判定。
     * 💡 start_at_unix は UTC基準の数値であるため、strftime('%s', 'now') との比較が最も正確。
     */
    let query = `
      SELECT s.start_at_unix, s.date_string, s.grid_size_min
      FROM staff_schedules s
      LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
      WHERE s.start_at_unix > strftime('%s', 'now')
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