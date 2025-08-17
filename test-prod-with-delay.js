// 環境変数の反映を待ってから本番環境でテスト
const testWithDelay = async () => {
  console.log('環境変数の反映を待っています（30秒）...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const timestamp = Date.now();
  const testData = {
    email: `prod-final-test-${timestamp}@example.com`,
    password: 'FinalTest123!',
    name: '最終本番テスト',
    phone: '090-9999-8888'
  };

  console.log('\nテストデータ:', testData);
  console.log('テスト環境: https://beeartena-next.vercel.app');

  try {
    const response = await fetch('https://beeartena-next.vercel.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('レスポンスステータス:', response.status);
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ 本番環境での新規登録成功！');
      console.log('ユーザー情報:', JSON.stringify(result.user, null, 2));
      console.log('Firebase UID:', result.user.id);
      console.log('登録メール:', result.user.email);
    } else {
      console.log('\n❌ 本番環境での新規登録失敗');
      console.log('エラー:', result.error);
      
      // エラーの詳細分析
      if (result.error.includes('api-key-not-valid')) {
        console.log('\n⚠️  APIキーの問題が継続しています');
        console.log('対処法:');
        console.log('1. Vercelダッシュボードで環境変数を確認');
        console.log('2. APIキーの大文字小文字を再確認（特に "j" が小文字であること）');
        console.log('3. 正しいキー: AIzaSyBXYa8FeHyHQa0jHRfhZJ4xLYUb4YvFFuA');
      }
    }
  } catch (error) {
    console.error('ネットワークエラー:', error);
  }
};

console.log('テスト開始...');
testWithDelay();