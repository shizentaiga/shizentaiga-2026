/**
 * src/pages/Services.tsx
 * 修正内容：
 * 1. PSI対策（アクセシビリティ配色 #757575 / #1A1A1A）
 * 2. 予約可能表示（🔵）の定義変更と最短予約日の初期選択ロジック
 * 3. 動的UI（日付選択後にスロット表示）の構造化
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'
import { generateCalendarData, CalendarDay } from '../lib/calendar-logic'

export const Services = () => {
  const baseDate = new Date();
  const calendarDays = generateCalendarData(baseDate);

  // 1. 「直近で予約可能な最短の日」を特定するロジック（仮：BUSINESS_INFOにある最初の日付）
  // ※実際の実装では BUSINESS_INFO.availableSlots の最初の日付と一致するものを探します
  const firstAvailableDate = BUSINESS_INFO.availableSlots[0]?.date || "";

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
      .selection-card[data-selected="true"] { 
        border: 2px solid #2c5282; 
        background: rgba(249, 250, 251, 0.9); 
      }
      .selection-card[data-selected="false"] { 
        border: 1px solid #e5e7eb; 
      }
      .selection-card:hover { border-color: #2c5282; }

      .status-dot { 
        width: 6px; height: 6px; border-radius: 50%; background: #2c5282; 
      }

      /* 予約可能表示の🔵（アクセントカラー） */
      .available-mark {
        width: 4px; height: 4px; border-radius: 50%; background: #2c5282;
        margin-top: 2px;
      }

      /* カレンダーの日付選択状態 */
      .calendar-day-cell[data-selected="true"] {
        background-color: #f8fafc;
        box-shadow: inset 0 0 0 2px #2c5282;
        z-index: 10;
      }
    </style>

    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">Service Booking</h1>
        <p class="text-[10px] text-gray-400 mt-2 tracking-widest">PRIVATE CONSULTATION</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase">01. Select Plan</h2>
          <div class="space-y-4">
            ${BUSINESS_INFO.services.map((s, index) => html`
              <div class="selection-card flex justify-between items-center p-6 bg-white rounded-sm cursor-pointer transition-all" 
                   data-selected="${index === 0 ? 'true' : 'false'}">
                <div>
                  <h3 class="text-sm font-bold text-gray-900">${s.name}</h3>
                  <p class="text-xs text-gray-500 mt-1">${s.description}</p>
                </div>
                <div class="text-right">
                  <span class="text-base font-bold text-gray-900">¥${s.price.toLocaleString()}</span>
                  <span class="block text-[10px] text-gray-400 uppercase mt-1">
                    ${s.duration}${s.suffix || ''}
                  </span>
                </div>
              </div>
            `)}
          </div>
        </section>

        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase">02. Select Date & Time</h2>
          
          <div class="mb-4 text-center">
            <span class="text-lg font-medium tracking-widest text-gray-900">
              ${baseDate.getFullYear()}.${(baseDate.getMonth() + 1).toString().padStart(2, '0')}
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
              ${calendarDays.map((day: CalendarDay, i) => {
                // 予約可能かどうかの判定（ロジック側で管理することを想定）
                // ここではデモとして、BUSINESS_INFOにある日付なら予約可能🔵を出す
                const formattedDateStr = `${day.date.getMonth() + 1}/${day.date.getDate()}`;
                const isAvailable = BUSINESS_INFO.availableSlots.some(slot => slot.date.includes(formattedDateStr));
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
              `})}
            </div>
          </div>

          <div id="time-slot-container" class="space-y-6">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Slots at</span>
              <span class="text-xs font-bold text-gray-900 border-b-2 border-accent pb-0.5">${firstAvailableDate}</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${BUSINESS_INFO.availableSlots.map((slot, index) => html`
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

          <p class="text-[10px] text-gray-400 mt-8 italic text-center">
            ※ 🔵印のついた日程が予約可能です。クリックして詳細時間を選択してください。
          </p>
        </section>

        <section class="mb-12 bg-white p-8 border border-gray-100 shadow-sm rounded-sm">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase">03. Consultant</h2>
          <div class="flex items-start gap-6">
            <div class="flex-1">
              <strong class="text-lg font-bold text-gray-900">清善 泰賀</strong>
              <p class="text-[10px] text-[#2c5282] font-bold tracking-widest mt-1 uppercase">Management Consultant</p>
              <p class="mt-4 text-xs text-[#555] leading-relaxed">
                戦略策定から資金調達まで、実働に裏打ちされた知見を提供します。
              </p>
            </div>
          </div>
        </section>

      </div>

      <div class="fixed bottom-0 w-full bg-white/95 backdrop-blur-md py-6 border-t border-gray-200 z-[100]">
        <div class="max-w-3xl mx-auto px-6 flex justify-between items-center">
          <div class="summary">
            <div class="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-tighter">Confirmation</div>
            <div class="text-xl md:text-2xl font-bold text-gray-900">
              <span class="text-xs mr-1 font-normal opacity-40">JPY</span>49,500
            </div>
          </div>
          <button class="bg-black text-white py-4 px-8 md:px-14 text-[11px] font-bold rounded-sm tracking-[0.2em] uppercase hover:bg-gray-800 transition-all flex items-center group">
            Book Now
            <i class="fa-solid fa-arrow-right ml-4 transform group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>
      </div>

    </body>
  `
}