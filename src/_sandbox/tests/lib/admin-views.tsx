// src/_sandbox/tests/lib/admin-views.tsx
import { html } from 'hono/html';

/**
 * 管理画面の共通レイアウト（外枠）
 * @param currentView 現在表示中のタブ名
 * @param content 各ページの中身（HTMLコンテンツ）
 */
export const AdminLayout = (currentView: string, content: any) => html`
  <div style="font-family: sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px;">
    <header style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between;">
      <h1 style="margin: 0; font-size: 1.2rem;">Zen-Yu Admin</h1>
      <a href="/_debug/_admin/logout" style="color: #d90429; text-decoration: none; font-size: 0.8rem;">ログアウト</a>
    </header>

    <nav style="display: flex; gap: 10px; margin-bottom: 20px;">
      <a href="?view=reservations" style="padding: 8px 16px; border-radius: 4px; text-decoration: none; background: ${currentView === 'reservations' ? '#4285F4' : '#eee'}; color: ${currentView === 'reservations' ? '#fff' : '#333'};">予約確認</a>
      <a href="?view=logs" style="padding: 8px 16px; border-radius: 4px; text-decoration: none; background: ${currentView === 'logs' ? '#4285F4' : '#eee'}; color: ${currentView === 'logs' ? '#fff' : '#333'};">操作ログ</a>
      <a href="?view=settings" style="padding: 8px 16px; border-radius: 4px; text-decoration: none; background: ${currentView === 'settings' ? '#4285F4' : '#eee'}; color: ${currentView === 'settings' ? '#fff' : '#333'};">基本設定</a>
    </nav>

    <main style="background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      ${content}
    </main>
  </div>
`;