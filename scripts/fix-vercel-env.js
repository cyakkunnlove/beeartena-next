#!/usr/bin/env node

const { execSync } = require('child_process');

// 修正が必要な環境変数のリスト
const envVars = [
  'ADMIN_PASSWORD',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PROJECT_ID',
  'JWT_SECRET',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_USE_FIREBASE',
  'REDIS_KEY_PREFIX',
];

console.log('Vercel環境変数から改行文字を削除します...\n');

envVars.forEach(envVar => {
  try {
    // 現在の値を取得
    const currentValue = execSync(`vercel env pull -y | grep "^${envVar}=" | cut -d'=' -f2-`, { encoding: 'utf8' }).trim();
    
    if (currentValue) {
      // 改行文字を削除
      const cleanValue = currentValue.replace(/\\n/g, '').replace(/^"|"$/g, '');
      
      console.log(`\n${envVar}:`);
      console.log(`  現在の値: ${currentValue.substring(0, 50)}...`);
      console.log(`  修正後: ${cleanValue.substring(0, 50)}...`);
      
      // 削除して再追加する必要があります
      console.log('  → 環境変数を更新中...');
      
      // 既存の環境変数を削除
      execSync(`vercel env rm ${envVar} production -y`, { stdio: 'ignore' });
      execSync(`vercel env rm ${envVar} preview -y`, { stdio: 'ignore' });
      execSync(`vercel env rm ${envVar} development -y`, { stdio: 'ignore' });
      
      // 新しい値で追加
      execSync(`echo "${cleanValue}" | vercel env add ${envVar} production`, { stdio: 'ignore' });
      execSync(`echo "${cleanValue}" | vercel env add ${envVar} preview`, { stdio: 'ignore' });
      execSync(`echo "${cleanValue}" | vercel env add ${envVar} development`, { stdio: 'ignore' });
      
      console.log('  ✅ 更新完了');
    }
  } catch (error) {
    console.error(`  ❌ ${envVar} の更新に失敗: ${error.message}`);
  }
});

// FIREBASE_ADMIN_PRIVATE_KEY は特別な処理が必要
console.log('\nFIREBASE_ADMIN_PRIVATE_KEY の処理...');
console.log('この環境変数は複数行のため、手動で更新する必要があります。');
console.log('Vercelダッシュボードで直接編集してください。');

console.log('\n\n完了しました！');
console.log('次のステップ:');
console.log('1. Vercelで再デプロイを実行: vercel --prod');
console.log('2. 5-10分待ってから再度テスト');