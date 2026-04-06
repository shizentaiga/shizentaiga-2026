import { describe, it, expect, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import fs from 'node:fs';
import path from 'node:path';
import { getSlotsByDate, tryLockSlot } from '../db/queries';

/**
 * ====================================================================
 * Queries Integration Test (Direct Execution Model)
 * ====================================================================
 * * 【設計上の決定事項: Direct Injection Strategy】
 * 1. エミュレーションの局所化:
 * Vitest のグローバル設定（config）に依存せず、各テストの `beforeEach` 内で 
 * `getPlatformProxy` を呼び出し、直接 D1 インスタンスを生成する。
 * これにより、複雑な型定義エラーを回避し、常に一貫した SQLite 環境を確保する。
 * * 2. スキーマの動的同期（Single Source of Truth）:
 * テーブル定義をテストコード内にハードコードせず、本番用の `schema.sql` を
 * 実行時に読み込む。これにより、DB設計の変更が即座にテストへ反映される。
 * * 3. データのアイソレーション:
 * テスト実行ごとにテーブルを初期化し、外部要因に左右されない純粋なロジック検証を行う。
 */

describe('Queries Direct Test (D1 Integration)', () => {
  // 💡 Cloudflare Workers の型定義競合を避けるため、意図的に any を使用。
  // 実利（テストの実行）を優先した経営的判断。
  let db: any;

  beforeEach(async () => {
    /**
     * Step 1: Wrangler Proxy による D1 エミュレータの起動
     * wrangler.toml を自動参照し、ローカル環境の SQLite インスタンスを取得。
     */
    const proxy = await getPlatformProxy({
      // 必要に応じて configPath: './wrangler.toml' を指定可能
    });
    
    // wrangler.toml 内の [[d1_databases]] binding 名（"DB"）に合わせる
    db = (proxy.env as any).DB;

    /**
     * Step 2: データベーススキーマの同期
     * 本番用 schema.sql を読み込み、実行環境のテーブル構造を最新化する。
     */
    const schemaPath = path.resolve(__dirname, '../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // セミコロンで分割し、空行を除外して順次実行
    const setupQueries = schemaSql.split(';').filter(s => s.trim());
    for (const q of setupQueries) {
      await db.prepare(q).run();
    }
  });

  /**
   * 基本動作検証: 指定日の予約枠が配列として返却されるかを確認
   */
  it('【正常系】データ取得の整合性：戻り値が配列であることを確認', async () => {
    const results = await getSlotsByDate(db, 'T1', '2026-04-06');
    expect(Array.isArray(results)).toBe(true);
  });

  /**
   * 補足：ここに「期限切れ枠の救済」や「二重予約の防御」などの
   * 具体的なシナリオテストを追記していく。
   */
});