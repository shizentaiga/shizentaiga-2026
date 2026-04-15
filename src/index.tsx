/**
 * @file index.tsx
 * @description アプリケーションのエントリーポイント（全体の設計図）。
 * 各URL（ルート）と、表示するページ・コンポーネントを紐付けます。
 * [v4.6 統合監査済み]
 * - 固定値を排除し、上位（Route Handler）で情報を確定させて下位へ渡す設計に統一。
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

/* --- ⚙️ DATA ACCESS --- */
import { getPlansFromDB } from './db/repositories/plan-db'
import { BUSINESS_INFO } from './constants/info'

/* --- 💳 EXTERNAL SERVICES --- */
import { createStripeSession } from './lib/stripe-server'

/**
 * [Type Definition] Cloudflare D1との接続型を定義
 */
type BaseBindings = {
  shizentaiga_db: D1Database;
}

// 2. index.tsx の Stripe API だけが使いたい「拡張された型」
type StripeBindings = BaseBindings & {
  STRIPE_SECRET_KEY: string;
}

const app = new Hono<{ Bindings: BaseBindings }>()

/* --- 0. CONFIGURATION & ASSETS --- */

// 1. 静的資産（画像・CSS・外部JS等）の配信パス
// @ts-ignore
app.use('/static/*', serveStatic({ root: './' }))

// 2. 全ページ共通のHTMLレイアウト（renderer.tsx）を適用
app.all('*', renderer)

// サンドボックス（開発・テスト用URL: /_debug）
import sandboxBridge from './_sandbox/_bridge';
// if (import.meta.env?.DEV || process.env.NODE_ENV === 'development') {
//   app.route('/_debug', sandboxBridge);
// }
app.route('/_debug', sandboxBridge);  // 本番環境でも_debugを表示

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
 */
app.get('/legal', (c) => {
  return c.render(<Legal />, { 
    title: 'Legal Information | 特定商取引法に基づく表記', 
    description: '特定商取引法に基づく表記を掲載しています。' 
  })
})

/**
 * [Services & Booking] /services
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
 * [v4.6 改修] 
 * - 固定値（ショップ名・担当者名）を、このルートハンドラー内で確定させる設計に変更。
 * - 開発モードかどうかに応じて、Checkoutコンポーネントのデバッグ表示を切り替えます。
 */
app.get('/services/checkout', async (c) => {
  const shopId = c.req.query('shop_id')
  const planId = c.req.query('plan')
  const date = c.req.query('date')
  const slot = c.req.query('slot')
  const staffIdFromQuery = c.req.query('staff_id') // 将来用

  // 全ての必須パラメータが存在するかチェック
  if (!shopId || !planId || !date || !slot) {
    return c.redirect('/error')
  }

  try {
    // ⭐️ データ確定：将来的にはここで shopId を使ってDBから店舗・スタッフ情報を引きます
    const targetShopName = BUSINESS_INFO.shopName; 
    
    // DBアクセス：プラン情報を取得
    const plans = await getPlansFromDB(c, targetShopName);
    const selectedPlan = plans.find(p => p.plan_id === planId);

    if (!selectedPlan) {
      console.error(`Plan not found: ${planId}`);
      return c.redirect('/error');
    }

    // ⭐️ 制御情報の決定（最上位で決める）
    const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development';

    // 確定したすべてのデータを Checkout コンポーネントへ注入（インジェクション）
    return c.render(
      <Checkout 
        shopName={targetShopName}            // ⭐️ 将来はDB取得値に差し替え
        staffName="清善 泰賀"                // ⭐️ 将来はDB取得値に差し替え
        planName={selectedPlan.plan_name}
        duration={selectedPlan.duration_min}
        price={selectedPlan.price_amount}
        rawShopId={shopId} 
        rawPlanId={planId} 
        date={date} 
        slot={slot} 
        showDebug={isDev}                    // ⭐️ 開発時のみデバッグ表示をONにする制御
        backUrl="/services"                  // ⭐️ 戻り先URLの指定
      />,
      { title: 'Confirm Booking | 予約内容の確認' }
    )
  } catch (e) {
    console.error("Critical error fetching checkout data:", e);
    return c.redirect('/error');
  }
})

/**
 * [Contact Page] /contact
 */
app.get('/contact', (c) => {
  return c.render(<ContactPage />, {
    title: `Contact | お問い合わせ窓口`,
  })
})

/**
 * [Error Page] /error
 */
app.get('/error', (c) => {
  return c.render(<ErrorPage />, {
    title: 'Error | お手数ですが再度お試しください',
  })
})

/* --- 2. API / DYNAMIC FRAGMENTS (HTMX Endpoints) --- */

/**
 * [Slot Update] /services/slots
 */
app.get('/services/slots', async (c) => {
  const date = c.req.query('date') || "";
  const planId = c.req.query('plan_id') || "";
  return c.html(await SlotList(c, date, planId));
})

/* --- 3. STRIPE PAYMENT (Post-Booking Logic) --- */

/**
 * [Stripe Session Creation] /services/checkout/session
 * Checkout.tsx の Form 送信を受け取り、Stripe 決済ページへリダイレクトします。
 */
app.post('/services/checkout/session', async (c) => {
  // 環境変数の取得
  const env = c.env as StripeBindings;
  
  // Checkout.tsx からの POST データを受け取る
  const body = await c.req.parseBody();
  
  try {
    const baseUrl = new URL(c.req.url).origin;

    // ⭐️ Step1: stripe-server.ts の外部関数を呼び出し
    // 日本語URLのエンコード処理等は関数内部で完結させています
    const sessionUrl = await createStripeSession(
      env.STRIPE_SECRET_KEY,
      String(body.plan_name),
      Number(body.amount),
      `${baseUrl}/services/success?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/services/checkout?shop_id=${BUSINESS_INFO.shopName}&plan=${body.plan_id}&date=${body.date}&slot=${body.slot}`,
      {
        plan_id: String(body.plan_id),
        date: String(body.date),
        slot: String(body.slot)
      }
    );

    // Stripe 決済画面へリダイレクト
    return c.redirect(sessionUrl, 303);
  } catch (e: any) {
    console.error("Stripe API Error (index):", e.message);
    return c.text(`Stripe API Error: ${e.message}`, 500);
  }
});

/**
 * [Payment Success] /services/success
 */
app.get('/services/success', (c) => {
  const sessionId = c.req.query('session_id') || "";
  return c.render(
    <div class="max-w-xl mx-auto py-20 text-center px-6">
      <h2 class="text-xl font-bold text-gray-900 tracking-widest uppercase mb-4">Payment Successful</h2>
      <p class="text-sm text-gray-500 mb-8">決済が完了しました。ご予約ありがとうございます。</p>
      <div class="p-4 bg-gray-50 border border-gray-100 font-mono text-[10px] text-gray-400 mb-10 break-all">
        SESSION_ID: ${sessionId}
      </div>
      <a href="/" class="inline-block border border-black px-8 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
        Return to Top
      </a>
    </div>,
    { title: 'Payment Success | 決済完了' }
  )
})

export default app