/**
 * Firebase REST APIを使用してセキュリティルールを更新
 */

const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

async function updateFirestoreRules() {
  try {
    console.log('🔒 Firestoreセキュリティルールを更新中...');
    
    // サービスアカウントキーを読み込む
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account-key.json');
    const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
    
    // 認証クライアントを作成
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const authClient = await auth.getClient();
    
    // ルールファイルを読み込む
    const rulesPath = path.join(__dirname, '..', 'firebase-rules', 'firestore.rules');
    const rulesContent = await fs.readFile(rulesPath, 'utf8');
    
    // Firestore Rules APIを使用してルールを更新
    const firestore = google.firebaserules('v1');
    
    const projectId = 'beeart-ena';
    const releaseRequest = {
      auth: authClient,
      name: `projects/${projectId}/releases/production`,
      requestBody: {
        name: `projects/${projectId}/releases/production`,
        rulesetName: `projects/${projectId}/rulesets/${Date.now()}`,
      }
    };
    
    // まずルールセットを作成
    const rulesetRequest = {
      auth: authClient,
      name: `projects/${projectId}`,
      requestBody: {
        source: {
          files: [{
            name: 'firestore.rules',
            content: rulesContent
          }]
        }
      }
    };
    
    console.log('📝 ルールセットを作成中...');
    const rulesetResponse = await firestore.projects.rulesets.create(rulesetRequest);
    console.log('✅ ルールセットが作成されました');
    
    // リリースを更新
    releaseRequest.requestBody.rulesetName = rulesetResponse.data.name;
    console.log('🚀 ルールをデプロイ中...');
    await firestore.projects.releases.update(releaseRequest);
    
    console.log('✅ Firestoreセキュリティルールが正常に更新されました！');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    
    // 代替案を提示
    console.log('\n📋 手動で更新する場合は、以下のURLにアクセスしてください：');
    console.log('https://console.firebase.google.com/project/beeart-ena/firestore/rules');
    console.log('\n以下のルールをコピー＆ペーストしてください：\n');
    
    const rulesPath = path.join(__dirname, '..', 'firebase-rules', 'firestore.rules');
    const rulesContent = await fs.readFile(rulesPath, 'utf8');
    console.log(rulesContent);
  }
}

// 実行
updateFirestoreRules();