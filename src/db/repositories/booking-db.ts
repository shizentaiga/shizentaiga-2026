/**
 * @file /src/db/repositories/booking-db.ts
 * @description Cloudflare D1 から予約チップ（空き枠）を取得し、プランに応じたバリデーションを行うデータアクセス層。
 * [設計方針]
 * 1. 冗長なロジックの排除: 共通のチップ取得処理を基盤とし、用途別のフィルタリング関数を提供。
 * 2. 循環参照の考慮: 動的インポート等を用いて、リポジトリ間の依存関係によるエラーを防止。
 * 3. 型安全性の維持: D1Database の結果に適切なインターフェースを適用し、不透明な any を排除。
 */

import { Context } from 'hono'
import { calculatePossibleSlots } from '../../lib/slot-logic'

/**
 * Cloudflare Workers 環境変数の型定義
 */
type Bindings = {
  shizentaiga_db: D1Database;
}

/**
 * 供給チップ（staff_schedules）の物理データ型
 */
export interface AvailableChip {
  start_at_unix: number;
  date_string: string;
  grid_size_min: number; 
}

/**
 * 画面表示用スロットのデータ型
 */
export interface BookingSlot {
  start_at_unix: number;
  time_label: string;
  is_available: boolean;
}

/**
 * DBから未予約のタイムチップ（供給枠）を生データとして取得する
 * @param c - Hono Context
 * @param dateString - 特定の日付で絞り込む場合は 'YYYY-MM-DD' を指定
 */
export const getAvailableChipsFromDB = async (
  c: Context<{ Bindings: Bindings }>, 
  dateString?: string
): Promise<AvailableChip[]> => {
  try {
    const db = c.env.shizentaiga_db;
    if (!db) return [];

    const nowUnix = Math.floor(Date.now() / 1000);

    // reservation_grid に slot_id が紐付いていないものが「未予約」のチップ
    let query = `
      SELECT s.start_at_unix, s.date_string, s.grid_size_min
      FROM staff_schedules s
      LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
      WHERE s.start_at_unix > ? 
        AND rg.slot_id IS NULL
    `;
    
    const params: (string | number)[] = [nowUnix];

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
 * @param planDuration - プランの正味時間(分)
 * @param planBuffer - 前後のバッファ時間(分)
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

  // 1. 日付ごとにチップ（開始UNIX時間）をまとめる
  const chipsByDate = allChips.reduce((acc, chip) => {
    if (!acc[chip.date_string]) acc[chip.date_string] = [];
    acc[chip.date_string].push(chip.start_at_unix);
    return acc;
  }, {} as Record<string, number[]>);

  // 2. スロット計算ロジックを通し、1つでも予約可能な枠がある日付だけを残す
  return Object.entries(chipsByDate)
    .filter(([_, unixTimes]) => {
      const possible = calculatePossibleSlots(unixTimes, totalNeeded, gridSize);
      return possible.length > 0;
    })
    .map(([date]) => ({ date }));
};

/**
 * Services.tsx からの呼び出し専用ラッパー
 * 「デフォルトプラン」の仕様に基づき、カレンダーに表示すべき有効な日付一覧を返す
 */
export const getAvailableDatesByTargetPlan = async (
  c: Context<{ Bindings: Bindings }>,
  shopName: string
): Promise<{ date: string }[]> => {
  // plan-db との循環参照を防ぐため、実行時にインポート
  const { getPlansFromDB } = await import('./plan-db');
  const plans = await getPlansFromDB(c, shopName);
  const defaultPlan = plans[0];
  
  if (!defaultPlan) return [];
  
  return getValidatedDatesByPlan(c, defaultPlan.duration_min, defaultPlan.buffer_min);
};