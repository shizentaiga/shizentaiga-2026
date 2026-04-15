/**
 * @file index.tsx
 * @description アプリケーションのエントリーポイント。
 * [v4.8 構造化リファクタリング]
 * - ビジネスロジックをハンドラー関数として分離し、ルート定義の視認性を向上。
 * - 1行1処理を基本とし、コメントを読むだけで改修箇所が特定できる設計。
 */

import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
import { renderer } from './renderer' 

/* --- 🧱 UI COMPONENTS & PAGES --- */
import { Top } from './pages/Top'      
import { Legal } from './pages/Legal' 
import { ErrorPage } from './pages/Error'
import { ContactPage } from './pages/Contact'
import { SuccessPage } from './pages/Success'
import { Services } from './pages/Services'
import { Checkout } from './pages/Checkout'
import { SlotList } from './components/Booking/SlotList'

/* --- ⚙️ DATA ACCESS --- */
import { getPlanById } from './db/repositories/plan-db' 
import { BUSINESS_INFO } from './constants/info'

/* --- 💳 EXTERNAL SERVICES --- */
import { createStripeSession } from './lib/stripe-server'

/* --- 📌 TYPE DEFINITIONS --- */
type BaseBindings = { shizentaiga_db: D1Database; }
type StripeBindings = BaseBindings & { STRIPE_SECRET_KEY: string; }

const app = new Hono<{ Bindings: BaseBindings }>()

/* --- 0. CONFIGURATION & ASSETS --- */

// 静的資産の配信
// @ts-ignore
app.use('/static/*', serveStatic({ root: './' }))

// 全ページ共通レイアウトの適用
app.all('*', renderer)

// デバッグ用サンドボックス
import sandboxBridge from './_sandbox/_bridge';
app.route('/_debug', sandboxBridge); 

/* --- 1. PAGE HANDLERS (表示処理の定義) --- */

/**
 * [TOP] トップページ
 */
const renderTopPage = (c: any) => c.render(<Top />, {
  title: '清善 泰賀 | 公式サイト',
  description: 'マネジメントコンサルタント 清善 泰賀のオフィシャルサイトです。'
});

/**
 * [LEGAL] 特定商取引法に基づく表記
 */
const renderLegalPage = (c: any) => c.render(<Legal />, { 
  title: 'Legal Information | 特定商取引法に基づく表記' 
});

/**
 * [SERVICES] サービス一覧・予約開始ページ
 */
const renderServicesPage = async (c: any) => {
  const content = await Services(c);
  return c.render(content, { title: 'Services & Booking | 予約案内' });
};

/**
 * [CHECKOUT] 予約内容最終確認ページ
 */
const renderCheckoutPage = async (c: any) => {
  // 1. クエリパラメータの抽出
  const shopId = c.req.query('shop_id');
  const planId = c.req.query('plan');
  const date = c.req.query('date');
  const slot = c.req.query('slot');

  // 2. パラメータ不足ならエラーへ
  if (!shopId || !planId || !date || !slot) return c.redirect('/error');

  try {
    // 3. DBからプラン詳細を取得
    const plan = await getPlanById(c, shopId, planId);
    if (!plan) return c.redirect('/error');

    // 4. 環境設定と表示用Propsの整理
    const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
    const checkoutProps = {
      shopName: BUSINESS_INFO.shopName,
      staffName: "清善 泰賀",
      planName: plan.plan_name,
      duration: plan.duration_min,
      price: plan.price_amount,
      rawShopId: shopId,
      rawPlanId: planId,
      date,
      slot,
      showDebug: isDev,
      backUrl: "/services"
    };

    // 5. 画面描画
    return c.render(<Checkout {...checkoutProps} />, { title: 'Confirm Booking' });
  } catch (e) {
    console.error("Checkout Error:", e);
    return c.redirect('/error');
  }
};

/* --- 2. ACTION HANDLERS (実行処理の定義) --- */

/**
 * [STRIPE] 決済セッション作成処理
 */
const handleStripeSession = async (c: any) => {
  const env = c.env as StripeBindings;
  const body = await c.req.parseBody();
  const baseUrl = new URL(c.req.url).origin;

  try {
    // 1. POSTデータの変数化
    const { plan_name, amount, plan_id, shop_id, date, slot } = body;
    const shopIdStr = String(shop_id);

    // 2. Stripe用URLの構築
    const successUrl = `${baseUrl}/services/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/services/checkout?shop_id=${shopIdStr}&plan=${plan_id}&date=${date}&slot=${slot}`;

    // 3. セッション作成実行
    const sessionUrl = await createStripeSession(
      env.STRIPE_SECRET_KEY,
      String(plan_name),
      Number(amount),
      successUrl,
      cancelUrl,
      { plan_id: String(plan_id), date: String(date), slot: String(slot) }
    );

    // 4. Stripe決済画面へリダイレクト
    return c.redirect(sessionUrl, 303);
  } catch (e: any) {
    console.error("Stripe Error:", e.message);
    return c.text(`Stripe API Error: ${e.message}`, 500);
  }
};

/* --- 3. ROUTE MAPPING (URLと処理の紐付け) --- */

app.get('/', renderTopPage);
app.get('/legal', renderLegalPage);
app.get('/services', renderServicesPage);
app.get('/services/checkout', renderCheckoutPage);
app.get('/contact', (c) => c.render(<ContactPage />, { title: 'Contact' }));
app.get('/error', (c) => c.render(<ErrorPage />, { title: 'Error' }));

// HTMX: スロット更新用
app.get('/services/slots', async (c) => {
  const date = c.req.query('date') || "";
  const planId = c.req.query('plan_id') || "";
  return c.html(await SlotList(c, date, planId));
});

// Stripe: 決済実行用
app.post('/services/checkout/session', handleStripeSession);

// Success: 決済完了
app.get('/services/success', (c) => {
  const sessionId = c.req.query('session_id') || "";
  return c.render(<SuccessPage sessionId={sessionId} />, { title: 'Payment Success' });
});

export default app;