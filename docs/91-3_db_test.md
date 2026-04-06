# 91-3：型定義エラー解消 & DB テスト環境構築手順

---

## 1. 準備：依存パッケージのインストール

~~~sh
npm install --save-dev @cloudflare/workers-types
~~~

以下のパッケージが `devDependencies` に含まれていることを確認する。

| パッケージ | 用途 |
|---|---|
| `vitest` | テストランナー |
| `wrangler` | D1 エミュレータ（Proxy） |
| `@cloudflare/workers-types` | Cloudflare Workers 型定義 |

---

## 2. 設計思想：Direct Injection 戦略

個別の型定義エラーや環境依存の複雑さを排除し、**ロジックの正しさを最速で検証する**構成を採用。

| 方針 | 内容 |
|---|---|
| 環境の局所化 | `vitest.config.ts` は最小限の Node.js 設定に留め、テストコード側で D1 エミュレータを直接起動 |
| スキーマ同期 | テスト実行時に `src/db/schema.sql` を動的に読み込み、常に本番と同一のテーブル構造で検証 |
| 検証の焦点 | 期限切れ `pending` 枠の救済 / `booked` 枠の二重予約防止 の2点に集中 |

---

## 3. テスト実行手順

### Step 1：ファイルの配置確認

以下の2ファイルが最新であることを確認する。

- `vitest.config.ts` — `defineConfig` を使用した最小構成
- `src/test/queries.test.ts` — `getPlatformProxy` を利用した統合テストコード

### Step 2：テストの実行

~~~sh
npx vitest run   # 一回のみ実行
npx vitest       # ファイル変更を監視して継続実行
~~~

### Step 3：検証項目の確認

出力レポートにおいて、以下がすべてパスしていることを確認する。

| # | テスト項目 | 確認内容 |
|---|---|---|
| 1 | `getSlotsByDate` | 期限切れスロットが `available` としてマップされているか |
| 2 | `tryLockSlot`（Success） | 期限切れスロットを正常に `pending` へ更新（奪取）できるか |
| 3 | `tryLockSlot`（Guard） | `booked` スロットへの更新試行が `false` で返されるか |

---

## 4. トラブルシューティング

| エラー | 対処 |
|---|---|
| `"DB not found"` | `wrangler.toml` の `[[d1_databases]]` の `binding` 名が `DB` になっているか確認 |
| 型エラー（赤波線） | エディタ上の表示のみであれば実行に影響しないため、まず `npx vitest` を強行してパスするか確認 |


---

## 5. テスト結果メモ
①
 ✓ src/test/queries.test.ts (1 test) 641ms
   ✓ Queries Direct Test (D1 Integration) (1)
     ✓ 【正常系】データ取得の整合性：戻り値が配列であることを確認  640ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  15:25:36
   Duration  1.62s (transform 207ms, setup 0ms, import 836ms, tests 641ms, environment 0ms)
