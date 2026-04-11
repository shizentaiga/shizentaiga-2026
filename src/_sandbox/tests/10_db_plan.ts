import { Hono } from 'hono';

/**
 * [TEST 10] DB Plan Fetcher (v2.6 Schema 対応版)
 * * ■ 目的
 * Cloudflare D1 (shizentaiga_db) との疎通確認、および plans テーブルからの
 * データ取得・表示を検証する。
 * * ■ 後任者への注記
 * 1. バインディング名: wrangler.toml/json の `binding` 設定と `Bindings` 型定義が一致している必要がある。
 * 2. 外部キー制約: D1 はデフォルトで OFF のため、セッション開始時に PRAGMA 設定を行う規約としている。
 * 3. 時間表記: duration_min が 0 の場合は「要問合せ」等のビジネスロジック判定を UI 層で行う例を示す。
 */

/**
 * 環境変数の型定義
 * wrangler.json の [d1_databases] セクションで指定した binding 名と一致させること。
 */
type Bindings = {
  shizentaiga_db: D1Database;
};

export const test10 = new Hono<{ Bindings: Bindings }>();

test10.get('/', async (c) => {
  try {
    // 1. バインディングの存在チェック
    // 構成ミス（wrangler設定とコードの不一致）を即座に検知するためのガード
    if (!c.env.shizentaiga_db) {
      throw new Error(
        "c.env.shizentaiga_db が取得できません。原因として以下が考えられます：\n" +
        "1. wrangler.json の binding 名が 'shizentaiga_db' ではない\n" +
        "2. ローカル実行時に D1 が正しく初期化されていない"
      );
    }

    // 2. 外部キー制約の有効化
    // 参照整合性を維持するためのシステム規約。
    // SQLite の仕様により「接続（リクエスト）ごと」に実行が必要。
    await c.env.shizentaiga_db.prepare('PRAGMA foreign_keys = ON;').run();

    // 3. プラン一覧の取得
    // v2.6 スキーマで追加された 'description' カラムを含め、
    // active（公開中）なプランのみを新着順で抽出する。
    const { results } = await c.env.shizentaiga_db.prepare(`
      SELECT 
        plan_id, 
        name, 
        description,
        duration_min, 
        price_amount, 
        status 
      FROM plans 
      WHERE status = 'active'
      ORDER BY created_at DESC
    `).all();

    // 4. データ不在時のハンドリング
    // 接続成功とデータ存在を区別して報告することで、原因の切り分け（接続不良か、seed漏れか）を容易にする。
    if (!results || results.length === 0) {
      return c.html(`
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>[TEST 10] DB Plan Checker</h3>
          <p style="color: #d97706; background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 4px;">
            ⚠ <strong>Database Connected:</strong> 接続は正常ですが、表示可能なデータが0件です。<br>
            <code>npx wrangler d1 execute shizentaiga_db --local --file=./src/db/seed_01_master.sql</code> を実行してください。
          </p>
          <p><a href="/_debug/">← サンドボックスTOPに戻る</a></p>
        </div>
      `);
    }

    // 5. ビュー（HTML）の構築
    // テンプレートエンジン未導入のため、可読性の高いテンプレートリテラルで構築。
    const rows = results.map(plan => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; font-family: monospace; font-size: 0.85rem; color: #666;">
          ${plan.plan_id}
        </td>
        <td style="border: 1px solid #ccc; padding: 8px;">
          <strong style="font-size: 1.05rem;">${plan.name}</strong><br>
          <div style="color: #666; font-size: 0.9rem; margin-top: 4px;">
            ${plan.description || '<span style="color: #ccc;">(説明文未設定)</span>'}
          </div>
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">
          ${plan.duration_min === 0 ? '<strong>要問合せ</strong>' : `${plan.duration_min} 分`}
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: right; font-weight: bold;">
          ¥${Number(plan.price_amount).toLocaleString()}
        </td>
      </tr>
    `).join('');

    return c.html(`
      <div style="font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
        <style>
          table { border-collapse: collapse; width: 100%; margin-top: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          th { background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; text-align: left; }
          td { border: 1px solid #dee2e6; padding: 12px; vertical-align: top; }
          tr:hover { background-color: #f1f3f5; }
        </style>
        
        <h3>[TEST 10] DB Plan Checker</h3>
        <p style="color: #059669; background: #ecfdf5; border: 1px solid #6ee7b7; padding: 10px; border-radius: 4px;">
          ✅ <strong>shizentaiga_db</strong> との通信、およびデータ取得に成功しました。
        </p>
        
        <table>
          <thead>
            <tr>
              <th style="width: 20%;">ID (prefix_ULID)</th>
              <th style="width: 45%;">プラン詳細</th>
              <th style="width: 15%;">所要時間</th>
              <th style="width: 20%;">価格 (税込)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          <p><a href="/_debug/" style="color: #2563eb; text-decoration: none;">← サンドボックスTOPに戻る</a></p>
        </div>
      </div>
    `);

  } catch (e: any) {
    // 6. 異常系の可視化
    // 開発中のデバッグ工数を削減するため、エラーメッセージを直接画面にレンダリングする。
    console.error("DB Fetch Error:", e);
    return c.html(`
      <div style="font-family: sans-serif; padding: 20px;">
        <h3 style="color: #dc2626;">[TEST 10] SYSTEM ERROR</h3>
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 4px; color: #991b1b;">
          <p><strong>エラーの概要:</strong></p>
          <pre style="white-space: pre-wrap; background: #fff; padding: 10px; border: 1px solid #fca5a5;">${e.message}</pre>
          <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 15px 0;">
          <p><strong>デバッグのチェックリスト:</strong></p>
          <ul style="font-size: 0.9rem;">
            <li><code>wrangler.json</code> の <code>binding</code> が "shizentaiga_db" になっているか？</li>
            <li>ローカル開発の場合、<code>--local</code> フラグを付けて実行しているか？</li>
            <li>スキーマ v2.6 の変更 (descriptionカラム追加) は適用済みか？</li>
          </ul>
        </div>
        <p><a href="/_debug/">← サンドボックスTOPに戻る</a></p>
      </div>
    `, 500);
  }
});