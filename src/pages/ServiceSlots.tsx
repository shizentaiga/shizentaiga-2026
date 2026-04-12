/**
 * @file ServiceSlots.tsx
 * @description 
 * 特定の日付とプランに基づき、予約可能な時間帯（ボタン）を動的に生成します。
 * [v3.0 Grid-Atomic Model] 30分単位のチップを連結して予約枠を「合成」します。
 */

import { Context } from 'hono'
import { getAvailableChipsFromDB } from '../db/booking-db'
import { getPlansFromDB } from '../db/plan-db'
import { calculatePossibleSlots } from '../lib/slot-logic'

/**
 * ServiceSlots コンポーネント（HTMX専用エンドポイント）
 * クエリパラメータ:
 * - date: 選択された日付 (YYYY-MM-DD)
 * - plan_id: 選択されたプランID
 */
export const ServiceSlots = async (c: Context) => {
  const selectedDate = c.req.query('date') || '';
  const planId = c.req.query('plan_id') || '';

  // 1. バリデーション：日付またはプランが未選択の場合は案内を表示
  if (!selectedDate || !planId) {
    return c.html(`
      <p class="text-xs text-gray-400 text-center py-10 bg-white border border-dashed border-gray-200 rounded-xl">
        日付とプランを選択してください
      </p>
    `);
  }

  try {
    // 2. プラン情報の取得と必要時間の算出
    const allPlans = await getPlansFromDB(c);
    const selectedPlan = allPlans.find(p => p.plan_id === planId);

    if (!selectedPlan) {
      return c.html(`<p class="text-sm text-red-400 p-4">指定されたプランが見つかりません</p>`);
    }

    // 合計拘束時間 = 施術時間 + 清掃/バッファ時間
    const totalRequiredMin = selectedPlan.duration_min + selectedPlan.buffer_min;

    // 3. DBから「その日の未予約チップ」をすべて取得 (30分単位の原子データ)
    const availableChips = await getAvailableChipsFromDB(c, selectedDate);
    const chipUnixArray = availableChips.map(chip => chip.start_at_unix);

    // 4. ロジック層で「連続する空き」を計算し、開始時間の候補を算出
    const possibleStartTimes = calculatePossibleSlots(chipUnixArray, totalRequiredMin);

    // 5. 候補がない場合の表示
    if (possibleStartTimes.length === 0) {
      return c.html(`
        <div class="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
          <p class="text-sm text-gray-500 font-medium">ご希望の日付・プランで確保できる空き時間がありません</p>
          <p class="text-[10px] text-gray-400 mt-2">別の日付、または短時間のプランをお試しください</p>
        </div>
      `);
    }

    // 6. 予約枠ボタンのレンダリング
    return c.html(`
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${possibleStartTimes.map(unix => {
          // JST形式で時間を表示 (例: 10:30)
          const timeLabel = new Date(unix * 1000).toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Tokyo'
          });

          /**
           * ボタンクリック時の挙動:
           * v3.0 では「開始時間(unix)」と「プランID」を後続の予約プロセス（Stripe等）へ渡します
           */
          return `
            <button 
              class="group flex flex-col items-center justify-center py-4 border border-gray-200 rounded-xl bg-white hover:border-gray-900 hover:shadow-md transition-all active:scale-95"
              onclick="selectBookingSlot('${unix}', '${planId}')"
            >
              <span class="text-sm font-bold text-gray-800">${timeLabel}</span>
              <span class="text-[9px] text-gray-400 mt-1 group-hover:text-gray-600">予約する</span>
            </button>
          `;
        }).join('')}
      </div>
    `);

  } catch (error) {
    console.error('[ServiceSlots Error]:', error);
    return c.html(`<p class="text-xs text-red-500 text-center py-8">システムエラーが発生しました</p>`);
  }
}