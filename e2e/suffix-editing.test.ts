import { test, expect } from '@playwright/test';

test.describe('Variable suffix editing', () => {
  test.use({ storageState: undefined });

  async function createVariableNode(page) {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);
    await page.keyboard.type('@user');
    await page.waitForTimeout(1000);

    const menu = page.locator('.typeahead-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Select userId option (not the dynamic custom option)
    const userIdOption = menu.locator('.typeahead-item').filter({ hasText: /^userId$/ });
    await expect(userIdOption).toBeVisible();
    await userIdOption.click({ force: true });
    await page.waitForTimeout(800);

    // Variable node should exist with editable class
    const variableNode = page.locator('.variable-node').first();
    await expect(variableNode).toBeVisible();
    return variableNode;
  }

  test('should allow adding suffix to a variable node', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    const variableNode = await createVariableNode(page);

    // Click on the variable label to enter edit mode
    await variableNode.locator('.variable-label-editable').click();

    // Suffix input should appear
    const suffixInput = page.locator('.suffix-input');
    await expect(suffixInput).toBeVisible({ timeout: 2000 });
    await expect(suffixInput).toHaveValue('');

    // Type a suffix and press Enter
    await suffixInput.fill('dd.ee');
    await expect(suffixInput).toHaveValue('dd.ee');
    await suffixInput.press('Enter');

    // Edit mode should exit - input should disappear
    await expect(suffixInput).not.toBeVisible();

    // The display label should now include the suffix
    const displayedText = (await variableNode.textContent()).trim();
    expect(displayedText).toContain('userId.dd.ee');
  });

  test('should show existing suffix in input when re-entering edit mode', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    const variableNode = await createVariableNode(page);

    // First edit: add suffix "test123"
    await variableNode.locator('.variable-label-editable').click();
    const suffixInput = page.locator('.suffix-input');
    await expect(suffixInput).toBeVisible({ timeout: 2000 });
    await suffixInput.fill('test123');
    await suffixInput.press('Enter');
    await expect(suffixInput).not.toBeVisible();

    // Verify display updated
    let textAfterFirstEdit = (await variableNode.textContent()).trim();
    expect(textAfterFirstEdit).toContain('test123');

    // Wait for Lexical to stabilize after the update
    await page.waitForTimeout(1000);

    // Re-enter edit mode - should show existing suffix
    await variableNode.locator('.variable-label-editable').click({ force: true });
    await expect(suffixInput).toBeVisible({ timeout: 2000 });
    await expect(suffixInput).toHaveValue('test123');
  });

  test('should remove suffix on empty Enter', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    const variableNode = await createVariableNode(page);

    // Add a suffix first
    await variableNode.locator('.variable-label-editable').click();
    const suffixInput = page.locator('.suffix-input');
    await expect(suffixInput).toBeVisible({ timeout: 2000 });
    await suffixInput.fill('abc');
    await suffixInput.press('Enter');
    await expect(suffixInput).not.toBeVisible();

    // Verify suffix was added
    let textAfterAdd = (await variableNode.textContent()).trim();
    expect(textAfterAdd).toContain('abc');

    // Wait for Lexical to stabilize after the update
    await page.waitForTimeout(500);

    // Re-enter edit mode and clear
    await variableNode.locator('.variable-label-editable').click({ force: true });
    await expect(suffixInput).toBeVisible({ timeout: 2000 });
    await suffixInput.fill('');
    await suffixInput.press('Enter');
    await expect(suffixInput).not.toBeVisible();

    // Verify suffix was removed - the base value should be userId without any suffix
    const afterRemoveText = await variableNode.locator('.variable-label').first().textContent();
    expect(afterRemoveText).toContain('userId');
    expect(afterRemoveText).not.toContain('abc');
  });

  test('should cancel edit on Escape', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    const variableNode = await createVariableNode(page);

    // Add a suffix first
    await variableNode.locator('.variable-label-editable').click();
    const suffixInput = page.locator('.suffix-input');
    await expect(suffixInput).toBeVisible({ timeout: 2000 });
    await suffixInput.fill('cancelme');
    await suffixInput.press('Enter');

    // Verify suffix was added
    let textAfterAdd = (await variableNode.textContent()).trim();
    expect(textAfterAdd).toContain('cancelme');

    // Wait for Lexical to stabilize after the update
    await page.waitForTimeout(500);

    // Re-enter edit mode, type something new, press Escape
    await variableNode.locator('.variable-label-editable').click({ force: true });
    await expect(suffixInput).toBeVisible({ timeout: 2000 });
    await suffixInput.fill('newvalue');
    await suffixInput.press('Escape');

    // Input should disappear (edit mode exited)
    await expect(suffixInput).not.toBeVisible();

    // Original suffix should remain (Cancel should NOT have saved the new value)
    const afterCancelText = await variableNode.locator('.variable-label').first().textContent();
    expect(afterCancelText).toContain('cancelme');
    expect(afterCancelText).not.toContain('newvalue');
  });
});
