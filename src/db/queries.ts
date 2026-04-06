import { D1Database } from '@cloudflare/workers-types';

/**
 * ====================================================================
 * Aletheia Domain Models: Slot Interface
 * ====================================================================
 * 予約枠の状態とライフサイクルを定義する中心的な型定義。
 * すべての時刻データは「10桁の Unix Timestamp (秒単位)」で統一する。
 */
export interface Slot {
  tenant_id:     string;                     // 事業者（テナント）を識別する一意識別子
  id:            string;                     // 枠ID（時系列ソート可能なULIDを推奨）
  date_string:   string;                     // 表示・検索用日付 (JST基準: 'YYYY-MM-DD')
  start_at_unix: number;                     // 予約開始時刻 (Unix Timestamp 10桁)
  slot_duration: number;                     // 枠の所要時間（分単位）
  status:        'available' | 'pending' | 'booked' | 'error'; // 状態遷移管理
  expires_at:    number | null;              // 仮確保(pending)の有効期限（期限切れはCronで回収）
  retry_count:   number;                     // 決済失敗時等の自動リトライ試行回数
  last_retry_at: number | null;              // 最後に照合を試みた時刻
  updated_at:    number;                     // レコードの最終更新時刻（証跡管理用）
}

/**
 * ====================================================================
 * Data Access Objects (Queries)
 * ====================================================================
 */

/**
 * 1. 指定日の予約枠一覧を取得 (getSlotsByDate)
 * * 特定のテナントおよび日付に紐づくすべてのスロットを時系列順に抽出する。
 * 指摘事項反映：.all<Slot>() により D1 の戻り値を型安全にキャストしている。
 */
export async function getSlotsByDate(
  db:         D1Database,                    // D1 データベースインスタンス
  tenantId:   string,                        // テナント識別子
  dateString: string                         // 取得対象日 ('YYYY-MM-DD')
): Promise<Slot[]> {
  const sql = `
    SELECT * FROM slots
    WHERE tenant_id = ?
      AND date_string = ?
    ORDER BY start_at_unix ASC;              -- 常にカレンダー表示順で取得
  `;
  
  const { results } = await db
    .prepare(sql)
    .bind(tenantId, dateString)
    .all<Slot>();                            // D1内部で Slot 型として結果を保持
    
  return results || [];
}

/**
 * 2. アトミックな仮確保 (tryLockSlot)
 * * 二重予約を物理的に防ぐための「楽観的ロック（Soft Lock）」ロジック。
 * status='available' であることを WHERE 句の必須条件にすることで、
 * タッチの差で他人に更新された場合は changes === 0 となり、確実に弾くことができる。
 */
export async function tryLockSlot(
  db:         D1Database,
  id:         string,                        // 対象枠のID
  tenantId:   string,                        // テナント識別子
  expiresAt:  number,                        // 仮確保の有効期限 (現在時刻 + 35分)
  now:        number                         // 現在時刻 (Updated_at用)
): Promise<boolean> {
  const sql = `
    UPDATE slots
    SET
      status     = 'pending',                -- 状態を「仮確保」に移行
      expires_at = ?,                        -- 決済完了までの猶予時間を設定
      updated_at = ?                         -- 更新時刻を記録
    WHERE
      id         = ?
      AND tenant_id = ?
      AND status = 'available';              -- 【重要】空き状態の場合のみ更新を許可
  `;

  const result = await db
    .prepare(sql)
    .bind(expiresAt, now, id, tenantId)
    .run();

  // 1行更新されていればロック成功。0行なら他者が先に確保したと判定。
  return result.meta.changes === 1;
}

/**
 * 3. 予約の確定 (finalizeBooking)
 * * 決済完了（Stripe等からの通知）を受けて、枠を最終確定状態にする。
 * 証跡管理のため、確定時刻を updated_at に刻み込み、有効期限をクリアする。
 */
export async function finalizeBooking(
  db:         D1Database,
  id:         string,
  tenantId:   string,
  now:        number                         // 確定時刻
): Promise<boolean> {
  const sql = `
    UPDATE slots
    SET
      status     = 'booked',                 -- 状態を「確定」に移行
      expires_at = NULL,                     -- 仮確保の期限設定を解除
      updated_at = ?                         -- 確定時刻を証跡として保存
    WHERE
      id         = ?
      AND tenant_id = ?
      AND status = 'pending';                -- 仮確保中(pending)の枠のみを対象とする
  `;

  const result = await db
    .prepare(sql)
    .bind(now, id, tenantId)
    .run();

  return result.meta.changes === 1;
}

/**
 * 4. 決済重複チェック (checkEventProcessed)
 * * 外部通知（Webhook）の二重受信による多重処理を防止する「べき等性」チェック関数。
 * processed_events テーブルに記録があるか否かを確認する。
 */
export async function checkEventProcessed(
  db:         D1Database,
  eventId:    string,                        // Stripe等のイベントID
  tenantId:   string                         // テナント識別子
): Promise<boolean> {
  const sql = `
    SELECT event_id FROM processed_events
    WHERE event_id = ?
      AND tenant_id = ?;
  `;
  
  const result = await db
    .prepare(sql)
    .bind(eventId, tenantId)
    .first();
    
  return !!result;                           // レコードが存在すれば true (処理済み)
}