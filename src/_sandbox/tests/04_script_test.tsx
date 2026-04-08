import { Hono } from 'hono';

export const test04 = new Hono();

test04.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Script Test 04 - External</title>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h1>Step 2: External Script Test</h1>
        <button id="testButton" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
          Click Me!
        </button>

        // Vite/Cloudflareの標準ルールでは public 直下は / 直下として配信されます
        <script src="/test04_logic.js"></script>

      </body>
    </html>
  `);
});