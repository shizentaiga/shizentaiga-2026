/**
 * @file /src/db/booking-db.ts
 * @description Cloudflare D1 (shizentaiga_db) から予約枠情報を取得・操作するデータアクセス層。
 * 将来的なDB増設やシステム移行を見据え、バインド名を明示的に "shizentaiga_db" として扱います。
 * 【運用ルール】SQL文には必ずリミット（LIMIT）を設定し、現在時刻以降のデータに絞り込むこと。
 */

import { Context } from 'hono'

/**
 * 取得上限の設定
 * 一度のリクエストで読み込む最大件数を定義します。
 */
const MAX_FETCH_COUNT = 100;

/**
 * 予約枠のデータ型定義（Schema v1.7 準拠）
 * データベースのテーブルカラムと完全に一致させています。
 */
export interface BookingSlot {
  tenant_id: string;
  id: string;
  service_id: string;
  staff_id: string;
  date_string: string;   // JST固定: 'YYYY-MM-DD'
  start_at_unix: number; // 10桁 Unix Timestamp (秒単位)
  slot_duration: number; // 分単位
  status: 'available' | 'pending' | 'booked' | 'error';
  expires_at?: number;
  retry_count: number;
  last_retry_at?: number;
  created_at: number;
  updated_at: number;
}

/**
 * データベースから「現在以降」の予約可能な枠を取得する（最大100件）
 * @param c - HonoのContext。env内のDBバインディングへのアクセスに使用します。
 * @returns 予約可能状態 ('available') かつ未来のスロット配列。失敗時は空配列を返します。
 */
export const getAvailableSlotsFromDB = async (c: Context): Promise<BookingSlot[]> => {
  try {
    /**
     * 【重要】Binding名の明示的な指定
     * wrangler.json の "binding": "shizentaiga_db" を直接参照します。
     */
    const shizentaiga_db = c.env.shizentaiga_db;

    if (!shizentaiga_db) {
      console.warn('[DB] Binding "shizentaiga_db" is not found in environment. Check your wrangler.json.');
      return [];
    }

    /**
     * 現在時刻（Unix秒）の取得
     * JSの Date.now() はミリ秒(13桁)のため、1000で割って秒単位(10桁)に変換します。
     */
    const nowUnix = Math.floor(Date.now() / 1000);

    /**
     * クエリ実行：未来の予約可能なスロットのみを抽出
     * 1. 過去のデータを除外するため `start_at_unix > ?` を追加。
     * 2. PSI（表示速度）維持のため、SELECT * を避け必要なカラムを明示。
     * 3. インデックス idx_slots_search_optimized を活用。
     */
    const response = await shizentaiga_db.prepare(
      `SELECT 
        tenant_id, id, service_id, staff_id, date_string, 
        start_at_unix, slot_duration, status, 
        expires_at, retry_count, last_retry_at, created_at, updated_at
       FROM slots 
       WHERE status = 'available' 
         AND start_at_unix > ?
       ORDER BY start_at_unix ASC
       LIMIT ?`
    ).bind(nowUnix, MAX_FETCH_COUNT).all();

    /**
     * 型安全のためのキャスト
     * 環境により .all<T>() がエラーとなる場合があるため、
     * results に対して明示的に型アサーションを行っています。
     */
    const results = (response.results || []) as unknown as BookingSlot[];

    console.log(`[DB] Successfully fetched ${results.length} future slots. (Limit: ${MAX_FETCH_COUNT})`);
    
    return results;

  } catch (error) {
    /**
     * エラーハンドリング
     * DB接続失敗時にページ全体がクラッシュ（ホワイトアウト）するのを防ぐガードです。
     */
    console.error('[DB Error] Failed to fetch from shizentaiga_db:', error);
    
    if (error instanceof Error) {
      console.error(`[Detail] ${error.message}`);
    }

    return [];
  }
}