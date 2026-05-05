# 🛠 調査統合レポート：ビルドパイプラインの不整合と解決策

**ステータス**: クローズ（実装は後回し・現状はインラインJSで運用中）  
**作成日**: 2026/04/08

---

## 1. 現象の正体：二重構造の欠如

今回の不具合は、「サーバー（HTMLを生成する側）」と「クライアント（ブラウザで動く側）」を
同じ一つのビルド設定で回そうとしたことによる、認識のズレが原因。

| 役割 | 対象ファイル | ビルド結果 |
|------|-------------|-----------|
| サーバー側 | `index.tsx` | Cloudflare上で動く「実行体」 |
| クライアント側 | `booking-interaction.ts` | ブラウザが読み込む「静的ファイル」 |

**起きていたこと**: Viteが「サーバー側」ビルドに集中するあまり、クライアント用TSファイルを
ビルド対象から除外 → ブラウザが探しに行っても **404** になっていた。

---

## 2. 統合された解決モデル（ハイブリッド構成）

### A. ビルド戦略（`vite.config.ts`）

`mode` によって「サーバー」と「クライアント」の人格を使い分ける。
```ts
export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    // クライアントJS専用ビルド
    return {
      build: {
        rollupOptions: {
          input: './src/booking-interaction.ts',
          output: {
            entryFileNames: 'static/client.js', // 固定名で出力（ハッシュなし）
          },
        },
      },
    }
  } else {
    // サーバー（Hono SSR）ビルド
    return {
      plugins: [pages(), devServer({ entry: 'src/index.tsx' })],
    }
  }
})
```

### B. 配信戦略（`index.tsx` / `Services.tsx`）

`import.meta.env.PROD` で読み込み先を自動切り替え。
```tsx
{import.meta.env.PROD
  ? <script type="module" src="/static/client.js" />      // 本番: ビルド済みJS
  : <script type="module" src="/src/booking-interaction.ts" />  // 開発: ViteがTS→JS翻訳
}
```

---

## 3. 今後の対応事項（ToDoリスト）

### 🔴 優先度：高 ― インフラと出力先の同期

- [ ] **Wranglerの整合性確認**: `wrangler.toml` の `bucket` 指定が Viteの `build.outDir`（`dist` 等）と一致しているか再確認
- [ ] **ビルドコマンドの更新**: `package.json` の `scripts` を2段階ビルドに書き換える
```json
"scripts": {
  "build": "vite build && vite build --mode client"
}
```

### 🟡 優先度：中 ― テンプレートの条件分岐実装

- [ ] **インラインからの脱却**: `Services.tsx` のベタ書きJSを、上記「B. 配信戦略」の条件分岐に差し替える

### 🟢 優先度：低 ― 型安全性の自動化

- [ ] **`public/` 配置の回避**: 手動配置は DX を損なうため避ける。あくまで「TS → JS の自動ビルド」フローを維持する

---

## 参考

- [Hono公式: Cloudflare Pages でのクライアントJS配信パターン](https://hono.dev/docs/getting-started/cloudflare-pages)
- `@hono/vite-cloudflare-pages` の `outputDir` デフォルトは `./dist`