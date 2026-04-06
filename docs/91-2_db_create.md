# 91-2_temp.md：データ層の構築（実装手順書）v1.8.1

---

## 1. D1 テーブルの初期化とシードデータの投入

ローカル環境の D1 データベースを準備し、検証用の動的データを投入します。

---

### 1.0 SQLファイル作成 (`src/db/schema.sql`)

以下の DDL を実行し、予約管理の基盤となるテーブルとインデックスを作成します。

~~~sql
-- メインテーブル
CREATE TABLE IF NOT EXISTS slots (
    tenant_id     TEXT    NOT NULL,
    id            TEXT    PRIMARY KEY,
    date_string   TEXT    NOT NULL,
    start_at_unix INTEGER NOT NULL,
    slot_duration INTEGER NOT NULL,
    status        TEXT    NOT NULL CHECK (status IN ('available', 'pending', 'booked', 'error')),
    expires_at    INTEGER,
    retry_count   INTEGER DEFAULT 0,
    last_retry_at INTEGER,
    updated_at    INTEGER NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_slots_tenant_date
    ON slots (tenant_id, date_string);

CREATE INDEX IF NOT EXISTS idx_slots_status_expires
    ON slots (status, expires_at);

-- 冪等性テーブル
CREATE TABLE IF NOT EXISTS processed_events (
    event_id     TEXT    PRIMARY KEY,
    tenant_id    TEXT    NOT NULL,
    processed_at INTEGER NOT NULL
);
~~~

**設計補足**

| 定義 | 目的 |
|---|---|
| `status CHECK (status IN (...))` | typo 等の不正値をDB層で物理的に阻止 |
| `idx_slots_tenant_date` | 「今日の予約」を大量データから高速抽出 |
| `processed_events` | 決済通知の二重処理を完全封鎖 |

---

### 1.1 テーブル作成の実行

~~~sh
npx wrangler d1 execute <DATABASE_NAME> --local --file=./src/db/schema.sql
~~~

---

### 1.2 検証用データの投入 (`src/db/seeds.sql`)

固定値ではなく SQLite 関数を用いて、実行時に即したデータを生成します。

~~~sql
INSERT INTO slots (tenant_id, id, date_string, start_at_unix, slot_duration, status, updated_at)
VALUES (
    'taiga_shizen',
    'slot_001',
    strftime('%Y-%m-%d', 'now', 'localtime'),
    unixepoch() + 86400,
    60,
    'available',
    unixepoch()
);
~~~

~~~sh
npx wrangler d1 execute <DATABASE_NAME> --local --file=./src/db/seeds.sql
~~~

---

## 2. データベース操作ロジックの実装 (`src/db/queries.ts`)

---

### 2.1 実装規約：時刻の精度管理

| 層 | 規約 |
|---|---|
| JavaScript側 | `Math.floor(Date.now() / 1000)` — 必ず10桁（秒単位） |
| DB側 | ミリ秒（13桁）混入を厳禁。比較演算の不整合を防止 |

---

### 2.2 予約枠の取得 (`getSlots`)

~~~sql
WHERE tenant_id = ? AND date_string = ?
ORDER BY start_at_unix ASC
~~~

---

### 2.3 アトミックな仮確保 (`tryLockSlot`)

~~~sql
UPDATE slots
SET status = 'pending', expires_at = ?, updated_at = ?
WHERE id = ? AND tenant_id = ? AND status = 'available'
~~~

`meta.changes === 1` の場合のみ成功と判定。それ以外は競合エラーとして処理。

---

## 3. 実装検証：同時アクセス・シミュレーション

ターミナルを2枚使用し、マルチテナント制約下での排他制御を確認します。

---

### 3.1 正常系の確認（ターミナル1）

~~~sql
UPDATE slots
SET status = 'pending', expires_at = unixepoch() + 2100, updated_at = unixepoch()
WHERE id = 'slot_001' AND tenant_id = 'taiga_shizen' AND status = 'available';
~~~

`1 row updated` の表示を確認。

---

### 3.2 競合の確認（ターミナル2）

ターミナル1の成功直後に同一 SQL を実行。

**期待結果**: `0 rows updated`  
→ `status` が既に `pending` のため、`WHERE status = 'available'` 条件により自動的に弾かれることを確認。

---

## 4. 次のアクション

- [ ] `src/db/schema.sql` の実行とテーブル生成
- [ ] `src/db/queries.ts` にアトミック更新ロジックをコーディング
- [ ] ターミナルによる `unixepoch()` を用いた手動 SQL 検証
