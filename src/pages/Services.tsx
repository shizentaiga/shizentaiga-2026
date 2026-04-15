/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー。
 * [v5.2 整合性再構築：SQL基準同期モデル]
 * * 修正の根拠:
 * 1. 実行環境（Local/Cloud）による Date の解釈差異を排除するため、基準時間をDBから取得。
 * 2. test02 で正常動作が確認されている「strftime +9 hours」を唯一の正解とする。
 */

import { Context } from 'hono'
import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS --- */
import { generateCalendarData } from '../lib/calendar-logic'
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
 * 💡 クライアントサイド・スクリプト（変更なし）
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
 * 💡 デバッグモニター（変更なし）
 */
const DebugMonitor = (shopId: string, staffId: string) => html`
  <div id="debug-monitor" class="fixed bottom-4 left-4 z-50 bg-black/85 text-[9px] font-mono text-green-400 p-3 rounded-sm border border-green-500/30 w-64 shadow-2xl pointer-events-none">
    <p class="border-b border-green-500/30 mb-2 pb-1 text-white font-bold tracking-tighter uppercase">SYSTEM_STATE_MONITOR</p>
    <div class="space-y-1">
      <p>SHOP_ID : <span class="text-blue-300">${shopId}</span></p>
      <p>STAFF_ID: <span class="text-blue-300">${staffId}</span></p>
      <p>PLAN_ID : <span id="debug-plan" class="text-yellow-400">---</span></p>
      <p>DATE    : <span id="debug-date" class="text-yellow-400">---</span></p>
      <p>TIME    : <span id="debug-time" class="text-pink-400">---</span></p>
      <p>NETWORK : <span id="debug-htmx" class="text-blue-400">Idle</span></p>
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
          ${CalendarSection(props.calendarDays, props.availableDates, props.firstAvailableDate, props.baseYear, props.baseMonth)}
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
      ${showDebug ? DebugMonitor(props.shopId, props.staffId) : ''}
    </body>
  `;
}

/**
 * 【Programmer Area】
 */
export const Services = async (c: Context<{ Bindings: Bindings }>) => {
  const db = c.env.shizentaiga_db;

  // 1. 基準日時の取得（test02準拠のSQL取得）
  // 型安全のため record 型としてキャスト
  const serverTime = await db.prepare(`
    SELECT 
      strftime('%Y', 'now', '+9 hours') as year,
      strftime('%m', 'now', '+9 hours') as month,
      datetime('now', '+9 hours') as full_now
  `).first<Record<string, string>>();

  // 万が一DB取得に失敗した際のフォールバック
  const currentYear = serverTime ? parseInt(serverTime.year) : new Date().getFullYear();
  const currentMonth = serverTime ? parseInt(serverTime.month) : new Date().getMonth() + 1;
  
  // カレンダー生成用の Date。
  // datetime('now', '+9 hours') の形式は "YYYY-MM-DD HH:MM:SS" なので、
  // ISO形式に整えて JS に「これはJSTだ」と教える。
  const jstNowDate = serverTime 
    ? new Date(serverTime.full_now.replace(' ', 'T') + '+09:00')
    : new Date();

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
  const firstAvailableDate = availableDates[0]?.date || "";

  // 4. レイアウトへのProps注入
  return PageLayout({
    ctx: c,
    shopId,
    staffId,
    displayPlans,
    calendarDays: generateCalendarData(jstNowDate), 
    availableDates,
    firstAvailableDate,
    defaultPlanId,
    baseYear: currentYear,
    baseMonth: currentMonth,
    showDebug: true 
  });
}