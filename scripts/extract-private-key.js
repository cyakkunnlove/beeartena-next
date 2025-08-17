#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// JSONファイルを読み込む
const jsonPath = '/Users/takuyakatou/Downloads/beeart-ena-firebase-adminsdk-fbsvc-9faed16d32.json';
const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// private_keyを取得（\nを実際の改行に変換）
const privateKey = jsonContent.private_key.replace(/\\n/g, '\n');

// 一時ファイルに書き出す
const tempPath = path.join(process.cwd(), 'temp-private-key.txt');
fs.writeFileSync(tempPath, privateKey);

console.log('Private key extracted to: temp-private-key.txt');
console.log('Use this file to set FIREBASE_ADMIN_PRIVATE_KEY in Vercel');