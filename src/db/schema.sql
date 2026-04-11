-- =========================================================================
-- 04_DATABASE_SCHEMA v2.7 (High-Observability & Professional Model)
-- =========================================================================
-- [開発者向け運用・実装プロトコル]
-- 1. 整合性保護: Cloudflare D1環境では、接続ごとに PRAGMA foreign_keys = ON; 
--    を明示実行してください。親レコード削除時は CASCADE (連鎖削除) を基本とします。
-- 2. 時刻管理: SQLiteは updated_at を自動更新しません。アプリケーション層にて
--    INSERT/UPDATE 時に必ず Unix Timestamp (10桁整数) をセットしてください。
-- 3. 決済の信頼性: processed_events テーブルを用いて、決済開始から完了までの
--    ライフサイクルを全記録します。Stripe Webhook の重複到達は一意制約で防御します。
-- 4. 証跡の永続性: 過去の予約データとの整合性を保つため、plans は物理削除せず
--    plan_status='archived' による論理削除（無効化）運用を徹底してください。
-- 5. 並行施術の許容: staff_schedules は時間の重複登録を仕様として許可します。
--    1名のスタッフが同時間帯に複数の施術を行う「同時並行在庫」をアプリ側で実装。
-- 6. 命名の厳密性: JOIN時の衝突を避けるため、nameやstatus等の汎用的なカラム名は
--    テーブル名をプレフィックスとして付与し、一意性を確保しています。
-- =========================================================================
-- [実行・管理コマンド]
-- DB構築: npx wrangler d1 execute shizentaiga_db --local --file=./src/db/schema.sql
-- =========================================================================

-- 既存テーブルのクリーンアップ（依存関係順）
DROP TABLE IF EXISTS slots;
DROP TABLE IF EXISTS staff_schedules;
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS staffs;
DROP TABLE IF EXISTS shops;

-- -------------------------------------------------------------------------
-- 1. マスタテーブル群（Foundation）
-- -------------------------------------------------------------------------

-- 店舗マスタ：サービス提供の最小単位
CREATE TABLE shops (
    shop_id    TEXT PRIMARY KEY,
    shop_name  TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- スタッフマスタ：店舗に所属する施術者
CREATE TABLE staffs (
    staff_id           TEXT PRIMARY KEY,
    shop_id            TEXT NOT NULL,
    real_name          TEXT NOT NULL,       -- 管理用（本名）
    staff_display_name TEXT NOT NULL,       -- 予約画面表示用
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- サービスプランマスタ
CREATE TABLE plans (
    plan_id          TEXT PRIMARY KEY,
    shop_id          TEXT NOT NULL,
    plan_name        TEXT NOT NULL,
    description      TEXT,
    duration_min     INTEGER NOT NULL,
    price_amount     INTEGER NOT NULL,
    -- draft:編集、active:公開、hidden:URL限定、inactive:停止、archived:廃止
    plan_status      TEXT NOT NULL DEFAULT 'active' 
        CHECK (plan_status IN ('draft', 'active', 'hidden', 'inactive', 'archived')),
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL,
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
    start_at_unix INTEGER NOT NULL,   -- 施術開始可能時刻 (UnixTime)
    end_at_unix   INTEGER NOT NULL,   -- 施術終了可能時刻 (UnixTime)
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

-- 予約本体（需要・証跡：Need）
CREATE TABLE slots (
    slot_id              TEXT PRIMARY KEY,
    plan_id              TEXT NOT NULL,
    staff_id             TEXT NOT NULL,
    user_email           TEXT,
    -- 予約ステータス: pending(仮確保), booked(確定), cancelled(取消), error(異常)
    booking_status       TEXT NOT NULL 
        CHECK (booking_status IN ('pending', 'booked', 'cancelled', 'error')),
    date_string          TEXT NOT NULL,      -- JST: 'YYYY-MM-DD'（カレンダー表示高速化用）
    start_at_unix        INTEGER NOT NULL,
    end_at_unix          INTEGER NOT NULL,
    actual_price_amount  INTEGER NOT NULL,   -- 予約時点の金額を固定保存
    actual_duration_min  INTEGER NOT NULL,   -- 予約時点の所要時間を固定保存
    stripe_session_id    TEXT,
    expires_at           INTEGER,            -- pendingの有効期限
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 3. 信頼性テーブル（Observability & Lifecycle Log）
-- -------------------------------------------------------------------------

-- べき等性・プロセス管理テーブル
CREATE TABLE processed_events (
    event_id          TEXT PRIMARY KEY,  -- evt_...
    stripe_session_id TEXT,
    slot_id           TEXT NOT NULL,
    event_status      TEXT NOT NULL      -- initiating, started, completed, failed
        CHECK (event_status IN ('initiating', 'started', 'completed', 'failed')),
    created_at        INTEGER NOT NULL,
    processed_at      INTEGER,
    error_log         TEXT,
    provider          TEXT DEFAULT 'stripe'
);

-- -------------------------------------------------------------------------
-- 4. インデックス設計（Optimization）
-- -------------------------------------------------------------------------

CREATE INDEX idx_staffs_shop ON staffs (shop_id);
CREATE INDEX idx_plans_shop ON plans (shop_id, plan_status);
CREATE INDEX idx_schedules_date ON staff_schedules (staff_id, date_string);

-- カレンダー表示および在庫計算の最適化
CREATE INDEX idx_slots_date_lookup ON slots (date_string, booking_status);
CREATE INDEX idx_slots_staff_time ON slots (staff_id, start_at_unix, booking_status);

-- 仮確保(pending)枠のクリーンアップ巡回用
CREATE INDEX idx_slots_expiry ON slots (booking_status, expires_at);

-- Stripe Session ID からの予約特定（Webhook用）
CREATE INDEX idx_slots_stripe_session ON slots (stripe_session_id);

-- 障害解析用
CREATE INDEX idx_processed_slot_lookup ON processed_events (slot_id);