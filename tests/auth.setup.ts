import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { AUTH_FILE, users } from '../data/testData';

// Runs once before the browser projects. Logs in through the UI and saves the session.
setup('authenticate customer', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.goto('/auth/login');
  await page.getByLabel('Email address').fill(users.customer.email);
  await page.getByLabel('Password', { exact: false }).first().fill(users.customer.password);
  await page.getByTestId('login-submit').click();
  // After login the site redirects to /account and shows the nav menu.
  await expect(page.getByTestId('nav-menu')).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
