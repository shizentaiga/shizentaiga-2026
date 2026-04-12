-- =========================================================================
-- 04_DATABASE_SCHEMA v3.0 (Grid-Atomic & Global Scale Model)
-- =========================================================================
-- [開発者向け運用・実装プロトコル]
-- 1. 整合性保護: Cloudflare D1環境では、接続ごとに PRAGMA foreign_keys = ON; を実行。
-- 2. チップ化: staff_schedules は 30分単位の最小単位レコードとして保持。
-- 3. 物理排他: reservation_grid テーブルの一意制約でダブルブッキングを防御。
-- =========================================================================

-- 既存テーブルのクリーンアップ
DROP TABLE IF EXISTS reservation_grid;
DROP TABLE IF EXISTS slots;
DROP TABLE IF EXISTS staff_schedules;
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS staffs;
DROP TABLE IF EXISTS shops;

-- 1. マスタテーブル
CREATE TABLE shops (
    shop_id    TEXT PRIMARY KEY,
    shop_name  TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE staffs (
    staff_id            TEXT PRIMARY KEY,
    shop_id             TEXT NOT NULL,
    real_name           TEXT NOT NULL,
    staff_display_name  TEXT NOT NULL,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

CREATE TABLE plans (
    plan_id          TEXT PRIMARY KEY,
    shop_id          TEXT NOT NULL,
    plan_name        TEXT NOT NULL,
    description      TEXT,
    duration_min     INTEGER NOT NULL,
    buffer_min       INTEGER NOT NULL DEFAULT 30, -- ★ここが Seed 成功に必要
    price_amount     INTEGER NOT NULL,
    plan_status      TEXT NOT NULL DEFAULT 'active' 
        CHECK (plan_status IN ('draft', 'active', 'hidden', 'inactive', 'archived')),
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- 2. 稼働・予約（Grid Model）
CREATE TABLE staff_schedules (
    schedule_id   TEXT PRIMARY KEY,
    staff_id      TEXT NOT NULL,
    date_string   TEXT NOT NULL,
    start_at_unix INTEGER NOT NULL,
    grid_size_min INTEGER NOT NULL DEFAULT 30,
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

CREATE TABLE slots (
    slot_id              TEXT PRIMARY KEY,
    plan_id              TEXT NOT NULL,
    staff_id             TEXT NOT NULL,
    user_email           TEXT,
    booking_status       TEXT NOT NULL 
        CHECK (booking_status IN ('pending', 'booked', 'cancelled', 'error')),
    date_string          TEXT NOT NULL, 
    start_at_unix        INTEGER NOT NULL,
    end_at_unix          INTEGER NOT NULL,
    actual_price_amount  INTEGER NOT NULL,
    actual_duration_min  INTEGER NOT NULL,
    actual_buffer_min    INTEGER NOT NULL,
    stripe_session_id    TEXT,
    expires_at           INTEGER,
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

-- ★物理的な重複防止テーブル
CREATE TABLE reservation_grid (
    schedule_id TEXT NOT NULL,
    slot_id     TEXT NOT NULL,
    PRIMARY KEY (schedule_id, slot_id),
    UNIQUE (schedule_id), 
    FOREIGN KEY (schedule_id) REFERENCES staff_schedules(schedule_id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES slots(slot_id) ON DELETE CASCADE
);

-- 3. 信頼性テーブル
CREATE TABLE processed_events (
    event_id          TEXT PRIMARY KEY,
    stripe_session_id TEXT,
    slot_id           TEXT NOT NULL,
    event_status      TEXT NOT NULL 
        CHECK (event_status IN ('initiating', 'started', 'completed', 'failed')),
    created_at        INTEGER NOT NULL,
    processed_at      INTEGER,
    error_log         TEXT,
    provider          TEXT DEFAULT 'stripe'
);

-- 4. インデックス
CREATE INDEX idx_staffs_shop ON staffs (shop_id);
CREATE INDEX idx_plans_shop ON plans (shop_id, plan_status);
CREATE INDEX idx_schedules_lookup ON staff_schedules (staff_id, date_string, start_at_unix);
CREATE INDEX idx_slots_date_lookup ON slots (date_string, booking_status);
CREATE INDEX idx_slots_expiry ON slots (booking_status, expires_at);