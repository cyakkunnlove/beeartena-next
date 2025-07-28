import { test, expect } from '@playwright/test'

test.describe('Accessibility Tests', () => {
  test('should pass basic accessibility test', async ({ page }) => {
    await page.goto('/')
    
    // Basic check that page loads
    await expect(page).toHaveTitle(/Beauty/)
  })
})