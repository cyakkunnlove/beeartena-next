const { chromium } = require('playwright');

async function testRegistrationFlow() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Opening registration page...');
    await page.goto('http://localhost:3000/register');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('Filling out the registration form...');
    
    // Fill out the form
    await page.fill('#name', 'テストユーザー');
    await page.fill('#email', 'test-user-20250731103411@example.com');
    await page.fill('#phone', '090-1234-5678');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    
    // Check the terms agreement
    await page.check('#agreeToTerms');
    
    console.log('Form filled. Submitting...');
    
    // Wait a moment to ensure all fields are filled
    await page.waitForTimeout(1000);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check for any errors or success messages
    const errorElement = await page.locator('.bg-red-50').first().textContent().catch(() => null);
    if (errorElement) {
      console.log('Error occurred:', errorElement);
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after submission:', currentUrl);
    
    // Take screenshot
    await page.screenshot({ path: 'registration-test-result.png' });
    console.log('Screenshot saved as registration-test-result.png');
    
    console.log('Registration test completed');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'registration-test-error.png' });
  } finally {
    await browser.close();
  }
}

// Test the debug page as well
async function testDebugPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Opening debug page...');
    await page.goto('http://localhost:3000/debug/firebase-auth');
    
    await page.waitForLoadState('networkidle');
    
    console.log('Testing Firebase configuration check...');
    await page.click('button:has-text("設定確認")');
    
    await page.waitForTimeout(2000);
    
    // Take screenshot of debug results
    await page.screenshot({ path: 'debug-page-result.png' });
    console.log('Debug page screenshot saved');
    
  } catch (error) {
    console.error('Debug test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run both tests
async function runTests() {
  console.log('Starting registration flow test...');
  await testRegistrationFlow();
  
  console.log('Starting debug page test...');
  await testDebugPage();
  
  console.log('All tests completed');
}

runTests();