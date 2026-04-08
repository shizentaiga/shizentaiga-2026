/**
 * @file CalendarSection.tsx
 * @description 予約日時選択のレンダリングを担当。
 * BUSINESS_INFO の ISO形式(YYYY-MM-DD)の日付データと照合し、空き枠を可視化します。
 */

import { html } from 'hono/html'

/**
 * CalendarSection コンポーネント
 * @param calendarDays - generateCalendarData で生成された日付配列
 * @param availableSlots - 予約可能な枠のマスターデータ（ISO形式: "2026-04-18" 等を想定）
 * @param firstAvailableDate - 初期表示で選択状態にする日付
 * @param baseYear - 表示対象의 年
 * @param baseMonth - 表示対象の 月
 */
export const CalendarSection = (
  calendarDays: any[], 
  availableSlots: readonly any[],
  firstAvailableDate: string, 
  baseYear: number, 
  baseMonth: number
) => {
  // 予約枠が一つも存在しないかチェック
  const hasAnySlots = availableSlots && availableSlots.length > 0;

  return html`
    <section class="mb-12">
      <h2 class="text-[11px] font-bold tracking-[0.2em] text-gray-500 mb-6 uppercase">02. Select Date & Time</h2>
      
      <div class="mb-6 text-center">
        <span class="text-xl font-medium tracking-[0.2em] text-gray-900 border-b border-gray-100 pb-2 inline-block">
          ${baseYear}.${baseMonth.toString().padStart(2, '0')}
        </span>
      </div>

      <div class="bg-white border border-gray-200 rounded-sm overflow-hidden mb-8 shadow-sm">
        <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => html`
            <div class="py-3 text-[10px] font-bold text-center tracking-widest ${i === 0 ? 'text-red-700/70' : i === 6 ? 'text-blue-700/70' : 'text-gray-400'}">
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

            /**
             * 【データ照合用ロジック】
             * ISO形式の文字列を生成（YYYY-MM-DD）
             */
            const pad = (n: number) => n.toString().padStart(2, '0');
            const isoDateStr = `${y}-${pad(m)}-${pad(d)}`;
            
            // 予約枠データとの照合
            const isAvailable = availableSlots.some(slot => slot.date === isoDateStr);
            const isSelected = firstAvailableDate === isoDateStr;
            
            // 月ラベルの表示判定
            const showMonthLabel = d === 1 || day.isFirstDayOfGrid;

            return html`
              <div class="calendar-day-cell bg-white group relative aspect-square min-h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all"
                   data-date="${isoDateStr}"
                   data-selected="${isSelected ? 'true' : 'false'}"
                   data-available="${isAvailable ? 'true' : 'false'}">
                
                ${showMonthLabel ? html`
                  <span class="absolute top-1 left-1.5 text-[11px] font-bold tracking-tighter text-gray-400 pointer-events-none">
                    ${m}/
                  </span>
                ` : ''}

                <span class="relative z-10 text-[13px] ${day.isCurrentMonth ? 'text-gray-900 font-medium' : 'text-gray-300'} 
                             ${day.isToday ? 'after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-px after:bg-gray-900' : ''}">
                  ${d}
                </span>

                <div class="absolute bottom-2 inset-x-0 flex justify-center items-center h-1.5">
                  ${isAvailable ? html`<div class="w-1 h-1 bg-[#2c5282] rounded-full shadow-sm"></div>` : ''}
                </div>
              </div>
            `
          })}
        </div>
      </div>

      <div id="time-slot-container" class="space-y-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Select Time</span>
          <span id="selected-date-display" class="text-xs font-bold text-gray-900 border-b-2 border-gray-200 pb-0.5">
            ${hasAnySlots ? (firstAvailableDate || '日付を選択してください') : '受付停止中'}
          </span>
        </div>

        <div id="slot-list" class="bg-gray-50 border border-dashed border-gray-200 rounded-sm p-8 text-center">
          ${hasAnySlots 
            ? html`<p class="text-[10px] text-gray-500 italic font-medium tracking-wider">Please select a date on the calendar.</p>`
            : html`
                <div class="flex flex-col items-center gap-2">
                  <i class="fa-regular fa-calendar-xmark text-gray-600 text-lg"></i>
                  <p class="text-[11px] text-gray-600 font-bold tracking-widest">現在、受付可能な予約枠はありません。</p>
                  <p class="text-[11px] text-gray-600 uppercase">No available slots at the moment.</p>
                </div>
              `
          }
        </div>
      </div>
    </section>
  `
}