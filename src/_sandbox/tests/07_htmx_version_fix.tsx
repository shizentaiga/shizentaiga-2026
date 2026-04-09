/**
 * @file test07.tsx
 * @description HTMX v1.9.12 検証（CDN依存・開発スピード優先モデル）。
 * * 【経営判断：2026-04-09】
 * 1. 可用性リスクの受容: unpkg.com のダウンタイムリスクを許容し、開発・検証速度を優先。
 * 2. 資産の簡素化: 自社サーバー内への静的ファイル配置を不要とし、デプロイコストを削減。
 * 3. 疎通の確実性: 既に実績のある test06 の配信モデルを継承し、検証を加速させる。
 */

import { Hono } from 'hono'
import { html } from 'hono/html'

export const test07 = new Hono()

test07.get('/', (c) => {
  const currentPath = c.req.path.replace(/\/$/, '') 
  
  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTMX v1.9.12 CDN-Test</title>
        
        <script src="https://unpkg.com/htmx.org@1.9.12"></script>

        <style>
          /* 最小限の動作確認用スタイル */
          .htmx-indicator { display: none; }
          .htmx-request .htmx-indicator { display: inline-block; }
          body { font-family: sans-serif; padding: 2rem; }
          button { padding: 0.5rem 1rem; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 4px; }
          #res { margin-top: 1rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>HTMX 疎通確認 (Ver 1.9.12)</h1>
        
        <button 
          hx-get="${currentPath}/api" 
          hx-target="#res"
          hx-indicator="#loading"
        >
          データ取得実行
        </button>

        <span id="loading" class="htmx-indicator" style="margin-left: 10px; color: #2563eb;">
          通信中...
        </span>

        <div id="res">
          待機中
        </div>
      </body>
    </html>
  `)
})

/**
 * 2. 部分HTML返却エンドポイント
 */
test07.get('/api', async (c) => {
  // 通信演出用のウェイト
  await new Promise(r => setTimeout(r, 600));
  const now = new Date().toLocaleTimeString('ja-JP');

  return c.html(html`
    <div>
      <p style="color: #2563eb; font-weight: bold;">通信成功: ${now}</p>
      <p style="font-size: 11px; color: #64748b;">Method: CDN (unpkg.com)</p>
    </div>
  `)
})


// /**
//  ⭐️以下は、固定ファイルで動作しない事例(リスクがあるため、すぐには、対応しないことに決定。)
//  * @file test07.tsx
//  * @description HTMX v1.9.12 固定運用モデルの技術実証（PoC / 最小構成版）。
//  * * 【設計思想：Zero-JS & High-Reliability】
//  * 1. サーバーサイド主導: ビジネスロジックをHono側に集約し、フロントエンドの状態管理を排除。
//  * 2. 依存性の隔離: 外部CDN（unpkg等）への依存を断ち、完全セルフホスト配信による可用性を確保。
//  * 3. インフラとしての監視: JavaScriptを「通信インフラの異常検知役」と定義し、ロジックから分離。
//  * * ※ VSCodeのエラー回避のため、複雑なSVGタグやTailwindの拡張記法を排除した安定版。
//  */

// import { Hono } from 'hono'
// import { html } from 'hono/html'

// export const test07 = new Hono()

// test07.get('/', (c) => {
//   /**
//    * パス解決ロジック
//    * サブディレクトリ（/_debug/等）にマウントされた際も、APIエンドポイントを正確に指し示すための処理。
//    */
//   const currentPath = c.req.path.replace(/\/$/, '')
  
//   // 報告書に基づき固定されるスクリプト名
//   const htmxScriptName = 'htmx-1.9.12.min.js'
  
//   /**
//    * SRI (Subresource Integrity) ハッシュ値
//    * セルフホスト（自社配信）環境においても、ビルド汚染や配信経路での改ざんを検知する「多層防御」を実現。
//    * 生成コマンド: cat [file] | openssl dgst -sha384 -binary | openssl base64 -A
//    */
//   const htmxIntegrity = "sha384-JxKhwLO8XNsFJET6RkXri9YfSHSv565wUHv+iMq+BrWQsA7rBNHw/rG5H9OpEKyv"

//   return c.html(html`
//     <!DOCTYPE html>
//     <html lang="ja">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>HTMX v1.9.12 固定運用テスト (test07)</title>
        
//         <script 
//           src="/js/${htmxScriptName}" 
//           integrity="${htmxIntegrity}" 
//           crossorigin="anonymous">
//         </script>

//         <script>
//           document.addEventListener('htmx:responseError', function(e) {
//             console.error('HTMX Response Error:', e.detail.xhr.status);
//             alert('サーバーとの通信に失敗しました。');
//           });
//           document.addEventListener('htmx:sendError', function(e) {
//             console.error('HTMX Network Error');
//             alert('ネットワーク接続を確認してください。');
//           });
//         </script>

//         <style>
//           /* 報告書第4項：インジケーター表示の義務化に伴う基本制御 */
//           .htmx-indicator { display: none; }
//           .htmx-request .htmx-indicator { display: inline-block; }
          
//           /* 最小限のレイアウト補正 */
//           body { font-family: sans-serif; padding: 2rem; line-height: 1.5; color: #333; }
//           button { padding: 0.5rem 1rem; cursor: pointer; }
//           #result { margin-top: 1rem; padding: 1rem; border: 1px solid #ddd; background: #f9f9f9; }
//         </style>
//       </head>
//       <body>
//         <h1>HTMX v1.9.12 疎通テスト</h1>
        
//         <button 
//           hx-get="${currentPath}/api" 
//           hx-target="#result" 
//           hx-indicator="#loading"
//         >
//           データを取得（疎通確認）
//         </button>

//         <span id="loading" class="htmx-indicator" style="margin-left: 10px; color: blue;">
//           COMMUNICATING...
//         </span>

//         <hr style="margin: 2rem 0;">

//         <div id="result">
//           ここにサーバーからの応答が表示されます。
//         </div>

//         </body>
//     </html>
//   `)
// })

// /**
//  * 2. 部分HTML返却エンドポイント（Fragment API）
//  * セキュリティ方針：冪等なGETリクエストによる情報取得。
//  * 将来的に機密操作を行う場合は、報告書の通り hx-post への切り替えを行うこと。
//  */
// test07.get('/api', async (c) => {
//   // 通信ウェイト：インジケーター（通信中表示）の動作を視覚的に確認するために挿入
//   await new Promise(r => setTimeout(r, 800));
  
//   const now = new Date().toLocaleTimeString('ja-JP');

//   return c.html(html`
//     <div>
//       <strong style="color: blue;">SUCCESS: ${now}</strong>
//       <p style="font-size: 0.8rem; color: #666;">
//         Verified: HTMX v1.9.12 / Self-hosted architecture.
//       </p>
//     </div>
//   `)
// })