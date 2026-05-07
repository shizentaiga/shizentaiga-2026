# 03_Stripe連携設計書 (Stripe Integration Guide) v1.1

本ドキュメントは、shizentaiga-2026 プロジェクトにおける Stripe Checkout と Cloudflare D1 の連携、
および決済整合性を担保するための実装規約を定義する。

---

## 1. 決済ライフサイクルと時間管理

予約枠の「仮確保（Soft Lock）」と Stripe セッションの有効期限を厳密に同期させ、二重予約を物理的に排除する。

### 1.1 有効期限の設定

| 対象 | 期限 | 計算式 |
|---|---|---|
| Stripe Checkout Session (`expires_at`) | **31分（1860秒）** | `Math.floor(Date.now() / 1000) + 1860` |
| D1 仮確保期限 (`pending_expires_at`) | **35分（2100秒）** | `current_unix + 2100` |

**不整合防止ロジック**: Stripe 側を先に失効させることで、「Stripe で決済成功したのに D1 側では枠が開放済み」という逆転現象を防止する。

---

## 2. セキュリティ原則：価格決定権の所在

~~~
【鉄則】決済金額は必ずサーバー側の BUSINESS_INFO[plan_id] から取得する。
        URL・フォーム・クライアントから送られてきた金額値は一切信頼しない。
~~~

### 2.1 価格決定フロー

~~~
POST /api/checkout?plan=spot&slot=slot_001&date=2026-04-07
     |
     v
[Hono ハンドラ]
     |
     +-- plan_id を BUSINESS_INFO に照合
     |       |
     |       +--[存在しない]--> 400 Bad Request
     |       |
     |       +--[存在する]--> BUSINESS_INFO[plan_id].price を取得
     |                              ↑
     |                    ここで金額が確定する（URLの値は参照しない）
     |
     +-- slot_id を D1 に照合（status='available' か検証）
     |
     v
Stripe セッション生成（サーバー確定金額を使用）
~~~

**実装規約**

| 項目 | 規約 |
|---|---|
| 金額の参照元 | `constants/info.ts`（`BUSINESS_INFO`）のみ |
| URLパラメータ | `plan_id`・`slot_id`・`date` のみ受け付ける。金額パラメータは設計上存在しない |
| 検証失敗時 | 400 Bad Request を返却し、Stripe セッションを生成しない |

---

## 3. Webhook 実装規約（Idempotency & Reliability）

Stripe からの通知を「唯一の真実（Source of Truth）」としつつ、ネットワーク不達に備えた設計を行う。

### 3.1 受信イベントと処理内容

| イベント名 | 処理内容 | 状態遷移 |
|---|---|---|
| `checkout.session.completed` | 予約確定。D1 の status を `booked` へ更新 | `pending` → `booked` |
| `checkout.session.expired` | 枠を即時開放。D1 の status を `available` へ更新 | `pending` → `available` |
| `payment_intent.payment_failed` | 決済失敗通知。必要に応じてユーザーへ再試行を促す | 状態維持または通知 |

### 3.2 冪等性（二重処理防止）の担保

~~~
Webhook 受信
     |
     v
event.id を processed_events テーブルで照合
     |
     +--[処理済み]--> 即座に 200 OK を返却（後続処理を全てスキップ）
     |
     +--[未処理]---> 処理実行 → event.id を記録 → 200 OK
~~~

---

## 4. Stripe Metadata の活用

Webhook 処理時に D1 のフルスキャンを避けるため、必要な情報を Stripe 側に付与する。

### 4.1 付与する Metadata 項目

| キー | 値の例 | 用途 |
|---|---|---|
| `tenant_id` | `taiga_shizen` | 将来のマルチテナント対応 |
| `slot_id` | `slot_001` | D1 `slots` テーブルの主キーと対応 |
| `plan_id` | `spot` | 選択プランの識別子 |

**制約**: キーあたり 40 文字、全体で 50 個までの制限を遵守する。

