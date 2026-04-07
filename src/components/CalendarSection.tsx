/**
 * @file CalendarSection.tsx
 * @description 予約日時選択（02. Select Date & Time）のレンダリングを担当。
 * カレンダーのグリッド表示と、選択された日付に紐づくタイムスロット一覧を生成します。
 */

import { html } from 'hono/html'

/**
 * CalendarSection コンポーネント
 * * @param calendarDays - generateCalendarData で生成された1ヶ月分（前後の余白含む）の日付配列
 * @param availableSlots - 予約可能な枠のマスターデータ（readonly制約付き）
 * @param firstAvailableDate - 初期表示で選択状態にする最短の日付文字列
 * @param baseYear - 表示対象の年
 * @param baseMonth - 表示対象の月
 * * @notes
 * - 状態管理: 本コンポーネントは現状 SSR (Static Site Rendering) を想定しており、
 * クリックによる動的な切り替えはクライアントサイド JS または Htmx 等の導入を前提としています。
 */
export const CalendarSection = (
  calendarDays: any[], 
  availableSlots: readonly any[],
  firstAvailableDate: string, 
  baseYear: number, 
  baseMonth: number
) => html`
  <section class="mb-12">
    <h2 class="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase">02. Select Date & Time</h2>
    
    <div class="mb-4 text-center">
      <span class="text-lg font-medium tracking-widest text-gray-900">
        ${baseYear}.${baseMonth.toString().padStart(2, '0')}
      </span>
    </div>

    <div class="bg-white border border-gray-200 rounded-sm overflow-hidden mb-8 shadow-sm">
      <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => html`
          <div class="py-2 text-[9px] font-bold text-center tracking-widest ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}">
            ${day}
          </div>
        `)}
      </div>

      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background-color: #f3f4f6;">
        ${calendarDays.map((day) => {
          // ロジック: スロットデータと日付の照合
          const formattedDateStr = `${day.date.getMonth() + 1}/${day.date.getDate()}`;
          const isAvailable = availableSlots.some(slot => slot.date.includes(formattedDateStr));
          const isSelected = firstAvailableDate.includes(formattedDateStr);

          return html`
            <div class="calendar-day-cell bg-white group relative min-h-[60px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-[0_0_0_0.5px_#f3f4f6]"
                 data-selected="${isSelected ? 'true' : 'false'}">
              
              ${day.monthLabel ? html`
                <span class="absolute top-1.5 left-2 text-[8px] font-bold tracking-tighter text-[#757575]">
                  ${day.monthLabel}
                </span>
              ` : ''}

              <span class="text-sm ${day.isCurrentMonth ? 'text-[#1A1A1A] font-medium' : 'text-[#757575]'} 
                           ${day.isToday ? 'ring-1 ring-[#2c5282] ring-offset-2 rounded-full w-6 h-6 flex items-center justify-center' : ''}">
                ${day.dayNum}
              </span>

              ${isAvailable ? html`<div class="available-mark"></div>` : ''}

              ${day.dayNum === 1 ? html`<div class="absolute inset-0 bg-[#2c5282]/5 pointer-events-none"></div>` : ''}
            </div>
          `
        })}
      </div>
    </div>

    <div id="time-slot-container" class="space-y-6">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Slots at</span>
        <span class="text-xs font-bold text-gray-900 border-b-2 border-accent pb-0.5">${firstAvailableDate}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${availableSlots.map((slot, index) => html`
          <div class="selection-card p-5 bg-white rounded-sm cursor-pointer transition-all flex items-center justify-between" 
               data-selected="${index === 0 ? 'true' : 'false'}">
            <div class="flex items-center gap-4">
              <span class="status-dot"></span>
              <div>
                <span class="block text-sm font-bold text-gray-900">${slot.date}</span>
                <span class="block text-xs text-gray-500 mt-0.5">${slot.time}</span>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </div>
        `)}
      </div>
    </div>
  </section>
`

/**
 * 【メンテナンス時の注意事項】
 * * 1. 日付判定ロジックについて:
 * `formattedDateStr` の生成（M/D形式）が constants/info.ts のデータ形式と一致している必要があります。
 * 形式を変更する場合は、lib/calendar-logic.ts と併せて修正してください。
 * * 2. 境界値エラーへの対応:
 * 万が一 `calendarDays` が空で渡された場合、グリッドが崩れる可能性があります。
 * `generateCalendarData` が常に42要素（7列×6行）を返すことを保証してください。
 * * 3. サービスレベルの考慮:
 * `availableSlots.some()` の計算量は配列サイズに比例します。
 * スロット数が数千件を超えるような場合は、レンダリング速度低下を防ぐため Map 等への事前変換を推奨します。
 */