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
 * 
 * DB切り分けコマンド
 * 1. データベース名の確認とパスの確定
 * npx wrangler d1 info shizentaiga_db --local
 * 2. テーブル構造（カラム名・型）の抽出
 * npx wrangler d1 execute shizentaiga_db --local --command="PRAGMA table_info(slots);"
 * 3. データの存在確認（1件以上のチェック）
 * npx wrangler d1 execute shizentaiga_db --local --command="SELECT COUNT(*) as total FROM slots;"
 * 
 * ステップ1：本番DBにテーブルが存在するか確認
 * npx wrangler d1 execute shizentaiga_db --remote --command="PRAGMA table_info(slots);"
 * ステップ2：本番DBのデータ件数を確認（Seed確認）
 * npx wrangler d1 execute shizentaiga_db --remote --command="SELECT COUNT(*) as total FROM slots;"
 * ステップ3：【必要に応じて】本番へのSeed投入
 * npx wrangler d1 execute shizentaiga_db --remote --file=./seed.sql
 * 
 */

import { Hono } from 'hono';

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test03 = new Hono<{ Bindings: Bindings }>();

test03.get('/', async (c) => {
  try {
    // 【修正点】
    // 1. id -> slot_id
    // 2. status -> booking_status (CHECK制約に合わせて変更)
    // 3. start_at_unix でソート
    const { results } = await c.env.shizentaiga_db
      .prepare(
        "SELECT slot_id, date_string, start_at_unix, booking_status FROM slots ORDER BY start_at_unix ASC"
      )
      .all();

    if (!results || results.length === 0) {
      return c.text("⚠️ データベースは空です。（slotsテーブルにレコードがありません）");
    }

    const report = results.map((row: any) => {
      // booking_status に基づくアイコン判定
      const statusIcon = row.booking_status === 'booked' ? '✅ 確定' : 
                         row.booking_status === 'pending' ? '⏳ 仮確保' : '❌ その他';
      
      // UNIXタイムスタンプを日本時間(JST)の読みやすい形式に変換
      // D1から取得する数値は秒単位(10桁)なので、Dateオブジェクトには1000倍してミリ秒で渡します
      const jstTime = new Date(row.start_at_unix * 1000).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `[${row.slot_id}] 日付:${row.date_string} | 開始:${jstTime} (UNIX:${row.start_at_unix}) | ${statusIcon}`;
    }).join('\n');

    return c.text(
      `--- Current Slot Status (v3.0 Grid Model) ---\n\n${report}\n\nTotal: ${results.length} slots found.`
    );

  } catch (e: any) {
    // 開発時に役立つよう、エラーメッセージを詳細に返却
    return c.json({ 
      status: "❌ SQL Error", 
      message: e.message,
      hint: "スキーマv3.0のカラム名（slot_id, booking_status）と一致しているか確認してください。"
    }, 500);
  }
});