import { Hono } from 'hono';

// 型定義：wrangler.json の binding と一致させる
type Bindings = {
  shizentaiga_db: D1Database;
};

export const test02 = new Hono<{ Bindings: Bindings }>();

test02.get('/', async (c) => {
  try {
    // 1. バインディングの存在確認
    if (!c.env.shizentaiga_db) {
      return c.text("❌ Error: shizentaiga_db が見つかりません。wrangler.json を確認してください。", 500);
    }

    // 2. 最小クエリの実行（現在時刻の取得）
    const result: any = await c.env.shizentaiga_db
      .prepare("SELECT datetime('now', '+9 hours') as jst_now")
      .first();

    return c.json({
      status: "✅ Connection Success!",
      time: result?.jst_now,
      note: "DB疎通に成功しました。"
    });

  } catch (e: any) {
    // エラー時は内容をそのまま出力（原因特定を容易にするため）
    return c.json({ status: "❌ SQL Error", error: e.message }, 500);
  }
});