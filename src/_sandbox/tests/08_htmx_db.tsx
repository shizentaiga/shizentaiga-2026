/**
 * @file test08.tsx
 * @description HTMXとDB(D1)を組み合わせた最小構成の疎通確認ツール。
 * * 【経営判断：2026-04-09】
 * 1. スタートアップ優先原則: 自社配信設定（セルフホスト）のデバッグコストを削減し、検証速度を最大化。
 * 2. 可用性リスクの受容: unpkg.com への依存を一時的に許容し、DB連携のPoC（概念実証）を優先。
 * 3. 疎通の確実性: 実績のある test08 構成をベースに、D1データベース（shizentaiga_db）との接続を実証。
 */

import { Hono } from 'hono'
import { html } from 'hono/html'
import { getAvailableSlotsFromDB } from '../../db/booking-db'

export const test08 = new Hono()

/**
 * 1. メイン画面（ベーステンプレート）
 * HTMXエンジンを読み込み、データの「受け皿」となるコンテナを提供します。
 */
test08.get('/', (c) => {
  /**
   * パス解決のロジック:
   * 開発環境やデバッグ用のサブディレクトリにマウントされた場合でも、
   * APIエンドポイントへの相対リクエストが壊れないよう現在のパスを動的に取得します。
   */
  const currentPath = c.req.path.replace(/\/$/, '')
  
  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTMX + DB (test08) | POC</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <style>
          /* 最小限の動作確認用スタイル（Linter警告リスクの排除） */
          body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333; background: #fafafa; }
          .slot-card { border: 1px solid #ddd; padding: 12px; margin-bottom: 8px; border-radius: 4px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .status-tag { float: right; font-weight: bold; font-size: 0.8em; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 12px; }
          
          /* HTMXインジケーター制御: 通信中のみ表示 */
          #loading { color: #2563eb; display: none; margin-left: 10px; font-weight: bold; font-size: 0.8em; }
          .htmx-request #loading { display: inline; }
          .htmx-request#loading { display: inline; }
        </style>
      </head>
      <body>
        <h1>予約枠確認 (PoC: test08)</h1>
        
        <button 
          hx-get="${currentPath}/api" 
          hx-target="#res" 
          hx-indicator="#loading"
          style="padding: 10px 20px; cursor: pointer; background: #333; color: #fff; border: none; border-radius: 4px; font-weight: bold;"
        >
          DBから最新情報を取得
        </button>

        <span id="loading">📡 データ取得中...</span>

        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">

        <div id="res">
          <p style="color: #888;">「取得」ボタンを押すと、Cloudflare D1 データベースへ接続します。</p>
        </div>

      </body>
    </html>
  `)
})

/**
 * 2. 部分HTML返却エンドポイント (Fragment API)
 * JSONではなく「レンダリング済みのHTMLパーツ」を返却することで、
 * フロントエンド側のパース処理やバグのリスクを物理的に排除します。
 */
test08.get('/api', async (c) => {
  try {
    // ビジネスロジック層から予約枠を取得（既存の shizentaiga_db 接続を利用）
    const slots = await getAvailableSlotsFromDB(c)
    const now = new Date().toLocaleTimeString('ja-JP')

    // データが0件の場合の例外処理（UXを考慮）
    if (slots.length === 0) {
      return c.html(html`
        <div style="background: #fff4e5; border: 1px solid #ffcc80; padding: 15px; border-radius: 4px; color: #9a6700;">
          <strong>取得完了（0件）</strong>
          <p style="font-size: 0.9em; margin: 5px 0 0;">現在、未来の予約枠はデータベースに登録されていません。 (${now})</p>
        </div>
      `)
    }

    // 正常系：取得データをHTMLパーツとして返却（最大5件に制限し負荷を抑制）
    return c.html(html`
      <div>
        <p style="font-size: 0.8em; color: #666; margin-bottom: 10px;">
          取得時刻: <strong>${now}</strong> / 該当件数: <strong>${slots.length}</strong>件
        </p>
        ${slots.slice(0, 5).map(slot => html`
          <div class="slot-card">
            <span class="status-tag">${slot.status}</span>
            <div style="font-weight: bold; color: #1e293b;">📅 ${slot.date_string}</div>
            <div style="font-size: 0.7em; color: #94a3b8; margin-top: 4px;">Slot ID: ${slot.id}</div>
          </div>
        `)}
        ${slots.length > 5 ? html`<p style="font-size: 0.8em; color: #94a3b8; text-align: center; margin-top: 10px;">...他 ${slots.length - 5} 件のデータが存在します</p>` : ''}
      </div>
    `)

  } catch (error) {
    // 異常系：DB接続失敗時のフォールバック通知
    console.error('PoC DB Access Error:', error)
    return c.html(html`
      <div style="background: #fee2e2; border: 1px solid #f87171; padding: 15px; border-radius: 4px; color: #b91c1c;">
        <strong>DB接続エラー</strong>
        <p style="font-size: 0.9em; margin-top: 5px;">
          shizentaiga_db への接続に失敗しました。D1のBinding設定、またはローカル開発環境のデータ有無を確認してください。
        </p>
      </div>
    `)
  }
})