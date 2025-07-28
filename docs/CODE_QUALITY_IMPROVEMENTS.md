# コード品質改善ガイド

## 概要

このドキュメントでは、BEE ART
ENAプロジェクトのコード品質を向上させるための改善点と推奨事項をまとめています。現在のコードベースは機能的には完成していますが、保守性、拡張性、パフォーマンスの観点から改善の余地があります。

## 優先度別改善項目

### 🔴 高優先度（セキュリティ・安定性に関わる項目）

#### 1. エラーハンドリングの統一

**現状の問題点：**

- エラーハンドリングが各コンポーネントでバラバラ
- ユーザーへのエラーメッセージが不統一

**改善案：**

```typescript
// lib/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// lib/errors/errorHandler.ts
export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError('UNKNOWN_ERROR', error.message)
  }

  return new AppError('UNKNOWN_ERROR', 'An unexpected error occurred')
}

// 使用例
try {
  await someAsyncOperation()
} catch (error) {
  const appError = handleError(error)
  toast.error(appError.message)
}
```

#### 2. 入力値検証の強化

**現状の問題点：**

- フォーム入力の検証が不完全
- SQLインジェクションやXSS攻撃への対策が不十分

**改善案：**

```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

export const userRegistrationSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上必要です')
    .regex(/[A-Z]/, '大文字を1文字以上含める必要があります')
    .regex(/[0-9]/, '数字を1文字以上含める必要があります'),
  name: z
    .string()
    .min(1, '名前を入力してください')
    .max(50, '名前は50文字以内で入力してください'),
  phone: z.string().regex(/^0\d{9,10}$/, '有効な電話番号を入力してください'),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '有効な日付を入力してください'),
})

// 使用例
export async function validateRegistration(data: unknown) {
  try {
    return userRegistrationSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError('VALIDATION_ERROR', error.errors[0].message)
    }
    throw error
  }
}
```

#### 3. 認証・認可の改善

**現状の問題点：**

- JWTトークンの有効期限管理が不十分
- ロールベースアクセス制御の実装が散在

**改善案：**

```typescript
// middleware/auth.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  const pathname = request.nextUrl.pathname

  // 保護されたルートの定義
  const protectedRoutes = {
    '/admin': ['admin'],
    '/mypage': ['customer', 'admin'],
  }

  // 認証チェック
  if (
    !token &&
    Object.keys(protectedRoutes).some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 認可チェック
  if (token) {
    const decodedToken = verifyToken(token.value)
    const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
      pathname.startsWith(route),
    )?.[1]

    if (requiredRoles && !requiredRoles.includes(decodedToken.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return NextResponse.next()
}
```

### 🟡 中優先度（パフォーマンス・保守性に関わる項目）

#### 4. コンポーネントの最適化

**現状の問題点：**

- 不要な再レンダリングが発生
- 大きなコンポーネントが分割されていない

**改善案：**

```typescript
// メモ化の活用
import { memo, useMemo, useCallback } from 'react';

export const CustomerList = memo(({ customers, onSelect }) => {
  const sortedCustomers = useMemo(() =>
    customers.sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );

  const handleSelect = useCallback((customer) => {
    onSelect(customer);
  }, [onSelect]);

  return (
    <div>
      {sortedCustomers.map(customer => (
        <CustomerItem
          key={customer.id}
          customer={customer}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
});

CustomerList.displayName = 'CustomerList';
```

#### 5. API呼び出しの最適化

**現状の問題点：**

- 重複したAPIリクエスト
- キャッシュ戦略の不在

**改善案：**

```typescript
// lib/api/client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      cacheTime: 10 * 60 * 1000, // 10分
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

// hooks/useCustomers.ts
import { useQuery } from '@tanstack/react-query'

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    select: (data) => data.sort((a, b) => b.createdAt - a.createdAt),
  })
}
```

#### 6. 型定義の強化

**現状の問題点：**

- `any`型の使用が多い
- 型定義が不完全な箇所がある

**改善案：**

```typescript
// types/index.ts の改善
export interface User {
  id: string
  email: string
  name: string
  phone: string
  role: UserRole
  points: number
  birthday: string
  lastBirthdayPointsYear?: number
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'customer' | 'admin'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    page: number
    total: number
    limit: number
  }
}

// 使用例
const response: ApiResponse<User[]> = await api.get('/users')
```

### 🟢 低優先度（コード品質・開発効率に関わる項目）

#### 7. テストの実装

**現状の問題点：**

- テストが一切実装されていない

**改善案：**

```typescript
// __tests__/auth.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '@/app/login/page';

describe('LoginPage', () => {
  it('should display error message for invalid credentials', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'invalid@email.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByText('ログイン'));

    await waitFor(() => {
      expect(screen.getByText('メールアドレスまたはパスワードが正しくありません')).toBeInTheDocument();
    });
  });
});
```

#### 8. ロギングシステムの実装

**現状の問題点：**

- console.logが散在
- エラーログの一元管理がない

**改善案：**

```typescript
// lib/logger/index.ts
interface LogContext {
  userId?: string
  action?: string
  metadata?: Record<string, any>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context)
    } else {
      // 本番環境ではロギングサービスに送信
      this.sendToLoggingService('info', message, context)
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context)
    } else {
      this.sendToLoggingService('error', message, {
        ...context,
        error: error?.stack,
      })
    }
  }

  private sendToLoggingService(level: string, message: string, context?: any) {
    // Sentry, LogRocket, DataDogなどに送信
  }
}

export const logger = new Logger()
```

#### 9. コードの重複削除

**現状の問題点：**

- 似たようなコンポーネントが複数存在
- ユーティリティ関数の重複

**改善案：**

```typescript
// components/ui/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  loading,
  emptyMessage = 'データがありません'
}: DataTableProps<T>) {
  if (loading) return <LoadingSpinner />;
  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <table className="w-full">
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index} onClick={() => onRowClick?.(item)}>
            {columns.map(column => (
              <td key={column.key}>
                {column.render ? column.render(item) : item[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## 実装ロードマップ

### Phase 1（1-2週間）

- [ ] エラーハンドリングの統一
- [ ] 入力値検証の強化
- [ ] 認証・認可の改善

### Phase 2（2-3週間）

- [ ] コンポーネントの最適化
- [ ] API呼び出しの最適化
- [ ] 型定義の強化

### Phase 3（3-4週間）

- [ ] テストの実装
- [ ] ロギングシステムの実装
- [ ] コードの重複削除

## パフォーマンス最適化

### 画像最適化

```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

### バンドルサイズ削減

```bash
# Bundle Analyzerの使用
npm install --save-dev @next/bundle-analyzer

# 分析実行
ANALYZE=true npm run build
```

## コーディング規約

### ネーミング規則

- コンポーネント: PascalCase（例: `CustomerList`）
- 関数: camelCase（例: `calculateTotalPrice`）
- 定数: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`）
- ファイル名: kebab-case（例: `customer-list.tsx`）

### ファイル構成

```
components/
  └── CustomerList/
      ├── index.tsx        # メインコンポーネント
      ├── CustomerList.types.ts  # 型定義
      ├── CustomerList.styles.ts # スタイル
      └── CustomerList.test.tsx  # テスト
```

### コミットメッセージ

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイルの変更
refactor: リファクタリング
test: テストの追加・修正
chore: ビルドプロセスや補助ツールの変更
```

## まとめ

これらの改善を段階的に実装することで、より堅牢で保守しやすいコードベースを実現できます。特に高優先度の項目は、システムの安定性とセキュリティに直結するため、早期の対応を推奨します。
