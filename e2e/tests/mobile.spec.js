import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.js';

test('mobile: bottom navigation works and the page does not scroll sideways', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Budgets' }).click();
  await expect(page).toHaveURL(/\/budgets$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
