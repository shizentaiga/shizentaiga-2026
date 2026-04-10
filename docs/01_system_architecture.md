# システム全体設計書 (System Architecture Design) v1.2

**プロジェクト名**: shizentaiga-2026  
**最終更新日**: 2026-04-07  
**設計者**: 清善 泰賀  

---

## 1. システムアーキテクチャ

Cloudflare のエッジコンピューティングを核とした「自己修復型・フルスタック構成」を採用する。

### 1.1 全体構造

| レイヤー | 技術 |
|---|---|
| Entry Point | Cloudflare Workers (Hono Framework) |
| Frontend | Hono JSX (Vite) |
| Database | Cloudflare D1 (D1 Manager) |
| 決済 | Stripe Checkout / Webhooks |
| 通知 | Resend（メール配送） |
| 外部同期 | Google Calendar API |

### 1.2 システム全体データフロー

~~~
[User Browser]
     |
     v
[Cloudflare Edge (Hono / Workers)]
     |
     +---> [Cloudflare D1]          # 予約枠・冪等性テーブル
     |
     +---> [Stripe Checkout]        # 単発・スポット決済
     |         |
     |         +<-- [Stripe Webhook]  # 確定・失効イベント受信
     |
     +---> [Resend API]             # 顧問契約フォーム → メール配送
~~~

### 1.3 Services.tsx 遷移フロー

~~~
[Services.tsx]
     |
     +--[単発・スポット選択]--> URLパラメータ付与
     |                              |
     |                              v
     |                     POST /api/checkout
     |                              |
     |                              v
     |                     [Stripe Checkout]
     |
     +--[顧問契約選択]----> [Contact Form]
                                    |
                                    v
                            POST /api/contact
                                    |
                                    v
                            [Resend API]
                                    |
                                    v
                    メール配送 → shizentaiga.com
~~~

---

## 2. ソフトウェア設計 (Hono / TypeScript)

### 2.1 ディレクトリ構造

~~~
/src
  ├── index.tsx          # ルーティング・ミドルウェア定義
  ├── renderer.tsx       # JSX レイアウト・SEO管理
  ├── pages/             # 各画面コンポーネント
  │   ├── Top.tsx
  │   ├── Services.tsx   # プラン選択・カレンダー・遷移起点
  │   ├── Legal.tsx
  │   └── Thanks.tsx
  ├── components/        # 再利用可能UI部品
  │   ├── CalendarSection.tsx
  │   ├── ServicePlanCard.tsx
  │   └── BookingFooter.tsx
  ├── db/                # D1 操作層
  │   ├── schema.sql     # テーブル定義 (v1.8準拠)
  │   └── queries.ts     # アトミックな在庫更新クエリ
  ├── lib/               # ユーティリティ・外部API
  │   ├── stripe.ts      # 決済ロジック (31分期限設定含む)
  │   ├── resend.ts      # お問い合わせメール送信
  │   └── notifier.ts    # 予約確定通知・iCal生成
  └── constants/
      └── info.ts        # サービス名・価格・連絡先等のマスタ
~~~

### 2.2 ルーティング定義

| メソッド | パス | 処理内容 |
|---|---|---|
| GET | `/` | トップページ |
| GET | `/services` | サービス一覧・予約枠選択 |
| POST | `/api/checkout` | Stripe 決済セッション作成（31分期限指定） |
| POST | `/api/webhook` | Stripe Webhook 受信（冪等性チェック実装） |
| POST | `/api/contact` | 顧問契約フォーム送信 → Resend API 経由でメール配送 |

### 2.3 URL Schema（URL-Driven Architecture）

セッションを使わず、URLパラメータで状態を引き回す設計を採用する。

~~~
/services?plan={plan_id}&date={YYYY-MM-DD}&slot={slot_id}
~~~

| パラメータ | 型 | 例 | 用途 |
|---|---|---|---|
| `plan` | string | `spot` / `advisor` | プラン識別子 |
| `date` | string | `2026-04-07` | JST日付（カレンダー選択値） |
| `slot` | string | `slot_001` | 枠識別子（D1の `id` と対応） |

**注意事項**: サーバー側で全パラメータのバリデーションを必ず実施し、不正値による誤処理を防止する。

---

## 3. データベース設計 (Cloudflare D1)

### 3.1 主要テーブル構成

**slots（在庫・予約管理）**

| カラム名 | 型 | 内容 |
|---|---|---|
| `tenant_id` | TEXT (INDEX) | テナント識別子（初期値: `taiga_shizen`） |
| `id` | TEXT (PK) | 枠識別子 |
| `date_string` | TEXT (INDEX) | JST固定日付（`YYYY-MM-DD`） |
| `start_at_unix` | INTEGER | 開始時刻（UTC Unix Timestamp） |
| `status` | TEXT | `available` / `pending` / `booked` |
| `expires_at` | INTEGER | 仮確保期限（UTC Unix Timestamp） |
| `slot_duration` | INTEGER | 枠の長さ（分） |

**processed_events（決済冪等性管理）**

| カラム名 | 型 | 内容 |
|---|---|---|
| `event_id` | TEXT (PK) | Stripe Event ID |
| `processed_at` | INTEGER | 処理日時（UTC Unix Timestamp） |

---

## 4. 決済・予約整合性ロジック

### 4.1 タイムスロット制御

**仮確保（Soft Lock）**

- DB更新時に `WHERE status='available'` を条件とするアトミック更新。
- DB仮確保期限: **35分** / Stripe セッション期限: **31分**（Stripe が先に失効することを保証）。

**自己修復（Reconciliation）**

- 5分間隔の Cron Trigger による期限切れ枠の自動開放。
- `checkout.session.expired` Webhook による即時在庫復旧。

### 4.2 Resend 連携（顧問契約フロー）

~~~
[Contact Form] --> POST /api/contact
                        |
                        v
                  [Resend API]
                        |
                        v
              shizentaiga.com へメール配送
              （件名・フォーム内容・送信者情報を含む）
~~~

- 顧問契約は決済を伴わないリード獲得型フローのため、D1への書き込みは行わない。
- メール送信失敗時のエラーハンドリングは呼び出し側（Honoハンドラ）で実装する。

---

## 5. セキュリティ & パフォーマンス

| 項目 | 対策 | 効果 |
|---|---|---|
| Data Integrity | 全 DB クエリに `tenant_id` を含める | 将来のマルチテナント化を担保 |
| タイムゾーン事故 | 時刻比較を全て Unix Timestamp (INTEGER) で統一 | JST/UTC逆転バグを封鎖 |
| Performance | `date_string` への INDEX 付与 | カレンダー検索のフルスキャンを回避 |
| URLパラメータ汚染 | サーバー側で全パラメータをバリデーション | 不正な `slot_id`・`plan` 値による誤処理を防止 |
| Webhook 多重処理 | `processed_events` による冪等性ガード | ネットワーク再送時の二重処理を遮断 |

---

## メモ
・Webhookの「競争状態（Race Condition）」への備え：「成功した直後に、古い失効イベントが届く」に対策する。  

・2. D1の「Time-to-Consistency」への配慮：レプリケーションの遅延等で Webhook 処理中に最新の状態が見えない可能性がゼロではありません。

・3.URL Schema のバリデーション（2.3項）：URLパラメータの price（もしあれば）は絶対に無視

・4. iCal 生成とタイムゾーン：Googleカレンダー連携用の .ics ファイルを作成する際、DTSTART / DTEND にはタイムゾーン指定（Asia/Tokyo）を含めるか、Z（UTC）表記に変換する必要があります。

