import { Hono } from 'hono';

type Bindings = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_EMAIL: string;
};

export const test06 = new Hono<{ Bindings: Bindings }>();

// 1. TOP画面 (ログインボタン)
test06.get('/', (c) => {
  const redirectUri = `${new URL(c.req.url).origin}/_debug/test06/google`;
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;

  return c.html(
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Google Auth Test v0.3 (No Lib)</h1>
      <a href={googleAuthUrl} style={{
        display: 'inline-block', padding: '10px 20px', background: '#4285F4', color: 'white', textDecoration: 'none', borderRadius: '4px'
      }}>Googleログインを開始</a>
    </div>
  );
});

// 2. Callback画面 (ここで裏側通信を行う)
test06.get('/google', async (c) => {
  const code = c.req.query('code');
  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/_debug/test06/google`;

  if (!code) return c.text("認可コードがありません", 400);

  try {
    // --- Step A: 認可コードをアクセストークンに交換 ---
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) {
      return c.text("トークンの取得に失敗しました: " + JSON.stringify(tokenData), 500);
    }

    // --- Step B: トークンを使ってユーザー情報を取得 ---
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json() as any;

    // --- Step C: 管理者判定 ---
    const isAdmin = user.email === c.env.ADMIN_EMAIL;

    if (!isAdmin) {
      return c.html(`<h1 style="color:red;">Forbidden</h1><p>${user.email} は許可されていません。</p><a href="./">戻る</a>`, 403);
    }

    return c.html(`
      <div style="padding: 20px; font-family: sans-serif;">
        <h1 style="color: green;">✅ 認証成功</h1>
        <p>ようこそ、${user.name} さん (${user.email})</p>
        <pre style="background:#eee; padding:10px;">${JSON.stringify(user, null, 2)}</pre>
        <a href="./">TOPに戻る</a>
      </div>
    `);

  } catch (e: any) {
    return c.text("エラーが発生しました: " + e.message, 500);
  }
});