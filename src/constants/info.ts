/**
 * src/constants/info.ts
 * * サイト内で使用する事業者情報、価格、法務文言、URL、予約枠を一括管理します。
 * 修正時の注意：このファイルを書き換えると、サイト内の全表記（Services.tsx等）が連動して変わります。
 */

// サービスページ用
export const UI_TEXT = {
  SERVICES: {
    TITLE: "Service Booking",
    SUB_TITLE: "PRIVATE CONSULTATION",
    STEP_PLAN: "01. Select Plan",
    ERROR_FETCH: "データの取得中にエラーが発生しました。通信環境を確認し、ページをリロードしてください。"
  }
} as const;

// 特商法ページ用(サービスページでは一部流用)
export const BUSINESS_INFO = {
  // 主にサービスページ用
  shopName: "善幽", // DB(shops.shop_name)と完全一致
  staffName: "清善 泰賀",

  // 基本情報(主に特商法ページ用)
  brandName: "清善 泰賀",
  sellerName: "善幽",
  representative: "菊池 大輔",
  email: "contact@shizentaiga.com",
  businessHours: "平日 10:00 〜 16:00",
  
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

  // 法務・ポリシー関連の定型文
  policies: {
    cancelPolicy: "予約実施の3日前（72時間前）まで：全額返金または振替を承ります。それ以降：返金・キャンセルには応じられません。",
    disclaimer: "本サービスは特定の成果を保証するものではなく、利用者の自己責任において利用するものとします。",
    privacyBrief: "お預かりした個人情報は、サービス提供および連絡以外の目的には一切使用しません。",
    lastUpdated: "2026-05-06",
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
 * * 1. ショップ識別: BUSINESS_INFO.shopName は、DB(shops.shop_name)と完全一致させてください。
 * 2. 予約枠の更新: DB(staff_schedules)側を更新してください。
 * 3. メールの変更: BUSINESS_INFO.email を書き換えてください。
 * 4. 所在地の開示: 実際に住所を記載する場合は、address の文字列を書き換えてください。
 */