/**
 * @file SlotList.tsx
 * @description 
 * 特定の日付とプランに基づき、予約可能な時間枠（スロット）を生成・表示します。
 * [v3.8 監査反映 & デザイン最適化モデル]
 * - 監査反映: オプショナルチェイニングによる徹底したランタイムエラー防止。
 * - 監査反映: HTMX更新時のアニメーション速度を 300ms に最適化（サクサク感の向上）。
 * - デザイン: 白ベースを維持し、選択時は「黒枠＋右上ドット」で上品に表現。
 */

import { html } from 'hono/html'
import { Context } from 'hono'
import { BUSINESS_INFO } from '../../constants/info'
import { getAvailableChipsFromDB } from '../../db/repositories/booking-db'
import { getPlansFromDB } from '../../db/repositories/plan-db'
import { calculatePossibleSlots } from '../../lib/slot-logic'

/**
 * 予約枠一覧コンポーネント
 */
export const SlotList = async (c: Context, date: string, planId: string) => {
  
  // 1. ガード：日付またはプランがない場合は初期状態のメッセージを表示
  if (!date || !planId) {
    return html`<div class="py-12 text-center text-gray-400 text-[10px] tracking-[0.2em] uppercase">Select a date to see available times.</div>`;
  }

  /**
   * 2. データ収集（並列実行）
   * info.ts の shopName を渡し、DB層で店舗隔離を維持します。
   */
  const [chips, allPlans] = await Promise.all([
    getAvailableChipsFromDB(c, date),
    getPlansFromDB(c, BUSINESS_INFO.shopName)
  ]);

  // 選択されたプランを特定
  const selectedPlan = allPlans.find(p => p.plan_id === planId);
  if (!selectedPlan) {
    return html`<div class="py-12 text-center text-red-400 text-[10px]">Plan not found for the selected shop.</div>`;
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
   * [監査対応] chips?.[0] とすることで、万が一の空配列時のTypeErrorを防止します。
   */
  const grid_size_min = chips?.[0]?.grid_size_min ?? 30;
  
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
   * [監査対応] timeZone: 'Asia/Tokyo' を明示し、実行環境に依存しないJST表示を死守。
   */
  const availableSlots = possibleStartAtUnixList.map(unix => {
    const dateObj = new Date(unix * 1000);
    return {
      unix: unix, // サーバー送信用（ID）
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
    <div class="animate-in fade-in duration-300">
      <h3 class="text-[9px] font-bold tracking-[0.3em] text-gray-400 mb-8 uppercase text-center">
        Available Time Slots (${selectedPlan.duration_min} min session)
      </h3>

      ${availableSlots.length > 0 ? html`
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto">
          ${availableSlots.map((slot) => {
            // 文字列結合による安全なID生成
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