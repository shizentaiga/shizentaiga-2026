import { Context } from 'hono';
import { html } from 'hono/html';

// --- ログページ専用のスタイル定義 ---
const PAGE_STYLE = {
  headerContainer: "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;",
  sectionCard: "background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);",
  logContainer: "display: flex; flex-direction: column; gap: 12px;",
  logItem: "display: flex; gap: 16px; padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; align-items: flex-start;",
  timestamp: "font-family: ui-monospace, monospace; color: #94a3b8; white-space: nowrap; min-width: 140px;",
  actorBadge: "background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; text-transform: uppercase;",
  message: "color: #1e293b; line-height: 1.5;",
  tag: (color: string) => `color: ${color}; font-weight: bold; margin-right: 8px;`
};

/**
 * 操作ログページ
 * 現時点ではサンプル表示ですが、将来的に DB から AdminLog[] を受け取る構成にしています
 */
export const renderLogs = async (c: Context, data: any = null) => {
  // サンプルデータ（実運用では DB から取得）
  const logs = [
    { ts: "2026-04-18 15:30:12", actor: "ADMIN", action: "SETTINGS", msg: "店舗「表参道店」の予約締切時間を 24時間 -> 12時間 に変更しました。" },
    { ts: "2026-04-18 14:20:45", actor: "SYSTEM", action: "AUTH", msg: "Googleアカウント (shizen***@gmail.com) によるログイン承認。" },
    { ts: "2026-04-18 10:05:00", actor: "ADMIN", action: "RESERVATION", msg: "ユーザー: test@example.com の予約をキャンセル処理しました。" },
  ];

  return html`
    <div style="${PAGE_STYLE.headerContainer}">
      <div>
        <h2 style="margin:0;">操作ログ</h2>
        <p style="margin:4px 0 0 0; color: #64748b; font-size: 0.9rem;">
          管理画面で行われた操作の履歴を確認できます。
        </p>
      </div>
    </div>

    <section style="${PAGE_STYLE.sectionCard}">
      <div style="${PAGE_STYLE.logContainer}">
        ${logs.map(log => html`
          <div style="${PAGE_STYLE.logItem}">
            <div style="${PAGE_STYLE.timestamp}">${log.ts}</div>
            <div style="${PAGE_STYLE.actorBadge}">${log.actor}</div>
            <div style="${PAGE_STYLE.message}">
              <span style="${PAGE_STYLE.tag('#3b82f6')}">[${log.action}]</span>
              ${log.msg}
            </div>
          </div>
        `)}
      </div>
      
      <div style="margin-top: 20px; text-align: center;">
        <button style="background: none; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; color: #64748b; font-size: 0.8rem; cursor: pointer;">
          以前のログを読み込む
        </button>
      </div>
    </section>
  `;
};