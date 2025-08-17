# Vercel環境変数の修正手順

## 問題
Vercel環境変数のすべての値に改行文字 `\n` が含まれており、これが `auth/api-key-not-valid` エラーの原因です。

## 修正方法

### 方法1: Vercel CLIで個別に修正

以下のコマンドを実行して、各環境変数を修正します：

```bash
# 例: NEXT_PUBLIC_FIREBASE_API_KEY の修正
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY production -y
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY preview -y
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY development -y

echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY preview
echo "AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY development
```

### 方法2: Vercelダッシュボードで修正

1. https://vercel.com/dashboard にアクセス
2. プロジェクト「beeartena-next」を選択
3. 「Settings」→「Environment Variables」
4. 各環境変数の編集ボタンをクリック
5. 値の末尾にある改行を削除（見えない場合は、値の最後にカーソルを置いてDeleteキーを押す）
6. 保存

### 修正が必要な環境変数

以下の環境変数から末尾の改行を削除してください：

- ADMIN_PASSWORD
- FIREBASE_ADMIN_CLIENT_EMAIL
- FIREBASE_ADMIN_PROJECT_ID
- JWT_SECRET
- NEXT_PUBLIC_FIREBASE_API_KEY ⭐️ 最重要
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_USE_FIREBASE
- REDIS_KEY_PREFIX
- REDIS_URL

### 特に注意が必要な環境変数

**FIREBASE_ADMIN_PRIVATE_KEY** は複数行の値なので、以下のように設定してください：

1. 値全体をコピー
2. 先頭と末尾の引用符を削除
3. `\n` を実際の改行に置換
4. 保存

## 修正後の確認

1. 環境変数を修正後、再デプロイ：
   ```bash
   vercel --prod
   ```

2. 5-10分待つ

3. デバッグページで確認：
   https://beeartena-next.vercel.app/debug/firebase-auth

## 期待される結果

修正後は `auth/api-key-not-valid` エラーが解消され、ユーザー登録が正常に動作するはずです。