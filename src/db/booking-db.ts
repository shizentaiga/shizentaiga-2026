/**
 * @file /src/db/booking-db.ts
 * @description Cloudflare D1 (shizentaiga_db) から予約情報を取得・操作するデータアクセス層。
 * v3.0 グリッド・アトミックモデル準拠。
 * 【運用ルール】SQL文には必ずリミット（LIMIT）を設定し、インデックス（start_at_unix）を活用すること。
 */

import { Context } from 'hono'

/**
 * 取得上限の設定
 */
const MAX_FETCH_COUNT = 100;

/**
 * 予約スロットのデータ型定義（Schema v3.0 準拠）
 * 物理削除をせず、status でライフサイクルを管理します。
 */
export interface BookingSlot {
  slot_id: string;              // ULID
  plan_id: string;              
  staff_id: string;
  user_email: string | null;    // v3.0で追加
  date_string: string;          // JST: 'YYYY-MM-DD'
  start_at_unix: number;        
  end_at_unix: number;          // 施術終了 + バッファ終了時刻
  booking_status: 'pending' | 'booked' | 'cancelled' | 'error'; // availableはスプレッド抽出対象外
  actual_price_amount: number; 
  actual_duration_min: number; 
  actual_buffer_min: number;    // v3.0で追加
  stripe_session_id?: string;
  expires_at?: number | null;   // pending時の有効期限
  created_at: number;
  updated_at: number;
}

/**
 * データベースから「現在以降」の有効な予約スロットを取得する（最大100件）
 * @param c - HonoのContext。
 * @returns 完了・取消・異常以外の、生きている予約（pending or booked）を優先的に返します。
 */
export const getAvailableSlotsFromDB = async (c: Context): Promise<BookingSlot[]> => {
  try {
    const shizentaiga_db = c.env.shizentaiga_db;

    if (!shizentaiga_db) {
      console.warn('[DB] Binding "shizentaiga_db" not found.');
      return [];
    }

    const nowUnix = Math.floor(Date.now() / 1000);

    /**
     * クエリ実行：未来の有効な予約スロットを抽出
     * 1. v3.0 schema に合わせ、actual_buffer_min を追加。
     * 2. booking_status は 'pending'（仮押さえ）か 'booked'（確定）をメインに取得。
     * 3. インデックス idx_slots_date_lookup または idx_slots_expiry を意識したWHERE句。
     */
    const response = await shizentaiga_db.prepare(
      `SELECT 
        slot_id, plan_id, staff_id, user_email, date_string, 
        start_at_unix, end_at_unix, booking_status, 
        actual_price_amount, actual_duration_min, actual_buffer_min,
        stripe_session_id, expires_at, created_at, updated_at
       FROM slots 
       WHERE start_at_unix > ?
         AND booking_status IN ('pending', 'booked') 
       ORDER BY start_at_unix ASC
       LIMIT ?`
    ).bind(nowUnix, MAX_FETCH_COUNT).all();

    const results = (response.results || []) as unknown as BookingSlot[];

    console.log(`[DB] Fetched ${results.length} active slots. (v3.0 Grid-Model)`);
    
    return results;

  } catch (error) {
    console.error('[DB Error] Failed to fetch from shizentaiga_db:', error);
    return [];
  }
}