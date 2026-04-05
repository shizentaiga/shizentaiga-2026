# システム全体設計書 (System Architecture Design) v1.1
**プロジェクト名**: shizentaiga-2026  
**最終更新日**: 2026-04-06  
**設計者**: 清善 泰賀  
---
## 1. システムアーキテクチャ
Cloudflare のエッジコンピューティングを核とした「自己修復型・フルスタック構成」を採用する。
### 1.1 全体構造
- **Entry Point**: Cloudflare Workers (Hono Framework)
- **Frontend**: Hono JSX (Vite)
- **Database**: Cloudflare D1 (D1 Manager)
- **External API**: Stripe (決済), Resend/MailChannels (通知), Google Calendar (同期)
### 1.2 データフロー図
~~~
[User Browser] <--> [Cloudflare Edge (Hono)] <--> [Cloudflare D1]
                                 ^
                                 |
                          [Stripe Webhook]
~~~
---
## 2. ソフトウェア設計 (Hono / TypeScript)
### 2.1 ディレクトリ構造
~~~text
/src
  ├── index.tsx       # ルーティング・ミドルウェア定義
  ├── renderer.tsx    # JSX レイアウト・SEO管理
  ├── pages/          # 各画面コンポーネント (Top, Services, etc.)
  ├── db/             # 【新規】D1 操作層
  │   ├── schema.sql  # テーブル定義 (v1.8準拠)
  │   └── queries.ts  # アトミックな在庫更新クエリ
  ├── lib/            # ユーティリティ
  │   ├── stripe.ts   # 決済ロジック (31分期限設定含む)
  │   └── notifier.ts # 通知・iCal生成
  └── constants/      # info.ts 等の定数管理
~~~
### 2.2 ルーティング定義
- GET /          : トップページ
- GET /services  : サービス一覧・予約枠選択
- POST /api/checkout : Stripe 決済セッション作成 (31分期限指定)
- POST /api/webhook  : Stripe Webhook 受信 (冪等性チェック実装)
---
## 3. データベース設計 (Cloudflare D1)
### 3.1 主要テーブル構成 (Aletheia Core v1.8 準拠)
**slots (在庫・予約管理)**
- tenant_id (TEXT/INDEX): テナント識別子 (初期値: 'taiga_shizen')
- id (TEXT/PK): 枠識別子
- date_string (TEXT/INDEX): JST固定日付 ('YYYY-MM-DD')
- start_at_unix (INTEGER): 開始時刻 (UTC Unix Timestamp)
- status (TEXT): 状態 (available, pending, booked)
- expires_at (INTEGER): 仮確保期限 (UTC Unix Timestamp)
- slot_duration (INTEGER): 枠の長さ(分)

**processed_events (決済冪等性管理)**
- event_id (TEXT/PK): Stripe Event ID
- processed_at (INTEGER): 処理日時
---
## 4. 決済・予約整合性ロジック
### 4.1 タイムスロット制御
**仮確保 (Soft Lock):**
- DB更新時に WHERE status='available' を条件とするアトミック更新。
- DB仮確保期限: 35分 / Stripeセッション期限: 31分。

**自己修復 (Reconciliation):**
- 5分間隔の Cron Trigger による期限切れ枠の自動開放。
- checkout.session.expired Webhook による即時在庫復旧。
---
## 5. セキュリティ & パフォーマンス
**Data Integrity:**
- 全ての DB クエリに tenant_id を含め、将来のマルチテナント化を担保。
- 時刻比較はすべて Unix Timestamp (INTEGER) で行い、タイムゾーン事故を防止。

**Performance:**
- date_string への INDEX 付与によるカレンダー検索の高速化。

**エンジニア・ノート:**  
本設計書は「予約決済基盤 v1.8」の策定に伴い、データ整合性と将来の拡張性（Phase 3 への移行）を最優先して刷新された。
