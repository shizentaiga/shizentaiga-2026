/**
 * 管理者ダッシュボード 司令塔モジュール
 * * 【ファイル構成イメージ】
 * src/_sandbox/tests/
 * ├── 00_admin.tsx           # [本ファイル] 認証ガード & ルーティング
 * ├── lib/
 * │   ├── admin-logic.ts     # OAuth等のバックエンドロジック
 * │   ├── admin-views.tsx    # 共通レイアウト (AdminLayout)
 * │   ├── admin-pages.tsx    # 各タブのコンテンツ (reservations/logs/settings)
 * │   └── admin-theme.ts     # デザイン定義 & テキスト定数
 * └── db/
 * └── admin-repository.ts # DB操作 (今後実装予定)
 */

import { Hono, Context } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { getGoogleAuthUrl, exchangeCodeForUser, verifyAdminEmail } from './lib/admin-logic';
import { AdminLayout } from './lib/admin-views';
import { renderReservations, renderLogs, renderSettings } from './lib/admin-pages';
import { ADMIN_THEME, ADMIN_STRINGS } from './lib/admin-theme';

// Cloudflare Workers の環境変数定義
type Bindings = {
  shizentaiga_db: D1Database; // DB連携を見据えて追加
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
  BASE_PATH: '/_debug/_admin', // 管理画面の起点URL
  get REDIRECT_URI_PATH() { return `${this.BASE_PATH}/google`; },
  get LOGOUT_PATH() { return `${this.BASE_PATH}/logout`; }
};

// ---------------------------------------------------------
// 2. HTMLビューの描画ヘルパー
// ---------------------------------------------------------

/**
 * ログイン前ページ
 * デザイン変更時は lib/admin-theme.ts を編集してください。
 */
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
// 3. 共通ヘルパー & 認証管理
// ---------------------------------------------------------

/**
 * リクエストコンテキストから認証状態とURL情報を抽出
 */
const getAdminCtx = (c: Context) => {
  const origin = new URL(c.req.url).origin;
  return {
    redirectUri: `${origin}${ADMIN_CONFIG.REDIRECT_URI_PATH}`,
    session: getCookie(c, ADMIN_CONFIG.SESSION_NAME)
  };
};

// ---------------------------------------------------------
// 4. メインルーティング (メインスイッチ)
// ---------------------------------------------------------

/** * [GET] 管理画面トップ 
 * 認証チェックを行い、viewパラメータに基づいて適切なページを返却します。
 */
test00.get('/', async (c) => {
  const { redirectUri, session } = getAdminCtx(c);
  
  // A. 未認証：Googleログインを促す
  if (!session) {
    const authUrl = getGoogleAuthUrl(c, redirectUri);
    return renderLoginPage(authUrl)(c);
  }

  // B. 認証済み：クエリパラメータ ?view=xxx に応じてコンテンツを切り替え
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
      content = await renderSettings(c);
      break;
    default:
      // 定義外のパラメータが来た場合は「予約確認」をデフォルト表示
      content = await renderReservations(c);
  }

  // 共通のナビゲーション枠 (AdminLayout) にコンテンツを埋め込んで返却
  return c.html(AdminLayout(view, content));
});

/** * [GET] OAuth Callback
 * Googleでの認証成功後に戻ってくるエンドポイント
 */
test00.get('/google', async (c) => {
  const code = c.req.query('code');
  const { redirectUri } = getAdminCtx(c);
  if (!code) return c.text("Code Missing", 400);

  try {
    const user = await exchangeCodeForUser(c, code, redirectUri);
    // env.ADMIN_EMAIL と一致するか検証
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

/** * [GET] Logout
 * セッションクッキーを削除してトップへリダイレクト
 */
test00.get('/logout', (c) => {
  deleteCookie(c, ADMIN_CONFIG.SESSION_NAME, { path: '/' });
  return c.redirect(ADMIN_CONFIG.BASE_PATH);
});