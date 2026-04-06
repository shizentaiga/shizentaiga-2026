-- ==========================================
-- 04_DATABASE_SCHEMA (Aletheia Core)
-- ==========================================
-- [実行コマンド / ローカル環境]
-- npx wrangler d1 execute <DATABASE_NAME> --local --file=./src/db/schema.sql
--
-- [実行コマンド / 本番環境]
-- npx wrangler d1 execute <DATABASE_NAME> --remote --file=./src/db/schema.sql
-- ==========================================

-- 予約枠管理メインテーブル
-- 予約のライフサイクル（空き→仮確保→確定）を厳密に管理する
CREATE TABLE IF NOT EXISTS slots (
    tenant_id     TEXT    NOT NULL,        -- 事業者（テナント）を識別する一意識別子
    id            TEXT    PRIMARY KEY,     -- 予約枠のユニークID（ソート可能なULIDを推奨）
    date_string   TEXT    NOT NULL,        -- 検索用日付文字列（例: '2026-04-06'）
    start_at_unix INTEGER NOT NULL,        -- 予約開始時間（10桁 Unix Timestamp / UTC）
    slot_duration INTEGER NOT NULL,        -- 予約枠の長さ（分単位）
    status        TEXT    NOT NULL         -- 現在の状態管理
        CHECK (status IN ('available', 'pending', 'booked', 'error')),
    expires_at    INTEGER,                 -- 仮確保(pending)の有効期限（10桁 Unix Timestamp）
    retry_count   INTEGER DEFAULT 0,       -- 決済失敗時等のリトライ回数
    last_retry_at INTEGER,                 -- 最終リトライ実行日時
    updated_at    INTEGER NOT NULL         -- 最終更新日時（アプリ側で Math.floor(Date.now()/1000) をセット）
);

-- 【検索最適化】特定の日付の予約枠を高速に抽出するためのインデックス
CREATE INDEX IF NOT EXISTS idx_slots_tenant_date
    ON slots (tenant_id, date_string);

-- 【運用最適化】期限切れの仮確保枠（pending）を Cron で一括回収するためのインデックス
CREATE INDEX IF NOT EXISTS idx_slots_status_expires
    ON slots (status, expires_at);

-- べき等性管理テーブル
-- Stripe Webhook 等の二重処理を物理的に防止する
CREATE TABLE IF NOT EXISTS processed_events (
    event_id     TEXT    PRIMARY KEY,      -- 処理済みイベントの一意なID（Stripe Event ID等）
    tenant_id    TEXT    NOT NULL,         -- 該当イベントの所属テナント
    processed_at INTEGER NOT NULL          -- 処理実行日時（10桁 Unix Timestamp）
);