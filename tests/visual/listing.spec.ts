import { test, expect } from '@playwright/test';

// Visual regression. The first run creates the baselines.
// Animations are disabled so the comparison stays stable.
const screens = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/auth/login' },
  { name: 'contact', path: '/contact' },
];

for (const { name, path } of screens) {
  test(`@regression ${name} matches the visual baseline`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
}
