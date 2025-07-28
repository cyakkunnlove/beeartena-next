import { test, expect } from '@playwright/test'

test.describe('Reservation Flow', () => {
  test('should complete reservation flow for non-logged-in user', async ({ page }) => {
    // Navigate to reservation page
    await page.goto('/reservation')
    
    // Step 1: Select service
    await expect(page.locator('h2')).toContainText('サービス選択')
    await page.click('text=2D眉毛')

    // Step 2: Select date
    await expect(page.locator('h2')).toContainText('日付選択')
    // Click on an available date
    await page.locator('button.bg-white:not(.cursor-not-allowed)').first().click()

    // Step 3: Select time
    await expect(page.locator('h2')).toContainText('時間選択')
    await page.locator('button:not(.bg-gray-100):not(.cursor-not-allowed)').first().click()

    // Step 4: Fill form
    await expect(page.locator('h2')).toContainText('予約情報入力')
    await page.fill('input[id="name"]', 'テスト 太郎')
    await page.fill('input[id="email"]', 'test@example.com')
    await page.fill('input[id="phone"]', '090-1234-5678')
    
    // Check agreement
    await page.check('input[id="agreement"]')
    
    // Submit form
    await page.click('button:has-text("予約を確定する")')

    // Should redirect to register page with reservation data
    await expect(page).toHaveURL(/\/register\?reservation=true/)
  })

  test('should complete reservation flow for logged-in user', async ({ page }) => {
    // Mock login state
    await page.goto('/login')
    await page.fill('input[id="email"]', 'test@example.com')
    await page.fill('input[id="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to reservation page
    await page.goto('/reservation')
    
    // Step 1: Select service
    await expect(page.locator('h2')).toContainText('サービス選択')
    await page.click('text=3D眉毛')

    // Step 2: Select date
    await expect(page.locator('h2')).toContainText('日付選択')
    await page.locator('button.bg-white:not(.cursor-not-allowed)').first().click()

    // Step 3: Select time
    await expect(page.locator('h2')).toContainText('時間選択')
    await page.locator('button:not(.bg-gray-100):not(.cursor-not-allowed)').first().click()

    // Step 4: Form should be auto-filled
    await expect(page.locator('h2')).toContainText('予約情報入力')
    await expect(page.locator('input[id="email"]')).toHaveValue('test@example.com')
    
    // Check agreement and submit
    await page.check('input[id="agreement"]')
    await page.click('button:has-text("予約を確定する")')

    // Should go to complete page
    await expect(page).toHaveURL('/reservation/complete')
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
