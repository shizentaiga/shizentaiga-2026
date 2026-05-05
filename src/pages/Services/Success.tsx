/**
 * @file Success.tsx
 * @description 決済完了・予約確定後のサンクスページ。
 * [プログラマー向けノート]
 * - このコンポーネントは /services/success で呼び出されます。
 * - セキュリティ上の理由から、sessionId は表示のみに使用し、重要な処理は Webhook 側で行います。
 */

type SuccessProps = {
  sessionId: string;
};

// --- 📋 DISPLAY TEXT (静的文言の設定) ---
// デザイナーやディレクターが文言を修正しやすいよう、上位で定義
const CONTENT = {
  TITLE_EN: "Payment Successful",
  TITLE_JP: "決済が完了しました",
  MESSAGE: "ご予約ありがとうございます。内容を確認後、担当者よりご連絡いたします。",
  ID_LABEL: "SESSION_ID",
  BUTTON_TEXT: "Return to Top",
} as const;

export const SuccessPage = ({ sessionId }: SuccessProps) => {
  
  // --- 🎨 STYLE CLASSES (Tailwind CSS) ---
  // デザイナーがスタイリングに集中できるよう、構造とスタイルを分離して記述
  const styles = {
    container: "max-w-xl mx-auto py-20 px-6 text-center",
    header: "text-xl font-bold text-gray-900 tracking-widest uppercase mb-4",
    message: "text-sm text-gray-500 mb-8",
    idBox: "p-4 bg-gray-50 border border-gray-100 font-mono text-[10px] text-gray-400 mb-10 break-all",
    button: "inline-block border border-black px-8 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
  };

  return (
    <div class={styles.container}>
      {/* メインタイトル */}
      <h2 class={styles.header}>
        {CONTENT.TITLE_EN}
      </h2>
      
      {/* 案内メッセージ */}
      <p class={styles.message}>
        {CONTENT.TITLE_JP}<br />
        {CONTENT.MESSAGE}
      </p>
      
      {/* 開発・照合用 ID表示エリア（URL経由での確認用） */}
      {sessionId && (
        <div class={styles.idBox}>
          {CONTENT.ID_LABEL}: {sessionId}
        </div>
      )}
      
      {/* アクションボタン */}
      <div class="mt-8">
        <a href="/" class={styles.button}>
          {CONTENT.BUTTON_TEXT}
        </a>
      </div>
    </div>
  );
};