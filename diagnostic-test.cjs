const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  try {
    // Navigate to diagnostics
    console.log('Navigating to diagnostics...');
    await page.goto('http://localhost:4173/#/diagnostics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Check topic selection
    const topics = await page.locator('button').filter({ hasText: /questions available/ }).allTextContents();
    console.log('Topics found:', topics.length);
    console.log('Topics:', topics.join(', '));
    
    // Select all topics
    const selectAllBtn = page.locator('button').filter({ hasText: 'Select All' });
    await selectAllBtn.click();
    await page.waitForTimeout(500);
    
    // Check if Start Diagnostic is enabled
    const startDiagBtn = page.locator('button').filter({ hasText: /Start Diagnostic/ });
    const isDisabled = await startDiagBtn.getAttribute('disabled');
    console.log('Start Diagnostic button disabled:', isDisabled !== null);
    
    if (isDisabled === null) {
      // Click Start Diagnostic
      await startDiagBtn.click();
      await page.waitForTimeout(1000);
      
      // Answer a few questions
      for (let i = 0; i < 3; i++) {
        const questionText = await page.locator('h2').first().textContent();
        console.log('Question:', questionText);
        
        // Find and click an answer option
        const options = page.locator('button').filter({ hasText: /^[A-D] / });
        const count = await options.count();
        if (count > 0) {
          await options.first().click();
          await page.waitForTimeout(500);
          
          // Submit answer
          const submitBtn = page.locator('button').filter({ hasText: 'Submit Answer' });
          await submitBtn.click();
          await page.waitForTimeout(1000);
          
          // Click Next Question if present
          const nextBtn = page.locator('button').filter({ hasText: 'Next Question' });
          if (await nextBtn.count() > 0) {
            await nextBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'C:/Users/zain1/.factory/missions/00f39a90-a18e-4aa0-bea6-c237b2cfe68f/evidence phase3/diagnostic-mode-rerun/playwright-test.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
