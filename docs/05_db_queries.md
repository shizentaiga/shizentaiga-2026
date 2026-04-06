# 05_データ操作層（Queries）ソースコード素案 v1.0

本ドキュメントは、Cloudflare D1 を使用した予約システムのデータ操作関数群を定義する。  
`src/db/queries.ts` に配置することを想定している。

---

## 1. 型定義 (Interfaces)

~~~typescript
export interface Slot {
  tenant_id:     string;                                          // 事業者識別子
  id:            string;                                          // 枠の一意識別子 (ULID)
  date_string:   string;                                          // 検索用日付 (YYYY-MM-DD)
  start_at_unix: number;                                          // 開始時刻 (Unix Timestamp 10桁)
  slot_duration: number;                                          // 枠の長さ (分)
  status:        'available' | 'pending' | 'booked' | 'error';
  expires_at:    number | null;
  retry_count:   number;
  last_retry_at: number | null;
  updated_at:    number;                                          // 最終更新時刻 (Unix Timestamp 10桁)
}
~~~

---

## 2. 実装コード (`src/db/queries.ts`)

~~~typescript
import { D1Database } from '@cloudflare/workers-types';

/**
 * 1. 指定日の予約枠一覧を取得
 * .all<Slot>() を使用し、戻り値に型を付与して後続ロジックをスムーズにする
 */
export async function getSlotsByDate(
  db:         D1Database,
  tenantId:   string,
  dateString: string
): Promise<Slot[]> {
  const sql = `
    SELECT * FROM slots
    WHERE tenant_id = ?
      AND date_string = ?
    ORDER BY start_at_unix ASC;
  `;
  const { results } = await db
    .prepare(sql)
    .bind(tenantId, dateString)
    .all<Slot>();
  return results || [];
}

/**
 * 2. アトミックな仮確保 (Soft Lock)
 * status='available' の時のみ更新。changes === 1 なら成功。
 */
export async function tryLockSlot(
  db:        D1Database,
  id:        string,
  tenantId:  string,
  expiresAt: number,  // unixepoch() + 2100 (35分)
  now:       number   // unixepoch()
): Promise<boolean> {
  const sql = `
    UPDATE slots
    SET
      status     = 'pending',
      expires_at = ?,
      updated_at = ?
    WHERE
      id         = ?
      AND tenant_id = ?
      AND status = 'available';
  `;
  const result = await db
    .prepare(sql)
    .bind(expiresAt, now, id, tenantId)
    .run();
  // 更新された行数が 1 であれば予約成功
  return result.meta.changes === 1;
}

/**
 * 3. 予約の確定 (Finalize)
 * booked 移行時も証跡として updated_at を必ず更新する
 */
export async function finalizeBooking(
  db:       D1Database,
  id:       string,
  tenantId: string,
  now:      number
): Promise<boolean> {
  const sql = `
    UPDATE slots
    SET
      status     = 'booked',
      expires_at = NULL,  -- 確定後は期限をクリア
      updated_at = ?      -- 確定時刻を証跡として記録
    WHERE
      id         = ?
      AND tenant_id = ?
      AND status = 'pending';  -- 仮確保中であること
  `;
  const result = await db
    .prepare(sql)
    .bind(now, id, tenantId)
    .run();
  return result.meta.changes === 1;
}

/**
 * 4. 決済重複チェック (Idempotency Check)
 */
export async function checkEventProcessed(
  db:       D1Database,
  eventId:  string,
  tenantId: string
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
  return !!result;
}
~~~

---

## 3. 実装上のポイント

| 項目 | 規約 |
|---|---|
| 時刻生成 | `now` 引数には必ず `Math.floor(Date.now() / 1000)` を渡す |
| エラーハンドリング | `db.prepare().run()` は例外を投げる可能性があるため、呼び出し側（Honoハンドラ等）で `try-catch` すること |