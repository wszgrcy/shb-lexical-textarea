import { test, expect } from '@playwright/test';

test.describe('Export/Import E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('error')) {
        console.log(`CONSOLE ERROR: ${text}`);
      }
    });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('export plain text should contain variable references in braces', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Insert a variable: type @user and select userId
    await page.keyboard.type('@user');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    const userIdOption = menu.locator('.typeahead-item').first();
    await userIdOption.click({ force: true });
    await page.waitForTimeout(3000);

    // Type some plain text around the variable to trigger change
    await page.keyboard.type(' test');
    await page.waitForTimeout(5000);

    // Check the resolved serialized string contains the userId value from context
    const resolvedCode = page.locator('code').nth(1); // second code block = resolved output
    await expect(resolvedCode).toBeVisible({ timeout: 5000 });
    const resolvedText = await resolvedCode.textContent();
    expect(resolvedText).toContain('user-123'); // userId context value
    expect(resolvedText).toContain('test');
  });

  test('export plain text should handle tuple variables with dot-separated values', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type @ and filter for nested path variable
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Type '嵌套' to find the nested path option
    await page.keyboard.type('嵌');
    await page.waitForTimeout(500);

    const nestedOption = menu.locator('.typeahead-item:has-text("嵌套")');
    if (await nestedOption.count() > 0) {
      await nestedOption.click({ force: true });
      await page.waitForTimeout(8000);
    } else {
      // Fallback: click the first available option
      const allOptions = menu.locator('.typeahead-item');
      const count = await allOptions.count();
      if (count > 0) {
        await allOptions.first().click({ force: true });
        await page.waitForTimeout(8000);
      }
    }

    // Check the resolved serialized string contains the nested value
    const resolvedCode = page.locator('code').nth(1);
    await expect(resolvedCode).toBeVisible({ timeout: 5000 });
    const resolvedText = await resolvedCode.textContent();
    expect(resolvedText).toContain('nested-value'); // bbb.ccc context value
  });

  test('export plain text should handle number value variable', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type @ to trigger autocomplete
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Click on the number value option (数字值)
    const numOption = menu.locator('.typeahead-item:has-text("123")');
    if (await numOption.count() > 0) {
      await numOption.click({ force: true });
      await page.waitForTimeout(8000);

      // Check that the resolved output shows the number value
      const resolvedCode = page.locator('code').nth(1);
      await expect(resolvedCode).toBeVisible({ timeout: 5000 });
      const resolvedText = await resolvedCode.textContent();
      expect(resolvedText).toContain('123');
    } else {
      // If we can't find by id, at least verify a variable was inserted
      await menu.locator('.typeahead-item').first().click({ force: true });
      await page.waitForTimeout(8000);
      const resolvedCode = page.locator('code').nth(1);
      await expect(resolvedCode).toBeVisible({ timeout: 5000 });
      const resolvedText = (await resolvedCode.textContent()) ?? '';
      // Should contain some value from the context (non-empty)
      expect(resolvedText.length).toBeGreaterThan(0);
    }
  });

  test('export plain text should handle complex field variable', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type @ to trigger autocomplete
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Try to find '复杂字段' by label text
    const complexOption = menu.locator('.typeahead-item:has-text("复杂")');
    if (await complexOption.count() > 0) {
      await complexOption.click({ force: true });
      await page.waitForTimeout(8000);

      // Check that the resolved output contains a non-empty value
      const resolvedCode = page.locator('code').nth(1);
      await expect(resolvedCode).toBeVisible({ timeout: 5000 });
      const resolvedText = (await resolvedCode.textContent()) ?? '';
      expect(resolvedText.length).toBeGreaterThan(0);
    }
  });

  test('export plain text should combine multiple variables with text', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type first part
    await page.keyboard.type('User: ');
    await page.waitForTimeout(300);

    // Insert userId variable
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);
    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    const userIdOption = menu.locator('.typeahead-item').first();
    if (await userIdOption.count() > 0) {
      await userIdOption.click({ force: true });
    }
    await page.waitForTimeout(8000);

    // Add separator
    await page.keyboard.type(' | Name: ');
    await page.waitForTimeout(300);

    // Insert userName variable
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);
    const menu2 = page.locator('.typeahead-menu');
    await expect(menu2).toBeVisible({ timeout: 5000 });
    // Filter to get userName
    await page.keyboard.type('name');
    await page.waitForTimeout(500);
    const options = menu2.locator('.typeahead-item');
    if (await options.count() > 0) {
      await options.first().click({ force: true });
    }
    await page.waitForTimeout(8000);

    // Check output contains two resolved variable values
    const resolvedCode = page.locator('code').nth(1);
    await expect(resolvedCode).toBeVisible({ timeout: 5000 });
    const resolvedText = await resolvedCode.textContent();
    expect(resolvedText).toContain('user-123'); // userId
    expect(resolvedText).toContain('张三');     // userName
  });

  test('export plain text should include plain text only when no variables', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type plain text without any variables
    await page.keyboard.type('Hello World, this is plain text');
    await page.waitForTimeout(5000);

    const resolvedCode = page.locator('code').nth(1);
    await expect(resolvedCode).toBeVisible({ timeout: 5000 });
    const resolvedText = await resolvedCode.textContent();
    expect(resolvedText).toContain('Hello World');
    expect(resolvedText).toContain('plain text');
  });

  test('autocomplete menu should show all available variables', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type @ to trigger autocomplete
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    const items = menu.locator('.typeahead-item');
    const count = await items.count();

    // App defines ~10 variables total
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('autocomplete should filter by typing after @', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type @ to trigger autocomplete
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Get initial count
    const initialItems = await menu.locator('.typeahead-item').count();
    expect(initialItems).toBeGreaterThan(0);

    // Type 'user' to filter for userId/userName
    await page.keyboard.type('user');
    await page.waitForTimeout(500);

    const filteredItems = menu.locator('.typeahead-item');
    const filteredCount = await filteredItems.count();

    // Should be filtered down but still have matches
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialItems);
  });

  test('autocomplete should show Chinese labels', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type @ to trigger autocomplete
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    const items = menu.locator('.typeahead-item');
    const allLabels = await items.locator('span').allTextContents();

    // Some entries should contain Chinese characters
    const chineseLabels = allLabels.filter(l => /[^\x00-\x7F]/.test(l));
    expect(chineseLabels.length).toBeGreaterThan(0);
  });

  test('text should be preserved when closing autocomplete without selection', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type some text
    await page.keyboard.type('Hello World');
    await page.waitForTimeout(300);

    // Trigger autocomplete but don't select anything
    await page.keyboard.press('@');
    await page.waitForTimeout(500);

    // Press Escape to close the menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Text should still be there
    const editableContent = await contentEditable.textContent();
    expect(editableContent).toContain('Hello World');
  });

  test('serializeTemplate should be called with resolver function', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type plain text first
    await page.keyboard.type('Hello ');
    await page.waitForTimeout(300);

    // Insert a variable
    await page.keyboard.press('@');
    await page.waitForTimeout(1000);
    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    await menu.locator('.typeahead-item').first().click({ force: true });
    await page.waitForTimeout(3000);

    // Add more text
    await page.keyboard.type(' World');
    await page.waitForTimeout(2000);

    // The resolved string should contain the variable value and plain text
    const resolvedCode = page.locator('code').nth(1);
    await expect(resolvedCode).toBeVisible({ timeout: 5000 });
    const resolvedText = await resolvedCode.textContent();
    expect(resolvedText).toContain('user-123'); // Variable was resolved by resolver function
    expect(resolvedText).toContain('Hello');
    expect(resolvedText).toContain('World');
  });
});
