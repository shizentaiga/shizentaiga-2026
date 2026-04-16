import { Hono } from 'hono';

export const test06 = new Hono();

test06.get('/', (c) => {
  return c.html(
    <html>
      <body>
        <h1>Google Auth Test</h1>
        {/* 動かなくて良い、ただのボタン */}
        <button type="button" style="padding: 10px 20px; cursor: pointer;">
          Googleでログイン
        </button>
      </body>
    </html>
  );
});