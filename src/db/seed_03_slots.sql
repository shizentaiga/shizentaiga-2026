-- =========================================================================
-- seed_03_slots.sql (Booking Reservation Data) v2.7
-- [運用規約]
-- 1. べき等性の確保: 実行時に既存の slots を全削除し、特定のデバッグ状態を再現する。
-- 2. 時刻指定: JSTから9時間引いたUTC時刻を unixepoch() で指定。
-- 3. 固定値の保存: actual_... カラムには、予約時のプラン情報をそのままコピーする。
-- =========================================================================
-- [実行コマンド]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/seed_03_slots.sql
-- =========================================================================

PRAGMA foreign_keys = ON;

-- 既存の予約スロットをクリア（デバッグ用）
DELETE FROM slots;

-- -------------------------------------------------------------------------
-- slots (需要・証跡：Need) の登録
-- シチュエーション：2026/04/18 11:00-12:30 の 90分枠が予約確定(booked)済み
-- -------------------------------------------------------------------------

INSERT INTO slots (
    slot_id,
    plan_id,
    staff_id,
    user_email,
    booking_status,
    date_string,
    start_at_unix,
    end_at_unix,
    actual_price_amount,
    actual_duration_min,
    stripe_session_id,
    expires_at,
    created_at,
    updated_at
) VALUES (
    'slt_20260418_1100_consulting', -- 可読性の高いID
    'pln_consulting',               -- 経営コンサルティング
    'stf_shizentaiga',             -- 清善 泰賀
    'test-user@example.com',        -- デバッグ用ユーザー
    'booked',                       -- 予約確定状態
    '2026-04-18',                   -- JST日付
    unixepoch('2026-04-18 02:00:00'), -- JST 11:00 (UTC 02:00)
    unixepoch('2026-04-18 03:30:00'), -- JST 12:30 (UTC 03:30)
    49500,                          -- プランからコピー
    90,                             -- プランからコピー
    'cs_test_placeholder_123',      -- ダミーのStripe Session ID
    NULL,                           -- bookedのため期限なし
    unixepoch('2026-04-12 00:00:00'), -- 予約操作が行われた時刻
    unixepoch('2026-04-12 00:00:00')
);