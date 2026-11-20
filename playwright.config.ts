import { defineConfig, devices } from '@playwright/test';

const onCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  // Waits for the demo API to be responsive before the first test (see the file for why).
  globalSetup: './src/support/wait-for-api.ts',
  fullyParallel: true,
  forbidOnly: onCI,
  // The target is a shared public demo site, so a retry on CI absorbs the odd slow response.
  // Locally there are no retries: a flaky test should fail in my face.
  retries: onCI ? 1 : 0,
  // Keep the load on the demo site polite.
  workers: onCI ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: onCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
    testIdAttribute: 'data-test',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: /tests\/api\//,
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: /tests\/api\//,
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: /tests\/api\//,
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      testIgnore: /tests\/api\//,
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
