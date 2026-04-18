import { Context } from 'hono';
import { html } from 'hono/html';
import { AdminSettingsData } from '../../db/admin-repository';

const PAGE_STYLE = {
  headerContainer: "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;",
  sectionCard: "background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);",
  sectionTitle: "font-size: 0.85rem; font-weight: 800; color: #64748b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;",
  badge: (bg: string, text: string) => `background:${bg}; color:${text}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size: 10px; white-space: nowrap;`,
  sysClock: "text-align:right; font-family:ui-monospace,monospace; background:#f1f5f9; padding:10px 15px; border-radius:8px;",
  activeRow: "background: #eff6ff; border-left: 4px solid #3b82f6;",
  dangerCard: "padding: 20px; border: 1px solid #fed7d7; background: #fff5f5; border-radius: 8px;",
  formInput: "width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem;",
  submitBtn: "background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;"
};

export const renderSettings = async (c: Context, data: AdminSettingsData | null) => {
  if (!data) return html`<div style="padding:20px; color:red;">⚠️ 設定データの読み込みに失敗しました。</div>`;

  const currentShop = data.shops.find(s => s.shop_id === data.selectedShopId);

  return html`
    <script>
      function setEditPlan(plan) {
        const form = document.getElementById('plan-form');
        const title = document.getElementById('form-title');
        
        // フォーム内の各要素に値を代入
        form.querySelector('[name="plan_id"]').value = plan.plan_id;
        form.querySelector('[name="plan_name"]').value = plan.plan_name;
        form.querySelector('[name="duration_min"]').value = plan.duration_min;
        form.querySelector('[name="buffer_min"]').value = plan.buffer_min;
        form.querySelector('[name="price_amount"]').value = plan.price_amount;
        form.querySelector('[name="description"]').value = plan.description || '';
        
        // UIのフィードバック: タイトルを変更し、青色にする
        title.innerText = '📋 プランの編集（ID: ' + plan.plan_id + '）';
        title.style.color = '#3b82f6';
        
        // フォーム位置までスクロール
        window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
      }

      function resetPlanForm() {
        const title = document.getElementById('form-title');
        title.innerText = '新規プラン追加';
        title.style.color = 'inherit';
      }
    </script>

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
      <h3 style="${PAGE_STYLE.sectionTitle}">📋 プラン管理 (${currentShop?.shop_name || '未選択'})</h3>
      
      <form id="plan-form" method="POST" action="/_debug/_admin/settings/plans" style="margin-bottom: 24px; padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e0; border-radius: 12px;">
        <h4 id="form-title" style="margin: 0 0 16px 0; font-size: 0.9rem;">新規プラン追加</h4>
        <input type="hidden" name="action" value="upsert">
        <input type="hidden" name="shop_id" value="${data.selectedShopId}">
        <input type="hidden" name="plan_id" value=""> <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <label style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px;">プラン名</label>
            <input type="text" name="plan_name" placeholder="例: プレミアム60" required style="${PAGE_STYLE.formInput}">
          </div>
          <div>
            <label style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px;">時間 (分)</label>
            <input type="number" name="duration_min" value="60" required style="${PAGE_STYLE.formInput}">
          </div>
          <div>
            <label style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px;">インターバル (分)</label>
            <input type="number" name="buffer_min" value="30" required style="${PAGE_STYLE.formInput}">
          </div>
          <div>
            <label style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px;">価格 (円)</label>
            <input type="number" name="price_amount" placeholder="5000" required style="${PAGE_STYLE.formInput}">
          </div>
        </div>

        <div style="display: flex; gap: 12px; align-items: flex-end;">
          <div style="flex: 1;">
            <label style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px;">プラン説明 (80文字以内)</label>
            <input type="text" name="description" placeholder="プランの概要を入力してください" maxlength="80" style="${PAGE_STYLE.formInput}">
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="submit" style="${PAGE_STYLE.submitBtn}">保存</button>
            <button type="reset" onclick="resetPlanForm()" style="background: #e2e8f0; color: #475569; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
              取消
            </button>
          </div>
        </div>
      </form>

      <div style="display: grid; gap: 8px;">
        ${data.plans.filter(p => p.plan_status !== 'archived').map(p => html`
          <div style="padding: 12px; border: 1px solid #f1f5f9; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: bold; font-size: 0.9rem;">${p.plan_name}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin: 2px 0 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${p.description || '（説明文なし）'}
              </div>
              <small style="color: #94a3b8;">
                ¥${p.price_amount.toLocaleString()} / ${p.duration_min}分 (休憩 ${p.buffer_min}分)
              </small>
            </div>
            
            <div style="display: flex; gap: 12px; align-items: center; margin-left: 16px;">
              <button 
                type="button" 
                onclick='setEditPlan(${JSON.stringify(p)})' 
                style="font-size: 0.75rem; color: #3b82f6; background: white; border: 1px solid #3b82f6; padding: 4px 10px; border-radius: 4px; cursor: pointer;">
                編集
              </button>

              <form method="POST" action="/_debug/_admin/settings/plans" onsubmit="return confirm('このプランをアーカイブしますか？')">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="plan_id" value="${p.plan_id}">
                <button type="submit" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; padding: 4px;">
                  削除
                </button>
              </form>
            </div>
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