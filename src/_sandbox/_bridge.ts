import { Hono } from 'hono';
import { sandboxRouter } from './_router';

/**
 * [TEST ONLY] 本番環境とテスト環境を繋ぐ最小限のブリッジ
 * 不具合混入を防ぐため、独自のロジックは一切持たせません。
 */
const app = new Hono();

app.route('/', sandboxRouter);

export default app;