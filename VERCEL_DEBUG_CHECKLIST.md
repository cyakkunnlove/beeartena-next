# Vercel本番環境デバッグチェックリスト

## 1. 基本的な確認事項

### ページアクセス確認
- [ ] トップページが表示される
- [ ] 新規登録ページ（/register）が表示される
- [ ] ログインページ（/login）が表示される
- [ ] デバッグページ（/debug/firebase-auth）が表示される

### ブラウザコンソール確認
- [ ] JavaScriptエラーがない
- [ ] Firebase設定が正しく読み込まれている
- [ ] 環境変数が読み込まれている

## 2. よくある問題と解決方法

### 問題: "Firebase設定が読み込まれていません"

**原因**: 環境変数が設定されていない
**解決方法**:
1. Vercelダッシュボード → Settings → Environment Variables
2. `VERCEL_ENV_SETUP.md` に記載された環境変数をすべて設定
3. 再デプロイを実行

### 問題: "API key not valid"

**原因**: Firebase APIキーが正しくない
**解決方法**:
1. APIキーの大文字小文字を確認（特に j が小文字であることを確認）
2. 正しいキー: `AIzaSyBXYa8FeHyHQa0jHRfhZJ4xLYUb4YvFFuA`

### 問題: "auth/unauthorized-domain"

**原因**: Vercelドメインが Firebase で許可されていない
**解決方法**:
1. Firebase Console → Authentication → Settings → Authorized domains
2. 以下を追加:
   - `beeartena-next-n2x3ib1oh-cyakkunnloves-projects.vercel.app`
   - `*.vercel.app`

### 問題: "Failed to parse private key"

**原因**: FIREBASE_ADMIN_PRIVATE_KEYのフォーマットエラー
**解決方法**:
1. 値全体を二重引用符で囲む
2. 改行文字 `\n` をそのまま含める
3. コピー＆ペースト時に余分な空白が入らないよう注意

## 3. デバッグ手順

### ステップ1: 環境変数の確認
```bash
# Vercelダッシュボードで確認
Settings → Environment Variables → 各変数が設定されているか確認
```

### ステップ2: ブラウザでの確認
1. https://beeartena-next-n2x3ib1oh-cyakkunnloves-projects.vercel.app/debug/firebase-auth
2. 「設定確認」ボタンをクリック
3. すべての環境変数が「✅」になっているか確認

### ステップ3: APIテスト
1. デバッグページで「APIテスト」ボタンをクリック
2. レスポンスを確認
3. エラーの場合は詳細メッセージを確認

## 4. 緊急時の対処

### モックモードへの切り替え
環境変数で `NEXT_PUBLIC_USE_FIREBASE=false` に設定すると、Firebaseを使用しないモックモードで動作します。

### ログの確認
Vercelダッシュボード → Functions タブでサーバーサイドのログを確認できます。

## 5. 確認後の報告項目

以下の情報を報告してください：
1. どのページでエラーが発生したか
2. ブラウザコンソールのエラーメッセージ
3. ネットワークタブでのAPIレスポンス
4. デバッグページでの環境変数の状態

これらの情報があれば、具体的な解決策を提供できます。