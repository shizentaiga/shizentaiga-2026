/**
 * @file CalendarSection.tsx
 * @description 
 * カレンダーの描画と日付選択を担当。
 * 各日付セルに HTMX の属性を追加し、クリック時に予約枠を動的取得するようにしました。
 */

import { html } from 'hono/html'

const CONFIG = {
  ACTIVE_RESERVATION_DAYS: 14,
  CELL_MIN_HEIGHT: 'min-h-[60px]',
  MAX_WIDTH: 'max-w-md',
};

export const CalendarSection = (
  calendarDays: any[], 
  availableSlots: readonly any[],
  firstAvailableDate: string, 
  baseYear: number, 
  baseMonth: number
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeLimitDate = new Date(today);
  activeLimitDate.setDate(today.getDate() + CONFIG.ACTIVE_RESERVATION_DAYS);

  return html`
    <section class="mb-12">
      <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">02. Select Date</h2>
      
      <div class="mb-6 text-center">
        <span class="text-xl font-medium tracking-[0.2em] text-gray-900 border-b border-gray-100 pb-2 inline-block">
          ${baseYear}.${baseMonth.toString().padStart(2, '0')}
        </span>
      </div>

      <div class="bg-white border border-gray-200 rounded-sm overflow-hidden mb-8 shadow-sm ${CONFIG.MAX_WIDTH} mx-auto">
        <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => html`
            <div class="py-3 text-[10px] font-bold text-center tracking-widest ${i === 0 ? 'text-red-700/60' : i === 6 ? 'text-blue-700/60' : 'text-gray-400'}">
              ${day}
            </div>
          `)}
        </div>

        <div class="grid grid-cols-7 gap-px bg-gray-100">
          ${calendarDays.map((day) => {
            // ステップ2で用意した day.dateStr をそのまま利用（ロジックの重複を排除）
            const isoDateStr = day.dateStr; 
            const dateObj = day.date;
            const d = day.dayNum;
            const m = dateObj.getMonth() + 1;

            const isAvailable = availableSlots.some(slot => slot.date === isoDateStr);
            const isSelected = firstAvailableDate === isoDateStr;
            const isInActivePeriod = dateObj >= today && dateObj <= activeLimitDate;
            const shouldHighlightSlot = isAvailable && (day.isCurrentMonth || isInActivePeriod);
            const showMonthLabel = day.isFirstDay;

            /**
             * ★HTMXの設定ポイント
             * 1. hx-get: クリック時にこのURLへGETリクエストを送る
             * 2. hx-target: サーバーから返ってきたHTMLをどこに流し込むか
             * 3. hx-trigger: どのようなアクションで動くか（click）
             * 4. hx-indicator: 通信中にスタイルを変える（オプション）
             */
            return html`
              <div class="calendar-day-cell bg-white group relative ${CONFIG.CELL_MIN_HEIGHT} flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-all"
                   data-date="${isoDateStr}"
                   data-selected="${isSelected ? 'true' : 'false'}"
                   data-available="${isAvailable ? 'true' : 'false'}"
                   
                   hx-get="/services/slots?date=${isoDateStr}"
                   hx-target="#slot-list-container"
                   hx-trigger="click"

                  /* ★追加：JavaScriptを使わずに「選択状態」の見た目を切り替える設定 */
                  /* 他のセルの選択を解除し、クリックされた自分にだけ 'bg-blue-100' をつけます */
                  hx-on:click="
                    document.querySelectorAll('.calendar-day-cell').forEach(el => el.classList.remove('bg-blue-100', 'ring-2', 'ring-blue-500'));
                    this.classList.add('bg-blue-100', 'ring-2', 'ring-blue-500');
                  "
              >
                
                ${showMonthLabel ? html`
                  <span class="absolute top-1 left-1.5 text-[10px] font-bold tracking-tighter text-gray-400 pointer-events-none">
                    ${m}/
                  </span>
                ` : ''}

                <span class="relative z-10 text-[14px] sm:text-[13px] ${day.isCurrentMonth ? 'text-gray-900 font-medium' : 'text-gray-300'} 
                             ${day.isToday ? 'after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-gray-900' : ''}">
                  ${d}
                </span>

                <div class="absolute bottom-2.5 inset-x-0 flex justify-center items-center h-1.5">
                  ${isAvailable ? html`
                    <div class="w-1.5 h-1.5 bg-[#2c5282] rounded-full shadow-sm transition-opacity ${shouldHighlightSlot ? 'opacity-100' : 'opacity-20'}"></div>
                  ` : ''}
                </div>
                
                ${shouldHighlightSlot ? html`<div class="absolute inset-0 bg-blue-50/40 pointer-events-none"></div>` : ''}
              </div>
            `
          })}
        </div>
      </div>

      </section>
  `
}