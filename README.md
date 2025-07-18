# Bee Artena - アートメイクサロン

アイブロウアートメイク専門サロン「Bee Artena」のウェブアプリケーションです。

## 機能

- 💄 アートメイクメニューと料金の閲覧
- 📅 オンライン予約システム
- 👤 会員登録・ログイン機能
- ⭐ ポイントシステム（5%還元、ランク制度）
- 📱 マイページ（予約履歴、ポイント履歴、プロフィール管理）
- 👨‍💼 管理画面（予約管理、顧客管理、ポイント管理、問い合わせ管理）

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: カスタム実装（bcrypt）
- **データ保存**: LocalStorage（一時的）
- **ホスティング**: Vercel
- **データベース**: PlanetScale（予定）

## 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone [repository-url]
cd beeartena-next

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーは http://localhost:3000 で起動します。

## ビルドとデプロイ

```bash
# プロダクションビルド
npm run build

# ビルドのプレビュー
npm start
```

## 管理者ログイン

- **Email**: admin@beeartena.jp
- **Password**: admin123

## ディレクトリ構造

```
beeartena-next/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理画面
│   ├── mypage/            # マイページ
│   ├── reservation/       # 予約ページ
│   └── ...
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティとサービス
│   ├── auth/             # 認証関連
│   ├── storage/          # データ保存
│   └── types.ts          # TypeScript型定義
└── public/               # 静的ファイル
```

## 今後の実装予定

- PlanetScaleデータベースへの移行
- メール通知機能
- LINE連携
- 決済システム
- 画像アップロード機能

## ライセンス

© 2024 Bee Artena. All rights reserved.# SSH setup completed
