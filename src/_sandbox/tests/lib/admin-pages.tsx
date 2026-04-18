// src/_sandbox/tests/lib/admin-pages.tsx
import { Context } from 'hono';
import { html } from 'hono/html';
import { AdminSettingsData } from '../db/admin-repository';

// --- スタイル定義（デザイナーが調整しやすいよう一箇所に集約） ---
const PAGE_STYLE = {
  headerContainer: "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;",
  sectionCard: "background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);",
  sectionTitle: "font-size: 0.85rem; font-weight: 800; color: #64748b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;",
  badge: (bg: string, text: string) => `background:${bg}; color:${text}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size: 10px; white-space: nowrap;`,
  sysClock: "text-align:right; font-family:ui-monospace,monospace; background:#f1f5f9; padding:10px 15px; border-radius:8px;",
  dangerCard: "padding: 20px; border: 1px solid #fed7d7; background: #fff5f5; border-radius: 8px;"
};

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
 * @param data admin-repository.ts から取得した動的データ
 */
export const renderSettings = async (c: Context, data: AdminSettingsData | null) => {
  if (!data) return html`<div style="padding:20px; color:red;">⚠️ 設定データの読み込みに失敗しました。</div>`;

  const leadDays = (data.minLeadTimeMin / 1440).toFixed(1);

  return html`
    <div style="${PAGE_STYLE.headerContainer}">
      <div>
        <h2 style="margin:0;">基本設定</h2>
        <p style="margin:4px 0 0 0; color: #64748b; font-size: 0.9rem;">
          ${data.shopName} / ${data.staffDisplayName}
          <span style="margin-left:10px; background:#e2e8f0; padding:2px 8px; border-radius:4px; font-size:0.75rem;">
            予約締切: ${leadDays}日前相当
          </span>
        </p>
      </div>
      <div style="${PAGE_STYLE.sysClock}">
        <small style="opacity:0.6; font-size:0.7rem;">SYSTEM JST</small><br>
        <span style="font-size:1rem; font-weight:bold;">${data.jstNow}</span>
      </div>
    </div>

    <section style="${PAGE_STYLE.sectionCard}">
      <h3 style="${PAGE_STYLE.sectionTitle}">📌 Service Plans</h3>
      <div style="display:grid; gap:10px;">
        ${data.plans.map(p => html`
          <div style="padding:12px; border:1px solid #f1f5f9; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:bold; font-size:0.9rem;">${p.plan_name}</div>
              <small style="color:#64748b;">¥${p.price_amount.toLocaleString()} / ${p.duration_min}分 (+${p.buffer_min})</small>
            </div>
            <span style="${PAGE_STYLE.badge(p.plan_status === 'active' ? '#dcfce7' : '#f1f5f9', p.plan_status === 'active' ? '#166534' : '#64748b')}">
              ${p.plan_status.toUpperCase()}
            </span>
          </div>
        `)}
      </div>
    </section>

    <section style="${PAGE_STYLE.dangerCard}">
      <h3 style="color: #c53030; font-size: 1rem; margin-top: 0;">緊急停止（サーキットブレーカー）</h3>
      <p style="font-size: 0.8rem; color: #742a2a;">
        ONにすると、一時的に全てのプランの予約受付を停止します。現在の締切設定（${leadDays}日前）に関わらず、即座に新規予約が不可になります。
      </p>
      <button style="background: #e53e3e; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(229, 62, 62, 0.2);">
        受付停止: OFF
      </button>
    </section>
  `;
};