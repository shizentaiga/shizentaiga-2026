-- =========================================================================
-- [実行・管理コマンド]
-- SQL実行: npx wrangler d1 execute shizentaiga_db --local --file=./src/db/schema.sql
-- =========================================================================

-- =========================================================================
-- [SCHEMA v4.3] Service Booking System (Future-Proof Model)
-- =========================================================================
-- 最終更新: 2026-04-16
-- 
-- 【主要な変更点】
-- 1. Agnostic-Payment: 決済プロバイダー依存を排除した抽象化設計。
-- 2. CRM-Integrity: external_id と provider の複合制約で多媒体併用に対応。
-- 3. Audit-Ready: 運営上の実務ステータス (refunded, no_show) を追加。
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. 初期化 (依存関係を考慮した削除順序)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS processed_payment_events;
DROP TABLE IF EXISTS payment_gateway_logs;
DROP TABLE IF EXISTS reservation_grid;
DROP TABLE IF EXISTS slots;
DROP TABLE IF EXISTS staff_schedules;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS staffs;
DROP TABLE IF EXISTS shops;

-- -------------------------------------------------------------------------
-- 1. 顧客管理 (CRM基盤)
-- -------------------------------------------------------------------------
CREATE TABLE customers (
    customer_id          TEXT PRIMARY KEY,     -- 内部管理ID (cst_xxx)
    external_customer_id TEXT,                 -- 外部サービス(Stripe等)側のID
    external_provider    TEXT,                 -- ID発行元の識別子 ('stripe', 'paypal' 等)
    google_id            TEXT UNIQUE,          -- Google認証連携用
    email                TEXT UNIQUE NOT NULL, -- リピーター特定および連絡用の主キー
    name                 TEXT,                 -- 表示名
    phone                TEXT,                 -- 緊急連絡先・SMS通知用
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL,
    -- 同一プロバイダー内でのID重複を防止しつつ、複数プロバイダーの併用を許容
    UNIQUE(external_customer_id, external_provider)
);

