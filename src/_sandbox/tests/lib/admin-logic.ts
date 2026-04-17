/**
 * @file admin-logic.ts
 * @description 管理画面専用の認証・ビジネスロジック集（Sandbox用）
 */
import { Context } from 'hono';

/**
 * Googleの認可URLを生成する
 */
export const getGoogleAuthUrl = (c: Context, redirectUri: string) => {
  const clientId = (c.env as any).GOOGLE_CLIENT_ID;
  const scope = encodeURIComponent('email profile');
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=select_account`;
};

/**
 * 認可コードをユーザー情報に交換する
 */
export const exchangeCodeForUser = async (c: Context, code: string, redirectUri: string) => {
  const env = c.env as any;

  // 1. トークン交換
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) throw new Error('Failed to exchange token');
  const tokenData = await tokenRes.json() as any;

  // 2. プロフィール取得
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) throw new Error('Failed to fetch user info');
  return await userRes.json() as { email: string; name: string; picture: string };
};

/**
 * 管理者権限（Email）の検証
 */
export const verifyAdminEmail = (c: Context, email: string): boolean => {
  return email === (c.env as any).ADMIN_EMAIL;
};