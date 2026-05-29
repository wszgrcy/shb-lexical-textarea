import { test, expect } from '@playwright/test';

test.describe('Lexical Editor Paste Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('error')) {
        console.log(`CONSOLE ERROR: ${text}`);
      }
    });
    page.on('pageerror', (err) => {
      console.log(`PAGE ERROR: ${err.message}`);
    });

    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('should split multi-line plain text with \n into multiple paragraphs', async ({
    page,
  }) => {
    const contentEditable = page.locator('[contenteditable="true"]');
    await contentEditable.click();
    await page.waitForTimeout(500);

    // Paste plain text with newlines - simulate as if no HTML is available
    const plainText = '第一行\n第二行\n第三行';

    await page.evaluate((text) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);
      // Don't set text/html to test plain text path

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      });

      const CONTENTEDITABLE = document.querySelector(
        '[contenteditable="true"]',
      );
      if (CONTENTEDITABLE) {
        CONTENTEDITABLE.dispatchEvent(pasteEvent);
      }
    }, plainText);

    await page.waitForTimeout(500);

    // Check the text content
    const innerText = await contentEditable.textContent();
    console.log('Pasted text content:', innerText);

    // The text should contain all lines
    expect(innerText).toContain('第一行');
    expect(innerText).toContain('第二行');
    expect(innerText).toContain('第三行');

    // Check number of paragraph elements - should be 3 separate paragraphs
    const paragraphs = page.locator(
      '.editor-textarea p, .editor-textarea h1, .editor-textarea h2, .editor-textarea h3, .editor-textarea h4, .editor-textarea h5, .editor-textarea h6',
    );
    const count = await paragraphs.count();

    console.log(`Number of paragraph elements: ${count}`);
    // Should have 3 paragraphs (one per line)
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
