/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー（v3.5 監査指摘反映・鉄壁モデル）。
 * * [監査反映] 
 * A. 日付選択時に `data-selected` 属性を動的に付け替え、プラン変更時の再送ロジックを確立。
 * B. スクリプト全体を `window.load` で保護し、HTMX未定義エラーを防止。
 */

import { html } from 'hono/html'
import { Context } from 'hono'
import { format } from 'date-fns'
import { BUSINESS_INFO } from '../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS --- */
import { generateCalendarData } from '../lib/calendar-logic'
import { getAvailableChipsFromDB } from '../db/booking-db'
import { getPlansFromDB } from '../db/plan-db'

/* --- 🧱 UI COMPONENTS --- */
import { ServicePlanList } from '../components/Booking/ServicePlanCard'
import { CalendarSection } from '../components/Booking/CalendarSection'
import { ConsultantSection } from '../components/Layout/ConsultantSection'
import { BookingFooter } from '../components/Booking/BookingFooter'
import { SlotList } from '../components/Booking/SlotList'

/* --- 📄 STATIC STRINGS --- */
const UI_TEXT = {
  TITLE: "Service Booking",
  SUB_TITLE: "PRIVATE CONSULTATION",
  STEP_PLAN: "01. Select Plan",
  ERROR_FETCH: "データの取得中にエラーが発生しました。通信環境を確認し、ページをリロードしてください。"
};

/**
 * クライアントサイド・スクリプト
 */
const ClientScript = () => html`
  <script>
    /**
     * [監査B対応] 鉄壁のロード保護
     * 全てのDOMおよび外部スクリプト(HTMX)がロードされた後に初期化。
     */
    window.addEventListener('load', function() {

      /* --- [デバッグ開始] 監視ヘルパー --- */
      function updateDebug(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      }
      /* --- [デバッグ終了] --- */

      /**
       * プラン変更時の処理
       */
      document.addEventListener('change', function(e) {
        if (e.target && e.target.name === 'plan_id') {
          const selectedPlanId = e.target.value;

          /* --- [デバッグ開始] --- */
          updateDebug('debug-plan', selectedPlanId);
          /* --- [デバッグ終了] --- */

          /**
           * [監査A対応]
           * 属性の付け替えが行われているため、querySelectorで「現在の日付」を確実に捕捉可能。
           */
          const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');
          if (selectedCell) {
            executeSlotRequest(selectedCell.getAttribute('data-date'), selectedPlanId);
          }
        }
      });

      /**
       * カレンダーの日付クリック監視
       */
      document.addEventListener('click', function(e) {
        const cell = e.target.closest('.calendar-day-cell');
        if (cell) {
          const date = cell.getAttribute('data-date');
          const planId = document.querySelector('input[name="plan_id"]:checked')?.value;

          /**
           * [監査A対応] 属性の付け替えロジック
           * 他の全セルの選択を解除し、クリックされたセルのみを「真」にする。
           */
          document.querySelectorAll('.calendar-day-cell').forEach(el => el.setAttribute('data-selected', 'false'));
          cell.setAttribute('data-selected', 'true');

          /* --- [デバッグ開始] --- */
          updateDebug('debug-date', date);
          /* --- [デバッグ終了] --- */

          executeSlotRequest(date, planId);
        }
      });

      /**
       * スロット取得リクエストの実行
       */
      function executeSlotRequest(date, planId) {
        if (!date || !planId) return;

        /* --- [デバッグ開始] --- */
        updateDebug('debug-htmx', 'Fetching...');
        /* --- [デバッグ終了] --- */

        /**
         * [監査B対応] 
         * ロードイベント内かつグローバルチェックを行い、htmx.ajaxを実行。
         */
        if (window.htmx) {
          htmx.ajax('GET', '/services/slots', {
            values: { date, plan_id: planId },
            target: '#slot-list-container'
          });
        }
      }

      document.body.addEventListener('htmx:responseError', function(evt) {
        document.getElementById('error-display')?.classList.remove('hidden');
      });

      document.body.addEventListener('htmx:afterOnLoad', function(evt) {
        if (evt.detail.target.id === 'slot-list-container') {
           document.getElementById('error-display')?.classList.add('hidden');
           /* --- [デバッグ開始] --- */
           updateDebug('debug-htmx', 'Idle');
           /* --- [デバッグ終了] --- */
        }
      });
    });
  </script>
`;

/**
 * 【Debug Area】監視モニターコンポーネント
 */
const DebugMonitor = () => html`
  <div id="debug-monitor" class="fixed bottom-4 left-4 z-50 bg-black/85 text-[9px] font-mono text-green-400 p-3 rounded-sm border border-green-500/30 w-64 shadow-2xl pointer-events-none">
    <p class="border-b border-green-500/30 mb-2 pb-1 text-white font-bold tracking-tighter">SYSTEM_STATE_MONITOR</p>
    <div class="space-y-1">
      <p>PLAN_ID : <span id="debug-plan" class="text-yellow-400">---</span></p>
      <p>DATE    : <span id="debug-date" class="text-yellow-400">---</span></p>
      <p>NETWORK : <span id="debug-htmx" class="text-blue-400">Idle</span></p>
    </div>
  </div>
`;

/**
 * 【Designer Area】メインレイアウト・テンプレート
 */
const PageLayout = async (props: {
  ctx: Context,
  displayPlans: any[],
  calendarDays: any[],
  availableDates: { date: string }[],
  firstAvailableDate: string,
  defaultPlanId: string,
  baseYear: number,
  baseMonth: number
}) => html`
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
          props.baseMonth
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

    ${BookingFooter()}
    ${ClientScript()}
    ${DebugMonitor() /* 不要になったらここを消すだけ */}
  </body>
`;

/**
 * 【Programmer Area】メインエントリーポイント
 */
export const Services = async (c: Context) => {
  const currentDate = new Date();

  const [displayPlans, rawChips] = await Promise.all([
    getPlansFromDB(c, BUSINESS_INFO.shopName),
    getAvailableChipsFromDB(c)
  ]);

  const defaultPlanId = displayPlans[0]?.plan_id || "";
  const availableDates = rawChips.map(chip => ({ date: chip.date_string }));
  const firstAvailableDate = availableDates[0]?.date || "";

  return PageLayout({
    ctx: c,
    displayPlans,
    calendarDays: generateCalendarData(currentDate),
    availableDates,
    firstAvailableDate,
    defaultPlanId,
    baseYear: parseInt(format(currentDate, 'yyyy')),
    baseMonth: parseInt(format(currentDate, 'MM'))
  });
}