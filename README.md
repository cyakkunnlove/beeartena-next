# Bee Artena - アートメイクサロン

アイブロウアートメイク専門サロン「Bee Artena」のウェブアプリケーションです。

## 機能

- 💄 アートメイクメニューと料金の閲覧（モニター価格対応）
- 📅 オンライン予約システム
- 👤 会員登録・ログイン機能（Firebase Authentication）
- ⭐ ポイントシステム（5%還元、ランク制度）
- 📱 マイページ（予約履歴、ポイント履歴、プロフィール管理）
- 👨‍💼 管理画面（予約管理、顧客管理、ポイント管理、問い合わせ管理）
- 📧 メール通知機能（予約確認・キャンセル通知）

## 技術スタック

- **フレームワーク**: Next.js 15.4.1 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: Firebase Authentication
- **データベース**: Firebase Firestore
- **メール配信**: Resend
- **キャッシュ**: Redis (Upstash)
- **ホスティング**: Vercel

## 開発環境のセットアップ

1. **リポジトリのクローン**
```bash
git clone [repository-url]
cd beeartena-next
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
`.env.local`ファイルを作成し、以下の環境変数を設定：
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# その他
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_api_key
ADMIN_EMAIL=admin@example.com  # 複数の場合: admin1@example.com,admin2@example.com
```

4. **開発サーバーの起動**
```bash
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

- LINE連携
- 決済システム（Stripe）
- 画像アップロード機能（施術前後の写真管理）
- SMS通知機能
- Google カレンダー連携

## ライセンス

© 2024 Bee Artena. All rights reserved.# SSH setup completed
