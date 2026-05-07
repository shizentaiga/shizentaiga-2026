# 🛠 Stripe Webhook & 仮予約(Pending) 実装計画書 v1.6

## 0. 鉄則：Simple is Best & Safety First
- **逆転期限設計**: `expires_at`(DB:35分) ＞ `expires_at`(Stripe:30分) により、決済完了後に枠が消えている事故を理論的に排除。
- **物理ロック**: `reservation_grid` の `UNIQUE` 制約を唯一の真実とし、アプリ層の複雑な排他制御を不要にする。
- **デグレ防止**: 既存の `handleStripeSession` の構造を壊さず、直前に「仮予約関数」を差し込むだけの最小侵入設計。

---

## 1. 進捗状況とワークフロー

### ✅ 完了済み (Done)
- [x] **Webhookハンドラー作成**: `api/webhook.ts` での署名検証・metadata抽出ロジック。
- [x] **確定処理の実装**: `booking-db.ts` での `confirmBooking`（Atomic更新）の実装。
- [x] **疎通確認**: Stripe CLI を利用したローカル環境での [200 OK] 疎通テスト。
- [x] **非同期メール基盤**: `waitUntil` を利用した Resend 送信フローの構築。

### 🚀 これから実装すること (To-Do)
- [ ] **仮予約関数の作成**: `createPendingBooking` (D1 batch処理) の実装。
- [ ] **フロントエンド結合**: 決済ボタン押下時に「DB仮予約 ➔ 成功時のみStripeへ」の動線確保。
- [ ] **Stripe期限設定**: `createStripeSession` への `expires_at` (30分) 追加。
- [ ] **実環境テスト**: 本番用 metadata を使用したエンドツーエンドの結合テスト。

---

## 2. 実装詳細

### 【New】Step 0: 仮予約層 (`booking-db.ts`)
**`createPendingBooking` 関数の役割:**
- **Atomic更新**: `slots` への INSERT(status:pending) と `reservation_grid` への挿入をセットで実行。
- **物理ガード**: 既に誰かが決済中（gridにレコードあり）なら `UNIQUE` 制約により即座に失敗を返し、Stripeセッション作成を中断させる。

### 【Step 1】確定処理層 (`booking-db.ts`)
- `confirmBooking`: Webhook受信時に `pending` ➔ `booked` へ昇格。
- 顧客テーブルへの関与は、今回の方針に基づき「対象外」としてスコープ外（デグレ・エラーリスク低減）。

### 【Step 2】Webhook層 (`api/webhook.ts`)
- **Metadata**: `{ plan_id, date, slot }` をキーとして利用。
- **冪等性**: Stripeからのリトライに備え、DB更新の成否を確認してからメール送信へ進む。

### 【Step 3】メール層 (Resend)
- **From**: `contact@shizentaiga.com`
- **内容**: 日本語固定。Google Meet等の案内を含む。

---

## 3. 処理の連鎖 (Updated Call Stack)

1. **[入口] `handleStripeSession`**: ユーザーが決済ボタンをクリック。
2. **[仮予約] `createPendingBooking`**: 👈 **(Next Implement)** 
   - DBに `pending` 枠作成。失敗ならエラーを返し、Stripeへ遷移させない。
3. **[決済] Stripe Checkout**:
   - `expires_at`: 30分（現在時刻 + 1800s）
   - `metadata`: `plan_id`, `date`, `slot` を注入。
4. **[通知] Stripe Webhook**: 決済成功イベントを送信。
5. **[確定] `confirmBooking`**: `pending` を `booked` に更新。
6. **[完了] Resend**: 予約確定メールをバックグラウンド送信。

---

## 4. 環境変数・パラメータ定義

| 変数名 | 定義・用途 |
|--------|------------|
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (Webhook署名検証) |
| `RESEND_API_KEY` | `re_...` (メール送信API) |
| `Metadata Keys` | `plan_id`, `date`, `slot` |

---

## 5. リスク管理 (デグレ・不具合対策)

- **フェイルセーフ**: DBの仮予約に失敗した場合、ユーザーには「他のユーザーが手続き中です」と表示し、Stripeの決済手数料が発生する前に止める。
- **不整合の自動回復**: `pending` で放置された枠は、`expires_at` (35分) を経過すると理論上無効となり、次回の空き状況確認時に上書き可能。
- **ログの監視**: `console.error` を各所に配置し、Cloudflareのログビューアーで異常（署名検証失敗等）を即時検知可能にする。