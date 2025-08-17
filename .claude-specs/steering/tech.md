# Technology Stack - Bee Artena

## Architecture Overview

### Frontend Architecture
- **Framework**: Next.js 15.4.1 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Custom React components with Heroicons
- **State Management**: React Context API (AuthContext)
- **Animations**: Framer Motion 12.23.6
- **Calendar**: React Big Calendar 1.19.4
- **Charts**: Recharts 3.1.0

### Backend Architecture
- **Runtime**: Node.js 20.x+
- **API Routes**: Next.js API Routes
- **Authentication**: Firebase Authentication with JWT
- **Database**: Firebase Firestore (NoSQL)
- **Email Service**: Resend API
- **Caching**: Redis (Upstash) with ioredis
- **File Storage**: Local storage with compression (lz-string)

### Infrastructure
- **Hosting**: Vercel (Production)
- **CDN**: Vercel Edge Network
- **SSL**: Automatic via Vercel
- **Domain**: beeartena.jp

## Development Environment

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

### Environment Variables
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Security
JWT_SECRET

# Email Service
RESEND_API_KEY
ADMIN_EMAIL  # カンマ区切りで複数指定可能

# Redis (Optional)
REDIS_URL
```

### Local Development Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm start
```

## Common Commands

### Development
- `npm run dev` - 開発サーバー起動 (localhost:3000)
- `npm run lint` - ESLintによるコード検証
- `npm run lint:fix` - ESLintエラーの自動修正
- `npm run format` - Prettierによるコード整形
- `npm run type-check` - TypeScriptの型チェック

### Testing
- `npm test` - Jestユニットテスト実行
- `npm run test:watch` - テストのウォッチモード
- `npm run test:coverage` - カバレッジレポート生成
- `npm run test:e2e` - Playwrightによるe2eテスト

### Firebase
- `npm run firebase:init` - Firebaseデータ初期化
- `npm run firebase:check` - Firebaseデータ確認
- `npm run firebase:deploy` - Firebase Functionsデプロイ

### Deployment
- `npm run vercel:deploy` - Vercelへのデプロイ（プレビュー）
- `npm run vercel:deploy:prod` - 本番環境へのデプロイ

### Utilities
- `npm run clean` - ビルドキャッシュのクリア
- `npm run analyze` - バンドルサイズ分析

## Port Configuration
- **Development Server**: http://localhost:3000
- **Production**: https://beeartena.jp

## Database Schema

### Collections
1. **users** - 会員情報
   - 認証情報、プロフィール、ポイント、ランク

2. **reservations** - 予約情報
   - 予約詳細、ステータス、料金情報

3. **points** - ポイント履歴
   - 付与・使用履歴、有効期限

4. **contacts** - お問い合わせ
   - カテゴリ別問い合わせ内容

5. **reservation_settings** - 予約設定
   - 営業時間、予約枠、キャンセルポリシー

## Security Considerations

### Authentication
- Firebase Authenticationによる認証
- JWT (Jose)によるセッション管理
- bcryptjsによるパスワードハッシュ化

### Data Protection
- HTTPS通信の強制
- 環境変数による機密情報管理
- Firestore Security Rulesによるアクセス制御

### Best Practices
- XSS対策（React自動エスケープ）
- CSRF対策（SameSite Cookie）
- SQL Injection対策（Firestoreは非SQL）

## Performance Optimization

### Frontend
- Next.js Image Optimizationによる画像最適化
- Code Splittingによるバンドルサイズ削減
- Suspense/Lazy Loadingによる初期表示高速化

### Backend
- Redisキャッシュによる高速レスポンス
- Firestore複合インデックスによるクエリ最適化
- API Route最適化

### Monitoring
- Vercel Analyticsによるパフォーマンス監視
- エラートラッキング（今後実装予定）