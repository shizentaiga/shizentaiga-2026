-- =========================================================================
-- seed_02_schedule.sql (Staff Availability Data) v2.7
-- [運用規約]
-- 1. べき等性の確保: 実行時に既存の staff_schedules を全削除し、最新の状態に置き換える。
-- 2. 時刻指定: unixepoch('YYYY-MM-DD HH:MM:SS') を使用。
--    SQLiteはUTCとして扱うため、JSTから9時間引いた時刻を記述する。
-- =========================================================================
-- [実行コマンド]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/seed_02_schedule.sql
-- =========================================================================

PRAGMA foreign_keys = ON;

-- 既存の稼働予定をクリア（デバッグ・最新反映用）
DELETE FROM staff_schedules;

-- -------------------------------------------------------------------------
-- staff_schedules (供給：Supply) の登録
-- staff_id: 'stf_shizentaiga' (seed_01で定義済み)
-- -------------------------------------------------------------------------

INSERT INTO staff_schedules (
    schedule_id, 
    staff_id, 
    date_string, 
    start_at_unix, 
    end_at_unix, 
    created_at
) VALUES 
-- 4/18 10:00-13:00 (JST)
(
    'sch_20260418_01',
    'stf_shizentaiga',
    '2026-04-18',
    unixepoch('2026-04-18 01:00:00'), -- UTC (JST 10:00)
    unixepoch('2026-04-18 04:00:00'), -- UTC (JST 13:00)
    unixepoch('2026-04-11 03:00:00')
),
-- 4/25 10:00-13:00 (JST)
(
    'sch_20260425_01',
    'stf_shizentaiga',
    '2026-04-25',
    unixepoch('2026-04-25 01:00:00'), -- UTC (JST 10:00)
    unixepoch('2026-04-25 04:00:00'), -- UTC (JST 13:00)
    unixepoch('2026-04-11 03:00:00')
),
-- 5/12 10:00-18:00 (JST)
(
    'sch_20260512_01',
    'stf_shizentaiga',
    '2026-05-12',
    unixepoch('2026-05-12 01:00:00'), -- UTC (JST 10:00)
    unixepoch('2026-05-12 09:00:00'), -- UTC (JST 18:00)
    unixepoch('2026-04-11 03:00:00')
),
-- 5/16 11:00-17:00 (JST)
(
    'sch_20260516_01',
    'stf_shizentaiga',
    '2026-05-16',
    unixepoch('2026-05-16 02:00:00'), -- UTC (JST 11:00)
    unixepoch('2026-05-16 08:00:00'), -- UTC (JST 17:00)
    unixepoch('2026-04-11 03:00:00')
);