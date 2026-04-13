/**
 * @file test08.tsx
 * @description HTMXとDB(D1)を組み合わせた最小構成の疎通確認ツール。
 * v3.0 グリッド・アトミックモデル対応版。
 */

import { Hono } from 'hono'
import { html } from 'hono/html'
// 関数名を Chips に統一（ビルドエラー回避）
import { getAvailableChipsFromDB } from '../../db/repositories/booking-db'

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test08 = new Hono<{ Bindings: Bindings }>()

/**
 * 1. メイン画面（ベーステンプレート）
 */
test08.get('/', (c) => {
  const currentPath = c.req.path.replace(/\/$/, '')
  
  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTMX + DB (test08) | v3.0 POC</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; line-height: 1.6; color: #334155; background: #f8fafc; }
          h1 { font-size: 1.5rem; color: #1e293b; }
          .slot-card { border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 8px; border-radius: 6px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .status-tag { float: right; font-weight: bold; font-size: 0.75em; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; border: 1px solid; }
          .status-booked { color: #059669; background: #ecfdf5; border-color: #10b981; }
          .status-pending { color: #d97706; background: #fffbeb; border-color: #f59e0b; }
          .status-available { color: #2563eb; background: #eff6ff; border-color: #3b82f6; }
          
          #loading { color: #2563eb; display: none; margin-left: 10px; font-weight: bold; font-size: 0.85em; }
          .htmx-request #loading { display: inline; }
        </style>
      </head>
      <body>
        <h1>予約枠確認 (v3.0 Grid: test08)</h1>
        
        <button 
          hx-get="${currentPath}/api" 
          hx-target="#res" 
          hx-indicator="#loading"
          style="padding: 12px 24px; cursor: pointer; background: #0f172a; color: #fff; border: none; border-radius: 6px; font-weight: bold; transition: opacity 0.2s;"
          onmouseover="this.style.opacity='0.9'"
          onmouseout="this.style.opacity='1'"
        >
          DBから最新予約を取得
        </button>

        <span id="loading">📡 D1 接続中...</span>

        <hr style="margin: 25px 0; border: 0; border-top: 1px solid #e2e8f0;">

        <div id="res">
          <p style="color: #64748b; font-size: 0.9em;">「取得」ボタンを押すと、D1 (shizentaiga_db) の <strong>staff_schedules</strong> テーブルから未予約分を取得します。</p>
        </div>

      </body>
    </html>
  `)
})

/**
 * 2. 部分HTML返却エンドポイント (Fragment API)
 */
test08.get('/api', async (c) => {
  try {
    const rawSlots = await getAvailableChipsFromDB(c)
    const now = new Date().toLocaleTimeString('ja-JP')

    if (rawSlots.length === 0) {
      return c.html(html`
        <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 6px; color: #92400e;">
          <strong>取得完了（空き枠なし）</strong>
          <p style="font-size: 0.85em; margin: 5px 0 0;">現在、表示可能な未予約チップは存在しません。 (${now})</p>
        </div>
      `)
    }

    return c.html(html`
      <div>
        <p style="font-size: 0.85em; color: #64748b; margin-bottom: 12px;">
          取得時刻: <strong>${now}</strong> / 検出: <strong>${rawSlots.length}</strong>件
        </p>
        ${rawSlots.slice(0, 10).map(s => {
          // 型チェックを回避するために any にキャスト
          const slot = s as any;
          
          const startTime = new Date(slot.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
          
          // ステータスに応じたクラス分け（値がない場合は available をデフォルトにする）
          const status = slot.booking_status || 'available';
          const statusClass = status === 'booked' ? 'status-booked' : (status === 'pending' ? 'status-pending' : 'status-available');

          return html`
            <div class="slot-card">
              <span class="status-tag ${statusClass}">${status}</span>
              <div style="font-weight: bold; color: #334155;">📅 ${slot.date_string} <span style="margin-left:8px; color:#2563eb;">${startTime}〜</span></div>
              <div style="font-size: 0.7em; color: #94a3b8; margin-top: 6px; font-family: monospace;">Slot ID: ${slot.slot_id || 'UNASSIGNED'}</div>
            </div>
          `
        })}
        ${rawSlots.length > 10 ? html`<p style="font-size: 0.75em; color: #94a3b8; text-align: center; margin-top: 12px; font-style: italic;">...他 ${rawSlots.length - 10} 件のデータが存在します</p>` : ''}
      </div>
    `)

  } catch (error) {
    console.error('v3.0 PoC Error:', error)
    return c.html(html`
      <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 6px; color: #b91c1c;">
        <strong>v3.0 システムエラー</strong>
        <p style="font-size: 0.85em; margin-top: 5px;">
          データの取得に失敗しました。D1 の接続設定や型定義を確認してください。
        </p>
      </div>
    `)
  }
})