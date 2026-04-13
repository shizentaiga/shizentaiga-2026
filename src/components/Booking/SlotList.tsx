/**
 * @file SlotList.tsx
 * @description 
 * 特定の日付とプランに基づき、予約可能な時間枠（スロット）を生成・表示します。
 * [v3.2 Multi-Tenant & Grid-Atomic対応]
 * 1. info.ts の shopName に基づき、他店舗データの混入を完全に遮断します。
 * 2. slot-logic.ts のアルゴリズムを用いて、チップの連続性をスキャンします。
 */

import { html } from 'hono/html'
import { Context } from 'hono'
import { BUSINESS_INFO } from '../../constants/info'
import { getAvailableChipsFromDB } from '../../db/booking-db'
import { getPlansFromDB } from '../../db/plan-db'
import { calculatePossibleSlots } from '../../lib/slot-logic'

/**
 * 予約枠一覧コンポーネント
 */
export const SlotList = async (c: Context, date: string, planId: string) => {
  
  // 1. ガード：日付またはプランがない場合は初期状態のメッセージを表示
  if (!date || !planId) {
    return html`<div class="py-12 text-center text-gray-400 text-xs tracking-widest uppercase">Select a date to see available times.</div>`;
  }

  /**
   * 2. データ収集（並列実行）
   * info.ts の shopName を渡し、DB層で「善幽」のデータのみに絞り込みます。
   */
  const [chips, allPlans] = await Promise.all([
    getAvailableChipsFromDB(c, date),
    getPlansFromDB(c, BUSINESS_INFO.shopName) // ★店舗隔離の鍵
  ]);

  // 選択されたプランを特定
  const selectedPlan = allPlans.find(p => p.plan_id === planId);
  if (!selectedPlan) {
    return html`<div class="py-12 text-center text-red-400 text-xs">Plan not found for the selected shop.</div>`;
  }

  // チップが存在しない（その日にスタッフの稼働がない）場合の処理
  if (!chips || chips.length === 0) {
    return html`
      <div class="py-12 border border-dashed border-gray-100 rounded-sm text-center">
        <p class="text-[10px] text-gray-400 tracking-[0.2em] uppercase">No availability for this date</p>
      </div>
    `;
  }

  /**
   * 3. スロット計算 (Grid-Atomic Logic)
   * 外部化した純粋関数 calculatePossibleSlots に計算を委託します。
   */
  // DBの staff_schedules からグリッド単位を取得（存在しない場合はデフォルト30分）
  const grid_size_min = chips[0].grid_size_min || 30;
  
  // プランの合計必要時間（施術 + 予備）
  const total_needed_min = selectedPlan.duration_min + selectedPlan.buffer_min;

  // Unixスタンプの配列を抽出
  const available_chips = chips.map((chip: any) => chip.start_at_unix);

  // ロジック実行：連続性を満たす開始時間のUnixスタンプ配列を取得
  const possibleStartAtUnixList = calculatePossibleSlots(
    available_chips,
    total_needed_min,
    grid_size_min
  );

  /**
   * 4. 表示用データの整形
   */
  const availableSlots = possibleStartAtUnixList.map(unix => {
    const dateObj = new Date(unix * 1000);
    return {
      time: dateObj.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo'
      })
    };
  });

  // 5. レンダリング
  return html`
    <div class="animate-in fade-in duration-700">
      <h3 class="text-[9px] font-bold tracking-[0.3em] text-gray-400 mb-8 uppercase text-center">
        Available Time Slots (${selectedPlan.duration_min} min session)
      </h3>

      ${availableSlots.length > 0 ? html`
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto">
          ${availableSlots.map((slot) => html`
            <button 
              type="button"
              class="group relative py-4 px-2 border border-gray-100 rounded-sm bg-white hover:bg-gray-900 transition-all duration-500 shadow-sm hover:shadow-xl"
            >
              <span class="text-xs font-light tracking-[0.15em] text-gray-900 group-hover:text-white transition-colors duration-300">
                ${slot.time}
              </span>
            </button>
          `)}
        </div>
      ` : html`
        <div class="py-12 border border-dashed border-gray-100 rounded-sm text-center">
          <p class="text-[10px] text-gray-400 tracking-[0.2em] uppercase">Full or no slots available</p>
        </div>
      `}
    </div>
  `;
}