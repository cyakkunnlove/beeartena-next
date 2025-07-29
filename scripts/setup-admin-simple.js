// Firebase CLIがインストールされている環境で実行
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function setupAdmin() {
  console.log('=== Firebase管理者ユーザー簡易セットアップ ===\n');
  
  const projectId = 'beeart-ena';
  const adminEmail = 'admin@beeartena.jp';
  const adminPassword = 'BeeArtEna2024Admin!';
  
  try {
    // 1. 現在のプロジェクトを確認
    console.log('1. Firebaseプロジェクトを確認中...');
    try {
      const { stdout } = await execAsync('firebase use');
      console.log('現在のプロジェクト:', stdout.trim());
      
      if (!stdout.includes(projectId)) {
        console.log(`プロジェクトを ${projectId} に切り替え中...`);
        await execAsync(`firebase use ${projectId}`);
      }
    } catch (error) {
      console.log('プロジェクトを設定中...');
      await execAsync(`firebase use --add ${projectId}`);
    }
    
    // 2. Firebase Emulatorを使用せずに、Firebaseコンソールで作成することを案内
    console.log('\n2. 管理者ユーザーの作成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Firebase CLIでは直接ユーザーを作成できないため、');
    console.log('以下のいずれかの方法で作成してください：\n');
    
    console.log('【方法A】Firebaseコンソールで作成（推奨）');
    console.log('1. 以下のURLにアクセス:');
    console.log(`   https://console.firebase.google.com/project/${projectId}/authentication/users`);
    console.log('2. "Add user"をクリック');
    console.log(`3. Email: ${adminEmail}`);
    console.log(`4. Password: ${adminPassword}`);
    console.log('5. "Add user"をクリック\n');
    
    console.log('【方法B】Firebase Admin SDKを使用');
    console.log('1. サービスアカウントキーをダウンロード:');
    console.log(`   https://console.firebase.google.com/project/${projectId}/settings/serviceaccounts/adminsdk`);
    console.log('2. "Generate new private key"をクリック');
    console.log('3. ダウンロードしたファイルを service-account-key.json として保存');
    console.log('4. scripts/create-admin-user.js を実行\n');
    
    console.log('【方法C】Firebase Authエミュレータを使用（開発環境のみ）');
    console.log('1. firebase init emulators でエミュレータを設定');
    console.log('2. firebase emulators:start でエミュレータを起動');
    console.log('3. http://localhost:9099 でAuth Emulator UIにアクセス');
    console.log('4. ユーザーを作成\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 3. Firestoreルールの確認
    console.log('\n3. Firestoreセキュリティルールの確認');
    console.log('firestore.rules ファイルに管理者権限の設定があることを確認してください。');
    
    // 4. 環境変数の設定を案内
    console.log('\n4. 次のステップ');
    console.log('ユーザー作成後:');
    console.log('1. .env.local で NEXT_PUBLIC_USE_FIREBASE=true に設定');
    console.log('2. npm run dev で開発サーバーを再起動');
    console.log(`3. http://localhost:3000/login でログイン`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    
  } catch (error) {
    console.error('\nエラーが発生しました:', error.message);
    console.error('Firebase CLIがインストールされていることを確認してください。');
    console.error('インストール: npm install -g firebase-tools');
  }
}

// 実行
setupAdmin();