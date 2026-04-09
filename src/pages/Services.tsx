/**
 * @file Services.tsx
 * @description 
 * 予約ページの「全体レイアウト」を統括する親コンポーネント。
 * * ■ 役割と設計思想:
 * 1. サーバーサイド・データ統合: 
 * HonoのSSR（Server Side Rendering）を活用し、DB（Cloudflare D1）から最新の予約空き状況を
 * サーバー内部で直接取得。クライアントサイドでの余分なAPI通信（Round Trip）を最小化する。
 * 2. ページ構造の定義: 
 * ヘッダー、プラン選択、カレンダー、フッターといった再利用可能なUI部品を統合し、
 * ユーザーの意思決定フロー（01.プラン選択 → 02.日程選択）を視覚化する。
 * 3. 疎結合な画面更新（HTMX）: 
 * ページ全体をリロードすることなく、日付選択に伴う「時間枠の一覧」のみを動的に
 * 書き換えるためのインフラ（hx-target等）を構築する。
 * * ■ 運用上の検討課題とリスク（スタートアップフェーズ後の技術負債の整理対象）:
 * 1. 外部CDN依存リスク (Availability Risk):
 * - unpkg.com (HTMX) および cdn.tailwindcss.com が停止・遅延した場合、システムの
 * 主要機能および外観が完全に損なわれる。
 * - 対策案：将来的にnpmパッケージとしてローカルにバンドルし、自社サーバーから配信する。
 * 2. Tailwind Play CDN のパフォーマンス:
 * - 現在は開発効率優先で Play CDN を使用しているが、これは実行時にCSSを生成するため、
 * 本番環境ではビルド済みのCSSを読み込む構成（PSI対策）への移行が推奨される。
 */

import { html, raw } from 'hono/html'

/* --- DATA & CONSTANTS --- */
import { BUSINESS_INFO } from '../constants/info'

/* --- LOGIC --- */
import { generateCalendarData } from '../lib/calendar-logic'

/* --- COMPONENTS --- */
import { ServicePlanList } from '../components/ServicePlanCard'
import { CalendarSection } from '../components/CalendarSection'
import { ConsultantSection } from '../components/ConsultantSection'
import { BookingFooter } from '../components/BookingFooter'

/* --- DB ACCESS --- */
import { getAvailableSlotsFromDB } from '../db/booking-db'

export const Services = async (c: any) => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (サーバーサイドでのデータ準備)
  /* -------------------------------------------------------------------------- */
  const currentDate = new Date();
  
  // カレンダーの「日付の器」を生成（lib/calendar-logic.ts を参照）
  const calendarDays = generateCalendarData(currentDate);
  
  // DBから予約枠データを直接取得（API経由ではなく、Worker内部で完結）
  const rawSlots = await getAvailableSlotsFromDB(c);

  // フロントエンドで扱いやすいように、DBのカラム名を一部調整
  const availableSlots = rawSlots.map(slot => ({ 
    ...slot, 
    date: slot.date_string 
  }));

  // 初期表示（ファーストビュー）で選択状態にする日付の特定
  const firstAvailableDate = availableSlots[0]?.date || "";
  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING (HTML構造の構築)
  /* -------------------------------------------------------------------------- */

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>

    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">Service Booking</h1>
        <p class="text-[10px] text-gray-600 mt-2 tracking-widest">PRIVATE CONSULTATION</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">01. Select Plan</h2>
          ${ServicePlanList(BUSINESS_INFO.services)}
        </section>

        <div id="calendar-container" class="mb-12">
          ${CalendarSection(
            calendarDays, 
            availableSlots, 
            firstAvailableDate, 
            baseYear, 
            baseMonth
          )}
        </div>

        <div id="slot-list-container" class="mb-12"
            hx-get="/services/slots?date=${firstAvailableDate}"
            hx-trigger="load"
        >
            <p class="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                読み込み中...
            </p>
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-sm rounded-lg text-center">
          通信エラーが発生しました。ページを再読み込みしてください。
        </div>

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        /**
         * HTMX ネットワークエラーハンドリング
         * サーバーダウンやタイムアウト時、ユーザーを放置せずエラーを表示する。
         */
        document.body.addEventListener('htmx:responseError', function(evt) {
          const errorDiv = document.getElementById('error-display');
          if (errorDiv) errorDiv.classList.remove('hidden');
        });
      </script>
    </body>
  `
}