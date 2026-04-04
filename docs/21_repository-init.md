# 21_repository-init.md

# リポジトリ初期化と開発環境の同期 (Phase 0)

**実施日**: 2026-04-05
**担当者**: 清善 泰賀
**プロジェクト名**: `shizentaiga-2026`

## 1. 概要
本プロジェクト `shizentaiga-2026` の立ち上げにあたり、ローカル開発環境の構築および GitHub リモートリポジトリとの初期同期を実施した記録である。

## 2. 命名戦略とディレクトリ設計
プロジェクト名は、以下の指針に基づき `shizentaiga-2026` に決定した。

- **時系列管理**: 技術スタックの刷新（Hono / Cloudflare Pages / D1）を象徴するため、西暦を付与。
- **一貫性**: ローカルフォルダ名、GitHubリポジトリ名、Cloudflareプロジェクト名を同一名称で統一し、認知負荷を軽減。
- **ドキュメント優先**: プロジェクトルートに `doc/` ディレクトリを配し、実装コードよりも先に「設計思想」と「計画書」を配置する。

## 3. 初期構築手順 (Initial Setup)

### 3.1 ローカル環境の初期化
まずはローカルマシン上に基盤を作成。

```bash
mkdir shizentaiga-2026
cd shizentaiga-2026
mkdir doc
# 計画書 (00_project-plan-v2.md) を配置
```

### 3.2 GitHub リポジトリの接続
GitHub側で空のリポジトリ（`shizentaiga-2026`）を作成後、SSHプロトコルを用いて紐付けを実施。

```bash
# 1. Git初期化
git init

# 2. 資産のステージング
git add .

# 3. 初期コミット (歴史の開始)
git commit -m "chore: project initialization and documentation"

# 4. ブランチ名の正規化
git branch -M main

# 5. リモートの追加 (SSH接続を継承)
git remote add origin git@github.com:shizentaiga/shizentaiga-2026.git

# 6. 初回プッシュ
git push -u origin main
```

## 4. セキュリティと整合性
- **認証方式**: 2026-04-04 に構築した SSH 鍵ペア（`id_ed25519`）を継続利用。パスワード入力を排除し、セキュアな自動プッシュ環境を維持している。
- **除外設定**: macOS 固有の `.DS_Store` や、今後生成される `node_modules` 等の不要ファイルについては、グローバルな `.gitignore` およびプロジェクト別の `.gitignore` で厳密に管理する。

## 5. 次のステップ
本同期の完了をもって、基盤構築フェーズ (Phase 1) へ移行する。
具体的には、`Hono` フレームワークの導入と Cloudflare Pages への初期デプロイを実施予定である。

---
**設計の哲学**: 
「ドキュメントは未完成の思考を固定し、未来の自分への最も誠実な贈り物となる。」