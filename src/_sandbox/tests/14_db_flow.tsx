/**
 * @file test14.tsx
 * @description 
 * 決済前確認（Checkout）の「DB同期」を検証するサンドボックス。
 * * 【検証ポイント】
 * 1. サーバーサイドでのデータ解決: クライアントから渡された「ID」を「正式名称」に変換できているか。
 * 2. 堅牢なリロード処理: リロードしてもDBから最新情報を引き直せるか。
 * 3. 結合（JOIN）の整合性: plans/staffs/shops のリレーションが崩れていないか。
 */

import { Hono } from 'hono';
import { html } from 'hono/html';

type Bindings = {
  shizentaiga_db: D1Database;
};

// D1から返却されるレコードの型を定義
interface CheckoutData {
  shop_name: string;
  staff_display_name: string;
  plan_name: string;
  price_amount: number;
}

export const test14 = new Hono<{ Bindings: Bindings }>();

/* --- 🧱 UI COMPONENT --- */
const CheckoutUI = (p: { 
  shopName: string, planName: string, staffName: string, 
  price: number, date: string, time: string 
}) => html`
  <div style="padding: 24px; font-family: sans-serif; max-width: 400px; border: 1px solid #ddd; border-radius: 8px;">
    <p style="font-size: 10px; color: #666; letter-spacing: 0.2em; border-bottom: 1px solid #eee; pb: 8px;">CHECKOUT_PREVIEW</p>
    <p><strong>店舗:</strong> ${p.shopName}</p>
    <p><strong>担当:</strong> ${p.staffName}</p>
    <p><strong>プラン:</strong> ${p.planName}</p>
    <p style="font-size: 1.5rem; font-weight: bold;">¥${p.price.toLocaleString()}</p>
    <p><strong>日時:</strong> ${p.date} ${p.time}</p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 4px; font-size: 11px; color: #166534;">
      ✅ DBから最新情報を取得しました。
    </div>
  </div>
`;

/* --- ⚙️ LOGIC (ハンドラ) --- */
test14.get('/', async (c) => {
  // 1. URLの「?」以降から値を取得
  const planId = c.req.query('plan_id');
  const slot = c.req.query('slot');

  // 2. パラメータがない場合、テスト用のリンクを表示してあげる（ここを親切化！）
  if (!planId || !slot) {
    // DBに存在するはずの仮のIDでテストリンクを作成
    // ⭐️※ 実際のDB内のID（pln_funding等）に合わせて書き換えてください
    const testLink = `${c.req.path}?plan_id=pln_funding&slot=1776475800`;
    
    return c.html(html`
      <div style="padding: 20px; font-family: monospace;">
        <h3 style="color: #e11d48;">⚠️ パラメータが不足しています</h3>
        <p>Checkoutをシミュレートするには、URLにplan_idとslotが必要です。</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6;">
          <p>👇 このリンクをクリックしてテストを開始してください：</p>
          <a href="${testLink}" style="color: #2563eb; font-weight: bold;">[TEST] 資金調達コンサルを予約した体でアクセスする</a>
        </div>
      </div>
    `);
  }

  try {
    // 3. DBアクセス: plan_id を元に、紐づく情報を一括JOIN
    // D1接続ごとに外部キー制約をONにする（念のため）
    await c.env.shizentaiga_db.prepare("PRAGMA foreign_keys = ON;").run();

    const data = await c.env.shizentaiga_db.prepare(`
      SELECT 
        sh.shop_name,
        st.staff_display_name,
        p.plan_name,
        p.price_amount
      FROM plans p
      INNER JOIN staffs st ON p.shop_id = st.shop_id
      INNER JOIN shops sh ON st.shop_id = sh.shop_id
      WHERE p.plan_id = ?
      LIMIT 1
    `).bind(planId).first<CheckoutData>();

    // 4. DBにデータがなかった場合の処理
    if (!data) {
      return c.html(html`
        <div style="padding: 20px; color: #ef4444;">
          <p><strong>Data Not Found:</strong> 指定された plan_id [${planId}] はDBに存在しません。</p>
          <p style="font-size: 12px; color: #666;">seed.sqlでマスタデータを投入したか確認してください。</p>
        </div>
      `);
    }

    // 5. 表示用にデータを整形
    const dateObj = new Date(parseInt(slot) * 1000);
    const dateStr = dateObj.toLocaleDateString('ja-JP', { 
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' 
    });
    const timeStr = dateObj.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', minute: '2-digit' 
    });

    // 6. UIを返却（リロードしてもここが再実行される）
    return c.html(
      CheckoutUI({
        shopName: data.shop_name,
        planName: data.plan_name,
        staffName: data.staff_display_name,
        price: data.price_amount,
        date: dateStr,
        time: timeStr
      })
    );

  } catch (err: any) {
    return c.html(html`<div style="color:red; padding:20px;">SQL Error: ${err.message}</div>`);
  }
});