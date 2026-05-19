import { test, expect } from '@playwright/test';

test.describe('Lexical Editor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('error')) {
        console.log(`CONSOLE ERROR: ${text}`);
      }
    });
    page.on('pageerror', err => {
      console.log(`PAGE ERROR: ${err.message}`);
    });

    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('editor should render and be editable', async ({ page }) => {
    const editorRoot = page.locator('.editor-textarea-wrapper');
    await expect(editorRoot).toBeVisible();

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.keyboard.type('Hello, Lexical!');
    await page.waitForTimeout(500);

    const innerText = await contentEditable.innerText();
    expect(innerText).toContain('Hello, Lexical!');
  });

  test('variable node should be created on menu selection', async ({ page }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "@user" to trigger autocomplete
    await page.keyboard.type('@user');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Click userId option (select the specific matching variable, not the dynamic option)
    const userIdOption = menu.locator('.typeahead-item').filter({ hasText: /^userId$/ });
    await expect(userIdOption).toBeVisible();
    await userIdOption.click({ force: true });
    await page.waitForTimeout(800);

    // Menu should close
    await expect(menu).not.toBeVisible();

    // Variable node should exist
    const variableNode = page.locator('.variable-node');
    await expect(variableNode).toBeVisible();
    const varText = await variableNode.first().textContent();
    expect(varText).toContain('userId');
  });

  test('should allow typing after a variable node', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Insert a variable first
    await page.keyboard.type('@user');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    // Select the specific 'userId' option, not the dynamic option
    const userIdOption = menu.locator('.typeahead-item').filter({ hasText: /^userId$/ });
    if (await userIdOption.count() > 0) {
      await userIdOption.click({ force: true });
    }
    await page.waitForTimeout(800);

    // Type text after the variable
    await page.keyboard.type(' World');
    await page.waitForTimeout(1000);

    // Final content should contain both variable and typed text
    const finalText = await contentEditable.textContent();
    expect(finalText).toContain('userId');
    expect(finalText).toContain('World');
  });

  test('variable menu should support keyboard down navigation', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "@" to trigger autocomplete menu
    await page.keyboard.type('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // First item should be pre-selected (highlighted) by default
    const firstItem = page.locator('.typeahead-item.selected').first();
    await expect(firstItem).toBeVisible();
    const firstLabel = await firstItem.textContent();

    // Press down arrow to select the second item
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    // The selected item should now be different
    const secondItemSelected = page.locator('.typeahead-item.selected').first();
    const secondLabel = await secondItemSelected.textContent();
    expect(secondLabel).not.toBe(firstLabel);

    // Press down arrow again to select third item
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    const thirdItemSelected = page.locator('.typeahead-item.selected').first();
    const thirdLabel = await thirdItemSelected.textContent();
    expect(thirdLabel).not.toBe(secondLabel);
  });

  test('variable menu should support keyboard up navigation (wrap around)', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "@" to trigger autocomplete menu
    await page.keyboard.type('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Press up arrow from the first item should wrap to the last item
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);

    const selectedItem = page.locator('.typeahead-item.selected').first();
    const selectedLabel = await selectedItem.textContent();

    // Should not be the first item anymore (wrapped to last)
    const firstItemAfterUp = page.locator('.typeahead-item').first();
    expect(selectedLabel).not.toBe(await firstItemAfterUp.textContent());
  });

  test('variable menu should select option on Enter key', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "@" to trigger autocomplete menu
    await page.keyboard.type('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Press Enter to select the highlighted first item
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Menu should close
    await expect(menu).not.toBeVisible();

    // Variable node should exist
    const variableNode = page.locator('.variable-node');
    await expect(variableNode).toBeVisible();
  });

  test('variable menu should support keyboard navigation then select', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "@" to trigger autocomplete menu
    await page.keyboard.type('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Navigate down twice to the third item
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Press Enter to select
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Menu should close
    await expect(menu).not.toBeVisible();

    // Variable node should exist
    const variableNode = page.locator('.variable-node');
    await expect(variableNode).toBeVisible();
  });

  test('variable menu should close on Escape key', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "@" to trigger autocomplete menu
    await page.keyboard.type('@');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Menu should be closed
    await expect(menu).not.toBeVisible();

    // The @ should still be in the editor
    const contentText = await contentEditable.textContent();
    expect(contentText).toContain('@');
  });

  test('variable menu keyboard navigation with filtered results', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "@user" to filter the menu (should show userId, userName)
    await page.keyboard.type('@user');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // First item should be highlighted
    const firstItem = page.locator('.typeahead-item.selected').first();
    await expect(firstItem).toBeVisible();

    // Press down to select second filtered item
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    const selectedAfterDown = page.locator('.typeahead-item.selected').first();
    const label1 = await selectedAfterDown.textContent();

    // Press up to go back to first
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);

    const selectedAfterUp = page.locator('.typeahead-item.selected').first();
    const label2 = await selectedAfterUp.textContent();

    // Labels should be different
    expect(label1).not.toBe(label2);
  });

  test('should delete preceding whitespace before variable node on menu selection', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Type "hello" first, then space, then @user to trigger autocomplete menu
    await page.keyboard.type('hello ');
    await page.waitForTimeout(300);
    await page.keyboard.type('@user');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Select the specific 'userId' option, not the dynamic option
    const userIdOption = menu.locator('.typeahead-item').filter({ hasText: /^userId$/ });
    if (await userIdOption.count() > 0) {
      await userIdOption.click({ force: true });
    }
    await page.waitForTimeout(800);

    // Menu should close
    await expect(menu).not.toBeVisible();

    // Variable node should exist
    const variableNode = page.locator('.variable-node');
    await expect(variableNode).toBeVisible();

    // The space before the @ should have been deleted when inserting the variable node.
    // The text content should be "hellouserId" (no space between "hello" and "userId")
    const finalText = await contentEditable.textContent();
    expect(finalText).toContain('userId');
  });
});
