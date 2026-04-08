# 04_データベーススキーマ設計書 (Database Schema Design) v1.7

本ドキュメントは、Cloudflare D1 におけるテーブル定義を定義する。
**「最速の立ち上げ」と「構造によるミス防止（安全性）」の両立**を目的とする。

**最終更新日**: 2026-04-07
**作成者**: 清善 泰賀

---

## 1. データベース基本情報

| 項目 | 内容 |
|---|---|
| 論理名 | shizentaiga_db |
| プラットフォーム | Cloudflare D1（SQLite） |
| 時刻規約 | Unix Timestamp（10桁・秒単位）/ 日付文字列は JST 固定 |

---

## 2. テーブル定義

### 2.1 `slots`（予約枠・在庫管理）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `tenant_id` | TEXT | NOT NULL | 事業者識別子 |
| `id` | TEXT | PRIMARY KEY | 枠の一意識別子（ULID推奨） |
| `service_id` | TEXT | NOT NULL | サービスプラン ID |
| `staff_id` | TEXT | NOT NULL | 担当者 ID |
| `date_string` | TEXT | NOT NULL | JST 固定: `YYYY-MM-DD` |
| `start_at_unix` | INTEGER | NOT NULL | 開始時刻（10桁 Unix） |
| `slot_duration` | INTEGER | NOT NULL | 枠の長さ（分）※在庫の粒度 |
| `status` | TEXT | NOT NULL | `available` / `pending` / `booked` / `error` |
| `expires_at` | INTEGER | — | 仮確保の期限（10桁 Unix） |
| `retry_count` | INTEGER | DEFAULT 0 | 連携リトライ数 |
| `created_at` | INTEGER | NOT NULL | 作成時刻（10桁 Unix） |
| `updated_at` | INTEGER | NOT NULL | 更新時刻（10桁 Unix） |

### 2.2 `processed_events`（冪等性管理）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `event_id` | TEXT | PRIMARY KEY | 外部イベント ID（`evt_...` 等） |
| `provider` | TEXT | DEFAULT `'stripe'` | 決済プロバイダ名（stripe / paypal 等） |
| `processed_at` | INTEGER | NOT NULL | 処理完了日時（10桁 Unix） |

---

## 3. SQL 実装コード（`src/db/schema.sql`）

~~~sql
-- 予約枠管理テーブル
CREATE TABLE IF NOT EXISTS slots (
    tenant_id     TEXT    NOT NULL,
    id            TEXT    PRIMARY KEY,
    service_id    TEXT    NOT NULL,
    staff_id      TEXT    NOT NULL,
    date_string   TEXT    NOT NULL,        -- アプリ側で必ず JST 形式（YYYY-MM-DD）を生成
    start_at_unix INTEGER NOT NULL,
    slot_duration INTEGER NOT NULL,
    status        TEXT    NOT NULL
        CHECK (status IN ('available', 'pending', 'booked', 'error')),
    expires_at    INTEGER,
    retry_count   INTEGER DEFAULT 0,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);

-- 【重要】業務ロジック制約：同一スタッフの同時刻重複を DB レベルで禁止
CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_unique_business_rule
    ON slots (tenant_id, staff_id, start_at_unix);

-- カレンダー検索の高速化（カバリングインデックス）
CREATE INDEX IF NOT EXISTS idx_slots_search_optimized
    ON slots (tenant_id, service_id, date_string, status);

-- 期限切れ仮予約の抽出用
CREATE INDEX IF NOT EXISTS idx_slots_pending_manager
    ON slots (status, expires_at);

-- 決済処理済みイベント管理テーブル
CREATE TABLE IF NOT EXISTS processed_events (
    event_id     TEXT    PRIMARY KEY,
    provider     TEXT    DEFAULT 'stripe',
    processed_at INTEGER NOT NULL
);

-- 過去ログ削除用インデックス
CREATE INDEX IF NOT EXISTS idx_processed_at_cleanup
    ON processed_events (processed_at);
~~~

---

## 4. テナント隔離プロトコル（Isolation Protocol）

「実装漏れは必ず起きる」という前提に立ち、人的ミスを構造的に排除する。

| フェーズ | 対策 | 内容 |
|---|---|---|
| 【即時】 | 型によるガード（Repository Pattern） | DB操作関数の第一引数を必ず `tenantId: string` とする。引数を忘れるとコンパイルエラーになり、実装漏れを機械的に阻止 |
| 【中期】 | クエリビルダーによる自動付与 | Drizzle ORM 等の導入時、テナント ID をセットしないとクエリが実行できない「薄いラッパー」を実装し、`WHERE` 句を自動挿入 |
| 【長期】 | 物理隔離への移行 | テナントごとに D1 インスタンスを分離（1 Tenant = 1 D1）し、論理的なデータ漏洩リスクを物理的にゼロにする |

---

## 5. 運用ルール

### 5.1 アプリケーション実装規約

| 項目 | 規約 |
|---|---|
| Timezone | `date_string` は必ず `Asia/Tokyo` 基準で生成する純粋関数（`formatDateJST` 等）を使用し、テストコードで担保する |
| Atomic Update | 在庫確保時は必ず `WHERE status = 'available'` を含め、DB レベルでの競合排除を行う |

### 5.2 仮予約（`pending`）の回収ロジック

| 対応時期 | 内容 |
|---|---|
| 暫定 | 空き枠検索時に `(status = 'available') OR (status = 'pending' AND expires_at < now())` を考慮するか、検索直前に期限切れを判定する |
| 将来 | Cron Triggers を 5〜10 分間隔で実行し、期限切れ枠を `available` へ自動復旧する清掃ジョブを実装する |

### 5.3 分析・拡張

| 項目 | 内容 |
|---|---|
| `provider` | Stripe 以外の決済手段導入に備え、プロバイダカラムを維持する |
| `retry_count` | 将来的に `retry_reason` カラムを追加し、失敗原因の分析を可能にする |

---

## 6. スタートアップ期の懸念事項・注意点

### ⚠️ `staff_id` の初期値設計

現段階では担当者が1名（清善 泰賀）のため `staff_id` は固定値になる想定だが、
**固定値をハードコードせず `constants/info.ts` 経由で参照する**こと。
将来の複数スタッフ対応時に、定数を変えるだけで済む設計を維持する。

### ⚠️ `service_id` の定義タイミング

`service_id` の値体系（例: `spot` / `advisor`）は、`constants/info.ts` の
`BUSINESS_INFO` と必ず一致させること。設計が先行してデータが後から定義されると、
シードデータと本番データで不整合が生じるリスクがある。

### ⚠️ `processed_events` の肥大化

テキストデータのため容量的な問題は低リスクだが、**削除ポリシーを設計書に明記**しておくことを推奨する。
例: `processed_at < (now - 90日)` のレコードを定期的に削除する Cron ジョブを将来的に追加する。

### ⚠️ マイグレーション運用

スタートアップ期はスキーマ変更が頻繁に発生しやすい。
`wrangler d1 execute` によるローカル検証を必ず経由し、
**本番 D1 への直接 DDL 実行は厳禁**とすること。