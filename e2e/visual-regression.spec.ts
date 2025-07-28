import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test('homepage visual test', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('login page visual test', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('login-page.png')
  })

  test('reservation flow visual test', async ({ page }) => {
    await page.goto('/reservation')
    await page.waitForLoadState('networkidle')
    
    // Service selection screen
    await expect(page).toHaveScreenshot('reservation-service-selection.png')
    
    // Select service and proceed
    await page.click('text=カット')
    await page.click('button:has-text("次へ")')
    
    // Date selection screen
    await expect(page).toHaveScreenshot('reservation-date-selection.png')
  })

  test('mobile view visual test', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    })
  })

  test('dark mode visual test', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
    })
  })

  test('components visual test', async ({ page }) => {
    // Create a test page with components
    await page.goto('/test/components')
    
    // Button states
    const button = page.locator('[data-testid="test-button"]')
    await expect(button).toHaveScreenshot('button-normal.png')
    
    await button.hover()
    await expect(button).toHaveScreenshot('button-hover.png')
    
    await button.focus()
    await expect(button).toHaveScreenshot('button-focus.png')
  })

  test('form validation visual test', async ({ page }) => {
    await page.goto('/login')
    
    // Submit empty form to trigger validation
    await page.click('button[type="submit"]')
    
    // Wait for error messages
    await page.waitForSelector('[role="alert"]')
    
    await expect(page).toHaveScreenshot('form-validation-errors.png')
  })

  test('gallery visual test', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Scroll to gallery section
    await page.locator('[data-testid="gallery-section"]').scrollIntoViewIfNeeded()
    
    await expect(page.locator('[data-testid="gallery-section"]')).toHaveScreenshot('gallery-section.png')
  })

  test('responsive layout visual test', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 812 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
        fullPage: true,
      })
    }
  })

  test('animation states visual test', async ({ page }) => {
    await page.goto('/')
    
    // Disable animations for baseline
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    })
    
    await expect(page).toHaveScreenshot('homepage-no-animations.png')
  })
})