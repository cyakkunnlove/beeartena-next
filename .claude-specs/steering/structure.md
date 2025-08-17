# Project Structure - Bee Artena

## Directory Organization

```
beeartena-next/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   │   ├── login/         # ログインページ
│   │   └── register/      # 会員登録ページ
│   ├── admin/             # 管理画面
│   │   ├── dashboard/     # ダッシュボード
│   │   ├── reservations/  # 予約管理
│   │   ├── customers/     # 顧客管理
│   │   ├── points/        # ポイント管理
│   │   ├── contacts/      # 問い合わせ管理
│   │   └── settings/      # 設定管理
│   ├── api/               # API Routes
│   │   ├── auth/          # 認証API
│   │   ├── reservations/  # 予約API
│   │   └── admin/         # 管理API
│   ├── maintenance/       # メンテナンスメニュー
│   ├── mypage/           # マイページ
│   ├── privacy/          # プライバシーポリシー
│   ├── reservation/      # 予約ページ
│   ├── terms/            # 利用規約
│   ├── globals.css       # グローバルスタイル
│   ├── layout.tsx        # ルートレイアウト
│   └── page.tsx          # ホームページ
├── components/            # Reactコンポーネント
│   ├── admin/            # 管理画面コンポーネント
│   ├── auth/             # 認証関連コンポーネント
│   ├── common/           # 共通コンポーネント
│   ├── mypage/           # マイページコンポーネント
│   └── reservation/      # 予約関連コンポーネント
├── lib/                   # ユーティリティとサービス
│   ├── auth/             # 認証関連
│   ├── email/            # メール送信サービス
│   ├── firebase/         # Firebase設定・サービス
│   ├── storage/          # ストレージサービス
│   ├── utils/            # ユーティリティ関数
│   ├── constants.ts      # 定数定義
│   ├── reservationService.ts  # 予約サービス
│   └── types.ts          # TypeScript型定義
├── public/               # 静的ファイル
│   ├── images/           # 画像ファイル
│   └── favicon.ico       # ファビコン
├── scripts/              # ユーティリティスクリプト
│   ├── checkFirebaseData.ts    # Firebaseデータ確認
│   ├── create-admin-user.js    # 管理者作成
│   └── initializeFirebase.ts   # Firebase初期化
├── .claude-specs/        # Claude Code仕様
│   └── steering/         # ステアリングドキュメント
├── .env.local            # 環境変数（ローカル）
├── .eslintrc.json        # ESLint設定
├── .gitignore            # Git除外設定
├── next.config.js        # Next.js設定
├── package.json          # パッケージ定義
├── README.md             # プロジェクト説明
├── tailwind.config.ts    # Tailwind CSS設定
└── tsconfig.json         # TypeScript設定
```

## Code Patterns

### Component Structure
```typescript
// components/[domain]/[ComponentName].tsx
'use client'  // Client Componentの場合

import { useState, useEffect } from 'react'
import { ComponentProps } from '@/lib/types'

interface ComponentNameProps {
  // Props定義
}

export default function ComponentName({ ...props }: ComponentNameProps) {
  // Component実装
  return (
    // JSX
  )
}
```

### API Route Pattern
```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    // ビジネスロジック
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Error message' }, { status: 500 })
  }
}
```

### Service Layer Pattern
```typescript
// lib/services/[serviceName].ts
import { db } from '@/lib/firebase/admin'

export const serviceName = {
  async create(data: DataType): Promise<Result> {
    // 実装
  },
  
  async get(id: string): Promise<Data> {
    // 実装
  },
  
  async update(id: string, data: Partial<DataType>): Promise<Result> {
    // 実装
  },
  
  async delete(id: string): Promise<Result> {
    // 実装
  }
}
```

## Architectural Principles

### 1. Separation of Concerns
- **Pages (app/)**: ルーティングとレイアウト
- **Components**: UI要素の再利用可能な単位
- **Services (lib/)**: ビジネスロジックとデータアクセス
- **Types**: TypeScript型定義の一元管理

### 2. Client/Server Boundary
- Client Components: インタラクティブなUI (`'use client'`)
- Server Components: データフェッチとレンダリング
- API Routes: バックエンドロジック

### 3. Data Flow
```
User Interaction → Client Component → API Route → Service Layer → Firebase
                                                           ↓
                                    Response ← Format ← Data
```

### 4. State Management
- **Local State**: useState/useReducer
- **Global Auth State**: AuthContext
- **Server State**: Firebase + React Query (future)
- **Form State**: Controlled Components

### 5. Error Handling
- Try-catch blocks in async functions
- Error boundaries for component errors
- Consistent error response format
- User-friendly error messages

### 6. Security Layers
1. **Frontend Validation**: 入力検証
2. **API Middleware**: 認証・認可チェック
3. **Firebase Rules**: データアクセス制御
4. **Service Layer**: ビジネスルール適用

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (e.g., `ReservationForm.tsx`)
- **Pages**: kebab-case (e.g., `reservation/page.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE in files

### Code
- **Components**: PascalCase
- **Functions**: camelCase
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **Props Interfaces**: ComponentNameProps

### Git Commits
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: コードスタイル
- refactor: リファクタリング
- test: テスト
- chore: ビルド関連

## Import Order
1. React/Next.js imports
2. Third-party library imports
3. Internal imports (@/ alias)
4. Relative imports
5. Type imports