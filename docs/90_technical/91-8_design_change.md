### 1. 移行の全体手順

1.  **CSSの外部化/共通化**: 
    `head` 内の Tailwind 設定や `@apply` を含む CSS は、共通のレイアウトファイル、または Cloudflare Pages 等であれば外部 CSS としても管理できますが、今回は `html` テンプレート内にインポートする形で再現します。
2.  **コンポーネントの解体と再定義**: 
    `ServiceCard` や `SlotItem` などの既存コンポーネントの中身を、新しいデザインの HTML 構造に書き換えます。
3.  **ビジネスロジックの再接続**: 
    `BUSINESS_INFO` からのデータを、新しいクラス名や構造に正しく流し込みます。

---

### 2. 修正後のソースコード (src/pages/Services.tsx)

/**
 * Aletheia Project - Production Ready Component
 * 役割: サービス一覧・予約状況の統合表示
 * 修正内容: ミニマルUIへの刷新、色のセマンティクス固定、レスポンシブ対応
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'

export const Services = () => {
  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'primary': '#1a1a1a',
              'accent': '#2c5282',
              'text-main': '#333333',
              'text-sub': '#555555',
            }
          }
        }
      }
    </script>

    <style>
      /* 選択状態の定義 (アクセントカラー) */
      .plan-item[data-selected="true"] { border: 2px solid #2c5282; background: rgba(249, 250, 251, 0.8); }
      .plan-item[data-selected="false"] { border: 1px solid #e5e7eb; opacity: 0.8; }
      
      /* 時間スロットの共通設計 */
      .time-slot {
        display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        border-radius: 0.125rem; transition: all 0.2s; padding: 0.75rem 0.5rem; font-size: 0.875rem;
      }
      .time-slot.available { border: 1px solid #d1d5db; background: white; color: #333333; }
      .time-slot.available:hover { border-color: #2c5282; }
      .time-slot.selected { background: #2c5282; color: white; border-color: #2c5282; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .time-slot.full { background: #f9fafb; color: #9ca3af; border-color: #f3f4f6; cursor: not-allowed; font-style: italic; opacity: 0.6; }

      .status-dot { width: 0.375rem; height: 0.375rem; border-radius: 9999px; }
      .status-dot.active { background: #2c5282; }
      .status-dot.selected { background: white; }
      .status-dot.inactive { background: #d1d5db; }
    </style>

    <body class="bg-gray-50 text-text-main leading-relaxed pb-40">
      <header class="bg-white py-10 px-5 text-center border-b border-gray-100">
        <h1 class="m-0 text-xl font-medium tracking-[0.15em] text-primary uppercase">Service Booking</h1>
      </header>

      <div class="max-w-3xl mx-auto p-5">
        
        <section class="mb-8 bg-white p-8 md:p-12 rounded-sm shadow-sm border border-gray-100">
          <h2 class="text-lg font-medium mb-8 pb-3 border-b border-gray-200 text-primary">01. プランの選択</h2>
          <div class="flex flex-col gap-4">
            ${BUSINESS_INFO.services.map((s, index) => html`
              <div class="plan-item flex justify-between items-center p-6 rounded-sm cursor-pointer transition-all" 
                   data-selected="${index === 0 ? 'true' : 'false'}" role="button">
                <div class="plan-info">
                  <h3 class="text-md font-bold text-gray-800">${s.name}</h3>
                  <p class="text-text-sub text-sm mt-1">${s.description}</p>
                </div>
                <div class="text-right">
                  <span class="text-lg font-bold text-gray-800 tracking-tight">¥${s.price.toLocaleString()}</span>
                  <span class="block text-[10px] text-text-sub mt-1 font-normal uppercase tracking-wider">
                    ${s.taxIncluded ? 'Tax Incl.' : 'Tax Excl.'} / ${s.duration}${s.suffix || ''}
                  </span>
                </div>
              </div>
            `)}
          </div>
        </section>

        <section class="mb-8 bg-white p-8 md:p-12 rounded-sm shadow-sm border border-gray-100">
          <h2 class="text-lg font-medium mb-6 pb-3 border-b border-gray-200 text-primary">02. 担当者</h2>
          <div class="staff-detail">
            <strong class="block text-xl font-bold text-gray-800 tracking-tight text-primary">清善 泰賀</strong>
            <p class="text-accent text-xs font-medium tracking-widest mt-1 uppercase opacity-90">Management Consultant</p>
            <div class="mt-5 h-px w-12 bg-accent"></div>
            <p class="mt-5 text-sm text-text-sub leading-relaxed max-w-2xl">
              戦略策定から資金調達まで、実働に裏打ちされた知見を提供します。
            </p>
          </div>
        </section>

        <section class="mb-8 bg-white p-8 md:p-12 rounded-sm shadow-sm border border-gray-100">
          <h2 class="text-lg font-medium mb-8 pb-3 border-b border-gray-200 text-primary">03. 日時</h2>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div class="p-2">
              <div class="mb-6 font-medium text-primary text-sm tracking-widest">2026.04</div>
              <div class="grid grid-cols-7 gap-1 text-[10px] text-center text-gray-400">
                <div class="text-red-900/70 py-2">SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div class="text-accent py-2 font-medium">SAT</div>
                <div class="py-2 bg-accent text-white rounded-full">11</div>
              </div>
            </div>

            <div>
              <p class="text-[10px] text-text-sub font-bold tracking-widest mb-4 uppercase">Available Slots</p>
              <div class="grid grid-cols-2 gap-3">
                ${BUSINESS_INFO.availableSlots.map(slot => html`
                  <button class="time-slot available">
                    <span class="status-dot active"></span>${slot.time}
                  </button>
                `)}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="fixed bottom-0 w-full bg-white/95 backdrop-blur-md py-6 border-t border-gray-200 z-[100] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)]">
        <div class="max-w-3xl mx-auto px-6 flex justify-between items-center">
          <div class="summary-text">
            <div class="text-[10px] text-gray-500 font-medium tracking-wide mb-1 uppercase">
              Selected Service / 04.11 10:00-
            </div>
            <div class="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
              <span class="text-xs mr-1 font-normal opacity-60 uppercase">JPY</span>49,500
            </div>
          </div>
          <button class="bg-black hover:bg-gray-800 text-white py-4 px-6 md:px-12 text-sm font-bold rounded-sm transition-all shadow-lg tracking-widest flex items-center group">
            次へ進む
            <i class="fa-solid fa-chevron-right ml-3 text-[10px] transform group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>
      </div>
    </body>
  `
}