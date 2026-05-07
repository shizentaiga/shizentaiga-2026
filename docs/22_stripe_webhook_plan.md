# 🛠 Stripe Webhook 実装計画書 (v1.3)
「理論的整合性に基づいた、最小構成の決済確定モデル」

---

## 0. 鉄則：Simple is Best

- **例外処理の最小化**: `expires_at` と Stripe セッション期限の逆転設計（35分 vs 30分）により、タイムアウト系のガードレール実装を「ゼロ」または「最小限のログ」に留めます。
- **物理制約の活用**: `reservation_grid` の UNIQUE 制約があるため、コード側で複雑な排他制御を書かず、DBの返り値を見て判断します。

---

## 1. ワークフロー（1時間実装コース）

| ステップ | 実行内容 | 完了の定義 |
|----------|----------|------------|
| 1. DB更新関数 | `booking-db.ts` に `confirmBooking` を追加。 | batch 実行で `results[0].meta.changes === 1` であること。 |
| 2. Webhook作成 | `api/webhook.ts` で metadata から予約情報を復元。 | 署名検証を通過し、受信データが `console.log` に出ること。 |
| 3. メール連携 | Webhook内から `shizentaiga.com` ドメインで Resend 送信。 | 自身のメールアドレスに予約完了通知が届くこと。 |
| 4. ルート登録 | `index.tsx` にエンドポイントを1行追加。 | `stripe listen` でローカル疎通が確認できること。 |

---

## 2. 実装詳細

### 【Step 1】DB層 (`booking-db.ts`)

- **Atomic更新**: `UPDATE slots` と `INSERT reservation_grid` をセットで実行。
- **顧客マージ**: 決済時の `email` を `customers` テーブルに `INSERT OR IGNORE` で放り込みます（名簿の自動蓄積）。

### 【Step 2】Webhook層 (`webhook.ts`)

- **通知タイミング**: DB更新成功時のみ、`c.executionCtx.waitUntil()` を利用して Resend API を叩きます。
- **レスポンス**: 処理の成否に関わらず、Stripeに対しては速やかに `200 OK` を返します（リトライによる二重送信防止）。

### 【Step 3】メール層 (Resend)

- **送信元**: `noreply@shizentaiga.com`（設定済みドメインを利用）。
- **内容**: 日本語固定で「予約日時・プラン名」を送信。

---

## 3. 切り戻し・保守計画

- **即時停止**: 万が一の不具合時は、`index.tsx` の Webhook ルートをコメントアウトするだけで決済確定処理のみを停止可能（Stripe側にはログが溜まるので後でリカバリ可能）。
- **手動対応**: 管理画面がない現在のフェーズでは、Stripe Dashboard からの通知を正（マスター）とし、必要に応じて D1 を直接操作して枠を解放します。

---

## 4. 最終確認事項（不明点は解消済み）

| 項目 | 方針 |
|------|------|
| タイムアウト | 35分設定により理論上無視 |
| 競合 | グリッドモデルにより理論上無視 |
| ドメイン | `shizentaiga.com` 使用。DNS設定済み。 |
| 言語 | 日本語固定 |
| 返金 | 手動運用 |

