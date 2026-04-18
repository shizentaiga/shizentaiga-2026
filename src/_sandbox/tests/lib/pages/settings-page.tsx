import { Context } from 'hono';
import { html } from 'hono/html';
import { AdminSettingsData } from '../../db/admin-repository';

// --- 設定ページ専用のスタイル定義 ---
const PAGE_STYLE = {
  headerContainer: "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;",
  sectionCard: "background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);",
  sectionTitle: "font-size: 0.85rem; font-weight: 800; color: #64748b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;",
  badge: (bg: string, text: string) => `background:${bg}; color:${text}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size: 10px; white-space: nowrap;`,
  sysClock: "text-align:right; font-family:ui-monospace,monospace; background:#f1f5f9; padding:10px 15px; border-radius:8px;",
  activeRow: "background: #eff6ff; border-left: 4px solid #3b82f6;",
  dangerCard: "padding: 20px; border: 1px solid #fed7d7; background: #fff5f5; border-radius: 8px;"
};

/**
 * 基本設定ページ (複数店舗・複数スタッフ・プラン管理)
 */
export const renderSettings = async (c: Context, data: AdminSettingsData | null) => {
  if (!data) return html`<div style="padding:20px; color:red;">⚠️ 設定データの読み込みに失敗しました。</div>`;

  const currentShop = data.shops.find(s => s.shop_id === data.selectedShopId);

  return html`
    <div style="${PAGE_STYLE.headerContainer}">
      <div>
        <h2 style="margin:0;">基本設定</h2>
        <p style="margin:4px 0 0 0; color: #64748b; font-size: 0.9rem;">
          システム全体のマスタデータを管理します。
        </p>
      </div>
      <div style="${PAGE_STYLE.sysClock}">
        <small style="opacity:0.6; font-size:0.7rem;">SYSTEM JST</small><br>
        <span style="font-size:1rem; font-weight:bold;">${data.jstNow}</span>
      </div>
    </div>

    <section style="${PAGE_STYLE.sectionCard}">
      <h3 style="${PAGE_STYLE.sectionTitle}">🏢 店舗管理</h3>
      <div style="display: grid; gap: 8px;">
        ${data.shops.map(shop => html`
          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; ${shop.shop_id === data.selectedShopId ? PAGE_STYLE.activeRow : ''}">
            <div>
              <span style="font-weight: bold;">${shop.shop_name}</span>
              <code style="margin-left: 8px; font-size: 0.7rem; color: #94a3b8;">${shop.shop_id}</code>
            </div>
            ${shop.shop_id === data.selectedShopId ? html`<span style="${PAGE_STYLE.badge('#dbeafe', '#1e40af')}">選択中</span>` : ''}
          </div>
        `)}
      </div>
    </section>

    <section style="${PAGE_STYLE.sectionCard}">
      <h3 style="${PAGE_STYLE.sectionTitle}">👤 スタッフ設定 (${currentShop?.shop_name || '未選択'})</h3>
      <div style="display: grid; gap: 8px;">
        ${data.staffs.map(staff => html`
          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: bold;">${staff.staff_display_name}</div>
              <small style="color: #64748b;">
                予約締切: <b>${(staff.min_lead_time_min / 60).toFixed(1)}時間前</b> 
                (${ (staff.min_lead_time_min / 1440).toFixed(1) }日前相当)
              </small>
            </div>
            <button style="font-size: 0.75rem; color: #3b82f6; background: none; border: 1px solid #3b82f6; padding: 4px 12px; border-radius: 6px; cursor: pointer;">
              編集
            </button>
          </div>
        `)}
      </div>
    </section>

    <section style="${PAGE_STYLE.sectionCard}">
      <h3 style="${PAGE_STYLE.sectionTitle}">📋 プラン一覧 (${currentShop?.shop_name || '未選択'})</h3>
      <div style="display: grid; gap: 8px;">
        ${data.plans.map(p => html`
          <div style="padding: 12px; border: 1px solid #f1f5f9; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: bold; font-size: 0.9rem;">${p.plan_name}</div>
              <small style="color: #64748b;">
                ¥${p.price_amount.toLocaleString()} / ${p.duration_min}分 (休憩 ${p.buffer_min}分)
              </small>
            </div>
            <span style="${PAGE_STYLE.badge(p.plan_status === 'active' ? '#dcfce7' : '#f1f5f9', p.plan_status === 'active' ? '#166534' : '#64748b')}">
              ${p.plan_status.toUpperCase()}
            </span>
          </div>
        `)}
      </div>
    </section>

    <section style="${PAGE_STYLE.dangerCard}">
      <h3 style="color: #c53030; font-size: 1rem; margin-top: 0;">緊急停止（店舗単位）</h3>
      <p style="font-size: 0.8rem; color: #742a2a;">
        選択中の店舗 <b>${currentShop?.shop_name || '未選択'}</b> の新規予約を即座に停止します。
      </p>
      <button style="background: #e53e3e; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold;">
        受付停止を実行
      </button>
    </section>
  `;
};