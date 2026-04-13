/**
 * @file /src/db/booking-db.ts
 * @description Cloudflare D1 (shizentaiga_db) から予約情報を取得・操作するデータアクセス層。
 * [v3.0 本番仕様・厳格型定義版]
 * 修正点:
 * 1. any の排除: params 配列を (string | number)[] で定義し、ビルド時の型推論を安定化。
 * 2. Bindings の定義: Context に環境変数の型を教えることで、c.env.shizentaiga_db の存在を保証。
 * 3. ジェネリクスの活用: .all<AvailableChip>() を使用し、AS キャストを最小限に。
 */

import { Context } from 'hono'

/**
 * Cloudflare Workers 環境変数の型定義
 */
type Bindings = {
  shizentaiga_db: D1Database
}

/**
 * 供給チップ（staff_schedules）のデータ型定義
 */
export interface AvailableChip {
  start_at_unix: number;
  date_string: string;
  grid_size_min: number; 
}

/**
 * 予約スロット（計算後）のデータ型定義（SlotList.tsx 等で使用）
 */
export interface BookingSlot {
  start_at_unix: number;
  time_label: string;
  is_available: boolean;
}

/**
 * 特定の日付、または未来の「未予約チップ（供給）」をすべて取得する
 * @param c - Hono Context (Bindings を指定して型安全性を確保)
 * @param dateString - 'YYYY-MM-DD' 形式
 */
export const getAvailableChipsFromDB = async (
  c: Context<{ Bindings: Bindings }>, 
  dateString?: string
): Promise<AvailableChip[]> => {
  try {
    const db = c.env.shizentaiga_db;
    if (!db) {
      console.error('[DB Error] shizentaiga_db is not found in env');
      return [];
    }

    const nowUnix = Math.floor(Date.now() / 1000);

    /**
     * v3.0 ロジック:
     * 1. s.grid_size_min を SELECT
     * 2. reservation_grid (予約紐付け) を LEFT JOIN し、slot_id が NULL のもの = 未予約
     */
    let query = `
      SELECT s.start_at_unix, s.date_string, s.grid_size_min
      FROM staff_schedules s
      LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
      WHERE s.start_at_unix > ? 
        AND rg.slot_id IS NULL
    `;
    
    // 型安全なパラメータ配列 (anyを排除)
    const params: (string | number)[] = [nowUnix];

    if (dateString) {
      query += ` AND s.date_string = ?`;
      params.push(dateString);
    }

    query += ` ORDER BY s.start_at_unix ASC LIMIT 500`;

    // D1のジェネリクスを使用して、結果の型を明示
    const response = await db.prepare(query).bind(...params).all<AvailableChip>();
    
    return response.results || [];

  } catch (error) {
    console.error('[DB Error] Failed to fetch available slots:', error);
    return [];
  }
};
