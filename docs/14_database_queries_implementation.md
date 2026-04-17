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

---

## 4. 単体テスト用メモ

1. 必要なパッケージのインストール
プロジェクトのルートで以下を実行します。

Bash
npm install -D vitest @cloudflare/vitest-pool-workers


1. vitest.config.ts の作成
プロジェクトのルートディレクトリに配置し、WranglerのコンテキストをVitestに認識させます。

TypeScript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});

2. queries.test.ts の統合実装
格納フォルダ(テスト専用)：src/test/queries.test.ts
格納フォルダ(本番用SQL)：src/db/schema.sql
格納フォルダ(単体テスト用プログラム)：src/db/queries.ts

schema.sql を動的に読み込み、「成功」と「防御（失敗）」の両面を検証する構成です。

TypeScript
import { describe, it, expect, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import fs from 'node:fs';
import path from 'node:path';
import { getSlotsByDate, tryLockSlot } from './queries';

describe('Queries Integration Tests with Schema Sync', () => {
  let db: D1Database;

  beforeEach(async () => {
    const proxy = await getPlatformProxy<{ DB: D1Database }>();
    db = proxy.env.DB;

    // 1. 本番の schema.sql を読み込んでテーブル構造を同期
    const schemaPath = path.resolve(__dirname, '../db/schema.sql'); // ⭐️パスは「schema.sql」のある場所を指定
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // セミコロンで分割して実行（コメントや空行を除去）
    const setupQueries = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const query of setupQueries) {
      await db.prepare(query).run();
    }

    // 2. テストデータの初期化
    await db.prepare(`DELETE FROM slots`).run();
  });

  it('【正常系】期限切れのpending枠がavailableとして取得できるか', async () => {
    // 過去の時刻で期限切れデータを投入
    await db.prepare(`
      INSERT INTO slots (tenant_id, id, date_string, start_at_unix, status, expires_at) 
      VALUES ('T1', 'slot_expired', '2026-04-06', 1712386800, 'pending', 1000)
    `).run();

    const results = await getSlotsByDate(db, 'T1', '2026-04-06');
    
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('available'); // 救済ロジックの検証
  });

  it('【正常系】期限切れ枠をtryLockSlotで上書き奪取できるか', async () => {
    await db.prepare(`
      INSERT INTO slots (tenant_id, id, date_string, start_at_unix, status, expires_at) 
      VALUES ('T1', 'slot_takeover', '2026-04-06', 1712386800, 'pending', 1000)
    `).run();

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 2100;

    const success = await tryLockSlot(db, 'slot_takeover', 'T1', expiresAt, now);
    expect(success).toBe(true);
  });

  it('【防御系】確定済み(booked)の枠に対してはtryLockSlotが失敗するか', async () => {
    // すでに予約確定済みのデータを投入
    await db.prepare(`
      INSERT INTO slots (tenant_id, id, date_string, start_at_unix, status, expires_at) 
      VALUES ('T1', 'slot_booked', '2026-04-06', 1712386800, 'booked', NULL)
    `).run();

    const now = Math.floor(Date.now() / 1000);
    const success = await tryLockSlot(db, 'slot_booked', 'T1', now + 2100, now);
    
    // ガードレールが機能していれば false になるはず
    expect(success).toBe(false);
  });
});