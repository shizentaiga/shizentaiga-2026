/**
 * -------------------------------------------------------------------------
 * 【DB開発フェーズ1】Cloudflare D1 操作・検証サイクル 手順書
 * -------------------------------------------------------------------------
 * 
 * おまけ：(wranglerのアップデートコマンド)
 * npm install -g wrangler@latest 
 * 
 * * 1. DBインスタンスの作成 (初回のみ)
 * $ npx wrangler d1 create shizentaiga_db
 * * 2. wrangler.jsonc への紐付け (初回/設定変更時)
 * 出力された database_id を wrangler.jsonc の [[d1_databases]] に記載する
 * * 3. スキーマ（テーブル作成）の適用
 * [ローカル] $ npx wrangler d1 execute shizentaiga_db --local --file=./src/db/schema.sql
 * [本番]     $ npx wrangler d1 execute shizentaiga_db --remote --file=./src/db/schema.sql
 * * 4. DBの状態確認 (テーブルが作られたか？)
 * $ npx wrangler d1 execute shizentaiga_db --local --command="SELECT name FROM sqlite_master WHERE type='table';"



* * 5. テスト実行 (このファイルを叩く)
 * $ npx wrangler dev --local
 * ※ または、Honoのテストランナーを使用してこのプログラムを呼び出す
 * * 6. DBの中身を直接覗く (デバッグ用)
 * $ npx wrangler d1 execute shizentaiga_db --local --command="SELECT * FROM slots LIMIT 10;"
 * * -------------------------------------------------------------------------
 * 【本日のテスト実装ゴール】
 * -------------------------------------------------------------------------
 * [ ] 1. 接続確認: DBオブジェクトが正しくバインドされているか
 * [ ] 2. Create: ダミーの予約枠(slots)を1件登録してみる (ULID生成含む)
 * [ ] 3. Read: 登録した枠を tenant_id 指定で取得できるか
 * [ ] 4. Constraint: 同一スタッフ・同時刻の重複登録を試みて、DBが正しくエラーを出すか
 */

// ここから実装を開始...

/**
 * -------------------------------------------------------------------------
 * 【DB開発フェーズ1】Cloudflare D1 操作・検証プログラム
 * -------------------------------------------------------------------------
 * * [実行コマンド / ローカルDBを確認]
 * $ npx wrangler dev --local
 * (Honoのルートにアクセスして実行結果を確認、または wrangler d1 execute コマンドを併用)
 * * [実行コマンド / リモート(本番)DBを確認]
 * $ npx wrangler dev --remote
 * (Workerが本番のD1に接続した状態で動作します。本番データに影響が出るため注意)
 * * -------------------------------------------------------------------------
 */

import { Hono } from 'hono';

// wrangler.jsonc で設定した binding 名に合わせる
type Bindings = {
  shizentaiga_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * テストエンドポイント: 予約枠一覧の取得
 * GET /sandbox/db-test
 */
app.get('/sandbox/db-test', async (c) => {
  const tenantId = 'tenant_shizentaiga'; // 実装プロトコルに基づきtenant_idを固定

  try {
    // 1. SQL実行（Repositoryパターンを意識した実装）
    // 「人間は忘れる」ため、必ず WHERE tenant_id を含める
    const { results } = await c.env.shizentaiga_db
      .prepare(`
        SELECT 
          id, 
          date_string, 
          start_at_unix, 
          status 
        FROM slots 
        WHERE tenant_id = ? 
        ORDER BY start_at_unix ASC
      `)
      .bind(tenantId)
      .all();

    // 2. 結果の返却
    return c.json({
      success: true,
      environment: c.env.shizentaiga_db ? 'Connected' : 'Failed',
      count: results.length,
      data: results,
    });

  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default app;

/**
 * -------------------------------------------------------------------------
 * 【重要】ブラウザ経由（Cloudflareサーバー）でアクセスする場合の注意点
 * -------------------------------------------------------------------------
 * * 1. バインディング（Binding）の不一致
 * - ローカル環境での `npx wrangler dev` は、wrangler.jsonc の設定を読み込みますが、
 * デプロイ後は Cloudflare Dashboard 上で D1 が適切に紐付いている必要があります。
 * - `c.env.shizentaiga_db` が undefined になる場合、ほとんどが設定ミスです。
 * * 2. 実行環境による挙動の違い
 * - ローカル: `.wrangler/state/v3/d1` 内の SQLite ファイルを読み書きします。
 * - リモート: Cloudflare のエッジネットワーク上にある本番用 D1 インスタンスを読み書きします。
 * - 💡 同じプログラムをデプロイしても、アクセス先（DBの実体）はコマンド一つで切り替わります。
 * * 3. タイムゾーンの罠
 * - Cloudflare Workers のランタイム（本番）は UTC で動作します。
 * - サーバー側で `new Date()` をすると UTC になるため、設計書通り
 * 「アプリ側で JST に変換してから DB へ投げる」というプロトコルが非常に重要になります。
 * * 4. 読み取り専用（Read-only）レプリカ
 * - 将来的に Smart Placement を使用する場合、書き込み直後に読み取ると
 * 反映が数ミリ秒遅れる「結果整合性」の課題が出る可能性がありますが、
 * 現在の規模では `c.env.DB` を直接叩く限り問題ありません。
 */