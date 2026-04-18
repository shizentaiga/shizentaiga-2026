/**
 * @file 02_db_check.tsx
 * @description 
 * v4.4 schema対応：結合ロジック修正 & リードタイム表示モデル
 * プラン管理：archived 状態のプランを非表示に設定、プランIDの表示追加
 */

import { Hono } from 'hono';
import { html } from 'hono/html';
import { calculatePossibleSlots } from '../../lib/slot-logic';

type Bindings = { shizentaiga_db: D1Database; }
type Plan = {
  plan_id: string; plan_name: string; duration_min: number;
  buffer_min: number; price_amount: number; plan_status: string;
};

export const test02 = new Hono<{ Bindings: Bindings }>();

const styles = {
  body: "padding: 30px; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; max-width: 1300px; margin: auto; color: #1e293b; line-height: 1.6;",
  header: "background: #0f172a; color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);",
  section: "background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);",
  sectionTitle: "font-size: 0.85rem; font-weight: 800; color: #64748b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;",
  table: "width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.8rem;",
  th: "padding: 12px; border-bottom: 2px solid #f1f5f9; background: #f8fafc; text-align: left; position: sticky; top: 0; z-index: 10;",
  td: "padding: 10px 12px; border-bottom: 1px solid #f1f5f9;",
  badge: (bg: string, text: string) => `background:${bg}; color:${text}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size: 10px; white-space: nowrap;`
};

