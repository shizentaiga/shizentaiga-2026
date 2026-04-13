import { D1Database } from '@cloudflare/workers-types';

/**
 * ====================================================================
 * Shizentaiga Domain Models: v3.0 Grid-Atomic Model
 * ====================================================================
 */

/**
 * 予約スロット（需要・証跡）
 */
export interface Slot {
  slot_id: string;              // id -> slot_id
  plan_id: string;              
  staff_id: string;
  user_email: string | null;
  date_string: string;          // 'YYYY-MM-DD'
  start_at_unix: number;        
  end_at_unix: number;          // 施術終了+バッファ込
  booking_status: 'pending' | 'booked' | 'cancelled' | 'error'; // availableはここには存在しない
  actual_price_amount: number;
  actual_duration_min: number;
  actual_buffer_min: number;
  stripe_session_id: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * スタッフ稼働チップ（供給）
 */
export interface StaffScheduleChip {
  schedule_id: string;          // grd_...
  staff_id: string;
  date_string: string;
  start_at_unix: number;
  grid_size_min: number;        // 通常30
}

/**
 * ====================================================================
 * Data Access Objects (Queries)
 * ====================================================================
 */

/**
 * 1. 指定日の「空きチップ」一覧を取得 (getAvailableGridByDate)
 * * 仕組み：staff_schedules（全チップ）から、既に reservation_grid（予約済み）にあるものを除外して取得。
 * * 期限切れ pending に紐づくチップを「空き」として扱う動的救済ロジックを LEFT JOIN で実現。
 */
export async function getAvailableGridByDate(
  db: D1Database,
  staffId: string,
  dateString: string
): Promise<StaffScheduleChip[]> {
  const now = Math.floor(Date.now() / 1000);

  // SQL解説:
  // 1. スケジュール（供給）をベースにする
  // 2. reservation_grid と slots を結合し、現在の予約状況を確認
  // 3. 「予約がない」か「予約があっても期限切れの pending である」チップのみを抽出
  const sql = `
    SELECT s.*
    FROM staff_schedules s
    LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
    LEFT JOIN slots sl ON rg.slot_id = sl.slot_id
    WHERE s.staff_id = ? AND s.date_string = ?
      AND (
        rg.slot_id IS NULL 
        OR (sl.booking_status = 'pending' AND sl.expires_at < ?)
        OR (sl.booking_status = 'cancelled')
      )
    ORDER BY s.start_at_unix ASC
  `;

  const { results } = await db.prepare(sql).bind(staffId, dateString, now).all<StaffScheduleChip>();
  return results || [];
}

/**
 * 2. 決済重複チェック (checkEventProcessed)
 * * v3.0 では shop_id(旧tenant_id) ではなく、グローバルにユニークな event_id で判定。
 */
export async function checkEventProcessed(
  db: D1Database,
  eventId: string
): Promise<boolean> {
  const sql = `SELECT event_id FROM processed_events WHERE event_id = ?`;
  const result = await db.prepare(sql).bind(eventId).first<{ event_id: string }>();
  return result !== null;
}

/**
 * 3. 予約枠の最終確定 (finalizeBooking)
 * * ステータスを確定(booked)に変更し、期限を消去。
 */
export async function finalizeBooking(
  db: D1Database,
  slotId: string,
  now: number
): Promise<boolean> {
  const sql = `
    UPDATE slots 
    SET booking_status = 'booked', expires_at = NULL, updated_at = ? 
    WHERE slot_id = ? AND booking_status = 'pending'
  `;

  const result = await db.prepare(sql).bind(now, slotId).run();
  return result.meta.changes === 1;
}

/**
 * 4. 予約のキャンセル・解放 (releaseSlot)
 * * v3.0 では reservation_grid からの削除（物理解放）と、slots のステータス変更（証跡保存）を同時に行う。
 * * トランザクション（D1の batch）を推奨。
 */
export async function releaseSlot(
  db: D1Database,
  slotId: string,
  now: number
): Promise<void> {
  // 1. 物理的なロック（グリッド）を解放
  const deleteGrid = db.prepare(`DELETE FROM reservation_grid WHERE slot_id = ?`).bind(slotId);
  // 2. 予約証跡をキャンセル状態へ
  const updateSlot = db.prepare(`
    UPDATE slots 
    SET booking_status = 'cancelled', updated_at = ? 
    WHERE slot_id = ?
  `).bind(now, slotId);

  await db.batch([deleteGrid, updateSlot]);
}

/**
 * ====================================================================
 * 【次期開発者・メンテナンス担当者への申し送り事項】
 * ====================================================================
 * * 1. 設計思想：チップ・グリッドによる供給と需要の分離
 * v3.0 では「枠があるから予約できる」のではなく「供給チップを予約スロットが占有する」
 * という考え方にシフトしました。 reservation_grid テーブルの UNIQUE(schedule_id) 
 * 制約が、ダブルブッキングを防ぐ最後の砦（物理防御）です。
 * * 2. 動的救済ロジックの所在
 * 以前は Slot オブジェクトを map して status を書き換えていましたが、新モデルでは
 * SQL の LEFT JOIN 句にて「期限切れの pending に紐づくチップ」を直接抽出します。
 * これにより、アプリケーション層での計算負荷を減らし、DB レベルで整合性を担保しています。
 * * 3. ID の命名規則
 * slot_id は予約単位、schedule_id は 30 分単位の物理チップを指します。
 * finalizeBooking や releaseSlot を行う際は、常に「スロット単位」で操作することを
 * 徹底してください。グリッドの解放は CASCADE または batch により自動化されます。
 * * 4. バッチ処理の重要性
 * 予約の解放などは、複数のテーブル（grid と slots）を跨ぐため、
 * db.batch() を使用して原子性（Atomicity）を確保しています。
 */