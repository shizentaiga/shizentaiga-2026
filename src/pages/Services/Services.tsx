/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー及びハンドラー群。
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS --- */
import { generateCalendarDataWithNavigation } from '../../lib/calendar-logic'
import { getAvailableDatesByTargetPlan } from '../../db/repositories/booking-db'
import { getPlansFromDB, getPlanById } from '../../db/repositories/plan-db'

/* --- 🧱 UI COMPONENTS --- */
import { ServicePlanList } from '../../components/Booking/ServicePlanCard'
import { CalendarSection } from '../../components/Booking/CalendarSection'
import { ConsultantSection } from '../../components/Layout/ConsultantSection'
import { BookingFooter } from '../../components/Booking/BookingFooter'
import { SlotList } from '../../components/Booking/SlotList'

/* --- 📄 SUB PAGES & TOOLS --- */
import { Checkout } from './Checkout'
import { SuccessPage } from './Success'
import { createStripeSession } from '../../lib/stripe-server'
import { ServicesClientScript } from './services-client'

const UI_TEXT = {
  TITLE: "Service Booking",
  SUB_TITLE: "PRIVATE CONSULTATION",
  STEP_PLAN: "01. Select Plan",
  ERROR_FETCH: "データの取得中にエラーが発生しました。通信環境を確認し、ページをリロードしてください。"
};

const PageLayout = async (props: {
  ctx: any,
  shopId: string,
  staffId: string, 
  displayPlans: any[],
  calendarDays: any[],
  availableDates: { date: string }[],
  firstAvailableDate: string,
  defaultPlanId: string,
  baseYear: number,
  baseMonth: number,
  viewMonthStr: string,
  prevMonthStr: string,
  nextMonthStr: string,
}) => {

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">${UI_TEXT.TITLE}</h1>
        <p class="text-[10px] text-gray-600 mt-2 tracking-widest">${UI_TEXT.SUB_TITLE}</p>
      </header>
      <div class="max-w-3xl mx-auto p-6">
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">${UI_TEXT.STEP_PLAN}</h2>
          <div id="plan-selection-area">
            ${ServicePlanList(props.displayPlans)}
          </div>
        </section>

        <div id="calendar-container" class="mb-12">
          ${CalendarSection(
            props.calendarDays, 
            props.availableDates, 
            props.firstAvailableDate, 
            props.baseYear, 
            props.baseMonth,
            props.prevMonthStr,
            props.nextMonthStr
          )}
        </div>

        <div id="slot-list-container" class="mb-12">
          ${await SlotList(props.ctx, props.firstAvailableDate, props.defaultPlanId)}
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-[10px] rounded-sm text-center tracking-widest">
          ${UI_TEXT.ERROR_FETCH}
        </div>

        ${ConsultantSection()}
      </div>
      ${BookingFooter(props.shopId)} 

      <!-- 外部スクリプト -->
      ${ServicesClientScript()}
    </body>
  `;
}

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

  const targetShopName = BUSINESS_INFO.shopName; 
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
      shopName: BUSINESS_INFO.shopName,
      staffName: "清善 泰賀",
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