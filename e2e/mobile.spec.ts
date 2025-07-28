import { test, expect, devices } from '@playwright/test'

test.use({
  ...devices['iPhone 12'],
})

test.describe('Mobile Experience @smoke', () => {
  test('should show mobile navigation @critical', async ({ page }) => {
    await page.goto('/')

    // Bottom navigation should be visible on mobile
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible()

    // Desktop header navigation should be hidden
    await expect(page.locator('header nav')).toBeHidden()
  })

  test('should navigate using bottom nav', async ({ page }) => {
    await page.goto('/')

    // Test bottom nav links
    await page.locator('[data-testid="bottom-nav"] a[href="/reservation"]').click()
    await expect(page).toHaveURL('/reservation')

    await page.locator('[data-testid="bottom-nav"] a[href="/mypage"]').click()
    await expect(page).toHaveURL('/login') // Should redirect if not logged in

    await page.locator('[data-testid="bottom-nav"] a[href="/"]').click()
    await expect(page).toHaveURL('/')
  })

  test('should show hamburger menu', async ({ page }) => {
    await page.goto('/')

    // Click hamburger menu
    await page.click('[data-testid="mobile-menu-button"]')

    // Menu should slide in
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()

    // Check menu items
    await expect(page.locator('[data-testid="mobile-menu"] text=メニュー')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-menu"] text=料金')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-menu"] text=サロン情報')).toBeVisible()

    // Close menu
    await page.click('[data-testid="mobile-menu-close"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeHidden()
  })

  test('should handle touch gestures', async ({ page }) => {
    await page.goto('/')

    // Test swipeable gallery
    const gallery = page.locator('[data-testid="gallery-swiper"]')
    await expect(gallery).toBeVisible()

    // Swipe to next image
    await gallery.dispatchEvent('touchstart', { touches: [{ clientX: 300, clientY: 200 }] })
    await gallery.dispatchEvent('touchmove', { touches: [{ clientX: 100, clientY: 200 }] })
    await gallery.dispatchEvent('touchend')

    // Check if slide changed
    await expect(page.locator('[data-testid="gallery-slide-2"]')).toBeVisible()
  })

  test('should optimize form inputs for mobile', async ({ page }) => {
    await page.goto('/login')

    // Check input types for mobile keyboards
    const emailInput = page.locator('input[id="email"]')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')

    const phoneInput = page.locator('input[id="phone"]')
    await expect(phoneInput).toHaveAttribute('type', 'tel')
    await expect(phoneInput).toHaveAttribute('autocomplete', 'tel')
  })

  test('should show mobile-optimized buttons', async ({ page }) => {
    await page.goto('/')

    // Check button sizes
    const buttons = page.locator('button')
    const firstButton = buttons.first()

    const box = await firstButton.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44) // Minimum touch target size
  })

  test('should handle offline mode', async ({ page, context }) => {
    await page.goto('/')

    // Go offline
    await context.setOffline(true)

    // Try to navigate
    await page.click('text=予約する')

    // Should show offline message
    await expect(page.locator('text=オフラインです')).toBeVisible()

    // Go back online
    await context.setOffline(false)

    // Retry
    await page.click('button:has-text("再試行")')
    await expect(page).toHaveURL('/reservation')
  })

  test('should lazy load images', async ({ page }) => {
    await page.goto('/')

    // Check that images have lazy loading
    const images = page.locator('img')
    const imageCount = await images.count()

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const loading = await img.getAttribute('loading')

      // Below-the-fold images should lazy load
      const box = await img.boundingBox()
      if (box && box.y > 800) {
        expect(loading).toBe('lazy')
      }
    }
  })

  test('should handle viewport rotation', async ({ page }) => {
    await page.goto('/')

    // Portrait mode
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible()

    // Landscape mode
    await page.setViewportSize({ width: 812, height: 375 })

    // Layout should adjust
    const content = page.locator('main')
    const box = await content.boundingBox()
    expect(box?.width).toBeGreaterThan(600)
  })
})
