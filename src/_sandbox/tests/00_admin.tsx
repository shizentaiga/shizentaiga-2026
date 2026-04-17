import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';

type Bindings = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_EMAIL: string;
};

// index.tsx とは独立した、このファイル専用の Hono インスタンス
export const test00 = new Hono<{ Bindings: Bindings }>();

// 管理画面専用のセッションCookie名
const ADMIN_SESSION_NAME = 'admin_auth_session';

/**
 * [管理者トップ]
 */
test00.get('/', (c) => {
  const session = getCookie(c, ADMIN_SESSION_NAME);
  const origin = new URL(c.req.url).origin;
  
  // Googleコンソールに登録したリダイレクトURIと完全一致させる
  const redirectUri = `${origin}/_debug/_admin/google`;

  // 認証URLの構築
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&prompt=select_account`;

  // 認証状態による分岐（将来的にここをPageLayoutなどに差し替え）
  if (!session) {
    return c.html(
      <div style="padding: 40px; font-family: sans-serif; text-align: center;">
        <h1>管理者ログイン</h1>
        <p>現在は認証前です。管理画面を利用するにはログインしてください。</p>
        <a href={googleAuthUrl} style="display: inline-block; padding: 10px 20px; background: #4285F4; color: white; text-decoration: none; border-radius: 5px;">
          Googleアカウントでログイン
        </a>
      </div>
    );
  }

  // 認証完了後の表示
  return c.html(
    <div style="padding: 40px; font-family: sans-serif;">
      <h1 style="color: #2b9348;">認証が完了しました</h1>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
        <p><strong>管理者用ダッシュボードへようこそ</strong></p>
        <p>ログイン中のメールアドレス: <span style="color: #4285F4;">{c.env.ADMIN_EMAIL}</span></p>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 0.9rem; color: #666;">※ ここに店舗管理やスケジュール管理の機能を実装していきます。</p>
        <a href="/_debug/_admin/logout" style="color: #d90429; font-size: 0.8rem;">ログアウト</a>
      </div>
    </div>
  );
});

/**
 * [OAuth Callback]
 * URI: /_debug/_admin/google
 */
test00.get('/google', async (c) => {
  const code = c.req.query('code');
  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/_debug/_admin/google`;

  if (!code) return c.text("Authorization code not found", 400);

  try {
    // 1. 認可コードをトークンに交換
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

    // 2. ユーザー情報の取得
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json() as any;

    // 3. 管理者検証（現在は ADMIN_EMAIL との完全一致のみ）
    if (user.email === c.env.ADMIN_EMAIL) {
      setCookie(c, ADMIN_SESSION_NAME, 'verified_admin', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 3600 * 24 // 24時間有効
      });
      return c.redirect('/_debug/_admin');
    }

    return c.text("アクセス権限がありません: " + user.email, 403);
  } catch (e) {
    console.error("Auth Error:", e);
    return c.text("Authentication error occurred", 500);
  }
});

/**
 * [Logout]
 */
test00.get('/logout', (c) => {
  deleteCookie(c, ADMIN_SESSION_NAME, { path: '/' });
  return c.redirect('/_debug/_admin');
});