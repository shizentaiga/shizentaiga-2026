import { Hono, Context } from 'hono'; // Context を追加
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { getGoogleAuthUrl, exchangeCodeForUser, verifyAdminEmail } from './lib/admin-logic';

type Bindings = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_EMAIL: string;
};

export const test00 = new Hono<{ Bindings: Bindings }>();

// ---------------------------------------------------------
// 1. 変数・定数の定義
// ---------------------------------------------------------
const ADMIN_INFO = {
  SESSION_NAME: 'admin_auth_session',
  BASE_PATH: '/_debug/_admin',
  get REDIRECT_URI_PATH() { return `${this.BASE_PATH}/google`; },
  get LOGOUT_PATH() { return `${this.BASE_PATH}/logout`; },
  STRINGS: {
    TITLE: '管理者ログイン',
    DASHBOARD_TITLE: '管理者ダッシュボード',
    WELCOME_MSG: '管理者用ダッシュボードへようこそ',
    LOGIN_BTN: 'Googleアカウントでログイン',
    LOGOUT_BTN: 'ログアウト',
    AUTH_SUCCESS: '認証が完了しました',
    AUTH_REQUIRED: '現在は認証前です。管理画面を利用するにはログインしてください。',
    WIP_MSG: '※ ここに店舗管理やスケジュール管理の機能を実装していきます。'
  }
};

// ---------------------------------------------------------
// 2. スタイル定義
// ---------------------------------------------------------
const THEME = {
  colors: {
    primary: '#4285F4',
    success: '#2b9348',
    danger: '#d90429',
    bgLight: '#f8f9fa',
    border: '#ddd',
    textMain: '#333',
    textMuted: '#666',
    white: '#ffffff'
  },
  spacing: {
    padding: '40px',
    gap: '20px'
  }
};

// ---------------------------------------------------------
// 3. HTMLビューの外部関数化 (型定義を追加)
// ---------------------------------------------------------

/**
 * ログインページ
 */
const renderLoginPage = (authUrl: string) => (c: Context) => c.html(
  <div style={{ padding: THEME.spacing.padding, fontFamily: 'sans-serif', textAlign: 'center' }}>
    <h1 style={{ color: THEME.colors.textMain }}>{ADMIN_INFO.STRINGS.TITLE}</h1>
    <p style={{ marginBottom: THEME.spacing.gap }}>{ADMIN_INFO.STRINGS.AUTH_REQUIRED}</p>
    <a href={authUrl} style={{ 
      display: 'inline-block', padding: '12px 24px', background: THEME.colors.primary, 
      color: THEME.colors.white, textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' 
    }}>
      {ADMIN_INFO.STRINGS.LOGIN_BTN}
    </a>
  </div>
);

/**
 * ダッシュボードページ
 */
const renderDashboardPage = (adminEmail: string) => (c: Context) => c.html(
  <div style={{ padding: THEME.spacing.padding, fontFamily: 'sans-serif' }}>
    <h1 style={{ color: THEME.colors.success }}>{ADMIN_INFO.STRINGS.AUTH_SUCCESS}</h1>
    <div style={{ background: THEME.colors.bgLight, padding: '20px', borderRadius: '8px', border: `1px solid ${THEME.colors.border}` }}>
      <p><strong>{ADMIN_INFO.STRINGS.DASHBOARD_TITLE}</strong></p>
      <p>ログイン: <span style={{ color: THEME.colors.primary }}>{adminEmail}</span></p>
      <hr style={{ margin: '20px 0', border: 0, borderTop: `1px solid ${THEME.colors.border}` }} />
      <p style={{ fontSize: '0.9rem', color: THEME.colors.textMuted }}>{ADMIN_INFO.STRINGS.WIP_MSG}</p>
      <div style={{ marginTop: '20px' }}>
        <a href={ADMIN_INFO.LOGOUT_PATH} style={{ 
          color: THEME.colors.danger, fontSize: '0.85rem', textDecoration: 'none', 
          border: `1px solid ${THEME.colors.danger}`, padding: '5px 10px', borderRadius: '4px' 
        }}>
          {ADMIN_INFO.STRINGS.LOGOUT_BTN}
        </a>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------
// 4. メインルーティング
// ---------------------------------------------------------

/**
 * コンテキスト取得用ヘルパー (any を Context に修正)
 */
const getAdminCtx = (c: Context) => {
  const origin = new URL(c.req.url).origin;
  return {
    redirectUri: `${origin}${ADMIN_INFO.REDIRECT_URI_PATH}`,
    session: getCookie(c, ADMIN_INFO.SESSION_NAME)
  };
};

/** [管理者トップ] */
test00.get('/', (c) => {
  const { redirectUri, session } = getAdminCtx(c);
  if (!session) {
    const authUrl = getGoogleAuthUrl(c, redirectUri);
    return renderLoginPage(authUrl)(c);
  }
  return renderDashboardPage(c.env.ADMIN_EMAIL)(c);
});

/** [OAuth Callback] */
test00.get('/google', async (c) => {
  const code = c.req.query('code');
  const { redirectUri } = getAdminCtx(c);
  if (!code) return c.text("Code Missing", 400);

  try {
    const user = await exchangeCodeForUser(c, code, redirectUri);
    if (verifyAdminEmail(c, user.email)) {
      setCookie(c, ADMIN_INFO.SESSION_NAME, 'verified', {
        path: '/', httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 3600 * 24
      });
      return c.redirect(ADMIN_INFO.BASE_PATH);
    }
    return c.text("Unauthorized", 403);
  } catch (e) {
    return c.text("Auth Error", 500);
  }
});

/** [Logout] */
test00.get('/logout', (c) => {
  deleteCookie(c, ADMIN_INFO.SESSION_NAME, { path: '/' });
  return c.redirect(ADMIN_INFO.BASE_PATH);
});