/**
 * @file test06.tsx
 * @description HTMXを用いた最小構成の疎通確認ツール。
 * JavaScriptを一切書かずに、サーバーサイドのロジックだけで画面の一部を更新する
 * 「HTMXアーキテクチャ」の基本構造を示します。
 */

import { Hono } from 'hono'
import { html } from 'hono/html'

export const test06 = new Hono()

/**
 * 1. メイン画面のレンダリング
 * HTMX本体の読み込みと、リクエストを飛ばすためのトリガー（ボタン）を配置します。
 */
test06.get('/', (c) => {
  /**
   * パス解決のロジック:
   * Honoがサブアプリとしてマウントされている場合（例: /_debug/test06）、
   * 相対パスの解釈ズレを防ぐため、リクエストから現在のフルパスを取得します。
   */
  const currentPath = c.req.path.replace(/\/$/, '') 
  
  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <title>HTMX Minimal Test</title>
      </head>
      <body>
        <h1>HTMX TEST</h1>
        
        <button hx-get="${currentPath}/api" hx-target="#res">
          FETCH DATA
        </button>

        <div id="res">No Data Yet</div>
      </body>
    </html>
    `)
})

/**
 * 2. 部分HTML返却エンドポイント
 * JSONではなく「HTMLの部品」を直接返します。
 */
test06.get('/api', (c) => {
  // サーバーサイドで時刻を生成
  const now = new Date().toLocaleTimeString('ja-JP')

  return c.html(html`
    <p style="color: blue; font-weight: bold;">
      SUCCESS: ${now}
    </p>
    `)
})