test02.get('/', async (c) => {
  if (!c.env.shizentaiga_db) return c.text("❌ D1 Connection Error", 500);

  try {
    // 1. マスター取得
    const master = await c.env.shizentaiga_db.prepare(`
      SELECT sh.shop_id, sh.shop_name, st.staff_id, st.staff_display_name, st.min_lead_time_min,
             strftime('%s', 'now') as now_unix,
             datetime('now', '+9 hours') as jst_now
      FROM shops sh
      INNER JOIN staffs st ON sh.shop_id = st.shop_id
      WHERE sh.shop_id = 'shp_zenyu' LIMIT 1
    `).first<any>();

    if (!master) return c.html(html`<div style="padding:20px;">⚠️ Master data not found.</div>`);

    // 2. データ取得 (archived を除外)
    const { results: allPlans } = await c.env.shizentaiga_db.prepare(`
      SELECT * FROM plans 
      WHERE shop_id = ? AND plan_status != 'archived' 
      ORDER BY price_amount DESC
    `).bind(master.shop_id).all<Plan>();

    const { results: bookedSlots } = await c.env.shizentaiga_db.prepare(`
      SELECT s.user_email, p.plan_name, p.plan_id, s.date_string, 
             time(s.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst, 
             s.actual_duration_min + s.actual_buffer_min as total_min
      FROM slots s JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.staff_id = ? AND s.booking_status = 'booked' ORDER BY s.start_at_unix ASC
    `).bind(master.staff_id).all<any>();

    const { results: grids } = await c.env.shizentaiga_db.prepare(`
      SELECT sch.date_string, sch.start_at_unix, sch.grid_size_min, time(sch.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst,
             rg.slot_id, p.plan_name as occupied_plan_name
      FROM staff_schedules sch
      LEFT JOIN reservation_grid rg ON sch.schedule_id = rg.schedule_id
      LEFT JOIN slots s ON rg.slot_id = s.slot_id
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE sch.staff_id = ? ORDER BY sch.date_string ASC, sch.start_at_unix ASC
    `).bind(master.staff_id).all<any>();

    // 3. 判定ロジック
    const nowUnix = Number(master.now_unix);
    const leadTimeSec = master.min_lead_time_min * 60;
    const leadDays = (master.min_lead_time_min / 1440).toFixed(1);

    const availableUnixTimes = grids.filter(g => !g.slot_id && (g.start_at_unix > nowUnix + leadTimeSec)).map(g => Number(g.start_at_unix));
    
    const planAvailabilities = allPlans
      .filter(p => p.duration_min > 0)
      .map(p => ({
        planName: p.plan_name,
        planId: p.plan_id,
        possibleSet: new Set(calculatePossibleSlots(availableUnixTimes, p.duration_min + p.buffer_min, grids[0]?.grid_size_min || 30))
      }));

    const groupedGrids = grids.reduce((acc: any, g) => {
      (acc[g.date_string] = acc[g.date_string] || []).push(g);
      return acc;
    }, {});

    return c.html(html`
      <body style="${styles.body}">
        <header style="${styles.header}">
          <div>
            <h1 style="margin:0; font-size:1.5rem; letter-spacing:-0.02em;">Master Integrity <span style="color:#60a5fa">v4.4</span></h1>
            <p style="margin:4px 0 0 0; opacity:0.8; font-size:0.9rem;">
              ${master.shop_name} / ${master.staff_display_name}
              <span style="margin-left:10px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px; font-size:0.75rem;">
                予約締切: ${leadDays}日前相当
              </span>
            </p>
          </div>
          <div style="text-align:right; font-family:ui-monospace,monospace; background:rgba(255,255,255,0.1); padding:10px 15px; border-radius:8px;">
            <small style="opacity:0.6; font-size:0.7rem;">SYSTEM JST</small><br>
            <span style="font-size:1rem; font-weight:bold;">${master.jst_now}</span>
          </div>
        </header>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <section style="${styles.section}">
            <h3 style="${styles.sectionTitle}">📌 Service Plans</h3>
            <div style="display:grid; gap:10px;">
              ${allPlans.map(p => html`
                <div style="padding:12px; border:1px solid #f1f5f9; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:bold; font-size:0.9rem;">
                      ${p.plan_name} <small style="color:#64748b; font-weight:normal;">(${p.plan_id})</small>
                    </div>
                    <small style="color:#64748b;">¥${p.price_amount.toLocaleString()} / ${p.duration_min}分 (+${p.buffer_min})</small>
                  </div>
                  <span style="${styles.badge(p.plan_status === 'active' ? '#dcfce7' : '#f1f5f9', p.plan_status === 'active' ? '#166534' : '#64748b')}">${p.plan_status}</span>
                </div>
              `)}
            </div>
          </section>

          <section style="${styles.section}">
            <h3 style="${styles.sectionTitle}">🗓 Active Reservations</h3>
            <table style="${styles.table}">
              <thead><tr><th style="${styles.th}">User / Plan</th><th style="${styles.th}">Time</th><th style="${styles.th}">Total</th></tr></thead>
              <tbody>
                ${bookedSlots.length > 0 ? bookedSlots.map(s => html`
                  <tr>
                    <td style="${styles.td}">
                      <small>${s.user_email}</small><br>
                      <b>${s.plan_name}</b> <small style="color:#64748b;">(${s.plan_id})</small>
                    </td>
                    <td style="${styles.td}">${s.date_string}<br><b>${s.start_time_jst}</b></td>
                    <td style="${styles.td}">${s.total_min} min</td>
                  </tr>
                `) : html`<tr><td colspan="3" style="${styles.td}; text-align:center; color:#94a3b8;">予約なし</td></tr>`}
              </tbody>
            </table>
          </section>
        </div>

        <section style="${styles.section}">
          <h3 style="${styles.sectionTitle}">⚡️ Availability Logic Grid</h3>
          ${Object.keys(groupedGrids).map(date => html`
            <details open style="margin-bottom:15px; border:1px solid #f1f5f9; border-radius:8px; overflow:hidden;">
              <summary style="padding:12px; background:#f8fafc; cursor:pointer; font-weight:bold; font-size:0.9rem; border-bottom:1px solid #f1f5f9;">
                📅 ${date}
              </summary>
              <table style="${styles.table}">
                <thead>
                  <tr>
                    <th style="${styles.th}; width:120px;">Start Time</th>
                    <th style="${styles.th}; width:180px;">Status</th>
                    ${planAvailabilities.map(pa => html`<th style="${styles.th}; text-align:center;">${pa.planName}<br><small>(${pa.planId})</small></th>`)}
                  </tr>
                </thead>
                <tbody>
                  ${groupedGrids[date].map((g: any) => {
                    const isOccupied = !!g.slot_id;
                    const isPassed = g.start_at_unix <= nowUnix;
                    const isLeadTimeLimit = !isPassed && (g.start_at_unix <= nowUnix + leadTimeSec);
                    let statusLabel = html`<span style="color:#10b981; font-weight:bold;">VACANT</span>`;
                    let rowBg = "transparent";
                    if (isOccupied) { statusLabel = html`<span style="color:#ef4444;">❌ [${g.occupied_plan_name}]</span>`; rowBg = "#fff1f2"; }
                    else if (isPassed) { statusLabel = html`<span style="color:#94a3b8;">PAST</span>`; rowBg = "#f8fafc"; }
                    else if (isLeadTimeLimit) { statusLabel = html`<span style="color:#f59e0b;">CLOSED (LT)</span>`; rowBg = "#fffbeb"; }

                    return html`
                      <tr style="background:${rowBg}">
                        <td style="${styles.td}; font-family:monospace;"><b>${g.start_time_jst}</b></td>
                        <td style="${styles.td}">${statusLabel}</td>
                        ${planAvailabilities.map(pa => html`
                          <td style="${styles.td}; text-align:center;">
                            ${pa.possibleSet.has(Number(g.start_at_unix)) ? html`<span style="${styles.badge('#3b82f6', 'white')}">STARTABLE</span>` : html`<span style="color:#cbd5e0;">-</span>`}
                          </td>
                        `)}
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </details>
          `)}
        </section>
      </body>
    `);
  } catch (e: any) {
    return c.json({ status: "❌ Error", message: e.message }, 500);
  }
});