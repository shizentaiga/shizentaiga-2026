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
      <h2 class="text-[11px] font-bold tracking-[0.2em] text-gray-500 mb-6 uppercase">02. Select Date & Time</h2>
      
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

            // ISO形式の文字列生成 (YYYY-MM-DD)
            const pad = (n: number) => n.toString().padStart(2, '0');
            const isoDateStr = `${y}-${pad(m)}-${pad(d)}`;
            
            // 予約枠の照合
            const isAvailable = availableSlots.some(slot => slot.date === isoDateStr);
            const isSelected = firstAvailableDate === isoDateStr;
            
            // 14日間ルール：今日から指定期間内か、または今月の日付であれば強調
            const isInActivePeriod = dateObj >= today && dateObj <= activeLimitDate;
            const shouldHighlightSlot = isAvailable && (day.isCurrentMonth || isInActivePeriod);

            // Googleカレンダー方式：1日（ついたち）のみ「5/1」表記、それ以外は「1」
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
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l4 4m0-4l-4 4" />
                  </svg>
                  <div class="space-y-1">
                    <p class="text-[11px] text-gray-600 font-bold tracking-widest">現在、受付可能な予約枠はありません。</p>
                    <p class="text-[11px] text-gray-400 uppercase">No available slots at the moment.</p>
                  </div>
                </div>
              `
          }
        </div>
      </div>
    </section>
  `
}