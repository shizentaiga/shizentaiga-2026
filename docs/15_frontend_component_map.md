# 予約システム プログラム詳細設計書

---

## 1. システム全体構造（Component Map）

画面を構成する主要なプログラムと、その役割・依存関係。

| プログラム名 (File) | 役割 | 主要な関数 / 変数 | 依存・トリガー |
|---|---|---|---|
| `Services.tsx` | 司令塔・全体のレイアウト結合 | `executeSlotRequest` | `plan_id`, `data-date` |
| `ServicePlanCard.tsx` | プラン（商品）選択 UI | `data-is-consulting` | `displayPlans` (DB) |
| `CalendarSection.tsx` | 日付選択 UI（HTMX） | `selectionChange` (Event) | `availableSlots` (DB) |
| `SlotList.tsx` | 時間枠の動的生成 | `calculatePossibleSlots` | `grid_size_min`, `duration_min` |
| `BookingFooter.tsx` | 状態監視・最終確定 | `syncSelection` | `currentTargetUrl` |

---

## 2. データベース・スキーマ（核心部）

ロジックの根幹となるテーブルとカラムの定義。

### A. `plans` テーブル（商品定義）

| カラム名 | 型 | 説明 |
|---|---|---|
| `plan_id` | String | UI・URL パラメータの起点 |
| `duration_min` | Number | スロット計算の基準 |
| `buffer_min` | Number | 前後準備時間。`duration_min` と合算して拘束時間を算出 |
| `price_amount` | Number | `0` の場合は Footer で「要相談」へ分岐 |

### B. `booking_chips` テーブル（在庫定義）

| カラム名 | 型 | 説明 |
|---|---|---|
| `start_at_unix` | Number（秒単位） | `calculatePossibleSlots` の引数 |
| `date_string` | String（`YYYY-MM-DD`） | カレンダーの在庫判定に使用 |
| `grid_size_min` | Number（通常 `30`） | チップの間隔分 |

---

## 3. データフローと依存関係（変数のリレー）

修正時に厳守すべき、コンポーネント間の通信ルール。

~~~
[起点] plan_id (PlanCard)
    ↓ input[name="plan_id"] を通じて取得
    ↓ 依存: Footerの金額表示、SlotListの在庫フィルタリング
    ↓ （HTMX の hx-include で送信）

[仲介] data-date (Calendar)
    ↓ セルクリック時に属性 data-selected="true" を付与
    ↓ クリック時に document.dispatchEvent(new Event('selectionChange'))
    ↓ を発火させ、Vanilla JS 側に通知

[終点] slot_id / unix (SlotList)
    ↓ input[name="slot_id"] の value として保持される Unix スタンプ（秒）
    ↓ 依存: Footer がこの checked 状態を検知し、最終 URL を生成
       /api/checkout?plan=...&date=...&slot=...
~~~

---

## 4. AI・プログラマー向け修正ガイド（逆引き）

| やりたいこと | 修正箇所 |
|---|---|
| 予約枠の間隔を変えたい | `SlotList.tsx` の `grid_size_min` および DB の `booking_chips` |
| ボタンの遷移先を変えたい | `BookingFooter.tsx` 内の `currentTargetUrl` の組み立てロジック |
| 特定のプランでカレンダーを隠したい | `ServicePlanCard.tsx` の `isConsulting` 判定（`duration_min === 0` 等）および Footer の `syncSelection` |

### 型と単位のルール

- `plan_id`：常に **String**
- `unix`：常に **Number（秒単位）**
  - JavaScript の `Date` で扱う際は `* 1000` を忘れないこと

---

## 5. 運用チェックリスト（開発完了判定基準）

- [ ] `plan_id` 変更時、`SlotList` が自動で再読込（HTMX）されるか？
- [ ] `CalendarSection` をクリックした際、Footer が `selectionChange` イベントを受信しているか？
- [ ] 予約ボタンが、日付と時間が両方選ばれるまで `disabled` を維持しているか？
- [ ] `debug-monitor` に表示される `TIME` が Unix スタンプ（秒）になっているか？

---

## 補足・考慮漏れ候補（スタートアップ観点）

以下はスコープ外でも、後から差し込みコストが高い項目のため、頭の片隅に置いておくことを推奨する。

### エラー・UX 系

- **HTMX 通信失敗時のフォールバック表示**：ネットワークエラー・タイムアウト時に SlotList が空のまま無言で止まるケースへの対処（最低限 `hx-on::error` でトースト表示）
- **多重クリック防止**：予約ボタン押下後、レスポンス返却まで再クリックを防ぐ `disabled` 制御

### 整合性・在庫系

- **仮予約（pending）の TTL 管理**：Stripe セッション期限と D1 の pending 期限が乖離した場合の Cron フォールバック処理の明文化（既存設計と接合確認）
- **同一スロットへの同時リクエスト競合**：`booking_chips` の UPDATE を楽観的ロックまたは D1 トランザクションで保護しているかの確認

### 運用・監視系

- **`debug-monitor` の本番環境無効化**：開発補助用のデバッグ UI が本番露出しないよう、環境変数フラグでの出し分けを設計段階で確定させる

*document version: v4.1 — last reviewed: 2026-04*