/**
 * @file Checkout.tsx
 * @description 予約内容の最終確認ページ（test04 成功ロジック完全準拠モデル）。
 */

import { html } from 'hono/html'

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
  showDebug = false, 
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
  
  // 表示用の整形
  const formattedTime = slot ? new Date(parseInt(slot) * 1000).toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo'
  }) : 'N/A';

  const formattedDate = date ? date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日') : 'N/A';

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <body class="bg-gray-50 text-gray-800 antialiased">
      <div class="max-w-xl mx-auto min-h-screen flex flex-col justify-center p-6">
        
        <div class="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden p-8">
          <h1 class="text-xs font-bold tracking-[0.3em] text-gray-400 uppercase mb-8 border-b pb-4">
            Booking Confirmation
          </h1>

          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] text-gray-400 uppercase block mb-1">Shop</label>
                <p class="text-base font-medium">${shopName}</p>
              </div>
              <div>
                <label class="text-[10px] text-gray-400 uppercase block mb-1">Specialist</label>
                <p class="text-base font-medium">${staffName}</p>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-50">
              <label class="text-[10px] text-gray-400 uppercase block mb-1">Selected Plan</label>
              <p class="text-lg font-bold">${planName}</p>
              <p class="text-sm text-gray-500">${duration} min / ¥${price.toLocaleString()}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
              <div><label class="text-[10px] text-gray-400 uppercase">Date</label><p>${formattedDate}</p></div>
              <div><label class="text-[10px] text-gray-400 uppercase">Time</label><p>${formattedTime}</p></div>
            </div>
          </div>

          <div class="mt-10">
            <form action="/services/checkout/session" method="POST">
            <input type="hidden" name="plan_name" value="${planName}">
            <input type="hidden" name="amount" value="${price}">
            <input type="hidden" name="plan_id" value="${rawPlanId}">
            <input type="hidden" name="shop_id" value="${rawShopId}"> 
            <input type="hidden" name="date" value="${date}">
            <input type="hidden" name="slot" value="${slot}">

              <button type="submit" class="w-full bg-black text-white py-5 text-[11px] font-bold rounded-sm tracking-[0.2em] uppercase hover:bg-gray-800 transition-all flex justify-center items-center">
                Proceed to Payment
              </button>
            </form>
            
            <a href="${backUrl}" class="block text-center mt-6 text-[10px] text-gray-400 uppercase tracking-widest">
              ← Modify Selection
            </a>
          </div>
        </div>

        ${showDebug ? html`
          <div class="mt-8 p-4 bg-black rounded-sm font-mono text-[9px] text-gray-500">
            <p class="text-white border-b border-gray-800 pb-2 mb-2 font-bold uppercase">Debug Trace (Data to be sent)</p>
            <div class="grid grid-cols-2 gap-2 text-green-500">
              <p>PLAN: ${planName}</p>
              <p>PRICE: ${price}</p>
              <p>ID: ${rawPlanId}</p>
              <p>SLOT: ${slot}</p>
            </div>
          </div>
        ` : ''}

      </div>
    </body>
  `
}