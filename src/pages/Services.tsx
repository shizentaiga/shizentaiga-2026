/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー。
 * [v5.8 ナビゲーション統合：CalendarSection2への完全移行]
 */

import { Context } from 'hono'
import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS --- */
import { generateCalendarData, generateCalendarDataWithNavigation } from '../lib/calendar-logic'
import { getAvailableDatesByTargetPlan } from '../db/repositories/booking-db'
import { getPlansFromDB } from '../db/repositories/plan-db'

/* --- 🧱 UI COMPONENTS --- */
import { ServicePlanList } from '../components/Booking/ServicePlanCard'
import { CalendarSection } from '../components/Booking/CalendarSection'
import { ConsultantSection } from '../components/Layout/ConsultantSection'
import { BookingFooter } from '../components/Booking/BookingFooter'
import { SlotList } from '../components/Booking/SlotList'

type Bindings = {
  shizentaiga_db: D1Database;
  STRIPE_SECRET_KEY?: string;
}

const UI_TEXT = {
  TITLE: "Service Booking",
  SUB_TITLE: "PRIVATE CONSULTATION",
  STEP_PLAN: "01. Select Plan",
  ERROR_FETCH: "データの取得中にエラーが発生しました。通信環境を確認し、ページをリロードしてください。"
};

/**
 * 💡 クライアントサイド・スクリプト
 */
const ClientScript = () => html`
  <script>
    window.addEventListener('load', function() {
      function updateDebug(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      }
      document.addEventListener('change', function(e) {
        if (!e.target) return;
        if (e.target.name === 'plan_id') {
          const selectedPlanId = e.target.value;
          updateDebug('debug-plan', selectedPlanId);
          updateDebug('debug-time', '---');
          const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');
          if (selectedCell) {
            executeSlotRequest(selectedCell.getAttribute('data-date'), selectedPlanId);
          }
        }
        if (e.target.name === 'slot_id') {
          const displayTime = e.target.getAttribute('data-time') || "Selected";
          const unixTimestamp = e.target.value;
          updateDebug('debug-time', displayTime + ' (' + unixTimestamp + ')');
        }
      });
      document.addEventListener('click', function(e) {
        const cell = e.target.closest('.calendar-day-cell');
        if (cell) {
          const date = cell.getAttribute('data-date');
          const planId = document.querySelector('input[name="plan_id"]:checked')?.value;
          document.querySelectorAll('.calendar-day-cell').forEach(el => el.setAttribute('data-selected', 'false'));
          cell.setAttribute('data-selected', 'true');
          updateDebug('debug-date', date);
          updateDebug('debug-time', '---');
          executeSlotRequest(date, planId);
        }
      });
      function executeSlotRequest(date, planId) {
        if (!date || !planId) return;
        updateDebug('debug-htmx', 'Fetching...');
        if (window.htmx) {
          htmx.ajax('GET', '/services/slots', {
            values: { date, plan_id: planId },
            target: '#slot-list-container'
          });
        }
      }
      document.body.addEventListener('htmx:afterOnLoad', function(evt) {
        if (evt.detail.target.id === 'slot-list-container') {
           document.getElementById('error-display')?.classList.add('hidden');
           updateDebug('debug-htmx', 'Idle');
        }
      });
    });
  </script>
`;

/**
 * 💡 デバッグモニター
 */
