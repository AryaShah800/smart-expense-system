import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.js';

test('demo button signs in without OTP and shows a populated dashboard', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening), Demo/);
  await expect(page.getByText('Total spent')).toBeVisible(); // donut centre label
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
});

test('password login is refused for the demo account', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('demo@smartexpense.app');
  await page.getByLabel('Password').fill('Demo@1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('a new expense shows up in the expenses list', async ({ page }) => {
  await openDemo(page);
  await page.goto('/add-transaction');
  await page.getByLabel('Amount').fill('1234');
  await page.getByLabel('Category').selectOption({ label: 'Food' });
  await page.getByLabel('Description (Optional)').fill('e2e lunch');
  await page.getByRole('button', { name: 'Save Transaction' }).click();
  await page.goto('/expenses');
  await expect(page.getByText('e2e lunch')).toBeVisible();
});

test('groups page lists the seeded groups and a balance summary', async ({ page }) => {
  await openDemo(page);
  await page.goto('/groups');
  await expect(page.getByText('Goa Trip')).toBeVisible();
  await expect(page.getByText('Apartment 404')).toBeVisible();
  await page.getByText('Goa Trip').click();
  await expect(page).toHaveURL(/\/groups\/.+/);
});

test('budgets page lists seeded limits', async ({ page }) => {
  await openDemo(page);
  await page.goto('/budgets');
  await expect(page.getByText('Category Budgets')).toBeVisible();
  await expect(page.getByText(/spent/i).first()).toBeVisible();
});
