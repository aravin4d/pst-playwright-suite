import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://practicesoftwaretesting.com';

// The setup project logs in once and saves the session. Browser projects depend on it,
// so logged-in tests start from a saved session instead of logging in each time.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['allure-playwright', { outputFolder: 'allure-results' }]],
  use: {
    baseURL: BASE_URL,
    // The live site uses data-test attributes, so getByTestId() reads them directly.
    testIdAttribute: 'data-test',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      grep: /@mobile/,
    },
  ],
});
