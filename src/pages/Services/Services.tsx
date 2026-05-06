/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー及びハンドラー群。
 */

import { BUSINESS_INFO } from '../../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS --- */
import { generateCalendarDataWithNavigation } from '../../lib/calendar-logic'
import { getAvailableDatesByTargetPlan } from '../../db/repositories/booking-db'
import { getPlansFromDB, getPlanById } from '../../db/repositories/plan-db'

/* --- 🧱 UI COMPONENTS --- */
import { SlotList } from '../../components/Booking/SlotList'

/* --- 📄 SUB PAGES & TOOLS --- */
import { Checkout } from './Checkout'
import { SuccessPage } from './Success'
import { createStripeSession } from '../../lib/stripe-server'

/* --- 🏗️ LAYOUT IMPORT --- */
import { PageLayout } from './ServicesLayout'

/* --- 🚀 EXPORTED HANDLERS --- */

/**
 * [PAGE] Services メイン
 */
export const ServicesPage = async (c: any) => {
  const db = c.env.shizentaiga_db;

  const res: any = await db.prepare(`
    SELECT 
      strftime('%Y', 'now', '+9 hours') as year,
      strftime('%m', 'now', '+9 hours') as month
  `).first();

  const currentYear = res ? parseInt(res.year) : new Date().getFullYear();
  const currentMonth = res ? parseInt(res.month) : new Date().getMonth() + 1;

  const queryMonth = c.req.query('month'); 
  const viewMonthStr = queryMonth || `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  
  const [viewY, viewM] = viewMonthStr.split('-').map(Number);
  const baseDateForCalendar = new Date(`${viewY}-${String(viewM).padStart(2, '0')}-02T00:00:00+09:00`);

  const targetShopName = BUSINESS_INFO.shopName;  // "善幽"
  const [displayPlans, availableDates] = await Promise.all([
    getPlansFromDB(c, targetShopName),
    getAvailableDatesByTargetPlan(c, targetShopName)
  ]);
  
  const firstPlan = displayPlans[0];
  const shopId = c.req.query('shop_id') || firstPlan?.shop_id || "shp_zenyu"; 
  const staffId = c.req.query('staff_id') || "stf_shizentaiga"; 
  const defaultPlanId = firstPlan?.plan_id || "";
  
  const dateInMonth = availableDates.find((d: any) => d.date.startsWith(viewMonthStr))?.date;
  const firstAvailableDate = dateInMonth || "";

  const prevDate = new Date(viewY, viewM - 2, 1);
  const nextDate = new Date(viewY, viewM, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

  const content = await PageLayout({
    ctx: c,
    shopId,
    staffId,
    displayPlans,
    calendarDays: generateCalendarDataWithNavigation(baseDateForCalendar), 
    availableDates,
    firstAvailableDate,
    defaultPlanId,
    baseYear: viewY,
    baseMonth: viewM,
    viewMonthStr, 
    prevMonthStr,
    nextMonthStr,
  });

  return c.render(content, { title: 'Services' });
}

/**
 * [HTMX] スロット一覧取得
 */
export const handleSlotList = async (c: any) => {
  const date = c.req.query('date') || "";
  const planId = c.req.query('plan_id') || "";
  return c.html(await SlotList(c, date, planId));
};

/**
 * [PAGE] チェックアウト確認
 */
export const renderCheckoutPage = async (c: any) => {
  const shopId = c.req.query('shop_id');
  const planId = c.req.query('plan');
  const date = c.req.query('date');
  const slot = c.req.query('slot');

  if (!shopId || !planId || !date || !slot) return c.redirect('/error');

  try {
    const plan = await getPlanById(c, shopId, planId);
    if (!plan) return c.redirect('/error');

    const props = {
      shopName: BUSINESS_INFO.shopName, // "善幽"
      staffName: BUSINESS_INFO.staffName, // "清善 泰賀"
      planName: plan.plan_name,
      duration: plan.duration_min,
      price: plan.price_amount,
      rawShopId: shopId,
      rawPlanId: planId,
      date, 
      slot, 
      backUrl: "/services"
    };

    return c.render(<Checkout {...props} />, { title: 'Confirm Booking' });
  } catch (e) {
    return c.redirect('/error');
  }
};

/**
 * [ACTION] Stripe セッション作成
 */
export const handleStripeSession = async (c: any) => {
  const body = await c.req.parseBody();
  const baseUrl = new URL(c.req.url).origin;

  try {
    const { plan_name, amount, plan_id, shop_id, date, slot } = body;
    const sessionUrl = await createStripeSession(
      c.env.STRIPE_SECRET_KEY,
      String(plan_name),
      Number(amount),
      `${baseUrl}/services/success?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/services/checkout?shop_id=${shop_id}&plan=${plan_id}&date=${date}&slot=${slot}`,
      { plan_id: String(plan_id), date: String(date), slot: String(slot) }
    );
    return c.redirect(sessionUrl, 303);
  } catch (e: any) {
    return c.text(`Stripe API Error: ${e.message}`, 500);
  }
};

/**
 * [PAGE] 完了画面
 */
export const renderSuccessPage = (c: any) => {
  const sessionId = c.req.query('session_id') || "";
  return c.render(<SuccessPage sessionId={sessionId} />, { title: 'Payment Success' });
};