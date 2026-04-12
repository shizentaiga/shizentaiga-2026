/**
 * @file SlotList.tsx
 * @description 
 * 特定の日付とプランに基づき、予約可能な時間枠（スロット）を生成・表示します。
 * [v3.0 Grid-Atomic対応]
 * 供給チップ（staff_schedules）の連続性をチェックし、プランの所要時間を満たす開始時間を算出します。
 */

import { html } from 'hono/html'
import { getAvailableChipsFromDB } from '../db/booking-db'
import { getPlansFromDB } from '../db/plan-db'

/* --- CONFIGURATION --- */
/**
 * システムが許容する最小のグリッド単位（分）
 * 1分単位などの極小分割によるDB負荷やループ爆発を防ぐセーフティガードです。
 * 将来的に5分単位等に変更する場合は、この値を書き換えます。
 */
const SYSTEM_MIN_GRID_UNIT = 15;

/**
 * 予約枠一覧コンポーネント
 */
export const SlotList = async (c: any, date: string, planId: string) => {
  
  // 1. ガード：日付またはプランがない場合は何も表示しない
  if (!date || !planId) {
    return html`<div class="py-12 text-center text-gray-400 text-xs">Select a date to see available times.</div>`;
  }

  /**
   * 2. 計算に必要なデータの収集
   */
  const [chips, allPlans] = await Promise.all([
    getAvailableChipsFromDB(c, date),
    getPlansFromDB(c)
  ]);

  const selectedPlan = allPlans.find(p => p.plan_id === planId);
  if (!selectedPlan) return html`<div>Plan not found.</div>`;

  // チップが存在しない（その日にスタッフの稼働がない）場合の処理
  if (!chips || chips.length === 0) {
    return html`
      <div class="py-12 border border-dashed border-gray-200 rounded-sm text-center">
        <p class="text-xs text-gray-400 tracking-widest uppercase">No available slots</p>
      </div>
    `;
  }

  /**
   * 3. スロット計算ロジック (Grid-Atomic Scan)
   * schema.sql の定義名 `grid_size_min` を使用します。
   */
  // DBの設定値を取得し、システムの最小許容単位でガードをかける
  const rawGridSize = chips[0].grid_size_min || 30; 
  const atomicUnitMin = Math.max(SYSTEM_MIN_GRID_UNIT, rawGridSize);
  const atomicUnitSec = atomicUnitMin * 60; // 連続性判定用の秒数差
  
  // プランの合計必要時間（duration + buffer）
  const totalNeededMin = selectedPlan.duration_min + (selectedPlan.buffer_min || 0);
  
  // 最小単位（チップ）が何個連続で必要かを算出
  const chipsNeeded = Math.ceil(totalNeededMin / atomicUnitMin);
  
  const availableSlots: { time: string }[] = [];
  
  // チップを開始時間順（UNIXタイムスタンプ）にソート
  const sortedStartTimes = chips
    .map((chip: any) => chip.start_at_unix)
    .sort((a: number, b: number) => a - b);

  /**
   * 4. 連続性チェック
   * 配列をスキャンし、直後のチップが atomicUnitSec 秒後に存在するかを確認し続けます。
   */
  for (let i = 0; i <= sortedStartTimes.length - chipsNeeded; i++) {
    let isContinuous = true;
    for (let j = 0; j < chipsNeeded - 1; j++) {
      // 隣り合うチップの開始時間が atomicUnitSec(900sや1800s) ちょうど離れているか
      if (sortedStartTimes[i + j + 1] !== sortedStartTimes[i + j] + atomicUnitSec) {
        isContinuous = false;
        break;
      }
    }
    
    if (isContinuous) {
      // 開始時間を 'HH:mm' 形式に変換
      const startTime = new Date(sortedStartTimes[i] * 1000);
      const timeStr = startTime.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo'
      });
      availableSlots.push({ time: timeStr });
    }
  }

  // 5. レンダリング
  return html`
    <div class="animate-in fade-in duration-500">
      <h3 class="text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase text-center">
        Available Time Slots (${selectedPlan.duration_min}min)
      </h3>

      ${availableSlots.length > 0 ? html`
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
          ${availableSlots.map((slot) => html`
            <button 
              type="button"
              class="group relative py-4 px-2 border border-gray-200 rounded-sm bg-white hover:bg-gray-900 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <span class="text-sm font-medium tracking-wider text-gray-900 group-hover:text-white transition-colors">
                ${slot.time}
              </span>
            </button>
          `)}
        </div>
      ` : html`
        <div class="py-12 border border-dashed border-gray-200 rounded-sm text-center">
          <p class="text-xs text-gray-400 tracking-widest uppercase">No available slots</p>
        </div>
      `}
    </div>
  `;
}