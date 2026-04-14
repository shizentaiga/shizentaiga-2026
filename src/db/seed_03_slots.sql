-- =========================================================================
-- seed_03_slots.sql (Booking Reservation Data) v3.0
-- [運用規約]
-- 1. べき等性の確保: 実行時に既存の slots を全削除する。
-- 2. グリッド占有: slots 登録と同時に reservation_grid への紐付けを行う。
-- 3. 整合性テスト: ここで予約されたチップに対し、別のslotを入れようとすると
--    UNIQUE制約エラーが発生することを確認する。
-- =========================================================================
-- [実行コマンド]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/seed_03_slots.sql
-- =========================================================================

PRAGMA foreign_keys = ON;

-- 既存の予約スロットをクリア（CASCADEによりreservation_gridもクリアされる）
DELETE FROM slots;

-- -------------------------------------------------------------------------
-- 1. slots (需要・証跡：Need) の登録
-- シチュエーション：2026/04/18 10:00-11:30 (90分) + 予備30分 = 合計4チップ占有
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
    actual_buffer_min,
    stripe_session_id,
    expires_at,
    created_at,
    updated_at
) VALUES (
    'slt_20260418_1000_consulting',
    'pln_consulting',
    'stf_shizentaiga',
    'test-user@example.com',
    'booked',
    '2026-04-18',
    unixepoch('2026-04-18 01:00:00'), -- JST 10:00
    unixepoch('2026-04-18 03:00:00'), -- JST 12:00 (90分施術 + 予備30分)
    49500,
    90,
    30,
    'cs_test_placeholder_123',
    NULL,
    unixepoch('2026-04-12 00:00:00'),
    unixepoch('2026-04-12 00:00:00')
);

-- -------------------------------------------------------------------------
-- 2. reservation_grid (物理占有) の登録
-- 予約した 10:00〜12:00 までのチップをすべてロックする
-- -------------------------------------------------------------------------

INSERT INTO reservation_grid (schedule_id, slot_id)
VALUES 
    ('grd_20260418_1000', 'slt_20260418_1000_consulting'),
    ('grd_20260418_1030', 'slt_20260418_1000_consulting'),
    ('grd_20260418_1100', 'slt_20260418_1000_consulting'),
    -- 下記は「片付け時間(buffer)」として占有されるチップ
    -- これにより、次の予約は 12:00 以降からしか入れなくなる
    ('grd_20260418_1130', 'slt_20260418_1000_consulting');

-- [補足]
-- シード seed_02_schedule.sql で 11:30 のチップ (grd_20260418_1130) を
-- 登録していない場合は、事前にそちらにレコードを追加しておく必要があります。