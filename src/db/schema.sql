-- =========================================================================
-- 04_DATABASE_SCHEMA v2.2 (Full Master Model)
-- =========================================================================
-- [開発者向け運用・実装プロトコル]
-- 1. 整合性保護: D1では PRAGMA foreign_keys = ON; を接続時に明示しない限り
--    外部キー制約が機能しません。親レコード削除時の挙動は CASCADE を基本とします。
-- 2. 時刻更新: SQLiteは updated_at を自動更新しません。アプリ側で INSERT/UPDATE 
--    実行時に必ず Unix Timestamp (10桁) をセットしてください。
-- 3. 冪等性: 決済完了等のイベント処理は processed_events の一意制約を活用し、
--    Stripe Webhook の重複到達からシステムを守ります。
-- =========================================================================
-- [実行コマンド / ローカル環境]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/schema.sql
-- ※本番環境では「--remote」に変更するが、運用への影響を考慮すること。(基本は初回のみ実行。)
-- データベース名を確認：npx wrangler d1 list
-- テーブル名の一覧：npx wrangler d1 execute shizentaiga_db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
-- カラム名の一覧：npx wrangler d1 execute shizentaiga_db --local --command="SELECT sql FROM sqlite_master WHERE type='table';"
-- =========================================================================

-- 既存テーブルのクリーンアップ
DROP TABLE IF EXISTS slots;
DROP TABLE IF EXISTS staff_schedules;
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS staffs;
DROP TABLE IF EXISTS shops;

-- -------------------------------------------------------------------------
-- 1. マスタテーブル群（Foundation）
-- -------------------------------------------------------------------------

-- 店舗マスタ
CREATE TABLE shops (
    shop_id   TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- スタッフマスタ
CREATE TABLE staffs (
    staff_id     TEXT PRIMARY KEY,
    shop_id      TEXT NOT NULL,
    real_name    TEXT NOT NULL,       -- 管理用
    display_name TEXT NOT NULL,       -- 予約画面表示用
    created_at   INTEGER NOT NULL,
    -- 店舗が削除された場合、紐づくスタッフも削除する（幽霊データ防止）
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- サービスプランマスタ
CREATE TABLE plans (
    plan_id      TEXT PRIMARY KEY,
    shop_id      TEXT NOT NULL,
    name         TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    price_amount INTEGER NOT NULL,
    created_at   INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 2. 稼働・予約テーブル群（Transactions）
-- -------------------------------------------------------------------------

-- スタッフ稼働枠（供給：Supply）
CREATE TABLE staff_schedules (
    schedule_id   TEXT PRIMARY KEY,
    staff_id      TEXT NOT NULL,
    date_string   TEXT NOT NULL,      -- JST: 'YYYY-MM-DD'
    start_at_unix INTEGER NOT NULL,   -- 対応開始時間
    end_at_unix   INTEGER NOT NULL,   -- 対応終了時間
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

-- 予約本体（需要・証跡：Need）
CREATE TABLE slots (
    slot_id           TEXT PRIMARY KEY,
    plan_id           TEXT NOT NULL,
    staff_id          TEXT NOT NULL,
    user_email        TEXT,
    status            TEXT NOT NULL CHECK (status IN ('pending', 'booked', 'cancelled', 'error')),
    start_at_unix     INTEGER NOT NULL,
    end_at_unix       INTEGER NOT NULL,
    actual_price      INTEGER NOT NULL, -- 予約時点の金額を固定（証跡）
    actual_duration   INTEGER NOT NULL, -- 予約時点の時間を固定（証跡）
    stripe_session_id TEXT,
    expires_at        INTEGER,          -- 仮確保の有効期限
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL, -- アプリ側で都度更新必須
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 3. 信頼性テーブル（Log）
-- -------------------------------------------------------------------------

-- べき等性管理（Stripe Webhook重複防止）
CREATE TABLE processed_events (
    event_id     TEXT PRIMARY KEY,
    provider     TEXT DEFAULT 'stripe',
    processed_at INTEGER NOT NULL
);

-- -------------------------------------------------------------------------
-- 4. インデックス設計（Optimization）
-- -------------------------------------------------------------------------

CREATE INDEX idx_staffs_shop ON staffs (shop_id);
CREATE INDEX idx_plans_shop ON plans (shop_id);
CREATE INDEX idx_schedules_date ON staff_schedules (staff_id, date_string);

-- 予約検索および二重予約防止のためのルックアップ
CREATE INDEX idx_slots_lookup ON slots (staff_id, start_at_unix, status);

-- 期限切れ pending 枠の一括クリーンアップおよび在庫計算からの除外用
CREATE INDEX idx_slots_expiry ON slots (status, expires_at);

-- 決済イベントの逆引き用
CREATE INDEX idx_slots_stripe_session ON slots (stripe_session_id);