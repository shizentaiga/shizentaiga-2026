/**
 * src/components/SlotItem.tsx
 * デザイナー編集用ファイル：予約枠の1行分の見た目を管理します。
 */
import { html } from 'hono/html'

interface SlotItemProps {
  date: string;
  time: string;
  status: 'open' | 'full' | 'closed';
  statusText: string;
}

export const SlotItem = ({ date, time, status, statusText }: SlotItemProps) => {
  // デザイン設定（デザイナーがここを書き換えるだけで見た目が変わるようにする）
  const colors = {
    open: { bg: '#1a1a1a', text: '#ffffff' },
    full: { bg: '#eeeeee', text: '#999999' },
    closed: { bg: '#fdf2f2', text: '#e02424' }
  };

  const currentTheme = colors[status] || colors.full;

  return html`
    <li style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f3f4f6; list-style: none;">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 0.9rem; font-weight: 600; color: #111;">${date}</span>
        <span style="font-size: 0.75rem; color: #757575; letter-spacing: 0.05em;">${time}</span>
      </div>
      <div style="
        font-size: 0.7rem; 
        font-weight: 700; 
        padding: 4px 10px; 
        border-radius: 2px; 
        text-transform: uppercase;
        background: ${currentTheme.bg}; 
        color: ${currentTheme.text};
      ">
        ${statusText}
      </div>
    </li>
  `
}