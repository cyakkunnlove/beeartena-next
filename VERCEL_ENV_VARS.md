# Vercel環境変数設定ガイド

Vercelにデプロイする際に設定が必要な環境変数のリストです。

## 1. Firebase設定（公開可能）

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBXYa8FeHyHQa0jHRfhZjJ4xLYUb4YvFFuA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=beeart-ena.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=beeart-ena
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=beeart-ena.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=47862693911
NEXT_PUBLIC_FIREBASE_APP_ID=1:47862693911:web:f7181ecac113393d5c9c52
```

## 2. Firebase Admin SDK（機密情報）

```
FIREBASE_ADMIN_PROJECT_ID=beeart-ena
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCr0E/RAcRsUbTx\ny7lgFNw3sQ22m/NyMAmlnF0LEWpwvO0bAvGa+ecxF9fzKV0AoE+TI607RYFjO/Cm\n1zwbU9ZSNLLUcme1slHpcB5FgfIyM6xUIDWchVpw+JkEW9DHbKCXjIOc38Z3W3FF\n8FZGkQwVJKUqVxNrhxB8M6qPeH3FeWzQIdnqwsf7giz3xQv3HMYja1Xwmpoxkg+9\nniHRMbmh87lsyIeITSF1Z3LJBtqHmDFubBLvkr4wRaIQpgK6U/q8/tExQKgAR0tT\n03lVkm3hz3kUJniOaoL+AoiH8VFIgA2N/Ptqp7qYx5f3Cw3LDs5ClsR3xfA6ijq2\nBxonjx9lAgMBAAECggEABMg1wddm1Zf5mBBHntRoeQwDxHJ3QRVJXh4UcIzXIFUA\nfskNxfaQ2CrgecC2jrWnjqzGcyOhBrd3StbV8gca7ECnaJEtm0mft4ZaxVb+UXuN\nie2NPcfFZ7xiRT7eov+o7Ebpg98uRDSxRKp8OuxpwG3mbfUB/J3EAvJM2+o/3+mQ\nkUQ18JzZzKhsX9dzCv4Wcbjnvp0zWj3/O7AfGBUZPfECpqmbJVGQJ709hEThrLjl\nHo09ftSFe8dbTNDp2MtW0Vy+5WNNer8JFYlyKR/B2QMIYh4ArtPUvlIc0GB7zQ/g\n7SGmUnvzCMD6msrZp+DXAow55EERUDl2ndWl3SYwoQKBgQDyTKVjDaD9IwuElJJQ\nM4N09TKsbyqmP72vWNtDSMs4wNPnf1oErCxK4yi7D30uoiPKBwGy9RPHHVyJLiOR\nwh9fHWOJmGpMnI4++IXokpuDT8JginwL57vuaq+Sd2F2uGrlAld/KwXrzfN9+OO8\nCNHvFOUOgetnmt2/4y91lgqmBQKBgQC1h113TER1RPEgjisW1RaqUHOQjoI8ypzc\nsH9Y7m1bsbX/v8Kgt5AHnUPW5EB6YA8n6tIwKG7aBvf2cOrhqQ9pnvFVQwkcMU1P\nmEpGVYffaRNeGqtUYjcdJ/gUuEFUVx/WgESSgmvavWaALBluuy+i+Yvlfj01spfW\nHGd60i9x4QKBgHmx7U82xSjetSY9yM7nUJspm+3nV7BwS0EKi/XbVdaHYubem8PF\nBeoG9aoeOW12misaIcxUMz7KjHOJ7OuEaGVJSXkOSDV6XCdcg0UwfVMSeDos0+jW\n1xkEFHKn6xfJwEaNSozgevTYV/dpTlhexbIi+Hi04BsFOWLrJCcW2PpRAoGATqDS\nkFD9uhnho+tQqLQl/CGa3PuNWA2fAkyE7J1hyvzfy2ZhREIeZd3tu4/kid0/01d4\nMZnh4hhwoVNpudMDtQk+mWLO+GI2jYp2aZ60msWluPYuTf+4xa1BXKAu0/xk8wFe\nMmPBmd6+Hjh7z6XOzXXv7bjPhInWEMz+2YlfOaECgYEAjT+EXZaWzjn4TndVEqNs\nV8xdgbO/LBM9HyMdRMAPM1Of3IkU6HfFSvqNGDv6hdGhT58c58MARnVfIgbM/7e0\neV7T/wjnMEATMxkq1wVfzjI91Dw2bU7OY6FtiLDRuIyZ55oCY3X9CAkLR4jIQzvj\nebrfRiozFRhtGa5Vnam0cf8=\n-----END PRIVATE KEY-----\n"
```

## 3. 認証設定

```
JWT_SECRET=beeartena-secret-key-2024-change-this-in-production
ADMIN_PASSWORD=BeeArtEna2024Admin!
```

## 4. Firebase使用フラグ

```
NEXT_PUBLIC_USE_FIREBASE=true
NODE_ENV=production
```

## 5. オプション（Redis）

Redisを使用する場合のみ：
```
REDIS_URL=redis://your-redis-url
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## 設定手順

1. Vercelダッシュボードにアクセス
2. プロジェクトの Settings → Environment Variables
3. 上記の環境変数を追加
4. `FIREBASE_ADMIN_PRIVATE_KEY`は改行文字（\n）を含むので注意
5. Production環境に適用されることを確認

## 注意事項

- `NEXT_PUBLIC_`で始まる変数はクライアント側で使用可能
- それ以外の変数はサーバー側のみで使用される
- プライベートキーは必ず秘密にしてください