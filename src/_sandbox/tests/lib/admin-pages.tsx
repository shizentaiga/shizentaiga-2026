// src/_sandbox/tests/lib/admin-pages.tsx
import { Context } from 'hono';
import { html } from 'hono/html';

/**
 * 1. 予約確認ページ
 */
export const renderReservations = async (c: Context) => html`
  <h2 style="margin-top:0;">予約確認</h2>
  <p style="color: #666; font-size: 0.9rem;">予約一覧の表示と手動操作（キャンセル等）を行う画面です。</p>
  <div style="margin-top: 20px; padding: 30px; border: 2px dashed #eee; border-radius: 8px; text-align: center; color: #999;">
    [予約データ一覧の表示をここに実装予定]
  </div>
`;

/**
 * 2. 操作ログページ
 */
export const renderLogs = async (c: Context) => html`
  <h2 style="margin-top:0;">操作ログ</h2>
  <p style="color: #666; font-size: 0.9rem;">「誰が・いつ・何をしたか」の証跡を確認します。</p>
  <div style="margin-top: 20px; font-family: monospace; font-size: 0.85rem; background: #f8f9fa; padding: 15px; border-radius: 4px;">
    <div>[2026-04-18 14:40] ADMIN: ログインしました</div>
  </div>
`;

/**
 * 3. 基本設定ページ
 */
export const renderSettings = async (c: Context) => html`
  <h2 style="margin-top:0;">基本設定</h2>
  <p style="color: #666; font-size: 0.9rem;">システムの全体制御（受付停止フラグなど）を行います。</p>
  <div style="margin-top: 20px; padding: 20px; border: 1px solid #fed7d7; background: #fff5f5; border-radius: 8px;">
    <h3 style="color: #c53030; font-size: 1rem; margin-top: 0;">緊急停止（サーキットブレーカー）</h3>
    <p style="font-size: 0.8rem;">ONにすると、一時的に全てのプランの予約受付を停止します。</p>
    <button style="background: #e53e3e; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">
      受付停止: OFF
    </button>
  </div>
`;