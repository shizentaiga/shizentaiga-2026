import { Hono } from 'hono';
import Stripe from 'stripe';

export const test04 = new Hono<{ Bindings: { STRIPE_SECRET_KEY: string } }>();

// --- 1. プラン選択・入力画面 ---
test04.get('/', (c) => {
  // c.req.path は現在のアクセスパスを返す
  // 末尾が / で終わっているか確認し、送信先を組み立てる
  const currentPath = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>Select Plan - Stripe Test</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen flex items-center justify-center p-6">
      <div class="max-w-md w-full">
        <h1 class="text-xs font-bold mb-6 text-gray-400 uppercase tracking-[0.3em] text-center">01. Select Plan</h1>
        
        <div class="space-y-4">
          <form action="${currentPath}create-session" method="POST" class="bg-white p-6 border border-gray-200 shadow-sm hover:border-black transition-all">
            <input type="hidden" name="plan_name" value="経営コンサルティング">
            <input type="hidden" name="amount" value="49500">
            <input type="hidden" name="slot_id" value="slot_90min_001">
            <div class="mb-4">
              <h2 class="text-lg font-bold text-gray-800">経営コンサルティング</h2>
              <p class="text-[11px] text-gray-500 mt-1 leading-relaxed">課題解決に向けた90分の戦略セッション</p>
            </div>
            <div class="flex items-end justify-between border-t pt-4">
              <div class="text-xs text-gray-400">90分 / <span class="text-lg text-black font-medium">¥49,500</span></div>
              <button type="submit" class="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest">Select</button>
            </div>
          </form>

          <form action="${currentPath}create-session" method="POST" class="bg-white p-6 border border-gray-200 shadow-sm hover:border-black transition-all">
            <input type="hidden" name="plan_name" value="資金調達プラン 初回相談">
            <input type="hidden" name="amount" value="11000">
            <input type="hidden" name="slot_id" value="slot_60min_002">
            <div class="mb-4">
              <h2 class="text-lg font-bold text-gray-800">資金調達プラン 初回相談</h2>
              <p class="text-[11px] text-gray-500 mt-1 leading-relaxed">融資・資金繰りに関する専門的なアドバイス</p>
            </div>
            <div class="flex items-end justify-between border-t pt-4">
              <div class="text-xs text-gray-400">60分 / <span class="text-lg text-black font-medium">¥11,000</span></div>
              <button type="submit" class="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest">Select</button>
            </div>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
});

// --- 2. Stripe決済URL生成 ---
test04.post('/create-session', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const body = await c.req.parseBody();
  
  try {
    // ⭐️ 改善点：Honoの c.req.url から origin を取得
    const baseUrl = new URL(c.req.url).origin;
    
    // ⭐️ 改善点：replace を使わず、Honoが認識しているマウントパス（c.req.path）の親を取得
    // c.req.path は "/_debug/test04/create-session"
    const currentPath = c.req.path;
    const baseDir = currentPath.substring(0, currentPath.lastIndexOf('/'));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: body.plan_name as string },
          unit_amount: Number(body.amount),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}${baseDir}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${baseDir}`,
      metadata: { slot_id: body.slot_id as string },
    });

    return c.redirect(session.url!, 303);
  } catch (e: any) {
    return c.text(`Error: ${e.message}`, 500);
  }
});

// --- 3. 決済完了ページ ---
test04.get('/success', (c) => {
  const sessionId = c.req.query('session_id') || "";
  // ⭐️ 改善点：Return to Top も c.req.path から動的に生成可能ですが、
  // シンプルに 1つ上の階層（./）に戻る記述が最も安全です。
  return c.html(`
    <div style="text-align:center; padding-top:100px; font-family:sans-serif;">
      <h2 style="color:green; letter-spacing:0.1em;">PAYMENT SUCCESSFUL</h2>
      <p style="font-size:12px; color:#666; margin: 20px 0;">ID: ${sessionId}</p>
      <a href="./" style="font-size:10px; text-decoration:none; border:1px solid #ccc; padding:10px 20px; color:#666; text-transform:uppercase;">Return to Portal</a>
    </div>
  `);
});