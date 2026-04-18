/**
 * 管理者ダッシュボード 司令塔モジュール
 * * 【ファイル構成マップ】
 * src/_sandbox/tests/
 * ├── 00_admin.tsx                # [本ファイル] 認証ガード、全体のルーティング、データ取得の統括
 * ├── lib/
 * │   ├── admin-logic.ts          # Google OAuth 認証、管理権限チェック等のバックエンドロジック
 * │   ├── admin-views.tsx         # 全画面共通のガワ（サイドバー、タブメニュー、AdminLayout）
 * │   ├── admin-theme.ts          # カラー、共通スタイル、テキスト定数
 * │   └── pages/                  # 各タブの具体的な表示内容（独立したコンポーネント）
 * │       ├── reservation-page.tsx # 予約確認（チップグリッド表示）
 * │       ├── log-page.tsx          # 操作ログ（実行履歴）
 * │       └── settings-page.tsx    # 基本設定（店舗・スタッフ・プラン管理）
 * └── db/
 * └── admin-repository.ts    # D1データベースとの橋渡し（複数店舗・スタッフ対応）
 * * 【主な責務】
 * 1. 認証ガード: セッションの有無を確認し、未認証時はログインページへ誘導
 * 2. ルーティング: クエリパラメータ(?view=)に基づき表示するページを切り替え
 * 3. データ注入: リポジトリから取得した動的データを各ページコンポーネントへ提供
 */

import { Hono, Context } from 'hono';
import { html } from 'hono/html';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { getGoogleAuthUrl, exchangeCodeForUser, verifyAdminEmail } from './lib/admin-logic';
import { AdminLayout } from './lib/admin-views';

// 旧ファイルのインポートを削除し、pages/ からのみ読み込む
import { renderReservations } from './lib/pages/reservation-page';
import { renderLogs } from './lib/pages/log-page';
import { renderSettings } from './lib/pages/settings-page';

import { ADMIN_THEME, ADMIN_STRINGS } from './lib/admin-theme';
// リポジトリから取得・更新関数をインポート
import { 
  getAdminSettings, 
  getAdminReservations, 
  upsertPlan, 
  deletePlan 
} from './db/admin-repository';

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

/** 認証チェックミドルウェア的な役割 */
const checkAuth = (c: Context) => {
  const session = getCookie(c, ADMIN_CONFIG.SESSION_NAME);
  return !!session;
};

// ---------------------------------------------------------
// 4. メインルーティング (GET)
// ---------------------------------------------------------

/** 管理画面トップ：認証ガードとビューの切り替え */
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
      try {
        const resData = await getAdminReservations(c.env.shizentaiga_db);
        content = await renderReservations(c, resData);
      } catch (e) {
        content = html`<div style="padding:20px; color:red;">予約データの取得中にエラーが発生しました。</div>`;
      }
      break;

    case 'logs':
      content = await renderLogs(c);
      break;

    case 'settings':
      try {
        const settingsData = await getAdminSettings(c.env.shizentaiga_db);
        content = await renderSettings(c, settingsData);
      } catch (e) {
        content = html`<div style="padding:20px; color:red;">設定データの取得中にエラーが発生しました。</div>`;
      }
      break;

    default:
      const defaultData = await getAdminReservations(c.env.shizentaiga_db);
      content = await renderReservations(c, defaultData);
  }

  return c.html(AdminLayout(view, content));
});

// ---------------------------------------------------------
// 5. 更新系ルーティング (POST)
// ---------------------------------------------------------

/** プランの追加・削除処理 */
test00.post('/settings/plans', async (c) => {
  if (!checkAuth(c)) return c.text("Unauthorized", 401);

  const body = await c.req.parseBody();
  const action = body.action;

  try {
    if (action === 'upsert') {
      await upsertPlan(c.env.shizentaiga_db, {
        shop_id: String(body.shop_id),
        plan_name: String(body.plan_name),
        duration_min: Number(body.duration_min),
        buffer_min: Number(body.buffer_min),
        price_amount: Number(body.price_amount),
        plan_status: 'active'
      });
    } else if (action === 'delete') {
      await deletePlan(c.env.shizentaiga_db, String(body.plan_id));
    }
    
    // 処理完了後、設定画面に戻す
    return c.redirect(`${ADMIN_CONFIG.BASE_PATH}?view=settings`);
  } catch (e) {
    console.error('Plan Update Error:', e);
    return c.text("Update Failed", 500);
  }
});

// ---------------------------------------------------------
// 6. 認証系ルーティング
// ---------------------------------------------------------

/** [GET] OAuth Callback: Google認証成功後の処理 */
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

/** [GET] Logout: セッション破棄 */
test00.get('/logout', (c) => {
  deleteCookie(c, ADMIN_CONFIG.SESSION_NAME, { path: '/' });
  return c.redirect(ADMIN_CONFIG.BASE_PATH);
});