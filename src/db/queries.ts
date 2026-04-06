import { D1Database } from '@cloudflare/workers-types';

/**
 * ====================================================================
 * Shizentaiga Domain Models: Slot Interface
 * ====================================================================
 */
export interface Slot {
  tenant_id:     string;                     // 事業者識別子
  id:            string;                     // 枠ID
  date_string:   string;                     // 'YYYY-MM-DD'
  start_at_unix: number;                     // 開始時刻 (10桁)
  slot_duration: number;                     // 所要時間（分）
  status:        'available' | 'pending' | 'booked' | 'error';
  expires_at:    number | null;              // 仮確保有効期限
  retry_count:   number;
  last_retry_at: number | null;
  updated_at:    number;                     // 最終更新時刻
}

/**
 * ====================================================================
 * Data Access Objects (Queries)
 * ====================================================================
 */

/**
 * 1. 指定日の予約枠一覧を取得 (getSlotsByDate)
 * * 期限切れ pending を available とみなす「動的救済ロジック」を内包。
 */
export async function getSlotsByDate(
  db:         D1Database,
  tenantId:   string,
  dateString: string
): Promise<Slot[]> {
  const sql = `SELECT * FROM slots WHERE tenant_id = ? AND date_string = ? ORDER BY start_at_unix ASC`;
  const now = Math.floor(Date.now() / 1000);

  const { results } = await db.prepare(sql).bind(tenantId, dateString).all<Slot>();
  if (!results?.length) return [];

  return results.map(slot => {
    const isExpired = slot.status === 'pending' && slot.expires_at && slot.expires_at < now;
    return isExpired ? { ...slot, status: 'available' as const } : slot;
  });
}

/**
 * 2. アトミックな仮確保 (tryLockSlot)
 * * 指摘事項反映：
 * - status='available' または「期限切れの pending」を更新対象とする。
 * - これにより表示上の空き状況と、確保ロジックを完全に一致させている。
 */
export async function tryLockSlot(
  db:          D1Database,
  id:          string,
  tenantId:    string,
  expiresAt:   number,                       // 新しい仮確保期限 (now + 35min)
  now:         number                        // 判定用および Updated_at 用
): Promise<boolean> {
  const sql = `
    UPDATE slots 
    SET status = 'pending', expires_at = ?, updated_at = ? 
    WHERE id = ? AND tenant_id = ? 
      AND (status = 'available' OR (status = 'pending' AND expires_at < ?))
  `;

  // 最後の引数(now)は WHERE 句内の expires_at < ? の判定に使用
  const result = await db.prepare(sql).bind(expiresAt, now, id, tenantId, now).run();
  return result.meta.changes === 1;
}

/**
 * 3. 予約の確定 (finalizeBooking)
 */
export async function finalizeBooking(
  db:          D1Database,
  id:          string,
  tenantId:    string,
  now:         number
): Promise<boolean> {
  const sql = `
    UPDATE slots 
    SET status = 'booked', expires_at = NULL, updated_at = ? 
    WHERE id = ? AND tenant_id = ? AND status = 'pending'
  `;

  const result = await db.prepare(sql).bind(now, id, tenantId).run();
  return result.meta.changes === 1;
}

/**
 * 4. 決済重複チェック (checkEventProcessed)
 * * 指摘事項反映：型安全のため .first<{ event_id: string }>() を明示的に指定。
 */
export async function checkEventProcessed(
  db:          D1Database,
  eventId:     string,
  tenantId:    string
): Promise<boolean> {
  const sql = `SELECT event_id FROM processed_events WHERE event_id = ? AND tenant_id = ?`;
  const result = await db.prepare(sql).bind(eventId, tenantId).first<{ event_id: string }>();
  return result !== null;
}

/**
 * 5. 予約枠の解放 (releaseSlot)
 */
export async function releaseSlot(
  db:          D1Database,
  id:          string,
  tenantId:    string,
  now:         number
): Promise<boolean> {
  const sql = `
    UPDATE slots 
    SET status = 'available', expires_at = NULL, updated_at = ? 
    WHERE id = ? AND tenant_id = ? AND status = 'pending'
  `;

  const result = await db.prepare(sql).bind(now, id, tenantId).run();
  return result.meta.changes === 1;
}

/**
 * ====================================================================
 * 【次期開発者・メンテナンス担当者への申し送り事項】
 * ====================================================================
 * * 1. 設計思想：動的な「期限切れ枠」の救済ロジッ
 * 本ソースコードは、フロントエンドの表示（getSlotsByDate）と、DBの更新（tryLockSlot）
 * において「期限切れの pending 枠を available とみなす」という動的な救済ロジックを
 * 共通して内包しています。これにより、Cron による物理的な状態回収（5分間隔等）
 * の隙間で発生する「予約の機会損失」をゼロにしています。
 * * 2. 不具合時の調査ポイント
 * - 「表示は空いているが予約できない」場合：
 * getSlotsByDate 内の now (Date.now()) と、tryLockSlot に渡される now の
 * 算出ロジック、あるいは DB サーバー側のシステム時刻に乖離がないか確認してください。
 * - 状態遷移の不整合：
 * 本システムは status = 'available' / 'pending' / 'booked' のリテラル型に
 * 厳格に依存しています。TypeScript エラーを回避するために `as const` を
 * 多用している箇所があるため、型の拡張時は注意が必要です。
 * * 3. パフォーマンスとスケーラビリティ
 * - D1 へのクエリは、バインド引数の順序ミスが最も致命的なバグを生みます。
 * 特に tryLockSlot の WHERE 句は OR 条件を含み複雑化しているため、
 * SQL 文の ? の数と .bind() の引数の数が 1:1 で一致しているか常に確認してください。
 * - try/catch は「例外を上位（Hono ハンドラ等）へ正しく投げて一括管理する」方針のため、
 * 本層ではあえて実装していません。
 * * 4. 改修時の注意
 * ビジネスルールが変更（例：仮確保を35分から変更するなど）される場合、
 * 呼び出し側のロジックだけでなく、本クエリ層での「期限判定（expires_at < now）」
 * が意図した挙動になるよう、DB 上の Unix Timestamp（10桁）の整合性を維持してください。
 */