/**
 * 【開発・検証用サンドボックス：台帳ファイル】
 * * ■ 動作チェック手順
 * 1. ローカルサーバー起動: `npm run dev`
 * 2. アクセスURL: http://localhost:5173/_debug/
 * ※ 各テストへの直通パス：(末尾の数字を変更して利用)
 * /_debug/testxx
 * * ■ 運用方針
 * 本番環境への影響を考慮し、本ファイルにルーティングを追記してテストする。
 */

import { Hono } from 'hono';
import { test01 } from './tests/01_hello';
import { test02 } from './tests/02_db_check';
import { test03 } from './tests/03_db_viewer';
import { test04 } from './tests/04_script_test';
import { test05 } from './tests/05_webhook';
import { test06 } from './tests/06_htmx_check';
import { test07 } from './tests/07_htmx_version_fix';
import { test08} from './tests/08_htmx_db';
import { test09} from './tests/09_reserve';
import { test10} from './tests/10_db_plan';
import { test11} from './tests/11_date';
import { test12} from './tests/12_calendar';
import { test13} from './tests/13_routing';
import { test14} from './tests/14_db_flow';

export const sandboxRouter = new Hono();

// --- 各テストモジュールの登録（ここを編集してテストを増やす） ---
sandboxRouter.route('/test01', test01);
sandboxRouter.route('/test02', test02);
sandboxRouter.route('/test03', test03);
sandboxRouter.route('/test04', test04);
sandboxRouter.route('/test05', test05);
sandboxRouter.route('/test06', test06);
sandboxRouter.route('/test07', test07);
sandboxRouter.route('/test08', test08);
sandboxRouter.route('/test09', test09);
sandboxRouter.route('/test10', test10);
sandboxRouter.route('/test11', test11);
sandboxRouter.route('/test12', test12);
sandboxRouter.route('/test13', test13);
sandboxRouter.route('/test14', test14);

// サンドボックスのトップページ（/_debug/）
sandboxRouter.get('/', (c) => c.text("Sandbox Router is active."));

/**
 * ■ 後任者・編集者向けの注意点
 * * 1. 【非破壊の原則】
 * 既存の test01 〜 test03 は「基盤が正常であること」を証明するための証拠です。
 * 新しい実験をする際は、これらを書き換えず、必ず「test05」などの新しい番号を振ってください。
 * * 2. 【DB参照の注意】
 * D1アクセスを含むテスト（test02, test03等）を編集する場合、
 * 必ずターミナルの `npx wrangler d1` 操作時のパスと、
 * ブラウザで見ているパスが同一（--persist-to の指定など）であることを確認してください。
 * * 3. 【デプロイ時の注意】
 * 本番環境（remote）にデプロイした際もこのパスは有効になります。
 * 機密情報を表示するテストを放置したまま、本番公開しないよう十分に注意してください。
 */