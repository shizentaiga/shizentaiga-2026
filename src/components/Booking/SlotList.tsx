/**
 * @file SlotList.tsx
 * @description 特定の日付とプランに基づき、予約可能な時間枠（スロット）を生成・表示。
 * [v5.2 整合性再構築：Intl タイムゾーン表示モデル]
 * - ルール: 計算はすべて生の UnixTime。表示時のみ Intl を使用して Asia/Tokyo 変換。
 */

import { html } from 'hono/html'
import { Context } from 'hono'
import { BUSINESS_INFO } from '../../constants/info'
import { getAvailableChipsFromDB } from '../../db/repositories/booking-db'
import { getPlansFromDB } from '../../db/repositories/plan-db'
import { calculatePossibleSlots } from '../../lib/slot-logic'

type Bindings = {
  shizentaiga_db: D1Database;
  STRIPE_SECRET_KEY?: string;
}

/**
 * 予約枠一覧コンポーネント
 */
export const SlotList = async (c: Context<{ Bindings: Bindings }>, date: string, planId: string) => {

  // 1. ガード節
  if (!date || !planId) {
    return html`<div class="py-12 text-center text-gray-400 text-[10px] tracking-[0.2em] uppercase">Select a date to see available times.</div>`;
  }

  // 2. データ収集
  const [chips, allPlans] = await Promise.all([
    getAvailableChipsFromDB(c, date),
    getPlansFromDB(c, BUSINESS_INFO.shopName)
  ]);

  const selectedPlan = allPlans.find(p => p.plan_id === planId);
  if (!selectedPlan) {
    return html`<div class="py-12 text-center text-red-400 text-[10px]">Plan not found.</div>`;
  }

  if (!chips || chips.length === 0) {
    return html`
      <div class="py-12 border border-dashed border-gray-100 rounded-sm text-center">
        <p class="text-[10px] text-gray-400 tracking-[0.2em] uppercase">No availability for this date</p>
      </div>
    `;
  }

  // 3. スロット計算（生の UnixTime のまま処理）
  const grid_size_min = chips?.[0]?.grid_size_min ?? 30;
  const total_needed_min = selectedPlan.duration_min + selectedPlan.buffer_min;
  const available_chips = chips.map((chip: any) => chip.start_at_unix);

  const possibleStartAtUnixList = calculatePossibleSlots(
    available_chips,
    total_needed_min,
    grid_size_min
  );

  /**
   * 4. 表示用データの整形（唯一の JST 補正ポイント）
   * 💡 修正ポイント: 
   * addHours ではなく Intl.DateTimeFormat を使用。
   * これにより、「UnixTime という絶対値」を維持したまま、表示だけを日本時間で行います。
   */
  const availableSlots = possibleStartAtUnixList.map(unix => {
    // UnixTime(秒) を Date オブジェクトに変換
    const dateObj = new Date(Number(unix) * 1000);
    
    // 日本時間(JST)の文字列を生成
    const timeLabel = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateObj);

    return {
      unix: unix,      // フォーム送信や計算にはこれを使う（不変）
      time: timeLabel  // ユーザーに見える時間（JST）
    };
  });

  // 5. レンダリング
  return html`
    <div class="animate-in fade-in duration-300">
      <h3 class="text-[9px] font-bold tracking-[0.3em] text-gray-400 mb-8 uppercase text-center">
        Available Time Slots (${selectedPlan.duration_min} min session)
      </h3>

      ${availableSlots.length > 0 ? html`
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto">
          ${availableSlots.map((slot) => {
            const radioId = "slot-" + slot.unix;
            
            return html`
              <div class="relative">
                <input 
                  type="radio" 
                  name="slot_id" 
                  id="${radioId}"
                  value="${slot.unix}" 
                  data-time="${slot.time}"
                  class="peer hidden"
                />
                <label 
                  for="${radioId}"
                  class="block cursor-pointer py-4 px-2 border border-gray-100 rounded-sm bg-white text-center transition-all duration-300 shadow-sm 
                         hover:border-gray-900 peer-checked:border-gray-900 peer-checked:ring-1 peer-checked:ring-gray-900 peer-checked:shadow-md"
                >
                  <span class="text-xs font-light tracking-[0.15em] text-gray-900 peer-checked:font-medium transition-all duration-300">
                    ${slot.time}
                  </span>
                  <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-gray-900 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-300"></div>
                </label>
              </div>
            `;
          })}
        </div>
      ` : html`
        <div class="py-12 border border-dashed border-gray-100 rounded-sm text-center">
          <p class="text-[10px] text-gray-400 tracking-[0.2em] uppercase">Full or no slots available</p>
        </div>
      `}
    </div>
  `;
}