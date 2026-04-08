/**
 * @file 05_db_test.ts
 * @description /_debug/test05 用のテストモジュール。
 * shizentaiga_db から予約枠を取得し、ブラウザ上で接続確認を行います。
 */

import { Hono } from 'hono';
import { html } from 'hono/html';
import { getAvailableSlotsFromDB } from '../../db/booking-db';

// sandboxRouter.route('/test05', test05) で呼び出すためのサブアプリ定義
export const test05 = new Hono();

test05.get('/', async (c) => {
  // DBからデータを取得
  const slots = await getAvailableSlotsFromDB(c);
  const now = new Date().toLocaleString('ja-JP');

  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>DB Test (test05)</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-2xl mx-auto bg-white shadow-sm border border-slate-200 rounded-lg p-6">
        
        <header class="border-b pb-4 mb-6">
          <h1 class="text-xl font-bold text-slate-800">D1 Connection: test05</h1>
          <p class="text-xs text-slate-400 mt-1 uppercase tracking-wider italic">Binding: shizentaiga_db</p>
        </header>
        
        <div class="mb-6 grid grid-cols-2 gap-4">
          <div class="bg-slate-50 p-3 rounded">
            <p class="text-[10px] text-slate-400 uppercase font-bold">Server Time</p>
            <p class="text-sm font-mono text-slate-600">${now}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded">
            <p class="text-[10px] text-slate-400 uppercase font-bold">Available Slots</p>
            <p class="text-lg font-bold text-blue-600">${slots.length} <span class="text-xs text-slate-400">items</span></p>
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="text-sm font-bold text-slate-700">Data Preview (Future only)</h2>
          
          ${slots.length === 0 
            ? html`
              <div class="bg-amber-50 border border-amber-100 p-4 rounded text-amber-700 text-sm">
                表示できる「未来の予約枠」がありません。
                <ul class="list-disc ml-5 mt-2 space-y-1">
                  <li>DBにデータが入っていない</li>
                  <li>過去の日時のデータしか存在しない</li>
                  <li>Binding設定が間違っている</li>
                </ul>
              </div>` 
            : html`
              <div class="border rounded divide-y">
                ${slots.slice(0, 5).map(slot => html`
                  <div class="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <span class="text-sm font-mono font-medium">${slot.date_string}</span>
                      <p class="text-[10px] text-slate-400 mt-1">Slot ID: ${slot.id}</p>
                    </div>
                    <span class="text-[10px] font-bold py-1 px-2 rounded-full bg-blue-50 text-blue-600 uppercase">
                      ${slot.status}
                    </span>
                  </div>
                `)}
              </div>
              ${slots.length > 5 ? html`<p class="text-center text-[10px] text-slate-400 mt-3 italic">And more ${slots.length - 5} items...</p>` : ''}
            `
          }
        </div>

        <div class="mt-8 pt-6 border-t flex items-center justify-between">
          <button onclick="window.location.reload()" class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded transition">
            REFRESH
          </button>
          <a href="/_debug/" class="text-slate-400 hover:text-slate-600 text-xs underline">
            Back to Sandbox Master
          </a>
        </div>

      </div>

      <p class="text-center mt-6 text-[9px] text-slate-300 uppercase tracking-widest">
        test05 module / isolation check
      </p>
    </body>
    </html>
  `);
});