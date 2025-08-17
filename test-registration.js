// 新規登録テストスクリプト
const testRegistration = async () => {
  const timestamp = Date.now();
  const testData = {
    email: `prod-test-${timestamp}@example.com`,
    password: 'ProdTest123!',
    name: '本番テストユーザー',
    phone: '090-9876-5432'
  };

  console.log('テストデータ:', testData);

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 新規登録成功！');
      console.log('ユーザー情報:', result.user);
      console.log('トークン:', result.token?.substring(0, 20) + '...');
    } else {
      console.log('❌ 新規登録失敗');
      console.log('エラー:', result.error);
    }
  } catch (error) {
    console.error('ネットワークエラー:', error);
  }
};

testRegistration();