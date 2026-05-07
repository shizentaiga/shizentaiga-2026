# 🛠 Stripe Webhook 実装計画書 (v1.5)
「理論的整合性に基づいた、最小構成の決済確定モデル」

---

## 0. 鉄則：Simple is Best

- **例外処理の最小化**: `expires_at`（35分）＞ Stripeセッション（30分）の逆転設計により、タイムアウト系の複雑なバリデーションを排除。
- **物理制約の活用**: `reservation_grid` の `UNIQUE (schedule_id)` 制約を「最終防衛線」とし、アプリケーション側での二重予約チェックを簡略化。

---

## 1. ワークフロー（1時間実装コース）

| ステップ | 実行内容 | 完了の定義 |
|----------|----------|------------|
| 1. DB更新関数 | `booking-db.ts` に `confirmBooking` を追加。 | D1 batch 実行で `results` が正常に返ること。 |
| 2. Webhook作成 | `api/webhook.ts` で Metadata から情報を復元。 | 署名検証に成功し `console.log` に metadata が出ること。 |
| 3. メール連携 | Resend を使い `contact@shizentaiga.com` から送信。 | 予約確定メールの受信確認。 |
| 4. ルート登録 | `index.tsx` に Webhook エンドポイントを追加。 | `stripe listen` での疎通テスト成功。 |

---

## 2. 実装詳細

### 【Step 1】DB層 (`booking-db.ts`)

**Atomic更新 (D1 Batch):**

- `customers`: `email` を基に `INSERT OR IGNORE`。IDは `cst_UUID` 形式。
- `slots`: `booking_status` を `booked` へ、`user_email` をセット。
- `reservation_grid`: `schedule_id` と `slot_id` を挿入。ここで重複があれば失敗させる。

**顧客ID生成**: `cst_${crypto.randomUUID()}` を使用。

### 【Step 2】Webhook層 (`webhook.ts`)

**Metadataの復元:**

- 送信側: `{ plan_id, date, slot }`（※ `slot` は UnixTime 文字列）
- 受信側: `session.metadata` から上記を取得。`slot_id` は `slot` 値（UnixTime）そのものとして扱う（既存ロジック互換）。

**非同期処理**: Resend 送信は `c.executionCtx.waitUntil()` を使用し、Stripeへのレスポンスを最優先（`200 OK`）する。

### 【Step 3】メール層 (Resend)

**送信設定:**

- **From**: `contact@shizentaiga.com`
- **Subject**: `【善幽】ご予約確定のお知らせ`
- **Body**: 予約日、プラン名を記載した簡潔な日本語テキスト。

---

## 3. 環境変数・パラメータ定義

| 変数名 | 定義・用途 |
|--------|------------|
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`（Webhook署名検証用） |
| `RESEND_API_KEY` | `re_...`（メール送信APIキー） |
| Metadata Keys | `plan_id`, `date`, `slot` |

---

## 4. 処理の連鎖（コールスタック）

1. **[外部] Stripeサーバー**: 決済完了イベントをPOST送信。
2. **[入口] `src/index.tsx`**: `app.post('/api/webhook/stripe', handleStripeWebhook)` で受信。
3. **[ロジック] `src/api/webhook.ts`**:
   - 署名検証 ➔ Metadata抽出。
   - `confirmBooking(c, { plan_id, date, slot, email })` を実行。
4. **[永続化] `src/db/repositories/booking-db.ts`**:
   - `confirmBooking` が D1 トランザクションで `customers`, `slots`, `reservation_grid` を一気通貫で更新。
5. **[通知] `src/api/webhook.ts`**:
   - DB更新成功時のみ Resend 送信をトリガー。

---

## 5. 最終確認事項

| 項目 | 方針 |
|------|------|
| タイムアウト | 35分設定により理論上無視 |
| 競合 | グリッドモデルとUNIQUE制約により物理排除 |
| ドメイン | `shizentaiga.com`（DNS設定済み） |
| 切り戻し | `index.tsx` の `app.post` をコメントアウトするだけで即停止可能 |