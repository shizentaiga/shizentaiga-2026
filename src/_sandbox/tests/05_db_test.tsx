/**
 * @file 05_db_test.ts
 * @description /_debug/test05 用のテストモジュール。
 * v3.0 チップ・グリッド・モデル対応版。
 */

import { Hono } from 'hono';
import { html } from 'hono/html';
import { getAvailableChipsFromDB } from '../../db/repositories/booking-db';

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test05 = new Hono<{ Bindings: Bindings }>();

test05.get('/', async (c) => {
  // DBからデータを取得
  const slots = await getAvailableChipsFromDB(c);
  const now = new Date().toLocaleString('ja-JP');

  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DB Test (test05) - Grid Model</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 p-4 md:p-8">
      <div class="max-w-2xl mx-auto bg-white shadow-sm border border-slate-200 rounded-lg p-6">
        
        <header class="border-b pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 class="text-xl font-bold text-slate-800">D1 Connection: test05</h1>
            <p class="text-xs text-slate-400 mt-1 uppercase tracking-wider italic">v3.0 Grid-Atomic Model</p>
          </div>
          <span class="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded">CONNECTED</span>
        </header>
        
        <div class="mb-6 grid grid-cols-2 gap-4">
          <div class="bg-slate-50 p-3 rounded">
            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Server Time (JST)</p>
            <p class="text-sm font-mono text-slate-600">${now}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded">
            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Current Slots</p>
            <p class="text-lg font-bold text-blue-600">${slots.length} <span class="text-xs text-slate-400">records</span></p>
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="text-sm font-bold text-slate-700">Data Preview (Available Chips)</h2>
          
          ${slots.length === 0 
            ? html`
              <div class="bg-amber-50 border border-amber-100 p-4 rounded text-amber-700 text-sm">
                表示できるデータがありません。
                <ul class="list-disc ml-5 mt-2 space-y-1 text-xs">
                  <li>staff_schedules テーブルに未来のデータがあるか確認してください</li>
                  <li>reservation_grid に紐付いていない（未予約）データのみ表示されます</li>
                </ul>
              </div>` 
            : html`
              <div class="border rounded divide-y overflow-hidden">
                ${slots.slice(0, 10).map((s) => {
                  // テスト用に型を一時的に緩める
                  const slot = s as any;

                  // UNIXタイムを可読性の高い時間に変換
                  const timeDisplay = new Date(slot.start_at_unix * 1000).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return html`
                    <div class="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                      <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-mono font-bold text-slate-700">${slot.date_string}</span>
                          <span class="text-xs font-mono text-blue-600 bg-blue-50 px-1 rounded">${timeDisplay}〜</span>
                        </div>
                        <p class="text-[9px] text-slate-400 mt-1 font-mono uppercase">ID: ${slot.slot_id || 'UNASSIGNED'}</p>
                      </div>
                      <div class="text-right">
                        <span class="text-[10px] font-bold py-1 px-2 rounded-full border border-blue-200 bg-white text-blue-600 uppercase shadow-sm">
                          ${slot.booking_status || 'AVAILABLE'}
                        </span>
                      </div>
                    </div>
                  `;
                })}
              </div>
              ${slots.length > 10 ? html`<p class="text-center text-[10px] text-slate-400 mt-3 italic">Listing first 10 items (Total: ${slots.length})</p>` : ''}
            `
          }
        </div>

        <div class="mt-8 pt-6 border-t flex items-center justify-between">
          <button onclick="window.location.reload()" class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded transition shadow-lg active:scale-95">
            REFRESH
          </button>
          <a href="/_debug/" class="text-slate-400 hover:text-slate-600 text-xs underline decoration-dotted">
            Back to Sandbox Master
          </a>
        </div>

      </div>

      <p class="text-center mt-6 text-[9px] text-slate-300 uppercase tracking-widest">
        test05 module / physical connection check
      </p>
    </body>
    </html>
  `);
});