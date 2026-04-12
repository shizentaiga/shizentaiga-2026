/**
 * @file index.tsx
 * @description アプリケーションのエントリーポイント。
 * ルーティングの定義と、静的ファイルの配信設定を行います。
 */

import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
import { renderer } from './renderer' 
import { Top } from './pages/Top'     
import { Legal } from './pages/Legal' 
import { Services } from './pages/Services' 

/* --- COMPONENTS --- */
// v3.0: 断片生成用のページ（ServiceSlots）を廃止し、共通コンポーネント SlotList を直接使用します
import { SlotList } from './components/Booking/SlotList'

const app = new Hono()

// --- ⭐️ 開発用サンドボックス ---
import sandboxBridge from './_sandbox/_bridge';
app.route('/_debug', sandboxBridge);
// ------------------------------------------------------------------

/**
 * 静的ファイルの配信設定
 */
// @ts-ignore
app.use('/static/*', serveStatic({ root: './' }))

// 全ページ共通のレイアウト(renderer)を適用
app.all('*', renderer)

// 1. トップページ
app.get('/', (c) => {
  return c.render(<Top />)
})

// 2. 特定商取引法に基づく表記
app.get('/legal', (c) => {
  return c.render(<Legal />, { 
    title: 'Legal Information', 
    description: '特定商取引法に基づく表記を掲載しています。' 
  })
})

/**
 * 3. サービス一覧・予約案内
 * サーバーサイドレンダリング(SSR)で初期状態の予約ページを返します。
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
 * 4. HTMX専用エンドポイント: 予約スロットの更新
 * カレンダーの日付クリック、またはプラン変更時に呼び出されます。
 * * 【重要】
 * ・このエンドポイントはページ全体（renderer）を通さず、
 * 特定のエリア（#slot-list-container）を書き換えるための「HTML断片」のみを返します。
 * ・Services.tsx（初期表示）と同じ SlotList コンポーネントを呼び出すことで、
 * 計算ロジックと見た目の一貫性を完全に保証します。
 */
app.get('/services/slots', async (c) => {
  const date = c.req.query('date') || "";
  const planId = c.req.query('plan_id') || "";
  
  // SlotListコンポーネントが生成するHTML断片を直接レスポンスとして返す
  return c.html(await SlotList(c, date, planId));
})

export default app