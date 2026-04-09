/**
 * @file ServiceSlots.tsx
 * @description 
 * カレンダーで日付がクリックされた際、その日の「予約ボタン一覧」だけを作る専用ファイルです。
 * ページ全体を書き換えるのではなく、特定の場所だけを最新の状態にする「部品（フラグメント）」を生成します。
 */

import { html } from 'hono/html'
// データベースから予約情報を取ってくるための「道具(getAvailableSlotsFromDB)」と、
// データの形を定義した「設計図(BookingSlot)」を読み込みます。
import { getAvailableSlotsFromDB, BookingSlot } from '../db/booking-db'

/**
 * 【ロジック：時刻の見た目を整える】
 * DBにある数値（Unixタイムスタンプ）を、人間が見てわかる「10:00」のような形式に変えます。
 * * @param unixSeconds - 1970年1月1日からの経過秒数
 * @returns 日本時間での "HH:mm" 形式の文字列
 */
// const formatJstTime = (unixSeconds: number): string => {
//   // コンピュータはミリ秒で計算するため、秒単位を1000倍します
//   const date = new Date(unixSeconds * 1000);
  
//   // 💡 重要：サーバーの場所に関わらず、強制的に「日本（東京）」の時間として文字にします。
//   // これにより、海外のサーバー上でも、等しく同じ時刻が表示されます。
//   return date.toLocaleTimeString('ja-JP', {
//     timeZone: 'Asia/Tokyo',
//     hour: '2-digit',    // 時を2桁で（09時など）
//     minute: '2-digit',  // 分を2桁で
//     hour12: false       // 24時間表記にする
//   });
// }

const formatJstTime = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  
  // Intl.DateTimeFormat を使用して、確実に「日本時間」として文字列化します。
  // これにより 9時間の計算ミスなどが物理的に発生しなくなります。
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * 【メインハンドラー：ServiceSlots】
 * Hono（サーバー）が「/services/slots」へのリクエストを受け取った時に実行されるメイン処理です。
 */
export const ServiceSlots = async (c: any) => {
  // 1. カレンダーから送られてきた日付（例：2026-04-10）を読み取ります。
  const targetDate = c.req.query('date')

  // 【安全策：日付が届かなかった場合】
  // エラーで画面が真っ白にならないよう、赤い文字で警告メッセージを返します。
  if (!targetDate) {
    return c.html(html`
      <div id="slot-list-container">
        <p style="color: #ef4444;">日付が指定されていません。</p>
      </div>
    `)
  }

  try {
    /**
     * 2. データベースへのお問い合わせ
     * await を使うことで、DBからデータが届くまで少しだけ「待機」します。
     * rawSlots には、DBにあるすべての予約枠がリスト形式で入ります。
     */
    const rawSlots: BookingSlot[] = await getAvailableSlotsFromDB(c)

    /**
     * 3. 必要なデータだけを抽出（フィルタリング）
     * 100件のデータがあっても、今日クリックされた日付と一致するものだけに絞り込みます。
     */
    const filteredSlots = rawSlots.filter(slot => slot.date_string === targetDate)

    /**
     * 4. 画面に表示するHTMLの組み立て
     * id="slot-list-container" という名前をつけることで、
     * HTMX（フロントエンド側）が「ここを書き換えればいいんだな」と自動判別します。
     */
    return c.html(html`
      <div id="slot-list-container" class="fade-in">
        <h3 style="font-size: 0.75rem; font-weight: bold; margin-bottom: 1rem; color: #4b5563; letter-spacing: 0.1em;">
          ${targetDate} の予約可能枠
        </h3>
        
        <div style="display: grid; gap: 0.5rem; grid-template-columns: repeat(2, 1fr);">
          ${filteredSlots.length > 0 
            ? filteredSlots.map(slot => {
                // 各データごとに「10:00」「13:30」などの文字を作ります
                const displayTime = formatJstTime(slot.start_at_unix);
                
                return html`
                  <button 
                    type="button"
                    class="slot-btn"
                    style="padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white; font-size: 0.875rem; cursor: pointer; transition: all 0.2s;"
                    onclick="console.log('Selected Slot ID: ${slot.id}')"
                  >
                    ${displayTime}
                  </button>
                `
              })
            : html`<p style="font-size: 0.875rem; color: #9ca3af;">現在、ご案内できる枠がありません。</p>`
          }
        </div>

        <style>
          .fade-in { animation: fadeIn 0.3s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          
          /* マウスを重ねた（ホバーした）時のボタンの色を青色に変えます */
          .slot-btn:hover { 
            background-color: #f9fafb !important; 
            border-color: #3b82f6 !important; 
            color: #3b82f6; 
          }
        </style>
      </div>
    `)
  } catch (error) {
    // 【異常事態への備え】
    // DBが止まっているなどのトラブル時に、コンソールに原因を記録してユーザーに通知します。
    console.error("Fragment Fetch Error:", error)
    return c.html(html`
      <div id="slot-list-container">
        <p style="color: #ef4444; font-size: 0.875rem;">予約枠の取得中にエラーが発生しました。</p>
      </div>
    `, 500)
  }
}