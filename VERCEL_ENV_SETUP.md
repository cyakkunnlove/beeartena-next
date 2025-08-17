# Vercel 環境変数設定ガイド

## 重要：Vercelダッシュボードで以下の環境変数を設定してください

### 1. Vercelダッシュボードにアクセス
1. https://vercel.com/dashboard にログイン
2. プロジェクト「beeartena-next」を選択
3. 「Settings」タブをクリック
4. 左メニューから「Environment Variables」を選択

### 2. 以下の環境変数を追加

#### Firebase設定（クライアントサイド）
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBXYa8FeHyHQa0jHRfhZJ4xLYUb4YvFFuA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=beeart-ena.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=beeart-ena
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=beeart-ena.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=47862693911
NEXT_PUBLIC_FIREBASE_APP_ID=1:47862693911:web:f7181ecac113393d5c9c52
```

#### Firebase Admin SDK（サーバーサイド）
```
FIREBASE_ADMIN_PROJECT_ID=beeart-ena
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCzj6EhPr02ypFS\nGTVdFdNzENd3cT5Jal9TO/6FRs09axSbjCRkjnIYafIEc6z01HMcMVT0XIShEG3f\naUrcwDY9HJplhV8+nM9qvCFLjce8UZBk2+Okp+dztgchkZhm8t+vCJT477QHM+J2\ns/g233s2rdBgTDAkZdSx7cE7lSL5uW+6GUvaPoxtAesMndOtOZ9H64qMElwb4Am3\nSK/XeMGxN/uyM1KwbThZ/izeexyghCVkIQkEvn4inFl2wNjyQkXQaMQfmd8gjzAf\nramBafM/uGCCtevBaYxeFGwEiHcNmFsrr8n1++vKRvbC/5Z+ZXPkbzxkFGetV0Sx\nvxVXEDmtAgMBAAECggEAFVmoJoxPskKeydy+eB1+wWlIvWaFKfSQdhSlnFJBWCKx\n1hbxQtWfImECil34vDnAoCMLf2y6xm3uKojaAmqGaHjMsPKNUyQRE5df/BxVGgK2\nwQ9WP39JaXxE18x4ixEo4KaMFBdoWAzmygd3JYsoGuXK55BXjxRemHN1LPD8MiYT\njMlwB0QnWzRrWCQtN0FmayE5WAEQ0Jm62WFizPATfmFbuFA7pnEhM1Xy7zkDPKbF\nGLrwHv1zN5+oyIcjQ5Su23+qAyenwJGeTHaoTSSQTPYKUmK9BnqB+chlFOa53ahU\n4WSiwbOSXvEDVPEiKjrPob8A4kaIRX7Srx8BVRfu8QKBgQDy8TYhmT0g1pSuWjNF\na8QOf6zUJMA86LDSSJTkkwfkQRFJltvoG69GcK/TtICtz+r3vQDBzAfCOX3eZBqI\nkOaLMer02CKcCcaur9mF1d7vYU+ukMvNaulqf017wGWc8rQurltJYcmoEkMSrIM3\n/zFwvu05LQcQAYaVX40MpKNh2QKBgQC9NlFwb40N2UnBVdacZphAbMvlMaS3zxUm\naVLCZy+fev9JTY61Jki1Itdymi+0MW4ApTxnjOUdSCXXud6UffD+mb5dG42z/orp\nit4NTetB1+0Hzm6pybY1V4uxuPK3AaNSjspasHihoEiK+l2VTHbBgZJJWFm42MUq\nDvDjyM4d9QKBgQDh3jdIp5L4q+gR7dTLTzU5kaSanAyK1IBJEag0lyp4IbKz62lK\n9CpSYERonOIiNzOq3vMMOuhfwFnw4Lr2i1l8wo1C1Ivg7QnmsaGYV85sWtndX8vL\nkQGwvOjKDIesks3ItNw0bpExDMGFZBSfhEhwHWKqjN2LGRAKYord3Vf1iQKBgBVD\ndnGBR8PHqH8+q0iWSwPqdhuCsbUqY4EWkwNf3z038FqHicMX01Hv4XBynWvNpkQS\nTbCBZ/obco1EyRu874ldM8R45TrWHzxRq9So7ghPQMcAzvTrwztJZFyLoVMprvYH\nL/xzGotnXN+pdTzjA/GJIyx07lhUnAu29CFVHrzFAoGBAN+8P0ekY3XkWf1f4DEN\nkF3kfwddp7QLSV/mP2aEBA/ZFxYn854KFuann5ihK6WXsp/nsZCRcqfMvL/opAY+\nhOvKiT6bUVAYmIzJXCgyyBGGkOMLWJvZe4GxO4STZJCfydpyYm453FF1ft4Ipd9w\n40CbAhVt25H4jqqYiib54dnq\n-----END PRIVATE KEY-----\n"
```

#### 認証設定
```
JWT_SECRET=beeartena-secret-key-2024-change-this-in-production
ADMIN_PASSWORD=BeeArtEna2024Admin!
```

#### その他の設定
```
NEXT_PUBLIC_USE_FIREBASE=true
NODE_ENV=production
NEXT_PUBLIC_API_URL=
```

#### Redis設定（オプション）
```
REDIS_URL=redis://default:ASkRAAIjcDE2NDM1NGMzNDVlYjc0OTBjOTVmNGI5ZGJhNTg4MjM0MHAxMA@talented-lion-10513.upstash.io:6379
REDIS_KEY_PREFIX=beeartena
```

### 3. 重要な注意事項

1. **FIREBASE_ADMIN_PRIVATE_KEY** を設定する際：
   - 値全体を二重引用符 `"` で囲む
   - 改行文字 `\n` はそのまま含める
   - 最初と最後の改行も含める

2. **環境変数のスコープ**：
   - すべての環境変数を「Production」環境に設定
   - 「Development」と「Preview」にも同じ値を設定することを推奨

3. **設定後の確認**：
   - すべての環境変数を設定後、「Save」ボタンをクリック
   - Vercelが自動的に再デプロイを開始します

### 4. Firebase Console での設定

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト「beeart-ena」を選択
3. **Authentication** → **Settings** → **Authorized domains**
4. 以下のドメインを追加：
   - `beeartena-next-n2x3ib1oh-cyakkunnloves-projects.vercel.app`
   - カスタムドメイン（設定する場合）

### 5. 動作確認

環境変数設定と再デプロイ完了後：
1. https://beeartena-next-n2x3ib1oh-cyakkunnloves-projects.vercel.app にアクセス
2. 新規登録機能をテスト
3. ログイン機能をテスト
4. 予約機能をテスト

## トラブルシューティング

### エラー: "Firebase API key not valid"
- 環境変数のAPIキーが正しく設定されているか確認
- 特に大文字小文字に注意（j が小文字であることを確認）

### エラー: "auth/unauthorized-domain"
- Firebase ConsoleのAuthorized domainsにVercelのドメインが追加されているか確認

### エラー: "Failed to parse private key"
- FIREBASE_ADMIN_PRIVATE_KEYが正しくフォーマットされているか確認
- 改行文字 `\n` が含まれているか確認