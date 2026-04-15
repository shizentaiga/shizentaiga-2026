# Stripe Webhook 受信準備：まとめ

## 1. ローカル環境のセットアップ (Stripe CLI)
* **インストール**: Mac環境にて `brew install stripe/stripe-cli/stripe` を実行。
* **認証**: `stripe login` コマンドでStripeアカウントとローカルPCを連携。
* **役割**: 本物のStripeサーバーから届く通知を、開発中のローカルPC（localhost:5173）へ中継するトンネルの役割を果たす。

## 2. 環境変数の設定 (.dev.vars)
* **STRIPE_SECRET_KEY**: 
    * Stripeダッシュボード（テスト環境）の `sk_test_...` を設定。
    * プログラムからStripe APIを操作するための「秘密の合言葉」。
* **STRIPE_WEBHOOK_SECRET**: 
    * `stripe listen` コマンド実行時に表示される `whsec_...` を設定。
    * 届いた通知が「本物のStripeから」であることを検証するための署名。
    * **重要**: `STRIPE_SECRET_KEY` とは完全に別物。

## 3. 通信経路の確立（トンネリング）
* **コマンド**: 
    ```bash
    stripe listen --forward-to localhost:5173/webhook
    ```
* **仕組み**: 
    1. Stripeサーバーがイベントを検知。
    2. Stripe CLIがそれを受け取る。
    3. Stripe CLIがローカルの `http://localhost:5173/webhook` へデータを転送（POSTリクエスト）。

## 4. プログラム側（Hono）の受け皿実装
* **実装場所**: `index.tsx` 内の `app.all('*', renderer)` よりも**「上」**に記述。
    * 理由：Honoは上から順にルーティングを評価するため、全リクエストをHTMLとして返そうとする `renderer` に吸い込まれるのを防ぐため。
* **最小実装コード**:
    ```typescript
    app.post('/webhook', async (c) => {
      console.log('Webhook received!');
      return c.text('OK');
    });
    ```

## 5. 動作確認プロセス
1.  `npm run dev` でHonoサーバーを起動（ポート5173）。
2.  `stripe listen` コマンドで待機。
3.  別のターミナルから `stripe trigger checkout.session.completed` を実行。
4.  コンソールに `Webhook received!` と表示されれば「疎通」成功。