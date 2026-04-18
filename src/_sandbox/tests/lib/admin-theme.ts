// src/_sandbox/tests/lib/admin-theme.ts

/**
 * デザイナー向け：カラー・スタイル定義（CSS文字列形式）
 */
export const ADMIN_THEME = {
  colors: {
    primary: '#4285F4',
    danger: '#d90429',
    textMain: '#333',
    white: '#ffffff',
  },
  styles: {
    // セミコロンを末尾につけたCSS形式の文字列
    container: "padding: 40px; font-family: sans-serif; text-align: center;",
    loginBtn: "display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;",
  }
};

/**
 * テキスト定義
 */
export const ADMIN_STRINGS = {
  TITLE: '管理者ログイン',
  AUTH_REQUIRED: '現在は認証前です。管理画面を利用するにはログインしてください。',
  LOGIN_BTN: 'Googleアカウントでログイン',
  LOGOUT_BTN: 'ログアウト',
  APP_NAME: 'Zen-Yu Admin'
};