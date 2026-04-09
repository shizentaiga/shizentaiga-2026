/* src/index.tsx */
import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
import { renderer } from './renderer' 
import { Top } from './pages/Top'     
import { Legal } from './pages/Legal' 
import { Services } from './pages/Services' // 依存関係あり
import { ServiceSlots } from './pages/ServiceSlots' // ★追加：予約枠の断片生成用

const app = new Hono()

// --- ⭐️ 開発用サンドボックス ---
import sandboxBridge from './_sandbox/_bridge';
app.route('/_debug', sandboxBridge);
// ------------------------------------------------------------------

/**
 * 静的ファイルの配信設定
 * 型エラーを回避しつつ、Cloudflare Workersでの動作を確保します。
 */
// @ts-ignore
app.use('/static/*', serveStatic({ root: './' }))

// 全ページ共通のレイアウト(renderer)を適用
app.all('*', renderer)

// 1. トップページ（既存：正常動作維持）
// ※ c.render は renderer.tsx を通るため、SEOメタタグ等が正しく付与されます
app.get('/', (c) => {
  return c.render(<Top />)
})

// 2. 特定商取引法に基づく表記（既存：正常動作維持）
app.get('/legal', (c) => {
  return c.render(<Legal />, { 
    title: 'Legal Information', 
    description: '特定商取引法に基づく表記を掲載しています。' 
  })
})

/**
 * 3. サービス一覧・予約案内（★最小限の修正反映）
 * 修正内容:
 * ・ハンドラーを async に変更
 * ・await Services(c) でDBデータ取得済みのコンテンツを受け取る
 * ・万が一 Services.tsx 側でエラーが出ても、システムが止まらないようガード
 */
app.get('/services', async (c) => {
  try {
    const servicesContent = await Services(c);
    return c.render(servicesContent, { 
      title: 'Services | 清善 泰賀', 
      description: '現在の予約状況をご案内します。' 
    })
  } catch (error) {
    console.error("Services Render Error:", error);
    return c.text("現在、予約システムを一時停止しております。しばらく経ってから再度お試しください。", 500);
  }
})

/**
 * ★追加：HTMX専用ルーティング
 * カレンダーの日付がクリックされた際、HTMXはこのURL（/services/slots）に
 * 予約枠の「断片（HTML）」を取りに来ます。
 * * 【注意】これはページ全体（renderer）を通さない「生」のHTML断片を返すため、
 * c.render ではなく、ServiceSlots が生成する c.html をそのまま返します。
 */
app.get('/services/slots', async (c) => {
  return await ServiceSlots(c);
})

export default app