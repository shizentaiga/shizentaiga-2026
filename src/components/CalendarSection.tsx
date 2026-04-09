/**
 * @file CalendarSection.tsx
 * @description 予約日時選択のレンダリングを担当。
 * BUSINESS_INFO の ISO形式(YYYY-MM-DD)の日付データと照合し、空き枠を可視化します。
 */

import { html } from 'hono/html'

/* --- CONFIGURATION (将来的な定数管理やデバッグ用) --- */
const CONFIG = {
  ACTIVE_RESERVATION_DAYS: 14, // 今日から何日間、月を跨いでも予約枠を強調するか
  CELL_MIN_HEIGHT: 'min-h-[60px]', // セルの最小高さ
  MAX_WIDTH: 'max-w-md', // カレンダー全体の最大幅（PCでの巨大化防止）
};

/**
 * CalendarSection コンポーネント
 * @param calendarDays - generateCalendarData で生成された日付配列
 * @param availableSlots - 予約可能な枠のマスターデータ
 * @param firstAvailableDate - 初期表示で選択状態にする日付
 * @param baseYear - 表示対象の年
 * @param baseMonth - 表示対象の月
 */
export const CalendarSection = (
  calendarDays: any[], 
  availableSlots: readonly any[],
  firstAvailableDate: string, 
  baseYear: number, 
  baseMonth: number
) => {
  // 予約枠の存在確認
  const hasAnySlots = availableSlots && availableSlots.length > 0;

  // 「今日」から14日後の境界値を計算（動的ハイライト用）
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
            const dateObj = day.date;
            const y = dateObj.getFullYear();
            const m = dateObj.getMonth() + 1;
            const d = dateObj.getDate();

            const pad = (n: number) => n.toString().padStart(2, '0');
            const isoDateStr = `${y}-${pad(m)}-${pad(d)}`;
            
            const isAvailable = availableSlots.some(slot => slot.date === isoDateStr);
            const isSelected = firstAvailableDate === isoDateStr;
            const isInActivePeriod = dateObj >= today && dateObj <= activeLimitDate;
            const shouldHighlightSlot = isAvailable && (day.isCurrentMonth || isInActivePeriod);
            const showMonthLabel = d === 1;

            return html`
              <div class="calendar-day-cell bg-white group relative ${CONFIG.CELL_MIN_HEIGHT} flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-all"
                   data-date="${isoDateStr}"
                   data-selected="${isSelected ? 'true' : 'false'}"
                   data-available="${isAvailable ? 'true' : 'false'}">
                
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

      <div id="time-slot-container" class="space-y-6 ${CONFIG.MAX_WIDTH} mx-auto">
        <div class="hidden">
           <span id="selected-date-display">${firstAvailableDate}</span>
        </div>

        <div id="slot-list" class="bg-gray-50/50 border border-dashed border-gray-200 rounded-lg p-8 text-center min-h-32 flex items-center justify-center">
          ${hasAnySlots 
            ? html`
                <p class="text-sm text-gray-500 leading-relaxed">
                  カレンダーから日付を選択してください<br>
                  <span class="text-[10px] tracking-widest text-gray-400 uppercase">Please select a date from the calendar</span>
                </p>
              `
            : html`
                <div class="flex flex-col items-center gap-3">
                  <p class="text-[11px] text-gray-600 font-bold tracking-widest uppercase">No available slots at the moment.</p>
                </div>
              `
          }
        </div>
      </div>
    </section>
  `
}