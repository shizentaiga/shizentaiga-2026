/**
 * 管理者ダッシュボード 司令塔モジュール
 * 認証ガード、ルーティング、およびリポジトリを介したデータ取得を制御します。
 */

import { Hono, Context } from 'hono';
import { html } from 'hono/html'; // ← これを追加
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { getGoogleAuthUrl, exchangeCodeForUser, verifyAdminEmail } from './lib/admin-logic';
import { AdminLayout } from './lib/admin-views';
import { renderReservations, renderLogs, renderSettings } from './lib/admin-pages';
import { ADMIN_THEME, ADMIN_STRINGS } from './lib/admin-theme';
// リポジトリのインポートを追加
import { getAdminSettings } from './db/admin-repository';

type Bindings = {
  shizentaiga_db: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_EMAIL: string;
};

export const test00 = new Hono<{ Bindings: Bindings }>();

// ---------------------------------------------------------
// 1. システム設定
// ---------------------------------------------------------
const ADMIN_CONFIG = {
  SESSION_NAME: 'admin_auth_session',
  BASE_PATH: '/_debug/_admin',
  get REDIRECT_URI_PATH() { return `${this.BASE_PATH}/google`; },
  get LOGOUT_PATH() { return `${this.BASE_PATH}/logout`; }
};

// ---------------------------------------------------------
// 2. HTMLビューの描画ヘルパー
// ---------------------------------------------------------

/** ログイン前ページ */
const renderLoginPage = (authUrl: string) => (c: Context) => c.html(
  <div style={ADMIN_THEME.styles.container}>
    <h1 style={`color: ${ADMIN_THEME.colors.textMain};`}>{ADMIN_STRINGS.TITLE}</h1>
    <p>{ADMIN_STRINGS.AUTH_REQUIRED}</p>
    <a href={authUrl} style={`${ADMIN_THEME.styles.loginBtn} background: ${ADMIN_THEME.colors.primary}; color: ${ADMIN_THEME.colors.white};`}>
      {ADMIN_STRINGS.LOGIN_BTN}
    </a>
  </div>
);

// ---------------------------------------------------------
// 3. 共通ヘルパー
// ---------------------------------------------------------

const getAdminCtx = (c: Context) => {
  const origin = new URL(c.req.url).origin;
  return {
    redirectUri: `${origin}${ADMIN_CONFIG.REDIRECT_URI_PATH}`,
    session: getCookie(c, ADMIN_CONFIG.SESSION_NAME)
  };
};

// ---------------------------------------------------------
// 4. メインルーティング
// ---------------------------------------------------------

test00.get('/', async (c) => {
  const { redirectUri, session } = getAdminCtx(c);
  
  if (!session) {
    const authUrl = getGoogleAuthUrl(c, redirectUri);
    return renderLoginPage(authUrl)(c);
  }

  const view = c.req.query('view') || 'reservations';

  let content;
  switch (view) {
    case 'reservations':
      content = await renderReservations(c);
      break;

    case 'logs':
      content = await renderLogs(c);
      break;

    case 'settings':
      // 【重要】リポジトリ経由でDBから設定情報を取得
      try {
        const settingsData = await getAdminSettings(c.env.shizentaiga_db);
        content = await renderSettings(c, settingsData);
      } catch (e) {
        content = html`<div style="padding:20px; color:red;">DB接続エラーが発生しました。</div>`;
      }
      break;

    default:
      content = await renderReservations(c);
  }

  return c.html(AdminLayout(view, content));
});

/** [GET] OAuth Callback */
test00.get('/google', async (c) => {
  const code = c.req.query('code');
  const { redirectUri } = getAdminCtx(c);
  if (!code) return c.text("Code Missing", 400);

  try {
    const user = await exchangeCodeForUser(c, code, redirectUri);
    if (verifyAdminEmail(c, user.email)) {
      setCookie(c, ADMIN_CONFIG.SESSION_NAME, 'verified', {
        path: '/', httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 3600 * 24
      });
      return c.redirect(ADMIN_CONFIG.BASE_PATH);
    }
    return c.text("Unauthorized", 403);
  } catch (e) {
    return c.text("Auth Error", 500);
  }
});

/** [GET] Logout */
test00.get('/logout', (c) => {
  deleteCookie(c, ADMIN_CONFIG.SESSION_NAME, { path: '/' });
  return c.redirect(ADMIN_CONFIG.BASE_PATH);
});