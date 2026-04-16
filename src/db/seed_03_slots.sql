-- =========================================================================
-- [実行コマンド]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/seed_03_slots.sql
-- =========================================================================

-- =========================================================================
-- [SEED v4.3] Booking Reservation Data (Atomic-Grid Demand)
-- =========================================================================
-- [運用規約]
-- 1. べき等性の確保: 実行時に既存の slots を全削除する。
--    ※ CASCADEにより reservation_grid も自動的にクリアされる。
-- 2. グリッド占有: slots 登録と同時に reservation_grid への紐付けを必須とする。
-- 3. Agnostic-Payment: Stripe等の特定サービスに依存しないカラム名を使用。
-- =========================================================================

PRAGMA foreign_keys = ON;

-- 既存の予約データをクリア
DELETE FROM slots;

-- -------------------------------------------------------------------------
-- 1. slots (需要・証跡：Need) の登録
-- シチュエーション：2026/04/18 10:00-11:30 (90分) + 予備30分 = 合計4チップ占有
-- -------------------------------------------------------------------------
INSERT INTO slots (
    slot_id,
    plan_id,
    staff_id,
    customer_id,        -- NULL の場合はゲスト予約
    user_email,
    booking_status,
    date_string,
    start_at_unix,
    end_at_unix,
    actual_price_amount,
    actual_duration_min,
    actual_buffer_min,
    payment_intent_id,  -- 抽象化された決済ID
    payment_provider,   -- 決済プロバイダー識別子
    expires_at,
    created_at,
    updated_at
) VALUES (
    'slt_20260418_1000_consulting',
    'pln_consulting',
    'stf_shizentaiga',
    NULL,               -- 未ログイン/ゲスト
    'test-user@example.com',
    'booked',           -- 確定済み
    '2026-04-18',
    unixepoch('2026-04-18 01:00:00'), -- JST 10:00
    unixepoch('2026-04-18 03:00:00'), -- JST 12:00 (90分 + 30分)
    49500,
    90,
    30,
    'pi_test_placeholder_789',       -- Agnostic ID
    'stripe',                        -- Provider
    NULL,                            -- 確定済みのため期限なし
    unixepoch('2026-04-16 00:00:00'),
    unixepoch('2026-04-16 00:00:00')
);

-- -------------------------------------------------------------------------
-- 2. reservation_grid (物理占有) の登録
-- 10:00〜12:00 までのチップ（合計4つ）をロック
-- -------------------------------------------------------------------------
INSERT INTO reservation_grid (schedule_id, slot_id)
VALUES 
    ('grd_20260418_1000', 'slt_20260418_1000_consulting'),
    ('grd_20260418_1030', 'slt_20260418_1000_consulting'),
    ('grd_20260418_1100', 'slt_20260418_1000_consulting'),
    -- 下記のチップまで占有することで、次の予約は 12:00 以降からしか受け付けない
    ('grd_20260418_1130', 'slt_20260418_1000_consulting');

-- -------------------------------------------------------------------------
-- [検証用メモ]
-- このシード実行後、以下のSQLを実行してエラー（UNIQUE制約違反）が出れば、
-- 清善さんの設計した「二重予約防止エンジン」が正常に機能している証拠です。
--
-- INSERT INTO reservation_grid (schedule_id, slot_id) 
-- VALUES ('grd_20260418_1000', 'another_slot_id');
-- -------------------------------------------------------------------------