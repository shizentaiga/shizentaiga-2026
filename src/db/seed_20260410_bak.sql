-- ==========================================
-- SEED DATA (Initial Slots)
-- ==========================================
-- [実行コマンド(ローカル)]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/seed_local.sql
-- [実行コマンド(本番)]
-- npx wrangler d1 execute shizentaiga_db --remote --file=./src/db/seed.sql
-- [チェック方法(ローカル)]
--  npx wrangler d1 execute shizentaiga_db --local --command="SELECT start_at_unix FROM slots LIMIT 1;"
-- ==========================================

-- 既存のテストデータをクリア（冪等性の確保）
-- 開発中に何度も実行できるよう、一度削除してから挿入するスタイルを推奨
DELETE FROM slots WHERE tenant_id = 'tenant_shizentaiga';

-- 予約枠の投入
-- IDはULIDの代わりにテストで見分けやすい固定値を付与
-- 【重要：時刻計算の根本解決】
-- unixepoch('YYYY-MM-DD HH:MM:SS') は引数をUTCとして扱います。
-- 日本時間(JST)の10:00は、UTCでは「01:00」です。
-- 直接UTC時刻を渡すことで、SQLiteの内部計算による時差バグを物理的に排除します。

INSERT INTO slots (
    tenant_id,      -- 事業者識別子
    id,             -- 一意のID（可読性重視）
    service_id,     -- サービスプランID
    staff_id,       -- 担当者識別子
    date_string,    -- 検索用日付文字列（JST固定）
    start_at_unix,  -- 予約開始時間（10桁 Unix Timestamp）
    slot_duration,  -- 枠の長さ（分単位）
    status,         -- 状態（available/pending/booked/error）
    created_at,     -- レコード作成日時
    updated_at      -- 最終更新日時
) VALUES 
-- 2026-04-18 10:00 - 13:00 (180分)
-- 日本時間 10:00 = UTC 01:00
(
    'tenant_shizentaiga', 
    'slot_20260418_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-04-18', 
    unixepoch('2026-04-18 01:00:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 03:00:00'), -- JST 12:00
    unixepoch('2026-04-08 03:00:00')
),
-- 2026-04-25 10:00 - 13:00
-- 日本時間 10:00 = UTC 01:00
(
    'tenant_shizentaiga', 
    'slot_20260425_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-04-25', 
    unixepoch('2026-04-25 01:00:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 04:00:00'), -- JST 13:00
    unixepoch('2026-04-08 04:00:00')
),
-- 2026-05-09 10:00 - 13:00
-- 日本時間 10:00 = UTC 01:00
(
    'tenant_shizentaiga', 
    'slot_20260509_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-05-09', 
    unixepoch('2026-05-09 01:00:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 05:00:00'), -- JST 14:00
    unixepoch('2026-04-08 05:00:00')
),
-- 2026-05-23 10:00 - 13:00
-- 日本時間 10:00 = UTC 01:00
(
    'tenant_shizentaiga', 
    'slot_20260523_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-05-23', 
    unixepoch('2026-05-23 01:00:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 06:00:00'), -- JST 15:00
    unixepoch('2026-04-08 06:00:00')
);