const DebugMonitor = (shopId: string, staffId: string, viewMonth: string, firstAvail: string) => html`
  <div id="debug-monitor" class="fixed bottom-4 left-4 z-50 bg-black/85 text-[9px] font-mono text-green-400 p-3 rounded-sm border border-green-500/30 w-64 shadow-2xl pointer-events-none">
    <p class="border-b border-green-500/30 mb-2 pb-1 text-white font-bold tracking-tighter uppercase">SYSTEM_STATE_MONITOR</p>
    <div class="space-y-1">
      <p>SHOP_ID    : <span class="text-blue-300">${shopId}</span></p>
      <p>STAFF_ID   : <span class="text-blue-300">${staffId}</span></p>
      <p>VIEW_MON   : <span class="text-pink-400 font-bold">${viewMonth}</span></p>
      <p>FIRST_AVAIL: <span class="text-orange-400 font-bold">${firstAvail || "(Empty)"}</span></p>
      <p class="border-t border-green-500/10 my-1"></p>
      <p>PLAN_ID    : <span id="debug-plan" class="text-yellow-400">---</span></p>
      <p>DATE       : <span id="debug-date" class="text-yellow-400">---</span></p>
      <p>TIME       : <span id="debug-time" class="text-pink-400">---</span></p>
      <p>NETWORK    : <span id="debug-htmx" class="text-blue-400">Idle</span></p>
    </div>
  </div>
`;

const PageLayout = async (props: {
  ctx: Context,
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
  prevMonthStr: string, // 追加
  nextMonthStr: string, // 追加
  showDebug?: boolean 
}) => {
  const { showDebug = true } = props; 

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
      ${ClientScript()}
      ${showDebug ? DebugMonitor(props.shopId, props.staffId, props.viewMonthStr, props.firstAvailableDate) : ''}
    </body>
  `;
}

/**
 * 【Programmer Area】
 */
export const Services = async (c: Context<{ Bindings: Bindings }>) => {
  const db = c.env.shizentaiga_db;

  // 1. 基準日時の取得
  const serverTime = await db.prepare(`
    SELECT 
      strftime('%Y', 'now', '+9 hours') as year,
      strftime('%m', 'now', '+9 hours') as month,
      datetime('now', '+9 hours') as full_now
  `).first<Record<string, string>>();

  const currentYear = serverTime ? parseInt(serverTime.year) : new Date().getFullYear();
  const currentMonth = serverTime ? parseInt(serverTime.month) : new Date().getMonth() + 1;
  
  const jstNowDate = serverTime 
    ? new Date(serverTime.full_now.replace(' ', 'T') + '+09:00')
    : new Date();

  // --- [ステップ1：URLパラメータから表示月を特定] ---
  const queryMonth = c.req.query('month'); 
  const viewMonthStr = queryMonth || `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  
  // --- [ステップ2：表示用基準Dateの生成] ---
  const [viewY, viewM] = viewMonthStr.split('-').map(Number);
  const baseDateForCalendar = new Date(`${viewY}-${String(viewM).padStart(2, '0')}-02T00:00:00+09:00`);

  const targetShopName = BUSINESS_INFO.shopName; 
  const queryShopId = c.req.query('shop_id'); 
  const queryStaffId = c.req.query('staff_id'); 

  // 2. 外部データの取得
  const [displayPlans, availableDates] = await Promise.all([
    getPlansFromDB(c, targetShopName),
    getAvailableDatesByTargetPlan(c, targetShopName)
  ]);
  
  // 3. 規定値の決定
  const firstPlan = displayPlans[0];
  const shopId = queryShopId || firstPlan?.shop_id || "shp_zenyu"; 
  const staffId = queryStaffId || "stf_shizentaiga"; 
  const defaultPlanId = firstPlan?.plan_id || "";
  
  // --- [ステップ3：文脈（表示月）を重視した日付抽出ロジック] ---
  const dateInMonth = availableDates.find(d => d.date.startsWith(viewMonthStr))?.date;
  const dateInFuture = availableDates.find(d => d.date > viewMonthStr)?.date;
  const firstAvailableDate = dateInMonth || "";
  // const firstAvailableDate = dateInMonth || dateInFuture || "";

  // --- [ステップ4：ナビゲーションURLの生成] ---
  const prevDate = new Date(viewY, viewM - 2, 1);
  const nextDate = new Date(viewY, viewM, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

  // 4. レイアウトへのProps注入
  return PageLayout({
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
    prevMonthStr, // CalendarSection2 用に追加
    nextMonthStr, // CalendarSection2 用に追加
    showDebug: true 
  });
}