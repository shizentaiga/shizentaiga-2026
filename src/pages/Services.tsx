/**
 * @file Services.tsx
 * @description 
 * 修正内容: CalendarSection の hx-include 化に伴い、
 * 手動の属性同期ロジックを削除し、コードを簡略化。
 */

import { html } from 'hono/html'

/* --- LOGIC --- */
import { generateCalendarData } from '../lib/calendar-logic'

/* --- COMPONENTS --- */
import { ServicePlanList } from '../components/ServicePlanCard'
import { CalendarSection } from '../components/CalendarSection'
import { ConsultantSection } from '../components/ConsultantSection'
import { BookingFooter } from '../components/BookingFooter'
import { SlotList } from '../components/SlotList'

/* --- DB ACCESS --- */
import { getAvailableChipsFromDB } from '../db/booking-db'
import { getPlansFromDB } from '../db/plan-db'

export const Services = async (c: any) => {
  const currentDate = new Date();
  const calendarDays = generateCalendarData(currentDate);
  
  const displayPlans = await getPlansFromDB(c);
  const defaultPlanId = displayPlans[0]?.plan_id || "";

  const rawChips = await getAvailableChipsFromDB(c);
  const availableDates = rawChips.map(chip => ({ 
    date: chip.date_string 
  }));

  const firstAvailableDate = availableDates[0]?.date || "";
  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth() + 1;

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
          予約データの取得中にエラーが発生しました。ページをリロードしてください。
        </div>

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        function updateDebugView(date, planId) {
          if (date) document.getElementById('debug-date').innerText = date;
          if (planId) document.getElementById('debug-plan').innerText = planId;
        }

        /**
         * 1. カレンダークリック時
         * (表示上の日付変更のみ。通信自体は HTMX が自動で行います)
         */
        document.addEventListener('click', function(e) {
          const cell = e.target.closest('.calendar-day-cell');
          if (cell) {
            updateDebugView(cell.getAttribute('data-date'), null);
          }
        });

        /**
         * 2. プラン変更時
         * 属性の書き換えは不要になりました (hx-include が自動解決するため)。
         */
        document.addEventListener('change', function(e) {
          if (e.target && e.target.name === 'plan_id') {
            const selectedPlanId = e.target.value;
            updateDebugView(null, selectedPlanId);

            // 現在選択中の日付があれば、その日のスロットをリロード
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

// 備考：デバッグ用コマンドとして、Script内に埋め込むと、選択した日付を閲覧可能
        // <div id="debug-info" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-[10px] font-mono text-yellow-700 rounded-sm">
        //   <p class="font-bold mb-1">🛠 DEBUG MONITOR</p>
        //   DEBUG: [Selected Date: <span id="debug-date">${firstAvailableDate || 'None'}</span>] 
        //   [Plan: <span id="debug-plan">${defaultPlanId}</span>]
        // </div>

