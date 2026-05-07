// http://localhost:5173/_debug/test01

import { Hono } from 'hono';

// index.tsx とは独立した、このファイル専用の Hono インスタンス
export const test01 = new Hono();

test01.get('/', (c) => {
  return c.text("Hello World from Test 01!");
});