import { expect } from '@playwright/test';

export async function openDemo(page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
