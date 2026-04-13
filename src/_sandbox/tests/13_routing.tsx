import { Hono } from 'hono';

export const test13 = new Hono();

/**
 * 1. 予約入力画面 (/_debug/test13/)
 */
test13.get('/', (c) => {
  return c.html(
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Step 1: 予約テスト</h1>
      <p>プランと日時を選んで「Book Now」を押してください。</p>
      
      <div style="border: 1px solid #ccc; padding: 15px; border-radius: 8px;">
        <p><strong>Selected Plan:</strong> A-Business</p>
        <p><strong>Selected Date:</strong> 2026-05-01 10:00</p>
        
        {/* URLの末尾に ?plan=...&date=... をくっつけて情報を送る */}
        <a href="/_debug/test13/checkout?plan=A-Business&date=2026-05-01-10:00" 
           style="background: black; color: white; padding: 10px 20px; text-decoration: none; display: inline-block;">
          Book Now (正常系)
        </a>

        <a href="/_debug/test13/checkout" 
           style="margin-left: 10px; color: red; text-decoration: underline;">
          Book Now (エラー発生系)
        </a>
      </div>
    </div>
  );
});

/**
 * 2. チェックアウト画面 (/_debug/test13/checkout)
 */
test13.get('/checkout', (c) => {
  // URLの「?」以降についている情報を取得
  const plan = c.req.query('plan');
  const date = c.req.query('date');

  // ①【静的ページ】情報が足りない場合はエラーを表示 (ガード節)
  if (!plan || !date) {
    return c.html(
      <div style="padding: 20px; color: red; text-align: center;">
        <h1>⚠️ Error</h1>
        <p>予約エラーが発生しております。</p>
        <p>恐れ入りますが、最初からやり直してください。</p>
        <a href="/_debug/test13">Topに戻る</a>
      </div>
    );
  }

  // ②【動的ページ】情報がある場合はそのまま表示
  return c.html(
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Step 2: 内容確認</h1>
      <div style="background: #f9f9f9; padding: 20px; border-left: 5px solid green;">
        <p>以下の内容で予約を確定しますか？</p>
        <ul>
          <li><strong>プラン:</strong> {plan}</li>
          <li><strong>日時:</strong> {date}</li>
        </ul>
        <button onclick="alert('予約完了！')">この内容で確定する</button>
      </div>
      <p><a href="/_debug/test13">戻って選択し直す</a></p>
    </div>
  );
});