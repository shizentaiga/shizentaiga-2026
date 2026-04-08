/**
 * @file vite.config.ts
 * @description Viteビルド設定ファイル。
 * サーバーサイド（Hono/Cloudflare Workers）のビルドを主眼に置いています。
 * * ■ クライアントJSの管理方針：
 * 複雑なビルドトラブルを避けるため、フロントエンドJSはビルドを通さず
 * /public/js/ 配下に直接配置し、静的ファイルとして配信しています。
 */

import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
import hono from '@hono/vite-build'

export default defineConfig({
  plugins: [
    cloudflare(), 
    ssrPlugin(),
    // Honoのサーバーエントリポイントを指定
    hono({
      entry: './src/index.tsx' 
    })
  ],
  build: {
    rollupOptions: {
      input: {
        // サーバーサイド（メインロジック）のみをビルド対象とする
        index: './src/index.tsx', 
      },
      // 出力設定：サーバーサイド実行用のJSを出力
      output: {
        entryFileNames: 'index.js',
      }
    }
  }
})