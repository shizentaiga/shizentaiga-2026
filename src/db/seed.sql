-- ==========================================
-- SEED DATA (Aletheia Core - Initial Slots)
-- ==========================================
-- [実行コマンド(ローカル)]
-- npx wrangler d1 execute shizentaiga_db --local --file=./src/db/seed.sql
-- [実行コマンド(本番)]
-- npx wrangler d1 execute shizentaiga_db --remote --file=./src/db/seed.sql
-- ==========================================

-- 既存のテストデータをクリア（冪等性の確保）
-- 開発中に何度も実行できるよう、一度削除してから挿入するスタイルを推奨
DELETE FROM slots WHERE tenant_id = 'tenant_shizentaiga';

-- 予約枠の投入
-- IDはULIDの代わりにテストで見分けやすい固定値を付与
-- start_at_unix は unixepoch() 関数を使用して、JST（日本標準時）から自動計算
-- created_at / updated_at は 2026-04-08 12:00:00 JST を基準値として一括設定

INSERT INTO slots (
    tenant_id,
    id,
    service_id,
    staff_id,
    date_string,
    start_at_unix,
    slot_duration,
    status,
    created_at,
    updated_at
) VALUES 
-- 2026-04-18 10:00 - 13:00 (180分)
(
    'tenant_shizentaiga', 
    'slot_20260418_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-04-18', 
    unixepoch('2026-04-18 10:00:00', '+09:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 12:00:00', '+09:00'), 
    unixepoch('2026-04-08 12:00:00', '+09:00')
),
-- 2026-04-25 10:00 - 13:00
(
    'tenant_shizentaiga', 
    'slot_20260425_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-04-25', 
    unixepoch('2026-04-25 10:00:00', '+09:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 12:00:00', '+09:00'), 
    unixepoch('2026-04-08 12:00:00', '+09:00')
),
-- 2026-05-09 10:00 - 13:00
(
    'tenant_shizentaiga', 
    'slot_20260509_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-05-09', 
    unixepoch('2026-05-09 10:00:00', '+09:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 12:00:00', '+09:00'), 
    unixepoch('2026-04-08 12:00:00', '+09:00')
),
-- 2026-05-23 10:00 - 13:00
(
    'tenant_shizentaiga', 
    'slot_20260523_1000', 
    'plan_consult_180', 
    'staff_shizentaiga', 
    '2026-05-23', 
    unixepoch('2026-05-23 10:00:00', '+09:00'), 
    180, 
    'available', 
    unixepoch('2026-04-08 12:00:00', '+09:00'), 
    unixepoch('2026-04-08 12:00:00', '+09:00')
);