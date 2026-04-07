/**
 * @file Services.tsx
 * @description サービス予約ページのメインレイアウト。
 * プラン選択、カレンダー、コンサルタント情報を統合し、予約導線を構築します。
 * * @notes
 * - ロジックは lib/、UI部品は components/ に分割し、本ファイルは「配置」に専念させています。
 * - デザイナーが style.css を編集する際、本ファイルの CSS クラス名との整合性に注意してください。
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'
import { generateCalendarData } from '../lib/calendar-logic'
import { ServicePlanList } from '../components/ServicePlanCard'
import { CalendarSection } from '../components/CalendarSection'

export const Services = () => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (ロジック部)
  /* -------------------------------------------------------------------------- */
  const baseDate = new Date();
  const calendarDays = generateCalendarData(baseDate);
  
  // 最短予約可能日の特定：BUSINESS_INFO が空の場合のエラーを防ぐため、オプションチェーンを使用
  const firstAvailableDate = BUSINESS_INFO.availableSlots[0]?.date || "";

  // 年・月の抽出：CalendarSection への引数として、純粋な数値で渡す（依存度を下げるため）
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth() + 1;

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
      /* * Critical CSS: 
       * 動的な状態（data-selected）に基づくスタイル。
       * パフォーマンス（PSIスコア）維持のため、複雑なアニメーションは避け、GPU負荷を抑えています。
       */
      .selection-card[data-selected="true"] { border: 2px solid #2c5282; background: rgba(249, 250, 251, 0.9); }
      .selection-card[data-selected="false"] { border: 1px solid #e5e7eb; }
      .selection-card:hover { border-color: #2c5282; }
      .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #2c5282; }
      .available-mark { width: 4px; height: 4px; border-radius: 50%; background: #2c5282; margin-top: 2px; }
      .calendar-day-cell[data-selected="true"] { background-color: #f8fafc; box-shadow: inset 0 0 0 2px #2c5282; z-index: 10; }
    </style>

    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">Service Booking</h1>
        <p class="text-[10px] text-gray-400 mt-2 tracking-widest">PRIVATE CONSULTATION</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase">01. Select Plan</h2>
          ${ServicePlanList(BUSINESS_INFO.services)}
        </section>

        ${CalendarSection(
          calendarDays, 
          BUSINESS_INFO.availableSlots, 
          firstAvailableDate, 
          currentYear, 
          currentMonth
        )}

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

/**
 * 【メンテナンス時の注意事項】
 * * 1. 動作不良（カレンダーが表示されない等）の場合:
 * - generateCalendarData() の返り値が正しく calendarDays に格納されているかを確認してください。
 * - BUSINESS_INFO.availableSlots が readonly 配列であるため、コンポーネント側での破壊的メソッド（push等）は禁止です。
 * * 2. デザインの修正:
 * - 配色を変更する場合、アクセシビリティ（PSIのコントラスト比）を考慮し、#757575 以下の明度は避けることを推奨します。
 * * 3. サービスレベルの影響:
 * - 本ファイルは予約の最終確認を担うため、Button の onclick イベント等を追加する際は、二重送信防止策を講じてください。
 * * 4. ソース分割の運用指針:
 * - 稼働状況や緊急度に応じて、本ファイルにコンポーネントを一時的に統合してデバッグを行うことは許容されます。
 */