---

## 5. 自己修復ロジック（Reconciliation）

Webhook が不達（サイレント失敗）となった場合のバックアップ体制。

### 5.1 Cron Trigger（5分間隔：自己修復と異常検知）

**抽出条件**: 期限切れ `pending` を最大50件抽出（API負荷分散）

| 条件 | 値 |
|---|---|
| `status` | `pending` |
| `expires_at` | `< now`（仮確保期限超過） |
| `retry_count` | `< 3`（上限未達） |

**照合・リトライ手順**

~~~
① 内部照合（processed_events 走査）
     |
     +--[処理済み記録あり]--> booked または available へ同期して終了
     |
     +--[記録なし]---------> ② 外部照合へ

② 外部照合（Stripe API: checkout.session.retrieve）
     |
     +--[paid]-----------> status = 'booked'
     +--[expired / open]--> status = 'available'
     +--[APIエラー]-------> retry_count += 1 / last_retry_at 更新
~~~

**異常値の隔離（Dead Letter Handling）**

発動条件: `retry_count >= 3` に達しても未解決のレコード

| 処置 | 内容 |
|---|---|
| ステータス変更 | `manual_check_required`（自動修復対象から除外） |
| アラート送信 | 管理者へ「自動照合失敗：手動確認依頼」通知を送信 |

---

## 6. セキュリティとコンプライアンス

### 6.1 PCI DSS 準拠と安全な通信

| 項目 | 対策 |
|---|---|
| カード情報の非保持 | カード情報は Workers を一切通過させず、Stripe Checkout（Hosted Page）を使用 |
| 署名検証 | `stripe.webhooks.constructEvent` を全 Webhook リクエストに適用 |
| 環境変数管理 | `STRIPE_SECRET_KEY` および `STRIPE_WEBHOOK_SECRET` は Cloudflare Secrets で厳重管理 |
| 金額改ざん防止 | 決済金額はサーバー側 `BUSINESS_INFO` から取得。クライアント値は一切参照しない |

---

## 7. テスト・検証手順

### 7.1 正常系・異常系テストケース

| # | テストケース | 期待結果 |
|---|---|---|
| 1 | 正常予約 | 決済完了後、D1 が `booked` になり、確定メールが1通のみ届く |
| 2 | 決済中断 | Stripe 画面を閉じて35分待機後、D1 が `available` に戻る |
| 3 | 二重通知 | 同一 Webhook ペイロードを2回送信し、2回目が無視される |
| 4 | Webhook 欠損 | Webhook を意図的に遮断し、5分後の Cron で予約が確定・開放される |
| 5 | 金額改ざん | URLパラメータに不正な金額を付与しても、サーバー側の価格が適用される |

---

## 付録：期限設定の変更ルール

Stripe `expires_at`（31分）と D1 `expires_at`（35分）の設定値を変更する場合は、
以下のドキュメントを**必ず同時に更新**すること。

- 本ドキュメント（`03_stripe_integration_guide.md`）
- `02_implementation_detail.md`
- `constants/info.ts` 内の該当定数

## メモ
・1. Stripeセッションの「再利用」禁止
/api/checkout ハンドラでは、pending 状態の枠であっても、**expires_at が未来であれば一律で「予約中（409 Conflict）」**として扱うのが最も安全です。

・2. Webhook 署名検証の「Raw Body」問題
技術的注意: stripe.webhooks.constructEvent に渡すボディは、パース（JSON.parse）される前の**生の文字列（Raw Body）**である必要があります。Hono を使用する場合、c.req.raw.clone().text() 等を使用して、署名検証用のボディを正しく抽出するように実装してください。

・3.冪等性テーブル (processed_events) のクリーンアップ
Cron Trigger（5分間隔）のついでに、「30日以上前の processed_events を削除する」という一行を加えておくと、メンテナンスフリーな「自浄作用」が完成します。


