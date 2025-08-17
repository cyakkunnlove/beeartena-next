// ローカルでFirebase設定を確認
require('dotenv').config({ path: '.env.local' });

console.log('環境変数の確認:');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log('API Key length:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length);
console.log('API Key has newline:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes('\n'));

// 環境変数を直接表示（最初の10文字のみ）
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (apiKey) {
  console.log('API Key first 10 chars:', apiKey.substring(0, 10));
  console.log('API Key last char code:', apiKey.charCodeAt(apiKey.length - 1));
}
