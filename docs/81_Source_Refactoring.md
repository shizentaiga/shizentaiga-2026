# 🚀 超スモールステップ・ソース整理計画

## フェーズ1：定数と型の分離（リスク：極小）
ロジックには触れず、情報の「置き場所」を整理します。

### ステップ 1.1：index.tsx の固定値を info.ts へ集約
*   **内容**: `index.tsx` や各 `pages/` にハードコードされている環境変数名、デフォルトの店舗名、メタタグの文字列などを `src/constants/info.ts` へ移動します。
*   **修正ファイル**: `index.tsx` ↔ `src/constants/info.ts`

### ステップ 1.2：共通インターフェースの独立化
*   **内容**: `index.tsx` で定義されている `Plan` 型や `BookingSlot` 型などの TypeScript 定義を、新しいファイル `src/types/index.ts`（または `src/models/`）へ切り出します。
*   **修正ファイル**: `index.tsx` ↔ `src/types/index.ts`

### ステップ 1.3：バリデーションスキーマの分離
*   **内容**: `zValidator` などで使っている `z.object({...})` の定義をハンドラーの外へ出し、専用ファイルへ移動します。
*   **修正ファイル**: `index.tsx` ↔ `src/lib/validation.ts` (新規作成)

---

## フェーズ2：ビジネスロジックの純粋関数化（リスク：低）
DB接続やHonoの `Context` に依存しない「計算」だけを `lib/` へ逃がします。

### ステップ 2.1：カレンダー表示用日付計算の移動
*   **内容**: `index.tsx` 内にある「今日から30日分の日付リストを作る」ようなループ処理を `src/lib/calendar-logic.ts` へ関数として抽出します。
*   **修正ファイル**: `index.tsx` ↔ `src/lib/calendar-logic.ts`

### ステップ 2.2：スロットの状態判定ロジックの移動
*   **内容**: 「予約満了か、残りわずかか」を判定する `if` 文の塊を `src/lib/slot-logic.ts` へ関数として抽出します。
*   **修正ファイル**: `src/components/Booking/SlotList.tsx` ↔ `src/lib/slot-logic.ts`

---

## フェーズ3：DBクエリの Repository 集約（リスク：中・慎重に）
SQLが直接書かれている箇所を、既存の `repositories` へ一本化します。

### ステップ 3.1：プラン取得 SQL の移動
*   **内容**: `index.tsx` で直接 `c.env.DB.prepare(...)` している箇所を、`src/db/repositories/plan-db.ts` のメソッド呼び出しに書き換えます。
*   **修正ファイル**: `index.tsx` ↔ `src/db/repositories/plan-db.ts`

### ステップ 3.2：予約実行 SQL の移動
*   **内容**: `Checkout.tsx` 付近で行っているインサート処理を `src/db/repositories/booking-db.ts` へ移動します。
*   **修正ファイル**: `src/pages/Checkout.tsx` ↔ `src/db/repositories/booking-db.ts`

---

## フェーズ4：ルーティングの整理（リスク：中・最終工程）
最後に、肥大化した `index.tsx` を分割します。

### ステップ 4.1：ページハンドラーの抽出
*   **内容**: `app.get('/', ...)` の中身（ロジック）を、それぞれの `src/pages/` 側の関数としてエクスポートし、`index.tsx` はそれを呼び出すだけにします。
*   **修正ファイル**: `index.tsx` ↔ `src/pages/Top.tsx` など

---

## ✅ 整理が完了した後の「単独ファイル変更」のイメージ
この整理が終わると、例えば「新プランを追加したい」という要望に対し、以下のいずれか **1ファイルのみ** の修正で完結します：

*   **表示名を変えるだけなら**: `src/constants/info.ts`
*   **DBの取得条件を変えるなら**: `src/db/repositories/plan-db.ts`
*   **計算ルール（割引など）を変えるなら**: `src/lib/slot-logic.ts`
*   **見た目（色やレイアウト）を変えるなら**: `src/components/Booking/ServicePlanCard.tsx`