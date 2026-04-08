import { Hono } from 'hono';

export const test04 = new Hono();

test04.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Script Test 04</title>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h1>Step 1: Inline Script Test</h1>
        <button id="testButton" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
          Click Me!
        </button>

        <script>
          // 最もシンプルな動作確認
          document.getElementById('testButton').addEventListener('click', () => {
            alert('Hello World from Inline Script!');
            console.log('Button clicked!');
          });
        </script>
      </body>
    </html>
  `);
});