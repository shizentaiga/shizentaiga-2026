/**
 * @file 02_db_check.tsx
 * @description 
 * 多店舗展開対応：店舗・担当者を最優先表示し、全マスタと予約状況を可視化する統合モニター。
 * 【多店舗デバッグ・フルスペック版】
 */

import { Hono } from 'hono';
import { html } from 'hono/html';

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test02 = new Hono<{ Bindings: Bindings }>();

test02.get('/', async (c) => {
  if (!c.env.shizentaiga_db) {
    return c.text("❌ Error: shizentaiga_db が見つかりません。", 500);
  }

  try {
    // 1. 【最優先】店舗情報・担当者情報の取得
    const master = await c.env.shizentaiga_db.prepare(`
      SELECT 
        sh.shop_id,
        sh.shop_name,
        st.staff_id,
        st.staff_display_name,
        datetime('now', '+9 hours') as jst_now
      FROM shops sh
      INNER JOIN staffs st ON sh.shop_id = st.shop_id
      WHERE sh.shop_id = 'shp_zenyu'
      LIMIT 1
    `).first<any>();

    if (!master) {
      return c.html(html`<div style="padding:20px; color:red;">⚠️ 指定された店舗(shp_zenyu)または担当者が見つかりません。seedを確認してください。</div>`);
    }

    // 2. プラン一覧（3件すべて）
    const { results: plans } = await c.env.shizentaiga_db.prepare(`
      SELECT plan_name, duration_min, buffer_min, price_amount 
      FROM plans 
      WHERE shop_id = ? 
      ORDER BY price_amount ASC
    `).bind(master.shop_id).all<any>();

    // 3. 予約状況（需要）
    const { results: bookedSlots } = await c.env.shizentaiga_db.prepare(`
      SELECT 
        s.slot_id, s.user_email, s.date_string, p.plan_name,
        time(s.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst,
        s.actual_duration_min, s.actual_buffer_min
      FROM slots s
      JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.staff_id = ?
      ORDER BY s.start_at_unix ASC
    `).bind(master.staff_id).all<any>();

    // 4. スケジュールグリッド（供給と占有詳細）
    const { results: scheduleGrids } = await c.env.shizentaiga_db.prepare(`
      SELECT 
        sch.date_string,
        time(sch.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst,
        sch.schedule_id,
        rg.slot_id,
        p.plan_name as occupied_plan_name
      FROM staff_schedules sch
      LEFT JOIN reservation_grid rg ON sch.schedule_id = rg.schedule_id
      LEFT JOIN slots s ON rg.slot_id = s.slot_id
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE sch.staff_id = ?
      ORDER BY sch.date_string ASC, sch.start_at_unix ASC
    `).bind(master.staff_id).all<any>();

    return c.html(html`
      <body style="padding: 30px; font-family: sans-serif; line-height: 1.4; color: #333; max-width: 1000px; margin: auto; background: #f4f7f6;">
        
        <header style="background: #1a202c; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <small style="color: #a0aec0; letter-spacing: 0.1em;">DEBUGGING TARGET</small>
              <h1 style="margin: 0; font-size: 1.5rem; color: #63b3ed;">店舗名: ${master.shop_name}</h1>
              <p style="margin: 5px 0 0 0; font-size: 1.1rem;">担当者: <strong>${master.staff_display_name}</strong></p>
            </div>
            <div style="text-align: right;">
              <small style="color: #a0aec0;">SERVER TIME (JST)</small>
              <div style="font-family: monospace; font-size: 1.1rem;">${master.jst_now}</div>
              <small style="color: #a0aec0;">ID: ${master.shop_id} / ${master.staff_id}</small>
            </div>
          </div>
        </header>

        <div style="display: grid; grid-template-columns: 1fr; gap: 40px;">

          <section>
            <h3 style="font-size: 0.9rem; color: #4a5568; border-bottom: 2px solid #cbd5e0; padding-bottom: 5px; margin-bottom: 15px;">SERVICE PLANS (Master)</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
              ${plans.map(p => html`
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; border-top: 4px solid #4299e1;">
                  <div style="font-weight: bold; font-size: 0.95rem;">${p.plan_name}</div>
                  <div style="font-size: 0.8rem; color: #666; margin-top: 8px;">
                    ${p.duration_min}分 (+${p.buffer_min}分) / <span style="color: #2d3748; font-weight: bold;">¥${p.price_amount.toLocaleString()}</span>
                  </div>
                </div>
              `)}
            </div>
          </section>

          <section>
            <h3 style="font-size: 0.9rem; color: #4a5568; border-bottom: 2px solid #cbd5e0; padding-bottom: 5px; margin-bottom: 15px;">ACTIVE RESERVATIONS (Slots)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; background: white; border-radius: 8px; overflow: hidden;">
              <tr style="background: #edf2f7; text-align: left;">
                <th style="padding: 12px; border: 1px solid #e2e8f0;">User</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Plan</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">DateTime</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Duration+Buf</th>
              </tr>
              ${bookedSlots.length > 0 ? bookedSlots.map(s => html`
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.user_email}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${s.plan_name}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.date_string} <b>${s.start_time_jst}</b></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.actual_duration_min}m + ${s.actual_buffer_min}m</td>
                </tr>
              `) : html`<tr><td colspan="4" style="padding: 20px; text-align: center; color: #a0aec0;">No active bookings.</td></tr>`}
            </table>
          </section>

          <section>
            <h3 style="font-size: 0.9rem; color: #4a5568; border-bottom: 2px solid #cbd5e0; padding-bottom: 5px; margin-bottom: 15px;">AVAILABILITY & CHIP OCCUPANCY</h3>
            <div style="max-height: 400px; overflow-y: auto; background: white; border: 1px solid #e2e8f0; border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                <thead style="position: sticky; top: 0; background: #edf2f7; z-index: 10;">
                  <tr style="text-align: left;">
                    <th style="padding: 10px; border: 1px solid #e2e8f0;">Date / Time</th>
                    <th style="padding: 10px; border: 1px solid #e2e8f0;">Status</th>
                    <th style="padding: 10px; border: 1px solid #e2e8f0;">Occupied Plan</th>
                  </tr>
                </thead>
                <tbody>
                  ${scheduleGrids.map(g => {
                    const isOccupied = !!g.slot_id;
                    return html`
                      <tr style="background: ${isOccupied ? '#fff5f5' : 'transparent'};">
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${g.date_string} <b>${g.start_time_jst}</b></td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: center;">
                          <span style="color: ${isOccupied ? '#c53030' : '#2f855a'}; font-weight: bold; font-size: 0.75rem;">
                            ${isOccupied ? '❌ OCCUPIED' : '✅ VACANT'}
                          </span>
                        </td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">
                          ${isOccupied ? html`<span style="color: #c53030; font-weight: bold;">[${g.occupied_plan_name}]</span>` : html`<span style="color: #cbd5e0;">-</span>`}
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          </section>

        </div>
        
        <footer style="margin-top: 40px; text-align: center; color: #a0aec0; font-size: 0.8rem;">
          DB INTEGRITY MONITOR - MULTI-SHOP READY
        </footer>
      </body>
    `);
  } catch (e: any) {
    return c.json({ status: "❌ SQL Error", message: e.message }, 500);
  }
});