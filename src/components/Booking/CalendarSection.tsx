/**
 * @file CalendarSection.tsx
 * @description 
 * 予約ページの「日付選択」UIを構成します。
 * [v3.2 Navigation-Atomic対応]
 * 修正内容: 既存の格子状レイアウトとHTMXロジックを完全維持したまま、月移動ボタンを統合。
 */

import { html } from 'hono/html'

const CONFIG = {
  ACTIVE_RESERVATION_DAYS: 90,    // 予約を受け付ける期間（今日から90日間）
  CELL_MIN_HEIGHT: 'min-h-[60px]', // カレンダーセルの最小高さ
  MAX_WIDTH: 'max-w-md',          // カレンダーの最大幅
};

/**
 * 💡 新規：ナビゲーションボタン付きカレンダー (v2)
 * 既存の CalendarSection の見た目と HTMX ロジックを 100% 継承・省略なし
 */
export const CalendarSection = (
  calendarDays: any[], 
  availableSlots: readonly any[],
  firstAvailableDate: string, 
  baseYear: number, 
  baseMonth: number,
  prevMonthStr: string,
  nextMonthStr: string
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activeLimitDate = new Date(today);
  activeLimitDate.setDate(today.getDate() + CONFIG.ACTIVE_RESERVATION_DAYS);

  return html`
    <section class="mb-12">
      <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">02. Select Date</h2>
      
      <div class="mb-6 flex items-center justify-center gap-8">
        <a href="?month=${prevMonthStr}" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </a>

        <span class="text-xl font-medium tracking-[0.2em] text-gray-900 border-b border-gray-100 pb-2 inline-block">
          ${baseYear}.${baseMonth.toString().padStart(2, '0')}
        </span>

        <a href="?month=${nextMonthStr}" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
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
            const isoDateStr = day.dateStr; 
            const dateObj = day.date;
            const d = day.dayNum;
            const m = dateObj.getMonth() + 1;

            const isAvailable = availableSlots.some(slot => slot.date === isoDateStr);
            const isSelected = firstAvailableDate === isoDateStr;
            const isInActivePeriod = dateObj >= today && dateObj <= activeLimitDate;
            const shouldHighlightSlot = isAvailable && (day.isCurrentMonth || isInActivePeriod);
            const showMonthLabel = day.isFirstDay;

            const selectedClasses = isSelected 
              ? 'bg-blue-50 shadow-[inset_0_0_0_2px_#2c5282] z-10' 
              : 'bg-white';

            return html`
              <div class="calendar-day-cell group relative ${CONFIG.CELL_MIN_HEIGHT} flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-all ${selectedClasses}"
                   data-date="${isoDateStr}"
                   data-selected="${isSelected ? 'true' : 'false'}"
                   data-available="${isAvailable ? 'true' : 'false'}"
                   
                   hx-get="/services/slots"
                   hx-vals='{"date": "${isoDateStr}"}'
                   hx-include="[name='plan_id']"
                   hx-target="#slot-list-container"
                   hx-trigger="click"

                   hx-on:click="
                    document.querySelectorAll('.calendar-day-cell').forEach(el => {
                      el.classList.remove('bg-blue-50', 'shadow-[inset_0_0_0_2px_#2c5282]', 'z-10');
                      el.classList.add('bg-white');
                      el.setAttribute('data-selected', 'false');
                    });
                    this.classList.remove('bg-white');
                    this.classList.add('bg-blue-50', 'shadow-[inset_0_0_0_2px_#2c5282]', 'z-10');
                    this.setAttribute('data-selected', 'true');
                    document.dispatchEvent(new Event('selectionChange', { bubbles: true }));
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
                
                ${shouldHighlightSlot && !isSelected ? html`<div class="absolute inset-0 bg-blue-50/40 pointer-events-none"></div>` : ''}
              </div>
            `
          })}
        </div>
      </div>
    </section>
  `
}