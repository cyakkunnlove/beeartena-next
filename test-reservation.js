// 予約テストスクリプト
const testReservation = async () => {
  console.log('予約テスト開始...');
  
  const reservationData = {
    serviceId: '2D',
    serviceName: 'パウダーブロウ',
    price: 20000,
    date: '2025-08-01',
    time: '18:30',
    customerName: 'テスト太郎',
    customerPhone: '090-1234-5678',
    customerEmail: 'test@example.com',
    notes: 'テスト予約です'
  };

  try {
    const response = await fetch('http://localhost:3000/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservationData),
    });

    const result = await response.json();
    
    console.log('レスポンスステータス:', response.status);
    console.log('レスポンスデータ:', result);
    
    if (!response.ok) {
      console.error('エラー:', result.error || result.message);
    }
  } catch (error) {
    console.error('リクエストエラー:', error);
  }
};

// Node.jsで実行する場合
if (typeof window === 'undefined') {
  const fetch = require('node-fetch');
  global.fetch = fetch;
}

testReservation();