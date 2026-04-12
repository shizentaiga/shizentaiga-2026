/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー。
 * * [技術スタックに関する注意点]
 * 1. CDN依存のリスク: 
 * 現在 unpkg.com (HTMX) および cdn.tailwind.com を使用中。
 * スタートアップ速度優先だが、商用リリース前にはセルフホスト（ローカルファイル読み込み）
 * またはビルド時の CSS 埋め込みへの移行を推奨。
 * 2. 日付処理: 
 * JS標準の Date オブジェクトによる「0開始月」などの混乱を防ぐため、date-fns を導入。
 */

import { html } from 'hono/html'
import { format } from 'date-fns' // 日付操作ライブラリ

/* --- LOGIC --- */
import { generateCalendarData } from '../lib/calendar-logic'

/* --- COMPONENTS --- */
import { ServicePlanList } from '../components/Booking/ServicePlanCard'
import { CalendarSection } from '../components/Booking/CalendarSection'
import { ConsultantSection } from '../components/Layout/ConsultantSection'
import { BookingFooter } from '../components/Booking/BookingFooter'
import { SlotList } from '../components/Booking/SlotList'

/* --- DB ACCESS --- */
import { getAvailableChipsFromDB } from '../db/booking-db'
import { getPlansFromDB } from '../db/plan-db'

export const Services = async (c: any) => {
  /**
   * 基準となる現在時刻の取得
   * 注: new Date() は SSR 実行時（サーバーサイド）の時刻を取得します。
   */
  const currentDate = new Date();
  const calendarDays = generateCalendarData(currentDate);
  
  const displayPlans = await getPlansFromDB(c);
  const defaultPlanId = displayPlans[0]?.plan_id || "";

  // DBから「予約可能なチップ」を取得し、カレンダーのドット表示用に使用
  const rawChips = await getAvailableChipsFromDB(c);
  const availableDates = rawChips.map(chip => ({ 
    date: chip.date_string 
  }));

  const firstAvailableDate = availableDates[0]?.date || "";

  /**
   * カレンダー描画用の年月を抽出
   * * [date-fns 使用前]
   * const baseYear = currentDate.getFullYear();
   * const baseMonth = currentDate.getMonth() + 1; // +1が必要なのが落とし穴
   * * [date-fns 使用後]
   * format を使うことで、直感的な数値（1月=01）を確実に取得可能。
   */
  const baseYear = parseInt(format(currentDate, 'yyyy'));
  const baseMonth = parseInt(format(currentDate, 'MM'));

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>

    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">Service Booking</h1>
        <p class="text-[10px] text-gray-600 mt-2 tracking-widest">PRIVATE CONSULTATION</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">01. Select Plan</h2>
          <div id="plan-selection-area">
            ${ServicePlanList(displayPlans)}
          </div>
        </section>

        <div id="calendar-container" class="mb-12">
          ${CalendarSection(
            calendarDays, 
            availableDates, 
            firstAvailableDate, 
            baseYear, 
            baseMonth
          )}
        </div>

        <div id="slot-list-container" class="mb-12">
          ${await SlotList(c, firstAvailableDate, defaultPlanId)}
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-xs rounded-lg text-center">
          予約データの取得中にエラーが発生しました。通信環境を確認し、ページをリロードしてください。
        </div>

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        /**
         * デバッグ用表示の更新
         */
        function updateDebugView(date, planId) {
          const dDate = document.getElementById('debug-date');
          const dPlan = document.getElementById('debug-plan');
          if (date && dDate) dDate.innerText = date;
          if (planId && dPlan) dPlan.innerText = planId;
        }

        /**
         * イベントリスナー: カレンダー選択
         */
        document.addEventListener('click', function(e) {
          const cell = e.target.closest('.calendar-day-cell');
          if (cell) {
            updateDebugView(cell.getAttribute('data-date'), null);
          }
        });

        /**
         * イベントリスナー: プラン変更
         * プランが変更された際、選択中の日付のスロットを再取得
         */
        document.addEventListener('change', function(e) {
          if (e.target && e.target.name === 'plan_id') {
            const selectedPlanId = e.target.value;
            updateDebugView(null, selectedPlanId);

            const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');
            if (selectedCell) {
              htmx.ajax('GET', '/services/slots', {
                values: { 
                  date: selectedCell.getAttribute('data-date'),
                  plan_id: selectedPlanId 
                },
                target: '#slot-list-container'
              });
            }
          }
        });

        /**
         * HTMX エラーハンドリング
         */
        document.body.addEventListener('htmx:responseError', function(evt) {
          document.getElementById('error-display')?.classList.remove('hidden');
        });

        document.body.addEventListener('htmx:afterOnLoad', function(evt) {
          if (evt.detail.target.id === 'slot-list-container') {
             document.getElementById('error-display')?.classList.add('hidden');
          }
        });
      </script>
    </body>
  `
}