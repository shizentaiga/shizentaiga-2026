import { Hono } from 'hono';

// index.tsx とは独立した、このファイル専用の Hono インスタンス
export const test99 = new Hono();

test99.get('/', (c) => {
  return c.text("Hello World from Test 99!");
});