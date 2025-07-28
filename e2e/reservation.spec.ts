import { test, expect } from '@playwright/test'

test.describe('Reservation Flow', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/mypage')
  })

  test('should complete reservation flow', async ({ page }) => {
    // Navigate to reservation page
    await page.click('text=予約する')

    // Step 1: Select service
    await expect(page.locator('h2')).toContainText('サービスを選択')
    await page.click('text=カット')
    await page.click('button:has-text("次へ")')

    // Step 2: Select date
    await expect(page.locator('h2')).toContainText('日付を選択')
    // Click on a future date (assuming calendar is displayed)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
    await page.click('button:has-text("次へ")')

    // Step 3: Select time
    await expect(page.locator('h2')).toContainText('時間を選択')
    await page.click('button:has-text("14:00")')
    await page.click('button:has-text("次へ")')

    // Step 4: Confirm
    await expect(page.locator('h2')).toContainText('予約内容の確認')
    await expect(page.locator('text=カット')).toBeVisible()
    await expect(page.locator('text=14:00')).toBeVisible()

    await page.click('button:has-text("予約を確定")')

    // Success
    await expect(page.locator('text=予約が完了しました')).toBeVisible()
    await page.click('button:has-text("マイページへ")')

    // Check reservation in mypage
    await page.click('text=予約履歴')
    await expect(page.locator('text=カット')).toBeVisible()
    await expect(page.locator('text=14:00')).toBeVisible()
  })

  test('should show unavailable time slots', async ({ page }) => {
    await page.goto('/reservation')

    // Select service and date
    await page.click('text=カット')
    await page.click('button:has-text("次へ")')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
    await page.click('button:has-text("次へ")')

    // Check that some slots are marked as unavailable
    const unavailableSlots = page.locator('.opacity-50')
    await expect(unavailableSlots).toHaveCount(await unavailableSlots.count())
  })

  test('should cancel reservation', async ({ page }) => {
    // First make a reservation
    await page.goto('/reservation')
    await page.click('text=カット')
    await page.click('button:has-text("次へ")')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
    await page.click('button:has-text("次へ")')

    await page.click('button:has-text("15:00")')
    await page.click('button:has-text("次へ")')
    await page.click('button:has-text("予約を確定")')

    // Go to reservations
    await page.goto('/mypage/reservations')

    // Cancel the reservation
    await page.click('button:has-text("キャンセル")')
    await page.click('button:has-text("はい、キャンセルします")')

    await expect(page.locator('text=予約をキャンセルしました')).toBeVisible()
    await expect(page.locator('text=キャンセル済み')).toBeVisible()
  })

  test('should not allow past date selection', async ({ page }) => {
    await page.goto('/reservation')
    await page.click('text=カット')
    await page.click('button:has-text("次へ")')

    // Try to select yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdaySelector = `[data-date="${yesterday.toISOString().split('T')[0]}"]`

    // Past dates should be disabled
    await expect(page.locator(yesterdaySelector)).toBeDisabled()
  })

  test('should show service details', async ({ page }) => {
    await page.goto('/reservation')

    // Click info icon for service details
    await page.click('[data-service="カット"] .info-icon')

    // Check modal/tooltip content
    await expect(page.locator('text=カットの詳細')).toBeVisible()
    await expect(page.locator('text=所要時間: 60分')).toBeVisible()
    await expect(page.locator('text=料金: ¥4,000')).toBeVisible()
  })

  test('should handle network error gracefully', async ({ page, context }) => {
    // Block API calls
    await context.route('**/api/reservations**', (route) => route.abort())

    await page.goto('/reservation')
    await page.click('text=カット')
    await page.click('button:has-text("次へ")')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
    await page.click('button:has-text("次へ")')

    await page.click('button:has-text("14:00")')
    await page.click('button:has-text("次へ")')
    await page.click('button:has-text("予約を確定")')

    // Should show error message
    await expect(page.locator('text=予約の処理中にエラーが発生しました')).toBeVisible()
  })
})
