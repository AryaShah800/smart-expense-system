import { defineConfig, devices } from '@playwright/test';

// Locally set E2E_CHANNEL=msedge (or chrome) to reuse an installed browser; CI installs chromium.
const channel = process.env.E2E_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  workers: 1, // one shared demo user, so specs run one at a time
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5173', channel, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', testIgnore: /mobile.spec.js/, use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', testMatch: /mobile.spec.js/, use: { ...devices['Pixel 7'], channel } },
  ],
  webServer: [
    {
      command: 'node scripts/e2eServer.js',
      cwd: '../backend',
      url: 'http://localhost:7000/',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: '../client',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
