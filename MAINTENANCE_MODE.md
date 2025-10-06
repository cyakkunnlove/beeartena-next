# メンテナンスモード設定

サイト全体をメンテナンスモードにして、一時的にアクセスを遮断できます。

## 設定方法

### 1. ローカル環境

`.env.local` の `NEXT_PUBLIC_MAINTENANCE_MODE` を `true` に設定:

```env
NEXT_PUBLIC_MAINTENANCE_MODE=true
```

### 2. Vercel本番環境

Vercelダッシュボードで環境変数を設定:

1. https://vercel.com/your-project/settings/environment-variables にアクセス
2. `NEXT_PUBLIC_MAINTENANCE_MODE` という変数を追加
3. 値を `true` に設定
4. Environment: Production, Preview, Development すべてにチェック
5. Save
6. Redeploy（再デプロイ）が必要です

**CLIで設定する場合:**

```bash
# 本番環境でメンテナンスモードをON
vercel env add NEXT_PUBLIC_MAINTENANCE_MODE production
# 値を入力: true

# 本番環境でメンテナンスモードをOFF
vercel env add NEXT_PUBLIC_MAINTENANCE_MODE production
# 値を入力: false

# 設定後は再デプロイが必要
vercel --prod
```

## メンテナンスモードの解除

環境変数を `false` に設定するか、削除してから再デプロイ:

```env
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

## 動作

- メンテナンスモード有効時: すべてのページが `/system-maintenance` にリダイレクト
- メンテナンスページ自体は常にアクセス可能
- 静的ファイル（画像等）はアクセス可能

## 注意事項

- `NEXT_PUBLIC_` プレフィックスが必要です（クライアント側でも使用するため）
- 設定変更後は必ず再デプロイが必要です
- 管理者も含めすべてのユーザーがアクセスできなくなります