-- -------------------------------------------------------------------------
-- 2. マスタデータ (店舗構成)
-- -------------------------------------------------------------------------
CREATE TABLE shops (
    shop_id    TEXT PRIMARY KEY,
    shop_name  TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE staffs (
    staff_id            TEXT PRIMARY KEY,
    shop_id             TEXT NOT NULL,
    real_name           TEXT NOT NULL, -- 労務管理用
    staff_display_name  TEXT NOT NULL, -- 顧客表示用
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

CREATE TABLE plans (
    plan_id          TEXT PRIMARY KEY,
    shop_id          TEXT NOT NULL,
    plan_name        TEXT NOT NULL,
    description      TEXT,
    duration_min     INTEGER NOT NULL, -- サービス提供時間
    buffer_min       INTEGER NOT NULL DEFAULT 30, -- 前後のインターバル
    price_amount     INTEGER NOT NULL,
    plan_status      TEXT NOT NULL DEFAULT 'active' 
        CHECK (plan_status IN ('draft', 'active', 'hidden', 'inactive', 'archived')),
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 3. スケジュール・予約管理 (Atomic-Grid Core)
-- -------------------------------------------------------------------------
CREATE TABLE staff_schedules (
    schedule_id   TEXT PRIMARY KEY,    -- 最小単位の枠ID
    staff_id      TEXT NOT NULL,
    date_string   TEXT NOT NULL,       -- YYYY-MM-DD
    start_at_unix INTEGER NOT NULL,    -- 枠の開始時刻(UnixTime)
    grid_size_min INTEGER NOT NULL DEFAULT 30, -- 枠の刻み幅
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

CREATE TABLE slots (
    slot_id                TEXT PRIMARY KEY,
    plan_id                TEXT NOT NULL,
    staff_id               TEXT NOT NULL,
    customer_id            TEXT,          -- 会員予約の場合に使用
    user_email             TEXT,          -- 非会員(Guest)予約および既存ロジック互換用
    booking_status         TEXT NOT NULL 
        CHECK (booking_status IN (
            'pending',   -- 決済処理中/仮押さえ
            'booked',    -- 予約確定
            'cancelled', -- ユーザーまたは管理者による取消
            'refunded',  -- 決済完了後の返金済み
            'no_show',   -- 当日来店なし(売上計上対象)
            'error'      -- 決済失敗・システム異常
        )),
    date_string            TEXT NOT NULL, -- 検索最適化用
    start_at_unix          INTEGER NOT NULL,
    end_at_unix            INTEGER NOT NULL,
    actual_price_amount    INTEGER NOT NULL, -- 予約時点の価格(証跡不変性の確保)
    actual_duration_min    INTEGER NOT NULL, -- 予約時点の所要時間
    actual_buffer_min      INTEGER NOT NULL, -- 予約時点のバッファ
    payment_intent_id      TEXT UNIQUE,      -- 決済プロバイダー側の取引識別子
    payment_provider       TEXT DEFAULT 'stripe',
    expires_at             INTEGER,          -- 'pending' 時の自動解放期限
    created_at             INTEGER NOT NULL,
    updated_at             INTEGER NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- -------------------------------------------------------------------------
-- 4. 二重予約防止エンジン (Grid-Atomic Core)
-- -------------------------------------------------------------------------
-- [実装プロトコル]
-- 1. ロック: slotsにレコード作成時、同時に本テーブルへINSERTを行う。
-- 2. 排他: UNIQUE制約により、同一のschedule_idに対する重複INSERTをDBレベルで阻止する。
-- 3. 解放: 期限切れやキャンセル時にslotsを削除すると、CASCADEにより本テーブルも即時解放される。
-- -------------------------------------------------------------------------
CREATE TABLE reservation_grid (
    schedule_id TEXT NOT NULL,
    slot_id     TEXT NOT NULL,
    PRIMARY KEY (schedule_id, slot_id),
    UNIQUE (schedule_id), -- スタッフ枠1つに対し予約枠1つを物理保証
    FOREIGN KEY (schedule_id) REFERENCES staff_schedules(schedule_id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES slots(slot_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 5. 決済監査ログ (Gateway Isolation)
-- -------------------------------------------------------------------------
CREATE TABLE payment_gateway_logs (
    id                TEXT PRIMARY KEY, -- プロバイダー発行のイベントID
    provider          TEXT NOT NULL,    -- 発行元識別子
    type              TEXT NOT NULL,    -- イベント種別 (webhook.type)
    payload           TEXT NOT NULL,    -- 受信データ全文(JSON)
    webhook_signature TEXT,             -- 検証用署名
    created_at        INTEGER NOT NULL
);

CREATE TABLE processed_payment_events (
    event_id          TEXT PRIMARY KEY, -- gateway_logs.id と1対1
    payment_intent_id TEXT,
    slot_id           TEXT NOT NULL,
    event_status      TEXT NOT NULL 
        CHECK (event_status IN ('initiating', 'started', 'completed', 'failed')),
    error_log          TEXT,
    processed_at       INTEGER,
    FOREIGN KEY (event_id) REFERENCES payment_gateway_logs(id)
);

-- -------------------------------------------------------------------------
-- 6. パフォーマンス最適化 (Indexes)
-- -------------------------------------------------------------------------
CREATE INDEX idx_staffs_shop ON staffs (shop_id);
CREATE INDEX idx_plans_shop ON plans (shop_id, plan_status);
CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_schedules_lookup ON staff_schedules (staff_id, date_string, start_at_unix);
CREATE INDEX idx_slots_date_lookup ON slots (date_string, booking_status);
CREATE INDEX idx_slots_expiry ON slots (booking_status, expires_at);
CREATE INDEX idx_gateway_logs_lookup ON payment_gateway_logs (provider, type, created_at);