/**
 * @file ServiceSlots.tsx
 * @description 
 * 特定の日付を選択した際に、その日の予約枠（ボタン一覧）だけをHTMLとして返す「断片（Fragment）」生成ファイル。
 * ページ全体をリロードせずに、カレンダーの下の部分だけを書き換えるために使用します。
 */

import { html } from 'hono/html'
// db/booking-db.ts から、データ取得関数と「データの型定義（BookingSlot）」をインポート
import { getAvailableSlotsFromDB, BookingSlot } from '../db/booking-db'

/**
 * 【ロジック：時刻変換】
 * Unix Timestamp (秒単位の数値) を JST (日本標準時) の "10:00" 形式の文字列に変換します。
 * * 💡 なぜサーバー側でするのか？：
 * ブラウザ（JavaScript）に計算させると、ユーザーのPC設定が「海外時間」だった場合に
 * 表示がズレる不具合が起きます。サーバー側で固定することで、誰が見ても正しい日本時間になります。
 */
const formatJstTime = (unixSeconds: number): string => {
  // 1. 秒をミリ秒に変換してDateオブジェクトを作成
  const date = new Date(unixSeconds * 1000);
  // 2. サーバー環境に関わらず、強制的に日本時間 (+9時間) の位置へ時間をずらす
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  // 3. 2桁表示（例：4時 → 04時）を維持しつつ、時と分を抽出
  const hours = jstDate.getUTCHours().toString().padStart(2, '0');
  const minutes = jstDate.getUTCMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * 【メインハンドラー：ServiceSlots】
 * Honoのルーティングから呼び出される「中身」の処理です。
 */
export const ServiceSlots = async (c: any) => {
  // 1. URLの末尾（?date=2026-04-10）から日付文字列を受け取る
  const targetDate = c.req.query('date')

  // 【ガード：日付がない場合】
  // 万が一URLが正しくない場合、システムを止めずに「エラー表示」だけを返します
  if (!targetDate) {
    return c.html(html`
      <div id="slot-list-container">
        <p style="color: #ef4444;">日付が指定されていません。</p>
      </div>
    `)
  }

  try {
    /**
     * 2. データベースから全予約枠を取得
     * : BookingSlot[] という記述は「この変数は予約枠データの配列である」という型宣言です。
     * これにより、スペルミス（time_string等）をTypeScriptが事前に防いでくれます。
     */
    const rawSlots: BookingSlot[] = await getAvailableSlotsFromDB(c)

    /**
     * 3. データのフィルタリング
     * DBにある大量のデータの中から、今クリックされた日付（targetDate）と一致するものだけを抜き出します。
     * 文字列同士（'2026-04-10' === '2026-04-10'）で比較するため、計算ミスが起きません。
     */
    const filteredSlots = rawSlots.filter(slot => slot.date_string === targetDate)

    /**
     * 4. HTMLの生成
     * id="slot-list-container" を持たせることで、HTMXが「ここを書き換えればいいんだな」と判断します。
     */
    return c.html(html`
      <div id="slot-list-container" class="fade-in">
        <h3 style="font-size: 0.75rem; font-weight: bold; margin-bottom: 1rem; color: #4b5563; letter-spacing: 0.1em;">
          ${targetDate} の予約可能枠
        </h3>
        
        <div style="display: grid; gap: 0.5rem; grid-template-columns: repeat(2, 1fr);">
          ${filteredSlots.length > 0 
            ? filteredSlots.map(slot => {
                // 各スロットごとに、表示用の時刻（10:00など）を作成
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

        {/* CSSアニメーションをここに内蔵することで、予約枠が表示される瞬間にふわっと出てきます */}
        <style>
          .fade-in { animation: fadeIn 0.3s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .slot-btn:hover { background-color: #f9fafb !important; border-color: #3b82f6 !important; color: #3b82f6; }
        </style>
      </div>
    `)
  } catch (error) {
    // 予期せぬエラー（DB切断など）が発生した場合の処理
    console.error("Fragment Fetch Error:", error)
    return c.html(html`
      <div id="slot-list-container">
        <p style="color: #ef4444; font-size: 0.875rem;">予約枠の取得中にエラーが発生しました。</p>
      </div>
    `, 500)
  }
}