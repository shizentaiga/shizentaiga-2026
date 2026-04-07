/**
 * @file Services.tsx
 * @description サービス予約ページのメインレイアウト。
 * コンポーネントの統合、およびインライン・クライアントスクリプト（JS）を含みます。
 * 外部ファイルへの依存を排除し、ビルドエラーに左右されない確実な動作を優先した構成です。
 */

import { html } from 'hono/html'

/* --- DATA & CONSTANTS --- */
import { BUSINESS_INFO } from '../constants/info'

/* --- LOGIC --- */
import { generateCalendarData } from '../lib/calendar-logic'

/* --- COMPONENTS --- */
import { ServicePlanList } from '../components/ServicePlanCard'
import { CalendarSection } from '../components/CalendarSection'
import { ConsultantSection } from '../components/ConsultantSection'
import { BookingFooter } from '../components/BookingFooter'

export const Services = () => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION
  /* -------------------------------------------------------------------------- */
  const baseDate = new Date();
  const calendarDays = generateCalendarData(baseDate);
  
  // 予約可能な最短の日付を特定
  const firstAvailableDate = BUSINESS_INFO.availableSlots[0]?.date || "";

  // カレンダー表示用の年・月
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING
  /* -------------------------------------------------------------------------- */
  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
      /* 選択状態や装飾に関する Critical CSS */
      .selection-card[data-selected="true"] { border: 2px solid #2c5282; background: rgba(249, 250, 251, 0.9); }
      .selection-card[data-selected="false"] { border: 1px solid #e5e7eb; }
      .selection-card:hover { border-color: #2c5282; }
      
      .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #2c5282; }
      .available-mark { width: 4px; height: 4px; border-radius: 50%; background: #2c5282; margin-top: 2px; }
      .calendar-day-cell[data-selected="true"] { background-color: #f8fafc; box-shadow: inset 0 0 0 2px #2c5282; z-index: 10; }
      
      #calendar-container { transition: all 0.3s ease-in-out; }
    </style>

    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">Service Booking</h1>
        <p class="text-[10px] text-gray-600 mt-2 tracking-widest">PRIVATE CONSULTATION</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">01. Select Plan</h2>
          ${ServicePlanList(BUSINESS_INFO.services)}
        </section>

        <div id="calendar-container">
          ${CalendarSection(
            calendarDays, 
            BUSINESS_INFO.availableSlots, 
            firstAvailableDate, 
            currentYear, 
            currentMonth
          )}
        </div>

        ${ConsultantSection()}

      </div>

      ${BookingFooter()}

      <script>
        (function() {
          const initBooking = () => {
            const calendarContainer = document.getElementById('calendar-container');
            const selectedDateDisplay = document.getElementById('selected-date-display');
            const slotList = document.getElementById('slot-list');

            if (!calendarContainer) return;

            calendarContainer.addEventListener('click', (e) => {
              const target = e.target;
              const cell = target.closest('.calendar-day-cell');

              // 予約不可またはセル以外は無視
              if (!cell || cell.dataset.available === 'false') return;

              const selectedDate = cell.dataset.date;
              if (!selectedDate) return;

              // 1. UI更新：選択状態の切り替え
              document.querySelectorAll('.calendar-day-cell').forEach((el) => {
                el.dataset.selected = 'false';
              });
              cell.dataset.selected = 'true';

              // 2. 表示日付の更新
              if (selectedDateDisplay) {
                selectedDateDisplay.textContent = selectedDate;
              }

              // 3. タイムスロットのシミュレーション
              if (slotList) {
                slotList.innerHTML = \`
                  <div class="col-span-full py-8 text-center">
                    <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#2c5282] mb-2"></div>
                    <p class="text-[10px] text-[#2c5282] font-bold tracking-widest uppercase animate-pulse">
                      Searching slots for \${selectedDate}...
                    </p>
                  </div>
                \`;

                setTimeout(() => {
                  slotList.innerHTML = \`
                    <div class="col-span-full py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-sm">
                      <p class="text-[11px] text-gray-500 font-bold tracking-widest">
                        ご指定の日付（\${selectedDate}）に現在予約枠はありません。
                      </p>
                      <p class="text-[9px] text-gray-600 uppercase mt-1">No available slots for this date.</p>
                    </div>
                  \`;
                }, 800);
              }

              console.log('[Booking] Click detected:', selectedDate);
            });
          };

          // 実行タイミングの制御
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initBooking);
          } else {
            initBooking();
          }
        })();
      </script>

    </body>
  `
}