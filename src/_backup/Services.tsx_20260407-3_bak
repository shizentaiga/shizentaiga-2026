/**
 * src/pages/Services.tsx
 * 修正内容：カレンダーの7列グリッド表示をインラインスタイルで強制適用
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'
import { generateCalendarData } from '../lib/calendar-logic'

export const Services = () => {
  // カレンダーデータの生成（今日を基準）
  const calendarDays = generateCalendarData(new Date());

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
      /* 選択状態の強調：アクセントの青 (#2c5282) を使用 */
      .selection-card[data-selected="true"] { 
        border: 2px solid #2c5282; 
        background: rgba(249, 250, 251, 0.9); 
      }
      .selection-card[data-selected="false"] { 
        border: 1px solid #e5e7eb; 
      }
      
      .selection-card:hover { 
        border-color: #2c5282; 
      }

      .status-dot { 
        width: 6px; height: 6px; border-radius: 50%; background: #2c5282; 
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
          
          <div class="bg-white border border-gray-100 rounded-sm overflow-hidden mb-6 shadow-sm">
            <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => html`
                <div class="py-2 text-[9px] font-bold text-center tracking-widest ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}">
                  ${day}
                </div>
              `)}
            </div>

            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background-color: #f3f4f6;">
              ${calendarDays.map((day, i) => html`
                <div class="bg-white ${day.className} group relative min-h-[50px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 shadow-[0_0_0_0.5px_#f3f4f6]">
                  
                  ${day.monthLabel ? html`
                    <span class="absolute top-1 left-1.5 text-[7px] font-bold tracking-tighter opacity-60 text-gray-400">
                      ${day.monthLabel}
                    </span>
                  ` : ''}

                  <span class="text-sm ${day.isToday ? 'relative z-10 font-bold' : ''}">
                    ${day.dayNum}
                  </span>

                  ${day.isToday ? html`<div class="absolute bottom-1.5 w-1 h-1 bg-[#2c5282] rounded-full"></div>` : ''}

                  ${day.isFirstDay ? html`<div class="absolute inset-y-0 left-0 w-[2px] bg-[#2c5282]/10"></div>` : ''}
                </div>
              `)}
            </div>
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
          <p class="text-[10px] text-gray-400 mt-4 italic text-center">
            ※ カレンダーまたは上記スロットから希望日を選択してください。
          </p>
        </section>

        <section class="mb-12 bg-white p-8 border border-gray-100 shadow-sm">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase">03. Consultant</h2>
          <div class="flex items-start gap-6">
            <div class="flex-1">
              <strong class="text-lg font-bold text-gray-900">清善 泰賀</strong>
              <p class="text-[10px] text-[#2c5282] font-bold tracking-widest mt-1 uppercase">Management Consultant</p>
              <p class="mt-4 text-xs text-gray-500 leading-relaxed">
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