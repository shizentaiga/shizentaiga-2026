/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー（v4.7 グローバル・タイムゾーン対応モデル）。
 * [設計方針]
 * 1. サーバー環境(Cloudflare Workers)のUTC依存を排除し、日本時間(JST)基準の描画を保証。
 * 2. ロジック(Programmer Area)と表示(Designer Area)を分離し、Props注入による疎結合化を実現。
 * 3. クエリパラメータ(shop_id, staff_id)によるマルチテナント展開への柔軟性を確保。
 */

import { Context } from 'hono'
import { html } from 'hono/html'
import { format, addHours } from 'date-fns'
import { BUSINESS_INFO } from '../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS: 外部データ・計算ロジック --- */
import { generateCalendarData } from '../lib/calendar-logic'
import { getAvailableChipsFromDB } from '../db/repositories/booking-db'
import { getPlansFromDB } from '../db/repositories/plan-db'

/* --- 🧱 UI COMPONENTS: 構成部品 --- */
import { ServicePlanList } from '../components/Booking/ServicePlanCard'
import { CalendarSection } from '../components/Booking/CalendarSection'
import { ConsultantSection } from '../components/Layout/ConsultantSection'
import { BookingFooter } from '../components/Booking/BookingFooter'
import { SlotList } from '../components/Booking/SlotList'

// 1. ファイル冒頭（20行目付近）に Bindings を追加
type Bindings = {
  shizentaiga_db: D1Database;
  STRIPE_SECRET_KEY?: string; // ← ここでも ? をつけて同期
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
 */
const ClientScript = () => html`
  <script>
    window.addEventListener('load', function() {
      // 1. 状態監視ユーティリティ：デバッグモニターへの反映
      function updateDebug(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      }

      // 2. 入力変更イベント：プラン選択・スロット選択時の処理
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

      // 3. クリックイベント：カレンダー日付選択時の処理
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

      // 4. データリクエスト：HTMXによるスロット情報の非同期取得
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

      // 5. 通信監視：HTMXのエラーおよびロード完了状態のハンドリング
      document.body.addEventListener('htmx:responseError', function(evt) {
        document.getElementById('error-display')?.classList.remove('hidden');
      });

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
  // --- CONFIGURATION ---
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
 * ここが「最上位」の入り口として、すべての規定値を決定します。
 */
export const Services = async (c: Context<{ Bindings: Bindings }>) => { // ← 型を指定
// export const Services = async (c: Context) => {
  /**
   * タイムゾーン正規化:
   * Workers(UTC)での月末月初バグを防ぐため、物理的に9時間を加算。
   * カレンダー描画およびJSTベースの「今日」の判定に使用する。
   */
  const now = new Date();
  const currentDateJST = addHours(now, 9);

  // ⭐️ 複数店舗・スタッフ対応の準備：将来的にここを query パラメータ取得に差し替えるだけでOK
  const targetShopName = BUSINESS_INFO.shopName; 
  const queryShopId = c.req.query('shop_id'); 
  const queryStaffId = c.req.query('staff_id'); 

  const [displayPlans, rawChips] = await Promise.all([
    getPlansFromDB(c, targetShopName),
    getAvailableChipsFromDB(c)
  ]);
  
  // データ整合性確保（固定値はここに集約し、PageLayoutには計算後の値を渡す）
  const shopId = queryShopId || displayPlans[0]?.shop_id || "shp_zenyu"; 
  const staffId = queryStaffId || "stf_shizentaiga"; 
  
  const defaultPlanId = displayPlans[0]?.plan_id || "";
  const availableDates = rawChips.map(chip => ({ date: chip.date_string }));
  const firstAvailableDate = availableDates[0]?.date || "";

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
    showDebug: true // ⭐️ ここでデバッグの有無を一括管理
  });
}