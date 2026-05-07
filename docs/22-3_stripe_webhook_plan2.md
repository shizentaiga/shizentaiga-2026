# 🛠 Stripe Webhook & 仮予約(Pending) 実装計画書 v1.7

## 0. 鉄則：Simple is Best & Safety First
- **上書き許容モデル**: `(status IS NULL) OR (status = 'pending' AND expires_at < now)` の条件を満たせば「予約可能」と判定。クリーンアップ処理を待たずに即時上書きを許可。
- **物理ロック**: `reservation_grid` の `UNIQUE` 制約により、ミリ秒単位の同時リクエストからも確実に1枠を保護。
- **デグレ防止**: 既存の決済フローに「条件付き上書きINSERT」を1ステップ追加するだけの最小構成。

---

## 1. 進捗状況とワークフロー

### ✅ 完了済み (Done)
- [x] Webhookハンドラー作成 (`api/webhook.ts`)
- [x] 確定処理の実装 (`confirmBooking`)
- [x] 疎通確認 (Stripe CLI [200 OK])
- [x] 非同期メール基盤 (`waitUntil` + Resend)

### 🚀 これから実装すること (To-Do)
- [ ] **仮予約関数の作成 (`createPendingBooking`)** 👈 **Next**
- [ ] フロントエンド結合（決済ボタン押下時の動線確保）
- [ ] Stripeセッションへの `expires_at` (30分) 付与

---

## 2. 実装詳細：Step 0 仮予約層 (`booking-db.ts`)

**`createPendingBooking` の判定・更新ロジック:**

1.  **既存枠の確認と上書き判定**:
    対象の `slot_id` に対して以下のSQL（イメージ）で更新を試みる。
    ```sql
    UPDATE slots 
    SET booking_status = 'pending', expires_at = :new_expires_at, ...
    WHERE slot_id = :slot_id 
      AND (booking_status IS NULL OR (booking_status = 'pending' AND expires_at < :now))
    ```
2.  **Atomicな場所取り**:
    `UPDATE` が成功（changes === 1）した場合のみ、`reservation_grid` への挿入（または更新）を行い、物理的な占有を確定させる。
3.  **例外への応答**:
    既に有効な `pending` または `booked` が存在し、上記 `UPDATE` が 0 件だった場合は「予約不可」としてフロントに返し、Stripeへは遷移させない。

---

## 3. 処理の連鎖 (Updated Call Stack)

1.  **[入口] `handleStripeSession`**: ユーザーが決済ボタンをクリック。
2.  **[判定/仮予約] `createPendingBooking`**: 👈 **(ロジックの肝)**
    - 「NULL または 期限切れpending」なら、`pending` として上書き。
    - 同時に `reservation_grid` を確保。
    - **失敗時**: 「他のユーザーが手続き中」または「予約済み」としてエラー。
3.  **[決済] Stripe Checkout**:
    - `expires_at`: 現在時刻 + 30分
    - `metadata`: `{ plan_id, date, slot }`
4.  **[通知/確定] Webhook ➔ `confirmBooking`**:
    - `pending` ➔ `booked` へ昇格。
5.  **[完了] Resend**: 予約確定メール送信。

---

## 4. リスク管理 (デグレ・不具合対策)

- **デグレ防止**: `createPendingBooking` は `INSERT` ではなく `UPDATE`（条件付き）をベースにすることで、既存の枠を壊さずに「空いている時だけ書き込む」安全な挙動を実現。
- **冪等性の維持**: 決済ボタンを連打されても、最初の1回が `pending` を作成すれば、2回目以降は判定ロジックにより弾かれるため、Stripeセッションが重複して発行されるのを防げる。
- **タイムアウトの安全性**: DB側の期限（35分）がStripe（30分）より長いため、「決済は終わったがDB側で期限切れになり、他人に枠を奪われる」リスクを排除。

---

## 5. 最終確認事項

| 項目 | 方針 |
|------|------|
| 予約可能条件 | `status IS NULL` または `status = 'pending' AND expires_at < now` |
| DB側期限 | 現在時刻 + 35分 (2100s) |
| Stripe側期限 | 現在時刻 + 30分 (1800s) |