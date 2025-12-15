# 運用チェックリスト（本番/Vercel）

## Redis（推奨）

### 目的
- キャッシュ/レート制限/キューの永続化を安定させる（Vercelの複数インスタンス/再起動でも挙動が崩れにくい）

### 使う環境変数
- `REDIS_URL`（推奨：`rediss://...`）
- `REDIS_KEY_PREFIX`（例：`beeartena`）

補足（任意/高度）:
- `DISABLE_REDIS=true` を入れるとRedis機能を強制OFFにできます（障害時の退避用）。

### 推奨プロバイダ例
- Upstash Redis（Serverless向け）
- Redis Cloud / Render / 自前Redis など

### Vercelでの設定
1. Vercel → Project → Settings → Environment Variables
2. `REDIS_URL` を **Production/Preview** に設定
3. デプロイ（再デプロイ）して反映

確認:
- 本番のログで「Redis host not found…」が出なくなること

## 管理者監査ログ（最小構成）

### 目的
- 「誰が・いつ・どの管理者APIを叩いたか」を残す（トラブル時の追跡用）

### 保存先
- Firestore: `admin_audit_logs` コレクション

### 管理画面
- ` /admin/audit ` に最新ログを表示

