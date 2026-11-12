import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AUTH_FILE } from '../../data/testData';

// Fails only on serious and critical WCAG 2.x A/AA violations.
const pages = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/auth/login' },
  { name: 'register', path: '/auth/register' },
  { name: 'contact', path: '/contact' },
  { name: 'hand-tools category', path: '/category/hand-tools' },
];

for (const { name, path } of pages) {
  test(`@regression ${name} page has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
  });
}

test('@regression login form fields are labelled', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('@regression search box can be reached with the keyboard', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('textbox', { name: 'Search' });
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await search.evaluate((el) => el === document.activeElement).catch(() => false);
  }
  expect(reached).toBeTruthy();
});

test.describe('Accessibility for a logged-in customer', () => {
  test.use({ storageState: AUTH_FILE });

  test('@regression cart page has no serious accessibility violations', async ({ page }) => {
    await page.goto('/checkout');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
  });
});
