import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';

type Bindings = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_EMAIL: string;
};

export const test06 = new Hono<{ Bindings: Bindings }>();

// セッション管理用Cookie名
const AUTH_COOKIE_NAME = 'debug_auth_session';

/**
 * 1. メインダッシュボード画面
 * 認証状態に応じて表示内容を切り替えます。
 */
test06.get('/', (c) => {
  // デバッグ用：現在ブラウザが保持しているCookieをすべて取得
  const allCookies = getCookie(c);
  const session = getCookie(c, AUTH_COOKIE_NAME);

  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/_debug/test06/google`;

  /**
   * Google Auth URL の構築（用途に合わせて選択可能）
   * * A. 強制ログインモード (&prompt=select_account)
   * ログアウト後、必ずアカウント選択画面を表示させたい場合に使用。
   * B. 標準ログインモード
   * Googleにログイン済みであれば、アカウント選択をスキップしてシームレスに認証。
   */
  const authUrls = {
    forced: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&prompt=select_account`,
    standard: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`
  };

  // 現在はテストのため「強制モード」をデフォルトに設定
  const googleAuthUrl = authUrls.forced;

  return c.html(
    <div style="padding: 20px; font-family: 'Helvetica Neue', sans-serif; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6;">
      <h1 style="border-left: 5px solid #4285F4; padding-left: 15px; margin-bottom: 30px;">Admin Auth Debug Console</h1>

      {/* --- Cookie Runtime Monitor (デバッグ用) --- */}
      <div style={{
        background: '#282c34', color: '#61dafb', padding: '15px', 
        borderRadius: '8px', marginBottom: '30px', fontSize: '0.85rem', border: '1px solid #444'
      }}>
        <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #444', color: '#fff' }}>🔍 Cookie Runtime Monitor</h3>
        <p style={{ margin: '5px 0' }}><strong>Target Session:</strong> {session ? <span style={{ color: '#98c379' }}>✅ [${session}]</span> : <span style={{ color: '#e06c75' }}>❌ (NOT FOUND)</span>}</p>
        <p style={{ margin: '5px 0' }}><strong>Stored Cookies:</strong> <code style={{ color: '#d19a66' }}>{JSON.stringify(allCookies, null, 2)}</code></p>
      </div>

      {/* 1. 認証ステータス・セクション */}
      <section style={{ border: '1px solid #ddd', padding: '25px', marginBottom: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>1. Authentication Status</h2>
        {session ? (
          <div>
            <p style={{ color: '#2b9348', fontWeight: 'bold' }}>● ログイン済み</p>
            <p>管理者として認証されています。内部リソースへのアクセスが許可されています。</p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#d90429', fontWeight: 'bold' }}>○ 未ログイン</p>
            <p>システムを利用するには、管理者アカウントでログインしてください。</p>
            <a href={googleAuthUrl} style={{ 
              display: 'inline-block', padding: '12px 24px', background: '#4285F4', 
              color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold', marginTop: '10px'
            }}>
              Googleアカウントでログイン
            </a>
          </div>
        )}
      </section>

      {/* 2. 管理者専用コンテンツ・セクション */}
      <section style={{ 
        border: '1px solid #ddd', padding: '25px', marginBottom: '20px', borderRadius: '10px',
        backgroundColor: session ? '#fff' : '#f8f9fa',
        color: session ? '#333' : '#adb5bd'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>2. Administrative Resources</h2>
        {session ? (
          <div style={{ background: '#f1f3f5', padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
            <p style={{ margin: '0 0 10px 0' }}><strong>System Log:</strong></p>
            <code style={{ fontSize: '0.9rem' }}>
              AUTH_USER: {c.env.ADMIN_EMAIL} <br />
              ACCESS_TIME: {new Date().toLocaleString()} <br />
              SECURITY_LEVEL: HIGH
            </code>
          </div>
        ) : (
          <p>※ このエリアを表示するには管理権限が必要です。</p>
        )}
      </section>

      {/* 3. セッション終了・セクション */}
      <section style={{ 
        border: '1px solid #ddd', padding: '25px', borderRadius: '10px',
        opacity: session ? 1 : 0.6, backgroundColor: '#fff5f5'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#c92a2a' }}>3. Session Termination</h2>
        <p>作業終了後は、セキュリティのために必ずセッションを破棄してください。</p>
        <a href="./test06/logout" style={{ 
          display: 'inline-block', padding: '10px 20px', 
          background: session ? '#e03131' : '#dee2e6', 
          color: 'white', textDecoration: 'none', borderRadius: '5px',
          fontWeight: 'bold', pointerEvents: session ? 'auto' : 'none'
        }}>
          ログアウト（セッション破棄）
        </a>
      </section>
    </div>
  );
});

/**
 * 2. OAuth Callback ハンドラ
 * Googleからの認証レスポンスを処理し、セッションを確立します。
 */
test06.get('/google', async (c) => {
  const code = c.req.query('code');
  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/_debug/test06/google`;

  if (!code) return c.text("Authorization code not found", 400);

  try {
    // A. 認可コードをアクセストークンに交換
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

    // B. ユーザープロフィールの取得
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json() as any;

    // C. 管理者メールアドレスの検証
    if (user.email === c.env.ADMIN_EMAIL) {
      // 認証済みCookieの発行（セッション開始）
      setCookie(c, AUTH_COOKIE_NAME, 'verified', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 3600 // 1時間有効
      });
      return c.redirect('/_debug/test06');
    }
    return c.text("Unauthorized: Access denied for " + user.email, 403);
  } catch (e) {
    return c.text("Authentication error occurred", 500);
  }
});

/**
 * 3. ログアウト・ハンドラ
 * セッションCookieを完全に削除し、初期状態に戻します。
 */
test06.get('/logout', (c) => {
  // すべての可能性のあるパスに対してCookie削除を実行（環境の完全クリーンアップ）
  deleteCookie(c, AUTH_COOKIE_NAME, { path: '/' });
  deleteCookie(c, AUTH_COOKIE_NAME, { path: '/_debug' });
  
  return c.redirect('/_debug/test06');
});