# 04_データベーススキーマ設計書 (Database Schema Design) v1.4

本ドキュメントは、Cloudflare D1 (SQLite) におけるテーブル定義およびインデックス戦略を定義する。
「Aletheia Core v1.8」の整合性ロジックに基づき、高速なカレンダー検索と堅牢な決済状態管理を両立させる。

---

## 1. データベース基本情報
- **論理名**: Shizentaiga Database
- **物理名**: shizentaiga-db
- **プラットフォーム**: Cloudflare D1 (SQLite)
- **リスク管理**: 本番環境 (aletheia-db) と名称を分離し、誤操作によるデータ消失を防止する。

---

## 2. 環境構築プロトコル
以下の手順で、設計したスキーマを物理データベースへ反映する。

### 2.1 D1 インスタンスの作成 (初回のみ)
npx wrangler d1 create shizentaiga-db

### 2.2 wrangler.toml への紐付け
[[d1_databases]]
binding = "DB"
database_name = "shizentaiga-db"
database_id = "xxxx-xxxx-xxxx-xxxx" # createコマンドで発行されたIDを記載

### 2.3 スキーマの適用 (実行コマンド)
-- ローカル環境への適用
npx wrangler d1 execute shizentaiga-db --local --file=./src/db/schema.sql

-- 本番環境への適用
npx wrangler d1 execute shizentaiga-db --remote --file=./src/db/schema.sql

---

## 3. テーブル定義 (Table Definitions)

### 3.1 slots (予約枠・在庫管理)
| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| **tenant_id** | TEXT | NOT NULL | 事業者識別子 |
| **id** | TEXT | PRIMARY KEY | 枠の一意識別子 (ULID推奨) |
| **date_string** | TEXT | NOT NULL | 検索用日付 (JST: 'YYYY-MM-DD') |
| **start_at_unix** | INTEGER | NOT NULL | 開始時刻 (10桁 Unix Timestamp) |
| **slot_duration** | INTEGER | NOT NULL | 枠の長さ (分単位) |
| **status** | TEXT | NOT NULL | 状態 (available/pending/booked/error) |
| **expires_at** | INTEGER | | 仮確保の期限 (10桁 Unix Timestamp) |
| **retry_count** | INTEGER | DEFAULT 0 | 自動照合の失敗回数 |
| **last_retry_at** | INTEGER | | 最終照合時刻 (10桁 Unix Timestamp) |
| **updated_at** | INTEGER | NOT NULL | 最終更新時刻 (10桁 Unix Timestamp) |

---

## 4. SQL 実装コード (src/db/schema.sql)

```sql
-- 予約枠管理テーブル
-- status に CHECK 制約を設け、アプリケーション層の typo による不正データ混入を防止する
CREATE TABLE IF NOT EXISTS slots (
    tenant_id     TEXT    NOT NULL,        -- テナントID
    id            TEXT    PRIMARY KEY,     -- 枠ID (ULID)
    date_string   TEXT    NOT NULL,        -- 検索用日付文字列
    start_at_unix INTEGER NOT NULL,        -- 開始時刻（秒単位）
    slot_duration INTEGER NOT NULL,        -- 所要時間（分）
    status        TEXT    NOT NULL         -- 状態管理
        CHECK (status IN ('available', 'pending', 'booked', 'error')),
    expires_at    INTEGER,                 -- 仮確保有効期限（秒単位）
    retry_count   INTEGER DEFAULT 0,       -- 照合リトライ数
    last_retry_at INTEGER,                 -- 最終照合時刻（秒単位）
    updated_at    INTEGER NOT NULL         -- 最終更新時刻（秒単位）
);

-- 特定テナントの特定日の枠を高速抽出するための複合インデックス
CREATE INDEX IF NOT EXISTS idx_slots_tenant_date 
    ON slots (tenant_id, date_string);

-- 期限切れの pending 枠を効率的に抽出するためのインデックス
CREATE INDEX IF NOT EXISTS idx_slots_status_expires 
    ON slots (status, expires_at);

-- 決済の二重処理を防止するべき等性管理テーブル
CREATE TABLE IF NOT EXISTS processed_events (
    event_id     TEXT    PRIMARY KEY,      -- Stripe イベントID (evt_...)
    tenant_id    TEXT    NOT NULL,         -- テナントID
    processed_at INTEGER NOT NULL          -- 処理日時（秒単位）
);


## 5. 運用および実装上の留意事項

### 5.1 タイムゾーンと精度の厳守
- **JST日付**: `date_string` は常に **Asia/Tokyo** 基準の文字列で保存する。
- **10桁統一**: 時刻データはすべて **秒単位(10桁)** で統一し、ミリ秒(13桁)を混入させない。
- **生成式**: `Math.floor(Date.now() / 1000)` を実装規約とする。

### 5.2 アトミック更新 (二重予約防止)
在庫確保時は、必ず `WHERE status = 'available'` 条件を含めた `UPDATE` 文を実行し、DBレベルでの競合排除を行う。

### 5.3 運用保守ロードマップ（将来的な最適化）
- **容量節約**: `processed_events` は決済数に応じて肥大化するため、将来的に「3ヶ月以上前の古いログを削除する」クリーンアップ・ジョブの導入を検討すること。
- **性能監視**: 検索パフォーマンスが低下した場合は、`EXPLAIN QUERY PLAN` コマンドを実行し、定義したインデックスが適切に活用されているか確認すること。
- **手動更新**: D1 は `updated_at` の自動更新が弱いため、すべての `UPDATE` 文にアプリ側からタイムスタンプを明示的にセットすること。