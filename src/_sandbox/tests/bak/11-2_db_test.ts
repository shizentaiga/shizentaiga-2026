import { Hono } from 'hono';

const app = new Hono<{ Bindings: { shizentaiga_db: D1Database } }>();

app.get('/db-test', async (c) => {
  try {
    const stats = await c.env.shizentaiga_db
      .prepare("SELECT COUNT(*) as total, datetime('now', '+9 hours') as jst_now FROM slots")
      .first();

    return c.json({ success: true, ...stats });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default app;