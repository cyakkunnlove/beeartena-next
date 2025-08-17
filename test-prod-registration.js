// 本番環境での新規登録テストスクリプト
const testProdRegistration = async () => {
  const timestamp = Date.now();
  const testData = {
    email: `vercel-test-${timestamp}@example.com`,
    password: 'VercelTest123!',
    name: 'Vercel本番テスト',
    phone: '090-1234-5678'
  };

  console.log('テストデータ:', testData);
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
      console.log('✅ 本番環境での新規登録成功！');
      console.log('ユーザー情報:', result.user);
      console.log('トークン:', result.token?.substring(0, 20) + '...');
    } else {
      console.log('❌ 本番環境での新規登録失敗');
      console.log('エラー:', result.error);
      console.log('詳細:', result);
    }
  } catch (error) {
    console.error('ネットワークエラー:', error);
  }
};

testProdRegistration();