const adminEmail = 'admin@beeartena.jp';
const adminPassword = 'BeeArtEna2024Admin!';

async function testAdminLogin() {
  console.log('Testing admin login with mock mode...');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
  
  try {
    const response = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    const data = await response.json();
    console.log('\nResponse status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ ログイン成功！');
      console.log('User:', data.user);
      console.log('Token:', data.token ? 'Token received' : 'No token');
    } else {
      console.log('\n❌ ログイン失敗');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// 実行
testAdminLogin();