import { Hono } from 'hono';

/**
 * [TEST 10] DB Plan Fetcher (v3.0 Grid-Atomic 対応版)
 * * ■ 目的
 * Cloudflare D1 (shizentaiga_db) からのマスターデータ取得を検証する。
 * v3.0 で追加された buffer_min (片付け時間) を含む整合性を確認。
 * * ■ 後任者への注記
 * 1. バインディング名: 常に 'shizentaiga_db' を固定。
 * 2. 外部キー制約: PRAGMA foreign_keys = ON; を推奨。
 * 3. 命名規則: v3.0 では shop_id による店舗分離が導入。
 * 4. ビジネスロジック: 総拘束時間は duration_min + buffer_min で算出する。
 */

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test10 = new Hono<{ Bindings: Bindings }>();

test10.get('/', async (c) => {
  try {
    // 1. バインディングの存在チェック
    if (!c.env.shizentaiga_db) {
      throw new Error(
        "c.env.shizentaiga_db が取得できません。\n" +
        "wrangler.json の binding 名が 'shizentaiga_db' であるか確認してください。"
      );
    }

    // 2. 外部キー制約の有効化
    await c.env.shizentaiga_db.prepare('PRAGMA foreign_keys = ON;').run();

    // 3. プラン一覧の取得 (v3.0 Schema)
    // buffer_min を追加取得し、予約画面に表示可能なステータス ('active', 'hidden') を対象にします。
    const { results } = await c.env.shizentaiga_db.prepare(`
      SELECT 
        plan_id, 
        shop_id,
        plan_name, 
        description,
        duration_min, 
        buffer_min,
        price_amount, 
        plan_status 
      FROM plans 
      WHERE plan_status IN ('active', 'hidden')
      ORDER BY created_at DESC
    `).all();

    // 4. データ不在時のハンドリング
    if (!results || results.length === 0) {
      return c.html(`
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>[TEST 10] DBプランのチェック</h3>
          <p style="color: #d97706; background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 4px;">
            ⚠ <strong>Database Connected:</strong> 接続成功。ただし active なデータが0件です。<br>
            <code>seed.sql</code> または管理画面からプランを登録してください。
          </p>
          <p><a href="/_debug/">← サンドボックスTOPに戻る</a></p>
        </div>
      `);
    }

    // 5. ビュー（HTML）の構築
    const rows = results.map(plan => {
      const totalTime = Number(plan.duration_min) + Number(plan.buffer_min);
      const isHidden = plan.plan_status === 'hidden';
      
      return `
      <tr>
        <td style="border: 1px solid #dee2e6; padding: 12px; font-family: monospace; font-size: 0.8rem; color: #64748b;">
          ${plan.plan_id}<br>
          <span style="font-size: 0.7rem; color: #94a3b8;">Shop: ${plan.shop_id}</span>
        </td>
        <td style="border: 1px solid #dee2e6; padding: 12px;">
          <strong style="font-size: 1rem; color: #1e293b;">${plan.plan_name}</strong>
          ${isHidden ? '<span style="font-size: 0.7rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">限定公開</span>' : ''}
          <div style="color: #64748b; font-size: 0.85rem; margin-top: 6px;">
            ${plan.description || '<span style="color: #cbd5e1;">(説明文なし)</span>'}
          </div>
        </td>
        <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-size: 0.9rem;">
          <div style="font-weight: bold;">${plan.duration_min}分</div>
          <div style="font-size: 0.75rem; color: #94a3b8;">(+清掃${plan.buffer_min}分)</div>
          <div style="font-size: 0.7rem; color: #3b82f6; margin-top: 4px;">計 ${totalTime}分</div>
        </td>
        <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-weight: 800; color: #0f172a;">
          ¥${Number(plan.price_amount).toLocaleString()}
        </td>
      </tr>
      `;
    }).join('');

    return c.html(`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 40px auto; padding: 0 20px;">
        <style>
          table { border-collapse: collapse; width: 100%; margin-top: 20px; background: #fff; border-radius: 8px; overflow: hidden; }
          th { background: #f8fafc; border: 1px solid #dee2e6; padding: 14px; text-align: left; font-size: 0.85rem; color: #64748b; text-transform: uppercase; }
          tr:hover { background-color: #f8fafc; }
        </style>
        
        <h3 style="margin-bottom: 5px;">[TEST 10] DB Plan Checker (v3.0)</h3>
        <p style="color: #059669; background: #ecfdf5; border: 1px solid #10b981; padding: 12px; border-radius: 8px; font-size: 0.9rem; margin-bottom: 25px;">
          ✅ <strong>v3.0 Grid-Atomic</strong> スキーマでのプラン取得に成功しました。
        </p>
        
        <table>
          <thead>
            <tr>
              <th style="width: 18%;">ID / Shop</th>
              <th style="width: 42%;">プラン内容</th>
              <th style="width: 20%; text-align: center;">専有時間 (Grid)</th>
              <th style="width: 20%; text-align: right;">価格 (税込)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <a href="/_debug/" style="color: #3b82f6; text-decoration: none; font-weight: bold; font-size: 0.9rem;">← サンドボックスTOPに戻る</a>
        </div>
      </div>
    `);

  } catch (e: any) {
    console.error("v3.0 Fetch Error:", e);
    return c.html(`
      <div style="font-family: sans-serif; padding: 20px;">
        <h3 style="color: #ef4444;">[TEST 10] SYSTEM ERROR (v3.0)</h3>
        <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 8px; color: #991b1b;">
          <p><strong>エラー原因の可能性:</strong></p>
          <pre style="white-space: pre-wrap; background: #fff; padding: 10px; border: 1px solid #fecaca; font-size: 0.85rem;">${e.message}</pre>
          <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 15px 0;">
          <p><strong>v3.0 移行チェックリスト:</strong></p>
          <ul style="font-size: 0.85rem; line-height: 1.6;">
            <li><code>plans</code> テーブルに <code>buffer_min</code> カラムは存在するか？</li>
            <li><code>plan_status</code> が単なる <code>active/inactive</code> 以外の <code>hidden</code> 等に対応しているか？</li>
            <li><code>shop_id</code> がカラムに含まれているか？</li>
          </ul>
        </div>
        <p style="margin-top:20px;"><a href="/_debug/">← サンドボックスTOPに戻る</a></p>
      </div>
    `, 500);
  }
});