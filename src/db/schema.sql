-- =========================================================================
-- 04_DATABASE_SCHEMA v2.5 (High-Observability & Professional Model)
-- =========================================================================
-- [開発者向け運用・実装プロトコル]
-- 1. 整合性保護: Cloudflare D1環境では、接続ごとに PRAGMA foreign_keys = ON; 
--    を明示実行してください。親レコード削除時は CASCADE (連鎖削除) を基本とします。
-- 2. 時刻管理: SQLiteは updated_at を自動更新しません。アプリケーション層にて
--    INSERT/UPDATE 時に必ず Unix Timestamp (10桁整数) をセットしてください。
-- 3. 決済の信頼性: processed_events テーブルを用いて、決済開始から完了までの
--    ライフサイクルを全記録します。Stripe Webhook の重複到達は一意制約で防御します。
-- 4. 証跡の永続性: 過去の予約データとの整合性を保つため、plans は物理削除せず
--    status='archived' による論理削除（無効化）運用を徹底してください。
-- 5. 並行施術の許容: staff_schedules は時間の重複登録を仕様として許可します。
--    1名のスタッフが同時間帯に複数の施術（カラー放置中のカット等）を行う
--    「同時並行在庫」の計算ロジックをアプリケーション側で実装してください。
-- =========================================================================
-- [実行・管理コマンド]
-- DB構築: npx wrangler d1 execute shizentaiga_db --local --file=./src/db/schema.sql
-- 一覧確認: .tables / 構造確認: .schema <table_name>
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
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- スタッフマスタ：店舗に所属する施術者
CREATE TABLE staffs (
    staff_id     TEXT PRIMARY KEY,
    shop_id      TEXT NOT NULL,
    real_name    TEXT NOT NULL,       -- 管理用（本名）
    display_name TEXT NOT NULL,       -- 予約画面表示用
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    -- 店舗削除時は関連スタッフも一括削除（孤立レコード防止）
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- サービスプランマスタ
-- status管理により、将来的な価格改定や廃止時も過去の予約証跡（slots）を壊さず運用可能。
CREATE TABLE plans (
    plan_id      TEXT PRIMARY KEY,
    shop_id      TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT,              -- ★追加：プランの補足説明文
    duration_min INTEGER NOT NULL,
    price_amount INTEGER NOT NULL,
    -- draft:編集、active:公開、hidden:URL限定、inactive:停止、archived:廃止
    status       TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('draft', 'active', 'hidden', 'inactive', 'archived')),
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 2. 稼働・予約テーブル群（Transactions）
-- -------------------------------------------------------------------------

-- スタッフ稼働枠（供給：Supply）
-- 重複登録を許容することで、美容業界特有の「同時並行施術」や「複雑なシフト」に対応。
CREATE TABLE staff_schedules (
    schedule_id   TEXT PRIMARY KEY,
    staff_id      TEXT NOT NULL,
    date_string   TEXT NOT NULL,      -- JST: 'YYYY-MM-DD'（日付検索最適化）
    start_at_unix INTEGER NOT NULL,   -- 施術開始可能時刻 (UnixTime)
    end_at_unix   INTEGER NOT NULL,   -- 施術終了可能時刻 (UnixTime)
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

-- 予約本体（需要・証跡：Need）
-- 予約成立時の金額(actual_price)・時間(actual_duration)を保持し、マスタ変更後のトラブルを防止。
CREATE TABLE slots (
    slot_id           TEXT PRIMARY KEY,
    plan_id           TEXT NOT NULL,
    staff_id          TEXT NOT NULL,
    user_email        TEXT,
    status            TEXT NOT NULL CHECK (status IN ('pending', 'booked', 'cancelled', 'error')),
    start_at_unix     INTEGER NOT NULL,
    end_at_unix       INTEGER NOT NULL,
    actual_price      INTEGER NOT NULL, 
    actual_duration   INTEGER NOT NULL, 
    stripe_session_id TEXT,             -- Webhook照合およびStripeへのステータス照会キー
    expires_at        INTEGER,          -- 仮確保（pending）の有効期限。期限切れは在庫に戻す。
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
    FOREIGN KEY (staff_id) REFERENCES staffs(staff_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 3. 信頼性テーブル（Observability & Lifecycle Log）
-- -------------------------------------------------------------------------

-- べき等性・プロセス管理テーブル
-- Stripeとの通信開始前からログを開始。通信障害やWebhook不達時の「沈黙の失敗」を可視化する。
CREATE TABLE processed_events (
    event_id          TEXT PRIMARY KEY,  -- 自社発行の処理ID。決済ボタン押下時に先行発行。
    stripe_session_id TEXT,              -- StripeセッションID。通信成功時のみ記録。
    slot_id           TEXT NOT NULL,     -- 紐づく予約レコード。障害時のリカバリ起点。
    status            TEXT NOT NULL      -- initiating(開始), started(受信), completed(完了), failed(異常)
        CHECK (status IN ('initiating', 'started', 'completed', 'failed')),
    created_at        INTEGER NOT NULL,  -- ログ生成時刻（ユーザーのアクション開始）
    processed_at      INTEGER,           -- 最終状態の確定時刻
    error_log         TEXT,              -- スタックトレースやAPIエラー内容。
    provider          TEXT DEFAULT 'stripe'
);

-- -------------------------------------------------------------------------
-- 4. インデックス設計（Optimization）
-- -------------------------------------------------------------------------

-- マスタ・稼働状況検索の高速化
CREATE INDEX idx_staffs_shop ON staffs (shop_id);
CREATE INDEX idx_plans_shop ON plans (shop_id, status);
CREATE INDEX idx_schedules_date ON staff_schedules (staff_id, date_string);

-- 予約在庫計算の最速化（並行予約チェック用）
CREATE INDEX idx_slots_lookup ON slots (staff_id, start_at_unix, status);

-- 仮確保(pending)枠のクリーンアップ巡回用
CREATE INDEX idx_slots_expiry ON slots (status, expires_at);

-- Stripe Session ID からの予約特定（Webhook処理用）
CREATE INDEX idx_slots_stripe_session ON slots (stripe_session_id);

-- 障害解析・プロセス監視用
CREATE INDEX idx_processed_slot_lookup ON processed_events (slot_id);
CREATE INDEX idx_processed_status_at ON processed_events (status, created_at);