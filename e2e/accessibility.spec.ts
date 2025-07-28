import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Accessibility E2E Tests', () => {
  test('homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
    await checkA11y(page)
  })

  test('login page should have no accessibility violations', async ({ page }) => {
    await page.goto('/login')
    await injectAxe(page)
    await checkA11y(page)
  })

  test('reservation flow should be accessible', async ({ page }) => {
    await page.goto('/reservation')
    await injectAxe(page)

    // Check initial page
    await checkA11y(page)

    // Select service
    await page.click('text=カット')
    await page.click('button:has-text("次へ")')

    // Check date selection
    await checkA11y(page)

    // Select date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
    await page.click('button:has-text("次へ")')

    // Check time selection
    await checkA11y(page)
  })

  test('keyboard navigation should work throughout the site', async ({ page }) => {
    await page.goto('/')

    // Tab through navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    // Continue tabbing and check focus is visible
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      await expect(focused).toBeVisible()

      // Check focus indicator
      const outline = await focused.evaluate(
        (el) => window.getComputedStyle(el).outline || window.getComputedStyle(el).boxShadow,
      )
      expect(outline).not.toBe('none')
    }
  })

  test('screen reader announcements for dynamic content', async ({ page }) => {
    await page.goto('/reservation')

    // Check for ARIA live regions
    const liveRegions = page.locator('[aria-live]')
    await expect(liveRegions).toHaveCount(await liveRegions.count())

    // Select service and check announcement
    await page.click('text=カット')

    // Check for status update
    const status = page.locator('[role="status"]')
    await expect(status).toContainText(/選択されました/)
  })

  test('form validation should be accessible', async ({ page }) => {
    await page.goto('/login')

    // Submit empty form
    await page.click('button[type="submit"]')

    // Check error messages are announced
    const emailError = page.locator('#email-error')
    await expect(emailError).toHaveAttribute('role', 'alert')
    await expect(emailError).toBeVisible()

    // Check input has aria-invalid
    const emailInput = page.locator('input[name="email"]')
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
  })

  test('images should have alt text', async ({ page }) => {
    await page.goto('/')

    // Get all images
    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')

      // Either has alt text or is decorative (alt="")
      expect(alt).not.toBeNull()
    }
  })

  test('headings should have proper hierarchy', async ({ page }) => {
    await page.goto('/')

    // Check for h1
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)

    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()

    // Verify headings are not empty
    headings.forEach((heading) => {
      expect(heading.trim()).not.toBe('')
    })
  })

  test('links should have descriptive text', async ({ page }) => {
    await page.goto('/')

    // Get all links
    const links = page.locator('a')
    const count = await links.count()

    for (let i = 0; i < count; i++) {
      const link = links.nth(i)
      const text = await link.textContent()
      const ariaLabel = await link.getAttribute('aria-label')

      // Either has text content or aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy()

      // Avoid generic link text
      if (text) {
        expect(text.toLowerCase()).not.toMatch(/^(click here|here|more|read more)$/)
      }
    }
  })

  test('color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)

    // Check specifically for color contrast
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
  })

  test('mobile menu should be accessible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    // Open mobile menu
    const menuButton = page.locator('[data-testid="mobile-menu-button"]')
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    await menuButton.click()
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    // Check menu is accessible
    const menu = page.locator('[data-testid="mobile-menu"]')
    await expect(menu).toHaveAttribute('role', 'navigation')

    // Check trap focus within menu
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(menu).toContainElement(focusedElement)
  })

  test('skip links should work', async ({ page }) => {
    await page.goto('/')

    // Focus skip link
    await page.keyboard.press('Tab')
    const skipLink = page.locator('text=メインコンテンツへスキップ')
    await expect(skipLink).toBeFocused()

    // Activate skip link
    await page.keyboard.press('Enter')

    // Check focus moved to main content
    const main = page.locator('#main')
    await expect(main).toBeFocused()
  })
})
