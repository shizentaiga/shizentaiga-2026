/**
 * @file index.tsx
 * @description アプリケーションのエントリーポイント。
 */

import { Hono } from 'hono'
import { Context } from 'hono'
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

import sandboxBridge from './_sandbox/_bridge';

/* --- 📌 TYPE DEFINITIONS --- */
type BaseBindings = { shizentaiga_db: D1Database; }
type StripeBindings = BaseBindings & { STRIPE_SECRET_KEY: string; }

 // URLの末尾のスラッシュを無視(strict: false)
const app = new Hono<{ Bindings: BaseBindings }>({ strict: false })

/* --- 0. CONFIGURATION & ASSETS --- */
app.all('*', renderer)
app.route('/_debug', sandboxBridge); 

/* --- 1. PAGE HANDLERS --- */
const renderTopPage = (c: Context) => c.render(<Top />);
const renderLegalPage = (c: Context) => c.render(<Legal />);

/* [SERVICES]  */
const renderServicesPage = async (c: any) => {
  const content = await Services(c);
  return c.render(content, { title: 'Services' });
};

/** [CHECKOUT] */
const renderCheckoutPage = async (c: any) => {
  // 💡 環境判定（Cloudflare Dashboard または .dev.vars の NODE_ENV を参照）
  const isDev = (c.env as any).NODE_ENV === 'development';

  const shopId = c.req.query('shop_id');
  const planId = c.req.query('plan');
  const date = c.req.query('date');   // YYYY-MM-DD
  const slot = c.req.query('slot');   // 生の UnixTime (文字列)

  if (!shopId || !planId || !date || !slot) return c.redirect('/error');

  try {
    const plan = await getPlanById(c, shopId, planId);
    if (!plan) return c.redirect('/error');

    /**
     * 💡 生の slot (UnixTime) をそのまま Checkout へ渡す。
     * 💡 実際の「+9h 表示」は、受け取った Checkout.tsx 側で実行
     */
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
      showDebug: isDev, // 💡 判定結果を注入
      backUrl: "/services"
    };

    return c.render(<Checkout {...checkoutProps} />, { title: 'Confirm Booking' });
  } catch (e) {
    console.error("Checkout Error:", e);
    return c.redirect('/error');
  }
};

/* --- 2. ACTION HANDLERS --- */

const handleStripeSession = async (c: any) => {
  const env = c.env as StripeBindings;
  const body = await c.req.parseBody();
  const baseUrl = new URL(c.req.url).origin;

  try {
    const { plan_name, amount, plan_id, shop_id, date, slot } = body;
    const shopIdStr = String(shop_id);

    const successUrl = `${baseUrl}/services/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/services/checkout?shop_id=${shopIdStr}&plan=${plan_id}&date=${date}&slot=${slot}`;

    /**
     * 💡 Stripeのメタデータ、戻りURLのパラメータ、共に「生の UnixTime」を維持。
     * 💡 これにより、キャンセルして戻ってきた際も、再び同じ slot (UTC数値) で
     * チェックアウト画面を開き直すことができる。
     */
    const sessionUrl = await createStripeSession(
      env.STRIPE_SECRET_KEY,
      String(plan_name),
      Number(amount),
      successUrl,
      cancelUrl,
      { plan_id: String(plan_id), date: String(date), slot: String(slot) }
    );

    return c.redirect(sessionUrl, 303);
  } catch (e: any) {
    console.error("Stripe Error:", e.message);
    return c.text(`Stripe API Error: ${e.message}`, 500);
  }
};

/* --- 3. ROUTE MAPPING --- */

app.get('/', renderTopPage);
app.get('/legal', renderLegalPage);
app.get('/services', renderServicesPage);
app.get('/services/checkout', renderCheckoutPage);
app.get('/contact', (c) => c.render(<ContactPage />, { title: 'Contact' }));
app.get('/error', (c) => c.render(<ErrorPage />, { title: 'Error' }));

app.get('/services/slots', async (c) => {
  const date = c.req.query('date') || "";
  const planId = c.req.query('plan_id') || "";
  
  /**
   * 💡 SlotList コンポーネント側でのみ、最後に表示補正を行う。
   * 💡 index.tsx ではパラメータを渡すことに徹する。
   */
  return c.html(await SlotList(c, date, planId));
});

app.post('/services/checkout/session', handleStripeSession);

app.get('/services/success', (c) => {
  const sessionId = c.req.query('session_id') || "";
  return c.render(<SuccessPage sessionId={sessionId} />, { title: 'Payment Success' });
});

export default app;