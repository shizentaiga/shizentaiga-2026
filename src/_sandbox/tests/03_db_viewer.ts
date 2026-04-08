/**
 * 【実戦：DB不具合切り分けノウハウ】
 * * 1. エラー "no such column" が出た場合：
 * - 原因：プログラム上のSQLと、実行環境(Wrangler)が見ているDB定義のズレ。
 * - 対策：ターミナルで `npx wrangler d1 execute [DB名] --local --command="PRAGMA table_info(slots);"` を叩き、
 * 「現在の物理的なカラム名」を直接白日の下にさらすこと。
 * * 2. CLIとブラウザの同期：
 * - Wranglerは CLI操作時とサーバー起動時で、参照するDBファイルが異なるケースがある。
 * - 確実に同期させるには `--persist-to .wrangler/state/v3` (等) を全コマンドに付与し、
 * 「同じ箱」を指し示すように強制する。
 * * 3. UNIXタイムスタンプの扱い：
 * - `start_at` (文字列) ではなく `start_at_unix` (整数) として管理されている場合、
 * 型定義を `INTEGER` に合わせ、必要に応じてフロントエンド側で日付形式に変換する。
 * * 4. 開発サイクル：
 * - index.tsx は一切汚さず、この _sandbox/tests フォルダを増設するだけで
 * 本番のリスクをゼロに抑えたまま「物理的なDB疎通」を何度でも検証できる。
 */

import { Hono } from 'hono';

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test03 = new Hono<{ Bindings: Bindings }>();

test03.get('/', async (c) => {
  try {
    // 【修正箇所】start_at を start_at_unix に変更
    // また、end_at というカラムも存在しないため、今回は除外するか別のカラムにします
    const { results } = await c.env.shizentaiga_db
      .prepare("SELECT id, date_string, start_at_unix, status FROM slots ORDER BY start_at_unix ASC")
      .all();

    if (!results || results.length === 0) {
      return c.text("⚠️ データベースは空です。");
    }

    const report = results.map((row: any) => {
      const statusIcon = row.status === 'available' ? '✅ 空き' : '⏳ 確保中';
      // start_at_unix は INTEGER なので、表示用に少し加工
      return `[${row.id}] 日付:${row.date_string} | 開始UNIX:${row.start_at_unix} | ${statusIcon}`;
    }).join('\n');

    return c.text(
      `--- Current Slot Status ---\n\n${report}\n\nTotal: ${results.length} slots found.`
    );

  } catch (e: any) {
    return c.json({ status: "❌ SQL Error", error: e.message }, 500);
  }
});