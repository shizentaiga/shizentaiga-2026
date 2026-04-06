/**
 * src/constants/info.ts
 * 【真実の単一源 (Single Source of Truth)】
 * * サイト内で使用する事業者情報、価格、法務文言、URL、予約枠を一括管理します。
 * 修正時の注意：このファイルを書き換えると、サイト内の全表記（Services.tsx等）が連動して変わります。
 */

export const BUSINESS_INFO = {
    // 予約可能枠（手動更新セクション）
  // ⭐️Googleカレンダー連携までの暫定運用。ここを書き換えてデプロイしてください。
  availableSlots: [
    { date: "2026-04-18", time: "10:00 - 13:00", status: "available" },
    { date: "2026-04-25", time: "10:00 - 13:00", status: "available" },
    { date: "2026-05-09", time: "10:00 - 13:00", status: "available" },
    { date: "2026-05-23", time: "10:00 - 13:00", status: "available" },
  ],

  // 基本情報
  brandName: "清善 泰賀 | Taiga Shizen Official",
  sellerName: "善幽（代表：菊池 大輔）",
  representative: "菊池 大輔",
  email: "contact@shizentaiga.com",
  businessHours: "平日 10:00 〜 18:00 (原則、3営業日以内に回答)",
  
  // キャッチコピー（SEO・OGP用）
  tagline: "不完全な論理のその先を、観測する。",
  defaultDesc: "自然科学と数理モデルを基盤に、経営の盲点を外側から観測する個別診断を提供。",

  // 所在地・電話番号（請求時開示の運用）
  address: "請求があった場合に遅滞なく電子メール等で開示いたします。",
  tel: "請求があった場合に遅滞なく電子メール等で開示いたします。",

  // 決済・配送関連
  paymentMethods: ["クレジットカード決済", "銀行振込"],
  paymentTiming: "【カード】ご注文時（即時決済） / 【銀行振込】ご注文日から3日以内",
  deliveryTiming: "予約完了後、指定日時に提供。デジタルコンテンツは決済完了後、即時またはメール送付。",

  // サービスプラン設定
  // Services.tsx でループ処理するために配列形式で定義
  services: [
    {
      id: "individualDiagnosis",
      name: "経営コンサルティング",
      duration: "90分",
      price: 49500,
      description: "課題解決に向けた90分の戦略セッション",
      taxIncluded: true,
      suffix: "" // ← これを追加
    },
    {
      id: "fundingPhase0",
      name: "資金調達プラン 初回相談",
      duration: "60分",
      price: 11000,
      description: "融資・資金繰りに関する専門的なアドバイス",
      taxIncluded: true,
      suffix: "" // ← これを追加
    },
    {
      id: "advisory",
      name: "顧問契約プラン",
      duration: "1ヶ月〜",
      price: 220000,
      description: "継続的な伴走支援により、組織の構造的課題を解決",
      taxIncluded: true,
      suffix: ""
    }
  ],

  // 法務・ポリシー関連の定型文
  policies: {
    cancelPolicy: "予約実施の3日前（72時間前）まで：全額返金または振替を承ります。それ以降：返金・キャンセルには応じられません。",
    disclaimer: "本サービスは特定の成果を保証するものではなく、利用者の自己責任において利用するものとします。",
    privacyBrief: "お預かりした個人情報は、サービス提供および連絡以外の目的には一切使用しません。",
    lastUpdated: "2026-04-06",
  },

  // 外部リンク（SNS等）
  links: {
    note: "https://note.com/taiga_shizen",
    qiita: "https://qiita.com/tshizen2506",
    x: "https://x.com/tshizen202506",
    linkedin: "https://www.linkedin.com/in/taigashizen",
    instagram: "https://www.instagram.com/taiga_shizen",
    listen: "https://listen.style/u/tshizen2506"
  }
} as const;

/**
 * 💡 メンテナンス・マニュアル
 * * 1. 予約枠の更新: availableSlots 配列の中身を書き換えて Push してください。
 * 2. メールの変更: BUSINESS_INFO.email を書き換えてください。
 * 3. 価格の変更: BUSINESS_INFO.services 内の price を変更してください。
 * 4. 所在地の開示: 実際に住所を記載する場合は、address の文字列を書き換えてください。
 */