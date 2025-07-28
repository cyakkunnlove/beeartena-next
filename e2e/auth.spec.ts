import { test, expect } from '@playwright/test'

test.describe('Authentication Flow @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login form @critical', async ({ page }) => {
    await page.click('text=ログイン')

    await expect(page.locator('h1')).toContainText('会員ログイン')
    await expect(page.locator('input[id="email"]')).toBeVisible()
    await expect(page.locator('input[id="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should login with valid credentials @critical', async ({ page }) => {
    await page.click('text=ログイン')

    await page.fill('input[id="email"]', 'test@example.com')
    await page.fill('input[id="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForURL('/mypage')

    // Check if logged in
    await expect(page.locator('text=マイページ')).toBeVisible()
    await expect(page.locator('text=test@example.com')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.click('text=ログイン')

    await page.fill('input[id="email"]', 'wrong@example.com')
    await page.fill('input[id="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Check error message
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません'),
    ).toBeVisible()

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should validate email format', async ({ page }) => {
    await page.click('text=ログイン')

    await page.fill('input[id="email"]', 'invalid-email')
    await page.fill('input[id="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Check validation error
    await expect(page.locator('text=有効なメールアドレスを入力してください')).toBeVisible()
  })

  test('should logout successfully @critical', async ({ page }) => {
    // First login
    await page.click('text=ログイン')
    await page.fill('input[id="email"]', 'test@example.com')
    await page.fill('input[id="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL('/mypage')

    // Then logout
    await page.click('text=ログアウト')

    // Confirm logout
    await page.click('button:has-text("ログアウトする")')

    // Should redirect to home
    await page.waitForURL('/')
    await expect(page.locator('text=ログイン')).toBeVisible()
  })

  test('should redirect to login when accessing protected page', async ({ page }) => {
    // Try to access mypage without login
    await page.goto('/mypage')

    // Should redirect to login
    await page.waitForURL('/login')
    await expect(page.locator('h1')).toContainText('会員ログイン')
  })

  test('should register new user @critical', async ({ page }) => {
    await page.click('text=新規登録')

    await page.fill('input[id="name"]', 'Test User')
    await page.fill('input[id="email"]', 'newuser@example.com')
    await page.fill('input[id="phone"]', '090-1234-5678')
    await page.fill('input[id="password"]', 'password123')
    await page.fill('input[id="confirmPassword"]', 'password123')

    await page.click('button[type="submit"]')

    // Should redirect to mypage after registration
    await page.waitForURL('/mypage')
    await expect(page.locator('text=Test User')).toBeVisible()
  })

  test('should validate password match in registration', async ({ page }) => {
    await page.click('text=新規登録')

    await page.fill('input[id="name"]', 'Test User')
    await page.fill('input[id="email"]', 'newuser@example.com')
    await page.fill('input[id="phone"]', '090-1234-5678')
    await page.fill('input[id="password"]', 'password123')
    await page.fill('input[id="confirmPassword"]', 'different123')

    await page.click('button[type="submit"]')

    // Check validation error
    await expect(page.locator('text=パスワードが一致しません')).toBeVisible()
  })
})
