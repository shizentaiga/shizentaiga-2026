/**
 * @file SlotList.tsx
 * @description 特定の日付とプランに基づき、予約可能な時間枠（スロット）を生成・表示。
 * [v4.7 グローバル・タイムゾーン対応モデル]
 * - タイムゾーン設計: サーバー(UTC)環境に依存せず、JST(Asia/Tokyo)での時刻表示を保証。
 * - 堅牢性: オプショナルチェイニングとガード節によるランタイムエラーの徹底防止。
 * - デザイン: 300msのフェードインアニメーションによる、SPAライクな滑らかな遷移。
 */

import { html } from 'hono/html'
import { Context } from 'hono'
import { BUSINESS_INFO } from '../../constants/info'
import { getAvailableChipsFromDB } from '../../db/repositories/booking-db'
import { getPlansFromDB } from '../../db/repositories/plan-db'
import { calculatePossibleSlots } from '../../lib/slot-logic'

/**
 * 予約枠一覧コンポーネント
 * 選択された日付(date)とプラン(planId)に基づき、連続した空き時間を計算して表示します。
 */
export const SlotList = async (c: Context, date: string, planId: string) => {
  
  // 1. ガード節：必須パラメータが欠落している場合は案内を表示
  if (!date || !planId) {
    return html`<div class="py-12 text-center text-gray-400 text-[10px] tracking-[0.2em] uppercase">Select a date to see available times.</div>`;
  }

  /**
   * 2. データ収集（並列実行）
   * info.ts の shopName をキーに、DB層で店舗固有のデータを取得。
   */
  const [chips, allPlans] = await Promise.all([
    getAvailableChipsFromDB(c, date),
    getPlansFromDB(c, BUSINESS_INFO.shopName)
  ]);

  // プラン特定：DBから取得したプラン一覧から対象を検索
  const selectedPlan = allPlans.find(p => p.plan_id === planId);
  if (!selectedPlan) {
    return html`<div class="py-12 text-center text-red-400 text-[10px]">Plan not found for the selected shop.</div>`;
  }

  // 例外処理：スタッフの稼働データ（チップ）が存在しない場合
  if (!chips || chips.length === 0) {
    return html`
      <div class="py-12 border border-dashed border-gray-100 rounded-sm text-center">
        <p class="text-[10px] text-gray-400 tracking-[0.2em] uppercase">No availability for this date</p>
      </div>
    `;
  }

  /**
   * 3. スロット計算 (Grid-Atomic Logic)
   * 最小単位(grid_size_min)と必要時間(duration+buffer)から、予約可能な開始点を算出。
   */
  const grid_size_min = chips?.[0]?.grid_size_min ?? 30; // 安全策：データ未定義時は30分をデフォルトに
  
  // 必要時間の合算
  const total_needed_min = selectedPlan.duration_min + selectedPlan.buffer_min;

  // Unixタイムスタンプ配列の生成
  const available_chips = chips.map((chip: any) => chip.start_at_unix);

  // 計算ロジック実行：連続性を満たす開始時間の配列を取得
  const possibleStartAtUnixList = calculatePossibleSlots(
    available_chips,
    total_needed_min,
    grid_size_min
  );

  /**
   * 4. 表示用データの整形（国際化対応の布石）
   * ⭐️ 実行環境(Workers UTC)に左右されないよう、JST(Asia/Tokyo)を明示的に指定。
   */
  const availableSlots = possibleStartAtUnixList.map(unix => {
    const dateObj = new Date(unix * 1000);
    return {
      unix: unix, // フォーム送信用（ID）
      time: dateObj.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,       // 24時間表記に統一
        timeZone: 'Asia/Tokyo' // JST固定
      })
    };
  });

  // 5. レンダリング：デザイン定義
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