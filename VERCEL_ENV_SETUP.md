# Vercel環境変数設定ガイド

このドキュメントでは、Bee ArtenaをVercelにデプロイする際に必要な環境変数の設定方法を説明します。

## 必要な環境変数

Vercelのダッシュボードで以下の環境変数を設定してください：

### Firebase設定
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### セキュリティ設定
```
JWT_SECRET=your_secure_jwt_secret_key
```

### API設定
```
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app
```

## 設定手順

1. **Vercelダッシュボードにログイン**
   - https://vercel.com にアクセス
   - プロジェクトを選択

2. **Settings → Environment Variablesに移動**
   - プロジェクトの設定ページを開く
   - 左側メニューから「Environment Variables」を選択

3. **環境変数を追加**
   - 各変数について：
     - Key: 変数名（例：`NEXT_PUBLIC_FIREBASE_API_KEY`）
     - Value: 実際の値
     - Environment: Production, Preview, Development を選択

4. **保存して再デプロイ**
   - 全ての変数を追加後、「Save」をクリック
   - デプロイメントを再実行

## Firebase設定の取得方法

1. **Firebaseコンソールにアクセス**
   - https://console.firebase.google.com

2. **プロジェクト設定を開く**
   - プロジェクトを選択
   - 歯車アイコン → プロジェクトの設定

3. **ウェブアプリの設定を確認**
   - 「全般」タブの「マイアプリ」セクション
   - ウェブアプリの設定情報をコピー

## セキュリティに関する注意事項

- `JWT_SECRET`は推測困難な文字列を使用してください
- 本番環境では必ず異なる値を設定してください
- 環境変数の値は公開リポジトリにコミットしないでください

## モックモードについて

Firebaseの設定が完了していない場合、アプリケーションはモックモードで動作します。
本番環境では必ずFirebaseの設定を完了させてください。

## トラブルシューティング

### 環境変数が反映されない場合
1. Vercelのダッシュボードで変数が正しく設定されているか確認
2. デプロイメントを再実行
3. ブラウザのキャッシュをクリア

### Firebaseエラーが発生する場合
1. Firebaseプロジェクトが正しく作成されているか確認
2. 認証とFirestoreが有効になっているか確認
3. セキュリティルールが適切に設定されているか確認