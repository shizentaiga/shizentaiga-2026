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
import { Services } from './pages/Services' 

/* --- COMPONENTS (UI Parts) --- */
// ページの一部（スロット一覧）を動的に更新するためのコンポーネント
import { SlotList } from './components/Booking/SlotList'

const app = new Hono()

/* --- 0. CONFIGURATION & ASSETS --- */

// 静的資産（画像・CSS・外部JS等）の配信パス
// @ts-ignore
app.use('/static/*', serveStatic({ root: './' }))

// サンドボックス（開発・テスト用URL: /_debug）
import sandboxBridge from './_sandbox/_bridge';
app.route('/_debug', sandboxBridge);

// 全ページ共通のHTMLレイアウト（renderer.tsx）を適用
app.all('*', renderer)

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
 * 予約システム メインページ（SSR）
 */
app.get('/services', async (c) => {
  try {
    const servicesContent = await Services(c);
    return c.render(servicesContent, { 
      title: 'Services & Booking | 予約案内', 
      description: '現在の予約状況をご案内します。カレンダーから日付を選択してください。' 
    })
  } catch (error) {
    console.error("Services Render Error:", error);
    return c.text("現在、予約システムを一時停止しております。しばらく経ってから再度お試しください。", 500);
  }
})

/* --- 2. API / DYNAMIC FRAGMENTS (HTMX Endpoints) --- */

/**
 * [Slot Update] /services/slots
 * HTMX用：予約スロットの表示更新（HTML断片のみを返却）
 * [Designer Note] ページ全体の更新ではなく、#slot-list-container の中身だけを書き換えます。
 */
app.get('/services/slots', async (c) => {
  const date = c.req.query('date') || "";
  const planId = c.req.query('plan_id') || "";
  
  // SlotListコンポーネント（/components/Booking/SlotList.tsx）を呼び出し
  return c.html(await SlotList(c, date, planId));
})

export default app