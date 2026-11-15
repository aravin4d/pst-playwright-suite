import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures';

// Automated checks catch roughly a third of accessibility problems, so this is a
// safety net, not a sign-off. The gate is "no critical WCAG A/AA violations";
// everything axe finds is attached to the report so lesser issues stay visible.

// Violations that exist in the shop today. They are listed here, not ignored silently:
// each one is a bug to raise, and the test fails the day a *new* critical issue appears.
// Remove an entry once it is fixed and the gate tightens by itself.
const knownIssues: Record<string, string[]> = {
  // The show/hide-password button is an icon with no accessible name.
  login: ['button-name'],
  register: ['button-name'],
};

const pages = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/auth/login' },
  { name: 'register', path: '/auth/register' },
  { name: 'contact', path: '/contact' },
];

for (const { name, path } of pages) {
  test(`${name} page has no new critical accessibility violations`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.getByTestId('nav-home').waitFor();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    await testInfo.attach('axe-violations.json', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
    const known = knownIssues[name] ?? [];
    for (const id of known) testInfo.annotations.push({ type: 'known a11y issue', description: id });

    const critical = results.violations
      .filter((violation) => violation.impact === 'critical' && !known.includes(violation.id))
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} elements)`);
    expect(critical).toEqual([]);
  });
}

test('login form can be completed with the keyboard alone', async ({ page, loginPage }) => {
  await loginPage.goto();

  await loginPage.email.focus();
  await page.keyboard.type('nobody@example.invalid');
  await page.keyboard.press('Tab');
  await expect(loginPage.password).toBeFocused();
  await page.keyboard.type('not-the-password');
  await page.keyboard.press('Enter');

  await expect(loginPage.error).toHaveText('Invalid email or password');
});

test('form fields are tied to their labels', async ({ page, loginPage }) => {
  await loginPage.goto();

  await expect(page.getByLabel('Email address')).toHaveAttribute('data-test', 'email');
  await expect(page.getByLabel('Password', { exact: false }).first()).toHaveAttribute('data-test', 'password');
});
