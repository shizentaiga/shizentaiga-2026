/**
 * @file ServiceSlots.tsx
 * @description 
 * 特定の日付に関連付けられた予約枠（時間帯ボタン）のHTML断片を生成します。
 * HTMXからのリクエストに応答し、カレンダー下のエリアを動的に書き換えます。
 */

import { Context } from 'hono'
import { getAvailableSlotsFromDB } from '../db/booking-db'

/**
 * ServiceSlots コンポーネント（HTMX用エンドポイント）
 * クエリパラメータ ?date=YYYY-MM-DD を受け取り、その日の枠を返します。
 */
export const ServiceSlots = async (c: Context) => {
  const selectedDate = c.req.query('date') || '';
  
  // 1. DBから全予約枠を取得（または特定日付でフィルタリングする関数を呼ぶ）
  const allSlots = await getAvailableSlotsFromDB(c);
  
  // 2. 選択された日付に合致する枠だけを抽出
  const daySlots = allSlots.filter(s => s.date_string === selectedDate);

  // 3. HTML断片のレンダリング
  if (daySlots.length === 0) {
    return c.html(`
      <p class="text-sm text-gray-400 text-center py-8 bg-white border border-gray-100 rounded-sm">
        選択された日付に予約可能な枠はございません。
      </p>
    `);
  }

  return c.html(`
    <div class="grid grid-cols-2 gap-3">
      ${daySlots.map(slot => {
        // Unixタイムスタンプから時間を抽出 (例: 10:00)
        const timeStr = new Date(slot.start_at_unix * 1000)
          .toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        return `
          <button class="py-4 border border-gray-200 rounded-sm text-sm font-medium hover:border-gray-900 transition-all bg-white"
                  data-slot-id="${slot.slot_id}">
            ${timeStr}
          </button>
        `;
      }).join('')}
    </div>
  `);
}