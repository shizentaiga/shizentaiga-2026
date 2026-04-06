import { defineConfig } from 'vitest/config';

/**
 * ====================================================================
 * Vitest Configuration for D1 Integration Testing
 * ====================================================================
 * * 【構成の経緯と意思決定】
 * 1. 互換性優先の選択: 
 * @cloudflare/vitest-pool-workers のサブパス（/config）および 
 * 専用関数（defineWorkersConfig）は、TypeScript の型定義エラーが
 * 解消困難であったため、最短で動作する Vitest 標準の `defineConfig` を採用。
 * * 2. 環境の分離:
 * 複雑な Pool Options による Wrangler の紐付けを config レイヤーで行わず、
 * テストコード（.test.ts）側で `getPlatformProxy` を直接呼び出すことで、
 * 環境構築の「ハマりどころ」を最小限に抑えている。
 * * 3. 実行効率:
 * environment を 'node' とし、余計なレイヤーを挟まないことで、
 * ローカルでのテスト実行速度とデバッグの容易さを両立。
 */

export default defineConfig({
  test: {
    // 💡 Workers環境をエミュレートするための最小設定
    // ※D1 のエミュレートは各テスト内の getPlatformProxy にて担保する。
    environment: 'node', 
    include: ['**/*.test.ts'],
    
    // グローバルなセットアップが必要になった場合はここに追記
    globals: true,
  },
});

/**
 * [参考] 不採用となった構成（型定義エラーにより動作不可）:
 * ---------------------------------------------------------
 * import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
 * * export default defineWorkersConfig({
 * test: {
 * poolOptions: {
 * workers: {
 * wrangler: { configPath: './wrangler.toml' },
 * },
 * },
 * },
 * });
 * ---------------------------------------------------------
 * ※ 上記構成は、Cloudflare のエコシステムが安定した際に再検討の余地あり。
 * ※ 現時点では、開発スピードを優先し、標準の defineConfig を使用。
 */