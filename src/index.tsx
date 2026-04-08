/* src/index.tsx
 * 【メインルーティング設定】
 * ・Local: npm run dev / Deploy: npx wrangler deploy
 * ・役割: 全ページの司令塔。共通レイアウトと各ページへの振分けを一括管理。
 */

import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
import { renderer } from './renderer' 
import { Top } from './pages/Top'     
import { Legal } from './pages/Legal' 
import { Services } from './pages/Services'

const app = new Hono()

// --- ⭐️ 開発用サンドボックス（検証完了後に削除・コメントアウト可能） ---
import sandboxBridge from './_sandbox/_bridge';
app.route('/_debug', sandboxBridge);
// ------------------------------------------------------------------

// 静的ファイルの配信設定（@ts-ignore は Cloudflare Runtime との型不一致回避に必須）
// @ts-ignore
app.use('/static/*', serveStatic({ root: './' }))

// 全ページ共通のレイアウト(renderer)を適用
app.all('*', renderer)

/**
 * ページルーティング定義
 * 各コンポーネントを特定のパスに紐付け、個別SEO設定を注入。
 */

// 1. トップページ
app.get('/', (c) => {
  return c.render(<Top />)
})

// 2. 特定商取引法に基づく表記
app.get('/legal', (c) => {
  return c.render(<Legal />, { 
    title: 'Legal Information', 
    description: '特定商取引法に基づく表記、利用規約、プライバシーポリシー等の法務情報を掲載しています。' 
  })
})

// 3. サービス一覧・予約案内
app.get('/services', (c) => {
  return c.render(<Services />, { 
    title: 'Services | 清善 泰賀', 
    description: '個別経営診断、資金調達支援、顧問契約のプラン一覧と現在の予約状況をご案内します。' 
  })
})

export default app