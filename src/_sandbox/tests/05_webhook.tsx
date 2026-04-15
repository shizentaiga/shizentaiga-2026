/**
 * @file 05_webhook.ts
 * 3つのターミナルとブラウザを繋ぐ、オペレーター専用コンソール
 */

import { Hono } from 'hono';
import { html } from 'hono/html';

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test05 = new Hono<{ Bindings: Bindings }>();

let lastWebhookLogs: any[] = [];

test05.get('/', async (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>Webhook Monitor | Kiyoyoshi Taiga</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 p-4 font-sans text-slate-900">
      <div class="max-w-2xl mx-auto space-y-6">
        
        <header class="bg-white border-b-4 border-slate-900 p-6 shadow-sm">
          <h1 class="text-xl font-black italic tracking-tighter uppercase">Webhook Operations</h1>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status: Operational</p>
        </header>

        <section class="bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 class="text-sm font-bold flex items-center gap-2">
            <span class="bg-slate-900 text-white px-2 py-0.5 rounded-full text-[10px]">GUIDE</span>
            3つのターミナルを準備してください
          </h2>
          
          <div class="grid gap-3 text-xs">
            <div class="p-3 bg-slate-50 rounded border-l-2 border-slate-300">
              <p class="font-bold text-slate-700">① [受信] Vite Server</p>
              <code class="text-[10px] text-blue-600 font-bold">npm run dev</code>
              <p class="text-slate-500 mt-1">このページが見えているなら成功です。ログはこの画面下部とターミナルの両方に出力されます。</p>
            </div>

            <div class="p-3 bg-slate-50 rounded border-l-2 border-slate-300">
              <p class="font-bold text-slate-700">② [中継] Stripe CLI Tunnel</p>
              <code class="text-[10px] text-blue-600 font-bold leading-loose">stripe listen --forward-to localhost:5173/_debug/test05</code>
              <p class="text-slate-500 mt-1">StripeサーバーとローカルPCを繋ぐ「トンネル」を起動します。</p>
            </div>

            <div class="p-3 bg-slate-50 rounded border-l-2 border-slate-300">
              <p class="font-bold text-slate-700">③ [実行] Test Trigger</p>
              <code class="text-[10px] text-blue-600 font-bold">stripe trigger checkout.session.completed</code>
              <p class="text-slate-500 mt-1">疑似的な決済完了イベントを送信し、システムを動かします。</p>
            </div>
          </div>
        </section>

        <section class="bg-white p-6 border border-slate-200 shadow-sm">
          <div class="flex gap-2 mb-4">
            <button onclick="updateLogs()" class="flex-1 bg-slate-900 text-white text-xs font-bold py-3 hover:bg-blue-600 transition-colors">
              UPDATE LOGS
            </button>
            <button onclick="clearLogs()" class="px-4 border border-slate-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors">
              CLEAR
            </button>
          </div>

          <div class="bg-slate-900 rounded-sm p-4 min-h-40 max-h-80 overflow-auto border border-slate-800">
            <pre id="log-output" class="text-green-400 text-[10px] font-mono leading-relaxed whitespace-pre-wrap uppercase tracking-tighter">Waiting for Action...</pre>
          </div>
        </section>

        <footer class="text-[9px] text-slate-400 font-mono text-center pb-10">
          SYSTEM_ID: SHIZENTAIGA_V4.6 | CONNECTION: LOCALHOST_5173
        </footer>
      </div>

      <script>
        async function updateLogs() {
          const out = document.getElementById('log-output');
          try {
            const res = await fetch(location.pathname + '/api/logs');
            out.innerText = await res.text();
          } catch (e) {
            out.innerText = 'FETCH ERROR. SERVER DOWN?';
          }
        }

        async function clearLogs() {
          if(!confirm('ログをリセットしますか？')) return;
          await fetch(location.pathname, { method: 'DELETE' });
          document.getElementById('log-output').innerText = 'LOGS CLEARED.';
        }
      </script>
    </body>
    </html>
  `);
});

// GET (API): ログデータ返却
test05.get('/api/logs', async (c) => {
  if (lastWebhookLogs.length === 0) {
    return c.text("NO EVENTS DETECTED.\nPLEASE EXECUTE STRIPE TRIGGER.");
  }
  return c.text(lastWebhookLogs.map(log => 
    `[${log.time}] EVENT: ${log.type}\nID: ${log.id}\n--------------------------------`
  ).join('\n'));
});

// DELETE: ログクリア
test05.delete('/', async (c) => {
  lastWebhookLogs = [];
  return c.text("OK");
});

// POST: Webhook受信
test05.post('/', async (c) => {
  try {
    const body = await c.req.json();
    lastWebhookLogs.unshift({
      time: new Date().toLocaleTimeString('ja-JP'),
      type: body.type,
      id: body.id
    });
    return c.text('OK', 200);
  } catch (err) {
    return c.text('Error', 400);
  }
});