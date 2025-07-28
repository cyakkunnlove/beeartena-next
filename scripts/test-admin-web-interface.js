/**
 * 管理者Web画面の動作確認スクリプト
 * puppeteerを使用して実際の管理者画面をテスト
 */

const puppeteer = require('puppeteer')

async function testAdminWebInterface() {
  console.log('🌐 管理者Web画面の動作確認を開始します...\n')

  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    defaultViewport: { width: 1400, height: 900 },
  })

  try {
    const page = await browser.newPage()

    // 1. 管理者ログイン画面へアクセス
    console.log('1. 管理者ログイン画面へアクセス')
    await page.goto('https://beeartena-next.vercel.app/admin/login')
    await page.waitForSelector('input[type="email"]')

    // 2. 管理者アカウントでログイン
    console.log('2. 管理者アカウントでログイン')
    await page.type('input[type="email"]', 'admin@beeartena.jp')
    await page.type('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')

    // ログイン後のリダイレクトを待つ
    await page.waitForNavigation()
    console.log('✅ ログイン成功')

    // 3. ダッシュボードの確認
    console.log('\n3. ダッシュボードの確認')
    await page.waitForSelector('h1')
    const dashboardTitle = await page.$eval('h1', (el) => el.textContent)
    console.log(`ページタイトル: ${dashboardTitle}`)

    // 統計情報の取得
    const stats = await page.$$eval('.stat-card', (cards) =>
      cards.map((card) => ({
        label: card.querySelector('.stat-label')?.textContent,
        value: card.querySelector('.stat-value')?.textContent,
      })),
    )
    console.log('統計情報:', stats)

    // 4. 顧客管理画面へ移動
    console.log('\n4. 顧客管理画面へ移動')
    await page.click('a[href="/admin/customers"]')
    await page.waitForSelector('table')

    // 顧客数の確認
    const customerRows = await page.$$('tbody tr')
    console.log(`顧客数: ${customerRows.length}`)

    // 5. 予約管理画面へ移動
    console.log('\n5. 予約管理画面へ移動')
    await page.click('a[href="/admin/reservations"]')
    await page.waitForSelector('h1')

    // 予約の新規作成ボタンを確認
    const hasNewButton = (await page.$('button:has-text("新規予約")')) !== null
    console.log(`新規予約ボタン: ${hasNewButton ? 'あり' : 'なし'}`)

    // 6. サービス管理画面へ移動
    console.log('\n6. サービス管理画面へ移動')
    await page.click('a[href="/admin/services"]')
    await page.waitForSelector('h1')

    // サービス一覧の確認
    const services = await page.$$eval('.service-item', (items) =>
      items.map((item) => ({
        name: item.querySelector('.service-name')?.textContent,
        price: item.querySelector('.service-price')?.textContent,
      })),
    )
    console.log('登録サービス:', services)

    // 7. システム設定画面へ移動
    console.log('\n7. システム設定画面へ移動')
    await page.click('a[href="/admin/settings"]')
    await page.waitForSelector('h1')

    console.log('\n✅ 管理者画面の基本動作確認完了')

    // スクリーンショットを保存
    await page.screenshot({ path: 'admin-dashboard.png' })
    console.log('スクリーンショットを保存しました: admin-dashboard.png')
  } catch (error) {
    console.error('❌ エラー:', error)

    // エラー時のスクリーンショット
    const page = (await browser.pages())[0]
    await page.screenshot({ path: 'error-screenshot.png' })
    console.log('エラー時のスクリーンショット: error-screenshot.png')
  }

  // ブラウザは開いたままにする（手動確認用）
  console.log('\n⚠️  ブラウザは開いたままです。手動で確認後、閉じてください。')
}

// 実行
testAdminWebInterface().catch(console.error)
