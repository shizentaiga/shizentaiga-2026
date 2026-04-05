# 04_データベーススキーマ設計書 (Database Schema Design) v1.0

本ドキュメントは、Cloudflare D1 (SQLite) におけるテーブル定義およびインデックス戦略を定義する。本設計は「Aletheia Core v1.8」の整合性ロジックに基づき、高速なカレンダー検索と堅牢な決済状態管理を両立させる。

---

## 1. テーブル定義 (Table Definitions)

### 1.1 slots (予約枠・在庫管理)
予約の空き状況、仮確保、確定状態を管理する最重要テーブル。

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| **tenant_id** | TEXT | NOT NULL | テナント識別子 (初期値: 'taiga_shizen') |
| **id** | TEXT | PRIMARY KEY | 枠の一意識別子 (ULID または UUID 推奨) |
| **date_string** | TEXT | NOT NULL | **検索用日付 (JST固定: 'YYYY-MM-DD')** |
| **start_at_unix** | INTEGER | NOT NULL | 開始時刻 (UTC Unix Timestamp) |
| **slot_duration** | INTEGER | NOT NULL | 枠の長さ (分単位) |
| **status** | TEXT | NOT NULL | 状態 (available, pending, booked, error) |
| **expires_at** | INTEGER | | **仮確保の期限 (UTC Unix Timestamp)** |
| **retry_count** | INTEGER | DEFAULT 0 | Cron による自動照合の失敗回数 (最大3回) |
| **last_retry_at** | INTEGER | | 最終照合試行時刻 (Unix Timestamp) |
| **updated_at** | INTEGER | NOT NULL | 最終更新時刻 (Unix Timestamp) |

### 1.2 processed_events (決済冪等性管理)
Stripe Webhook の二重処理を防止するためのログテーブル。

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| **event_id** | TEXT | PRIMARY KEY | Stripe Event ID (`evt_...`) |
| **tenant_id** | TEXT | NOT NULL | テナント識別子 |
| **processed_at** | INTEGER | NOT NULL | 処理完了時刻 (Unix Timestamp) |

---

## 2. インデックス戦略 (Index Strategy)

D1 (SQLite) のクエリパフォーマンスを最大化し、フルスキャンを防止するためのインデックスを定義する。

### 2.1 slots テーブル
- **idx_slots_tenant_date**: `(tenant_id, date_string)`
  - 用途: 特定テナントの特定日の空き枠一覧表示（カレンダー表示）を高速化。
- **idx_slots_status_expires**: `(status, expires_at)`
  - 用途: Cron Trigger による「期限切れの pending 枠」の抽出を最適化。
- **idx_slots_tenant_status**: `(tenant_id, status)`
  - 用途: 管理画面等でのステータス別集計。

---

## 3. SQL 実装コード (schema.sql)

初期構築時に実行する DDL。

-- 予約枠管理テーブル
CREATE TABLE IF NOT EXISTS slots (
    tenant_id TEXT NOT NULL,
    id TEXT PRIMARY KEY,
    date_string TEXT NOT NULL,
    start_at_unix INTEGER NOT NULL,
    slot_duration INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('available', 'pending', 'booked', 'error')),
    expires_at INTEGER,
    retry_count INTEGER DEFAULT 0,
    last_retry_at INTEGER,
    updated_at INTEGER NOT NULL
);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_slots_tenant_date ON slots (tenant_id, date_string);
CREATE INDEX IF NOT EXISTS idx_slots_status_expires ON slots (status, expires_at);

-- べき等性管理テーブル
CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    processed_at INTEGER NOT NULL
);

---

## 4. 運用上の留意事項

### 4.1 タイムゾーンの厳守
JST日付: date_string は Asia/Tokyo 基準の文字列で保存。  
UTC整数: start_at_unix 等はすべて UTC 基準の「秒単位(10桁)」 で統一。  
実装規約: Math.floor(Date.now() / 1000) を使用し、ミリ秒の混入を徹底排除する。  

### 4.2 アトミック更新のクエリ例
在庫確保時の UPDATE 文は以下の形式を厳守し、アプリケーションレベルでのロックではなく、データベースレベルでの競合排除を行う。

UPDATE slots 
SET status = 'pending', expires_at = ?, updated_at = ?
WHERE id = ? AND tenant_id = ? AND status = 'available';

## 5. 実装上のアドバイス (Implementation Tips)

### 5.1 updated_at の手動更新
D1 (SQLite) は自動更新機能が弱いため、`UPDATE` 文には必ず `updated_at = ?` を含め、アプリ側で生成したタイムスタンプをセットすること。

### 5.2 ULID の採用推奨
主キー `id` にはソート可能な **ULID** を推奨。時系列順の書き込みにより D1 の I/O 負荷を抑え、ID 自体から作成日時を特定できるためデバッグ効率も向上する。

---
最終更新日: 2026-04-06
作成者: 清善 泰賀