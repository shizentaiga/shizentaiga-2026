/**
 * @file index.tsx
 * @description アプリケーションのエントリーポイント（全体の設計図）。
 * 各URL（ルート）と、表示するページ・コンポーネントを紐付けます。
 * * [Designer Note] 
 * ページ全体のタイトルや説明文を変更したい場合は、各ルート内のメタデータを修正してください。
 */

import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
import { renderer } from './renderer' 
import { Top } from './pages/Top'      
import { Legal } from './pages/Legal' 
import { ErrorPage } from './pages/Error'
import { ContactPage } from './pages/Contact'

/* --- 🧱 UI COMPONENTS & PAGES --- */
import { Services } from './pages/Services'
import { Checkout } from './pages/Checkout'
import { SlotList } from './components/Booking/SlotList'

const app = new Hono()

/* --- 0. CONFIGURATION & ASSETS --- */

// 1. 静的資産（画像・CSS・外部JS等）の配信パス：⭐️最優先
// @ts-ignore
app.use('/static/*', serveStatic({ root: './' }))

// 2. 全ページ共通のHTMLレイアウト（renderer.tsx）を適用：⭐️全ルートの入り口
app.all('*', renderer)

// サンドボックス（開発・テスト用URL: /_debug） ⭐️ローカル環境のみサンドボックスを表示
import sandboxBridge from './_sandbox/_bridge';
if (import.meta.env?.DEV || process.env.NODE_ENV === 'development') {
  app.route('/_debug', sandboxBridge);
}

/* --- 1. PAGES (Main Routes) --- */

/**
 * [Top Page] /
 */
app.get('/', (c) => {
  return c.render(<Top />, {
    title: '清善 泰賀 | 公式サイト',
    description: 'マネジメントコンサルタント 清善 泰賀のオフィシャルサイトです。'
  })
})

/**
 * [Legal Information] /legal
 * 特定商取引法に基づく表記
 */
app.get('/legal', (c) => {
  return c.render(<Legal />, { 
    title: 'Legal Information | 特定商取引法に基づく表記', 
    description: '特定商取引法に基づく表記を掲載しています。' 
  })
})

/**
 * [Services & Booking] /services
 * メイン予約画面
 */
app.get('/services', async (c) => {
  const content = await Services(c);
  return c.render(content, { 
    title: 'Services & Booking | 予約案内', 
    description: '現在の予約状況をご案内します。' 
  })
})

/**
 * [Checkout Page] /services/checkout
 * 予約内容確認画面
 * [v3.0 堅牢化] 店舗IDを含む必須パラメータが欠けている場合はエラーへ飛ばします。
 */
app.get('/services/checkout', (c) => {
  const shopId = c.req.query('shop_id')
  const planId = c.req.query('plan')
  const date = c.req.query('date')
  const slot = c.req.query('slot')

  // 全ての必須パラメータが string 型として存在するかチェック
  if (!shopId || !planId || !date || !slot) {
    return c.redirect('/error')
  }

  // チェックを通過したため、型エラーなく Checkout コンポーネントへ渡せます
  return c.render(
    <Checkout shopId={shopId} planId={planId} date={date} slot={slot} />,
    { title: 'Confirm Booking | 予約内容の確認' }
  )
})

/**
 * [Contact Page] /contact
 * 問い合わせページ
 */
app.get('/contact', (c) => {
  return c.render(<ContactPage />, {
    title: `Contact | お問い合わせ窓口`,
  })
})

/**
 * [Error Page] /error
 * 汎用エラー画面
 */
app.get('/error', (c) => {
  return c.render(<ErrorPage />, {
    title: 'Error | お手数ですが再度お試しください',
  })
})

/* --- 2. API / DYNAMIC FRAGMENTS (HTMX Endpoints) --- */

/**
 * [Slot Update] /services/slots
 * HTMX用：予約スロットの表示更新
 */
app.get('/services/slots', async (c) => {
  const date = c.req.query('date') || "";
  const planId = c.req.query('plan_id') || "";
  return c.html(await SlotList(c, date, planId));
})

export default app