/**
 * @file /src/db/booking-db.ts
 * @description Cloudflare D1 (shizentaiga_db) から予約情報を取得・操作するデータアクセス層。
 * v3.0 グリッド・アトミックモデル準拠。
 */

import { Context } from 'hono'

/**
 * 取得上限の設定
 */
const MAX_FETCH_COUNT = 100;

/**
 * 供給チップ（staff_schedules）のデータ型定義
 * ロジック側で grid_size_min を必要とするため、型定義に追加します。
 */
export interface AvailableChip {
  start_at_unix: number;
  date_string: string;
  grid_size_min: number; // ★ v3.0 ロジックで必須
}

// ... (BookingSlot インターフェースと getAvailableSlotsFromDB は変更なしでOK)

/**
 * 特定の日付、または未来の「未予約チップ（供給）」をすべて取得する
 * @param c - Hono Context
 * @param dateString - 'YYYY-MM-DD' 形式
 */
export const getAvailableChipsFromDB = async (
  c: Context, 
  dateString?: string
): Promise<AvailableChip[]> => { // ★ 戻り値の型を定義
  try {
    const db = c.env.shizentaiga_db;
    if (!db) return [];

    const nowUnix = Math.floor(Date.now() / 1000);

    /**
     * v3.0 ロジック:
     * 1. s.grid_size_min を SELECT に追加（SlotList.tsx で使用するため）
     * 2. reservation_grid (予約紐付け) を LEFT JOIN し、slot_id が NULL のもの = 未予約
     */
    let query = `
      SELECT s.start_at_unix, s.date_string, s.grid_size_min
      FROM staff_schedules s
      LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
      WHERE s.start_at_unix > ? 
        AND rg.slot_id IS NULL
    `;
    const params: any[] = [nowUnix];

    if (dateString) {
      query += ` AND s.date_string = ?`;
      params.push(dateString);
    }

    query += ` ORDER BY s.start_at_unix ASC LIMIT 500`;

    const response = await db.prepare(query).bind(...params).all();
    
    // 型安全に結果を返す
    return (response.results || []) as unknown as AvailableChip[];

  } catch (error) {
    console.error('[DB Error] Failed to fetch available chips:', error);
    return [];
  }
};