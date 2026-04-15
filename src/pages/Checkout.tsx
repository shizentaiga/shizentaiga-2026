/**
 * @file Checkout.tsx
 * @description 予約内容の最終確認ページ（v4.7 グローバル・タイムゾーン対応モデル）。
 * [設計方針]
 * 1. プレゼンテーション層: 上位層から注入された確定データに基づき、予約内容を最終表示。
 * 2. タイムゾーン設計: Cloudflare Workers(UTC)環境下でも、JST(Asia/Tokyo)での正確な時刻表示を保証。
 * 3. ローカライズ対応: localeプロパティにより、将来的な多言語展開（海外展開）への拡張性を確保。
 */

import { html } from 'hono/html'

/**
 * 予約確認コンポーネント
 */
export const Checkout = ({ 
  shopName,
  staffName,
  planName,
  duration,
  price,
  rawShopId, 
  rawPlanId, 
  date, 
  slot,
  // --- ⚙️ 制御用プロパティ（デフォルト値設定済み） ---
  showDebug = true, 
  backUrl = "/services",
  locale = "ja-JP"
}: { 
  shopName: string;
  staffName: string;
  planName: string;
  duration: number;
  price: number;
  rawShopId: string; 
  rawPlanId: string; 
  date: string; 
  slot: string;
  showDebug?: boolean; 
  backUrl?: string;
  locale?: string;
}) => {
  
  /**
   * 時刻整形ロジック:
   * ⭐️ 監査反映：実行環境に依存せず、常に指定のタイムゾーン(JST)で24時間制表示を行う。
   * 将来のタイムゾーン変数化を見据えた「ハードコーディング最小化」設計。
   */
  const formattedTime = slot ? new Date(parseInt(slot) * 1000).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo'
  }) : 'N/A';

  // 日付の表示調整: 日本国内向けは「YYYY年MM月DD日」形式を採用
  const formattedDate = date ? date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日') : 'N/A';

  /**
   * 【Debug Area】データトレーサビリティ
   * ページ遷移時に受け渡された生のID（rawId）を可視化。
   */
  const debugMonitor = showDebug ? html`
    <div class="mt-8 p-4 bg-black/90 rounded-sm border border-gray-800 font-mono text-[9px] text-gray-500 shadow-xl">
      <p class="text-gray-300 border-b border-gray-800 pb-2 mb-2 font-bold tracking-tighter uppercase">Debug: Raw Data Trace</p>
      <div class="grid grid-cols-2 gap-2">
        <p>RAW_SHOP : <span class="text-green-500">${rawShopId}</span></p>
        <p>RAW_PLAN : <span class="text-green-500">${rawPlanId}</span></p>
        <p>RAW_DATE : <span class="text-green-500">${date}</span></p>
        <p>RAW_SLOT : <span class="text-green-500">${slot}</span></p>
      </div>
    </div>
  ` : '';

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <body class="bg-gray-50 text-gray-800 antialiased">
      <div class="max-w-xl mx-auto min-h-screen flex flex-col justify-center p-6">
        
        <div class="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
          <div class="p-8">
            <h1 class="text-xs font-bold tracking-[0.3em] text-gray-400 uppercase mb-8 border-b pb-4">
              Booking Confirmation
            </h1>

            <div class="space-y-6">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Shop</label>
                  <p class="text-base font-medium text-gray-900">${shopName}</p>
                </div>
                <div>
                  <label class="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Specialist</label>
                  <p class="text-base font-medium text-gray-900">${staffName}</p>
                </div>
              </div>

              <div class="pt-4 border-t border-gray-50">
                <label class="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Selected Plan</label>
                <p class="text-lg font-bold text-gray-900">${planName}</p>
                <p class="text-sm text-gray-500 mt-1">${duration} min / ¥${price.toLocaleString()}</p>
              </div>

              <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div>
                  <label class="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Date</label>
                  <p class="text-base font-medium">${formattedDate}</p>
                </div>
                <div>
                  <label class="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Time</label>
                  <p class="text-base font-medium">${formattedTime}</p>
                </div>
              </div>
            </div>

            <div class="mt-10">
              <button class="w-full bg-black text-white py-5 text-[11px] font-bold rounded-sm tracking-[0.2em] uppercase hover:bg-gray-800 transition-all flex justify-center items-center group">
                Proceed to Payment
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-3 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </button>
              
              <a href="${backUrl}" class="block text-center mt-6 text-[10px] text-gray-400 hover:text-gray-600 tracking-widest uppercase transition-colors">
                ← Modify Selection
              </a>
            </div>
          </div>
        </div>

        ${debugMonitor}
      </div>
    </body>
  `
}