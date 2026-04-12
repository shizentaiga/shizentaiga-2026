/**
 * @file CalendarSection.tsx
 * @description 
 * 予約ページの「日付選択」UIを構成します。
 * [v3.0 Grid-Atomic対応]
 * 修正内容: hx-include を導入し、プランIDの送信を宣言的に変更。
 * 複雑なJavaScriptによるパラメータ同期を廃止しました。
 */

import { html } from 'hono/html'

const CONFIG = {
  ACTIVE_RESERVATION_DAYS: 90,    // 予約を受け付ける期間（今日から90日間）
  CELL_MIN_HEIGHT: 'min-h-[60px]', // カレンダーセルの最小高さ
  MAX_WIDTH: 'max-w-md',          // カレンダーの最大幅
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
                   
                   /**
                    * ★HTMXロジック (v3.1 安定版):
                    * 1. hx-get: スロット取得エンドポイント
                    * 2. hx-vals: このセル固有の日付データのみをJSONで定義
                    * 3. hx-include: ページ内の 'plan_id' ラジオボタンを自動的にリクエストに含める
                    */
                   hx-get="/services/slots"
                   hx-vals='{"date": "${isoDateStr}"}'
                   hx-include="[name='plan_id']"
                   hx-target="#slot-list-container"
                   hx-trigger="click"

                   /**
                    * ★UIインタラクション:
                    */
                   hx-on:click="
                    document.querySelectorAll('.calendar-day-cell').forEach(el => {
                      el.classList.remove('bg-blue-50', 'shadow-[inset_0_0_0_2px_#2c5282]', 'z-10');
                      el.classList.add('bg-white');
                      el.setAttribute('data-selected', 'false');
                    });
                    this.classList.remove('bg-white');
                    this.classList.add('bg-blue-50', 'shadow-[inset_0_0_0_2px_#2c5282]', 'z-10');
                    this.setAttribute('data-selected', 'true');
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