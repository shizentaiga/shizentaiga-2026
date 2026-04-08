-- =========================================================================
-- 04_DATABASE_SCHEMA v1.7
-- =========================================================================
-- [実行コマンド / ローカル環境]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/schema.sql
--
-- [実行コマンド / 本番環境]
-- npx wrangler d1 execute shizentaiga_db --remote --file=./src/db/schema.sql
-- =========================================================================

-- 予約枠管理メインテーブル
-- 予約のライフサイクル（空き→仮確保→確定）を厳密に管理する。
-- 「同一スタッフの同時刻重複」を物理的に排除する制約を含む。
CREATE TABLE IF NOT EXISTS slots (
    tenant_id     TEXT    NOT NULL,        -- 事業者（テナント）を識別する一意識別子
    id            TEXT    PRIMARY KEY,     -- 予約枠のユニークID（ULID推奨）
    service_id    TEXT    NOT NULL,        -- 提供するサービスプランの識別子
    staff_id      TEXT    NOT NULL,        -- 担当スタッフの識別子
    date_string   TEXT    NOT NULL,        -- 検索用日付文字列（JST固定: 'YYYY-MM-DD'）
    start_at_unix INTEGER NOT NULL,        -- 予約開始時間（10桁 Unix Timestamp）
    slot_duration INTEGER NOT NULL,        -- 予約枠の長さ（分単位 / 在庫の最小粒度）
    status        TEXT    NOT NULL         -- 現在の状態管理
        CHECK (status IN ('available', 'pending', 'booked', 'error')),
    expires_at    INTEGER,                 -- 仮確保(pending)の有効期限（10桁 Unix Timestamp）
    retry_count   INTEGER DEFAULT 0,       -- 決済失敗時等のリトライ回数
    last_retry_at INTEGER,                 -- 最終リトライ実行日時
    created_at    INTEGER NOT NULL,        -- レコード作成日時（障害追跡用）
    updated_at    INTEGER NOT NULL         -- 最終更新日時（アプリ側で秒単位タイムスタンプをセット）
);

-- 【業務制約】同一スタッフによる同時刻の枠生成をDBレベルで禁止し、二重予約を物理的に防止する
CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_unique_business_rule
    ON slots (tenant_id, staff_id, start_at_unix);

-- 【検索最適化】カレンダー表示および空き枠検索を極限まで高速化する（カバリングインデックス）
CREATE INDEX IF NOT EXISTS idx_slots_search_optimized 
    ON slots (tenant_id, service_id, date_string, status);

-- 【運用最適化】期限切れの仮確保枠（pending）を Cron 等で効率的に回収するためのインデックス
CREATE INDEX IF NOT EXISTS idx_slots_pending_manager
    ON slots (status, expires_at);

-- べき等性管理テーブル
-- Stripe Webhook 等の外部イベントの二重処理を物理的に防止する（べき等性の担保）
CREATE TABLE IF NOT EXISTS processed_events (
    event_id     TEXT    PRIMARY KEY,      -- 外部イベントの一意識別子（Stripe ID 等）
    provider     TEXT    DEFAULT 'stripe', -- 決済プロバイダ名（将来の多角化に対応）
    tenant_id    TEXT    NOT NULL,         -- 該当イベントの所属テナント
    processed_at INTEGER NOT NULL          -- 処理実行日時（10桁 Unix Timestamp）
);

-- 【メンテナンス最適化】過去のイベントログをクリーンアップするためのインデックス
CREATE INDEX IF NOT EXISTS idx_processed_at_cleanup
    ON processed_events (processed_at);