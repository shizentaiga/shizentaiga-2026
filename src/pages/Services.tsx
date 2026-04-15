/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー（v4.8 予約整合性強化モデル）。
 * [設計方針]
 * 1. ビジネスロジックの分離: カレンダーの空き判定(所要時間考慮)は外部リポジトリへ集約。
 * 2. サーバー環境(UTC)依存の排除: 日本時間(JST)基準の描画を保証。
 * 3. 高い保守性: インターフェースをシンプルに保ち、描画(Designer)とロジック(Programmer)を分離。
 */

import { Context } from 'hono'
import { html } from 'hono/html'
import { format, addHours } from 'date-fns'
import { BUSINESS_INFO } from '../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS: 外部データ・計算ロジック --- */
import { generateCalendarData } from '../lib/calendar-logic'
import { getAvailableDatesByTargetPlan } from '../db/repositories/booking-db'
import { getPlansFromDB } from '../db/repositories/plan-db'

/* --- 🧱 UI COMPONENTS: 構成部品 --- */
import { ServicePlanList } from '../components/Booking/ServicePlanCard'
import { CalendarSection } from '../components/Booking/CalendarSection'
import { ConsultantSection } from '../components/Layout/ConsultantSection'
import { BookingFooter } from '../components/Booking/BookingFooter'
import { SlotList } from '../components/Booking/SlotList'

/**
 * Cloudflare Workers 環境変数の型定義
 */
type Bindings = {
  shizentaiga_db: D1Database;
  STRIPE_SECRET_KEY?: string;
}

/* --- 📄 STATIC STRINGS: 表示文言 --- */
const UI_TEXT = {
  TITLE: "Service Booking",
  SUB_TITLE: "PRIVATE CONSULTATION",
  STEP_PLAN: "01. Select Plan",
  ERROR_FETCH: "データの取得中にエラーが発生しました。通信環境を確認し、ページをリロードしてください。"
};

/**
 * クライアントサイド・スクリプト
 * HTMXを利用した動的な予約スロット更新とデバッグ表示を制御
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
        // プラン変更時：カレンダーで選択中の日付があれば、その日付の枠を再取得
        if (e.target.name === 'plan_id') {
          const selectedPlanId = e.target.value;
          updateDebug('debug-plan', selectedPlanId);
          updateDebug('debug-time', '---');
          const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');
          if (selectedCell) {
            executeSlotRequest(selectedCell.getAttribute('data-date'), selectedPlanId);
          }
        }
        // スロット選択時：デバッグモニターに反映
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
 * 【Debug Area】監視モニターコンポーネント
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

/**
 * 【Designer Area】メインレイアウト・テンプレート
 */
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
 * 【Programmer Area】メインレンダリング関数
 */
export const Services = async (c: Context<{ Bindings: Bindings }>) => {
  // 1. 基準日時の設定（JST）
  const now = new Date();
  const currentDateJST = addHours(now, 9);

  const targetShopName = BUSINESS_INFO.shopName; 
  const queryShopId = c.req.query('shop_id'); 
  const queryStaffId = c.req.query('staff_id'); 

  // 2. 外部データの取得（プラン一覧と、プラン時間を考慮した有効な日付一覧）
  const [displayPlans, availableDates] = await Promise.all([
    getPlansFromDB(c, targetShopName),
    getAvailableDatesByTargetPlan(c, targetShopName)
  ]);
  
  // 3. 規定値の決定とフォールバック
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
    calendarDays: generateCalendarData(currentDateJST),
    availableDates,
    firstAvailableDate,
    defaultPlanId,
    baseYear: parseInt(format(currentDateJST, 'yyyy')),
    baseMonth: parseInt(format(currentDateJST, 'MM')),
    showDebug: true 
  });
}