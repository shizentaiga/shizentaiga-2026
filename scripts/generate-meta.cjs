/**
 * @file /script/generate-meta.js
 * @description サイトのSEO（検索エンジン最適化）に必要な「sitemap.xml」と「robots.txt」を自動生成するスクリプト。
 * 実行されると、プロジェクトのルートディレクトリにこれらのファイルを書き出します。
 */

const fs = require('fs');

// 1. 環境変数からドメイン名を取得。設定されていない場合はデフォルトとして 'shizentaiga.com' を使用
const domain = process.env.DOMAIN_NAME || 'shizentaiga.com';
const baseUrl = `https://${domain}`;

// 2. 最終更新日（lastmod）の設定
let lastMod;
if (process.env.LAST_MOD) {
  // 環境変数に指定がある場合はそれを使用
  lastMod = process.env.LAST_MOD; 
} else {
  // 指定がない場合は、現在の日本標準時（JST）から日付を算出
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // 日本時間のオフセット（9時間） 
  const jstDate = new Date(now.getTime() + jstOffset);
  // ISO形式（YYYY-MM-DDTHH:mm:ss.sssZ）から日付部分だけを取得
  lastMod = jstDate.toISOString().split('T')[0];
}

/**
 * 3. サイトマップ（sitemap.xml）の内容定義
 * 検索エンジン（Google等）にサイトの構造と更新日を伝えるためのXML形式のデータ
 */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;

/**
 * 4. robots.txt の内容定義
 * 検索エンジンのクローラー（巡回ロボット）に対する動作指示。
 * 全てのクローラーに対してアクセスを許可し、サーバー負荷軽減のために巡回間隔を1秒に設定。
 */
const robots = `User-agent: *
Allow: /
Crawl-delay: 1

Sitemap: ${baseUrl}/sitemap.xml`;

// 5. 実際にファイルを物理的に書き出す処理
try {
  // サイトマップをルートディレクトリに書き出し
  fs.writeFileSync('sitemap.xml', sitemap);
  // robots.txt をルートディレクトリに書き出し
  fs.writeFileSync('robots.txt', robots);
  
  console.log(`[SUCCESS] Meta files generated for: ${baseUrl}`);
  console.log(`[INFO] lastmod is set to: ${lastMod}`);
} catch (err) {
  // ファイルの書き込みに失敗した場合はエラーを出力し、プロセスを異常終了（1）させる
  console.error(`[FATAL ERROR] Meta generation failed: ${err}`);
  process.exit(1); 
}