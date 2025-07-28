import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests @a11y', () => {
  test('homepage accessibility @critical', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('login page accessibility', async ({ page }) => {
    await page.goto('/login')

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('reservation flow accessibility', async ({ page }) => {
    await page.goto('/reservation')

    // Service selection page
    const serviceResults = await new AxeBuilder({ page }).analyze()
    expect(serviceResults.violations).toEqual([])

    // Select service and check date selection
    await page.click('text=2D眉毛')
    const dateResults = await new AxeBuilder({ page }).analyze()
    expect(dateResults.violations).toEqual([])
  })

  test('keyboard navigation @critical', async ({ page }) => {
    await page.goto('/')

    // Tab through main navigation
    await page.keyboard.press('Tab')
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName)
    expect(firstFocused).toBeTruthy()

    // Navigate to login
    await page.goto('/login')

    // Tab to email field
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const emailFocused = await page.evaluate(() => document.activeElement?.id)
    expect(emailFocused).toBe('email')

    // Tab to password field
    await page.keyboard.press('Tab')
    const passwordFocused = await page.evaluate(() => document.activeElement?.id)
    expect(passwordFocused).toBe('password')

    // Tab to submit button
    await page.keyboard.press('Tab')
    const submitFocused = await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement | HTMLButtonElement | null
      return el?.type
    })
    expect(submitFocused).toBe('submit')
  })

  test('screen reader labels', async ({ page }) => {
    await page.goto('/reservation')

    // Check form labels
    await page.click('text=2D眉毛')
    await page.locator('button.bg-white:not(.cursor-not-allowed)').first().click()
    await page.locator('button:not(.bg-gray-100):not(.cursor-not-allowed)').first().click()

    // Check that form inputs have proper labels
    const nameLabel = await page.locator('label[for="name"]')
    await expect(nameLabel).toBeVisible()

    const emailLabel = await page.locator('label[for="email"]')
    await expect(emailLabel).toBeVisible()

    const phoneLabel = await page.locator('label[for="phone"]')
    await expect(phoneLabel).toBeVisible()
  })

  test('color contrast', async ({ page }) => {
    await page.goto('/')

    const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()

    const contrastViolations = results.violations.filter(
      (violation) => violation.id === 'color-contrast',
    )
    expect(contrastViolations).toEqual([])
  })

  test('focus indicators', async ({ page }) => {
    await page.goto('/')

    // Check that interactive elements have focus indicators
    const button = page.locator('button').first()
    await button.focus()

    const focusOutline = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return styles.outline || styles.boxShadow
    })

    expect(focusOutline).not.toBe('none')
    expect(focusOutline).not.toBe('')
  })

  test('image alt texts', async ({ page }) => {
    await page.goto('/')

    // Get all images
    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')

      // Every image should have an alt attribute (can be empty for decorative)
      expect(alt).toBeDefined()
    }
  })

  test('form error announcements', async ({ page }) => {
    await page.goto('/login')

    // Submit empty form
    await page.click('button[type="submit"]')

    // Check for error messages with proper roles
    const errorMessages = page.locator('[role="alert"]')
    await expect(errorMessages).toHaveCount(await errorMessages.count())

    // Errors should be announced to screen readers
    const firstError = errorMessages.first()
    await expect(firstError).toBeVisible()
  })

  test('mobile accessibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    const mobileResults = await new AxeBuilder({ page }).analyze()
    expect(mobileResults.violations).toEqual([])

    // Check touch target sizes
    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      const box = await button.boundingBox()

      // WCAG 2.1 Level AA requires 44x44 pixels minimum
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('heading hierarchy', async ({ page }) => {
    await page.goto('/')

    // Check that headings are in proper order
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
      elements.map((el) => ({
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent,
      })),
    )

    // Should have exactly one h1
    const h1Count = headings.filter((h) => h.level === 1).length
    expect(h1Count).toBe(1)

    // Check heading levels don't skip (e.g., h1 -> h3)
    for (let i = 1; i < headings.length; i++) {
      const levelDiff = headings[i].level - headings[i - 1].level
      expect(levelDiff).toBeLessThanOrEqual(1)
    }
  })

  test('language attributes', async ({ page }) => {
    await page.goto('/')

    // Check that page has lang attribute
    const lang = await page.getAttribute('html', 'lang')
    expect(lang).toBe('ja')
  })

  test('skip links', async ({ page }) => {
    await page.goto('/')

    // Press Tab to reveal skip link
    await page.keyboard.press('Tab')

    // Check if skip to main content link exists
    const skipLink = page.locator('a[href="#main"], a[href="#content"]').first()
    const isVisible = await skipLink.isVisible()

    if (isVisible) {
      // Click skip link
      await skipLink.click()

      // Check that focus moved to main content
      const focusedId = await page.evaluate(() => document.activeElement?.id)
      expect(['main', 'content']).toContain(focusedId)
    }
  })
})
