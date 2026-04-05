# 03_Stripe連携設計書 (Stripe Integration Guide) v1.0

本ドキュメントは、shizentaiga-2026 プロジェクトにおける Stripe Checkout と Cloudflare D1 の連携、および決済整合性を担保するための実装規約を定義する。

---

## 1. 決済ライフサイクルと時間管理 (Time Management)

予約枠の「仮確保（Soft Lock）」と Stripe セッションの有効期限を厳密に同期させ、二重予約を物理的に排除する。

### 1.1 有効期限の設定（重要パラメータ）
- **Stripe Checkout Session (`expires_at`)**: **31分 (1860秒)**
  - セッション作成時に `Math.floor(Date.now() / 1000) + 1860` を指定。
- **D1 仮確保期限 (`pending_expires_at`)**: **35分 (2100秒)**
  - DB更新時に `current_unix + 2100` を指定。
- **不整合防止ロジック**: 
  - Stripe 側を先に失効させることで、「Stripe で決済が成功したのに、DB 側では既に枠が開放されている」という逆転現象を防止する。

---

## 2. Webhook 実装規約 (Idempotency & Reliability)

Stripe からの通知を「唯一の真実（Source of Truth）」としつつ、ネットワーク不達に備えた設計を行う。

### 2.1 受信イベントと処理内容
| イベント名 | 処理内容 | 期待される状態遷移 |
| :--- | :--- | :--- |
| **`checkout.session.completed`** | 予約確定処理。D1 の status を `booked` へ。 | `pending` -> `booked` |
| **`checkout.session.expired`** | 期限切れ解放。D1 の status を `available` へ。 | `pending` -> `available` |
| **`payment_intent.payment_failed`** | 決済失敗通知（必要に応じてユーザーへ再試行を促す通知）。 | 状態維持または通知 |

### 2.2 冪等性（二重処理防止）の担保
- **イベント ID 管理**: `processed_events` テーブルに Stripe の `event.id` を記録。
- **ガードロジック**: Webhook 受信時、まず `event.id` が DB に存在するかを確認。存在する場合は即座に 200 OK を返し、後続の処理（メール送信等）の重複を遮断する。

---

## 3. Stripe Metadata の活用

Webhook 処理時に DB のフルスキャンを避けるため、必要な情報を Stripe 側に付与する。

### 3.1 付与する Metadata 項目
- `tenant_id`: 将来のマルチテナント対応用（例: 'taiga_shizen'）
- `slot_id`: D1 の `slots` テーブルの主キー
- `plan_id`: 選択されたプランの識別子
- **制約**: キーあたり 40 文字、全体で 50 個までの制限を遵守する。

---

## 4. 自己修復ロジック (Reconciliation)

Webhook が不達（サイレント失敗）となった場合のバックアップ体制。

## 4.1 Cron Trigger（5分間隔：自己修復と異常検知）

### 抽出条件
期限切れ `pending` を最大50件抽出（API負荷分散）。

| 条件 | 値 |
|---|---|
| status | `pending` |
| expires_at | `< now`（仮確保期限超過） |
| retry_count | `< 3`（上限未達） |

---

### 照合・リトライ手順

**① 内部照合（processed_events 走査）**  
Webhook処理済みの場合 → 記録に従い `booked` または `available` へ同期して終了。

**② 外部照合（Webhook未着の場合）**  
Stripe API: `checkout.session.retrieve` を実行。

~~~
paid             → status = 'booked'
expired / open   → status = 'available'
APIエラー        → retry_count += 1 / last_retry_at 更新
~~~

---

### 異常値の隔離（Dead Letter Handling）

**発動条件**: `retry_count >= 3` に達しても未解決のレコード

| 処置 | 内容 |
|---|---|
| ステータス変更 | `manual_check_required`（自動修復対象から除外） |
| アラート送信 | 管理者へ「自動照合失敗：手動確認依頼」通知 |

---

## 5. セキュリティとコンプライアンス

### 5.1 PCI DSS 準拠と安全な通信
- **カード情報の非保持**: カード情報は一切 Workers を通過させず、Stripe Checkout (Hosted Page) を使用する。
- **署名検証**: `stripe.webhooks.constructEvent` を使用し、Stripe 公式の署名検証を全ての Webhook リクエストに適用する。
- **環境変数**: `STRIPE_SECRET_KEY` および `STRIPE_WEBHOOK_SECRET` は Cloudflare Secrets にて厳重に管理する。

---

## 6. テスト・検証手順

### 6.1 正常系・異常系テストケース
1. **正常予約**: 決済完了後、DB が `booked` になり、メールが 1 通だけ届くこと。
2. **決済中断**: Stripe 画面を閉じて 35 分待機。DB が `available` に戻ること。
3. **二重通知**: 同一の Webhook ペイロードを 2 回送信し、2 回目が無視されること。
4. **Webhook 欠損**: Webhook を意図的に遮断し、5 分後の Cron で予約が確定・開放されること。

---
最終更新日: 2026-04-06
作成者: 清善 泰賀