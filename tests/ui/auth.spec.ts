import { test, expect } from '../../src/fixtures';

test.describe('Sign in', () => {
  test('customer signs in through the form and lands on My account @smoke', async ({
    loginPage,
    accountPage,
    header,
    customer,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.signIn(customer.email, customer.password);

    await expect(page).toHaveURL(/\/account$/);
    await expect(accountPage.title).toHaveText('My account');
    await expect(header.userMenu).toBeVisible();
    await expect(header.signIn).toBeHidden();
  });

  test('wrong credentials are rejected without saying which part was wrong', async ({ loginPage, page }) => {
    await loginPage.goto();
    // An address that cannot exist, so repeated runs never lock a real account.
    await loginPage.signIn('nobody@example.invalid', 'not-the-password');

    await expect(loginPage.error).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('empty form asks for both fields', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.submit.click();

    await expect(loginPage.emailError).toHaveText('Email is required');
    await expect(loginPage.passwordError).toHaveText('Password is required');
  });

  test('malformed email and too-short password are caught before any request is sent', async ({
    loginPage,
    page,
  }) => {
    let loginCalls = 0;
    await page.route('**/users/login', (route) => {
      loginCalls += 1;
      return route.continue();
    });

    await loginPage.goto();
    await loginPage.signIn('not-an-email', 'x');

    await expect(loginPage.emailError).toHaveText('Email format is invalid');
    await expect(loginPage.passwordError).toHaveText('Password length is invalid');
    expect(loginCalls).toBe(0);
  });

  test('password is masked and the page links to register and reset', async ({ loginPage }) => {
    await loginPage.goto();

    await expect(loginPage.password).toHaveAttribute('type', 'password');
    await expect(loginPage.registerLink).toHaveAttribute('href', '/auth/register');
    await expect(loginPage.forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
  });
});

test.describe('Account pages are protected', () => {
  for (const path of ['/account', '/account/profile', '/account/invoices', '/account/favorites']) {
    test(`${path} sends a signed-out visitor to the login page`, async ({ page, loginPage }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/auth\/login/);
      await expect(loginPage.submit).toBeVisible();
    });
  }

  test('a token the API does not recognise is treated as signed out', async ({ page, baseURL, loginPage }) => {
    // Simulates a stale or tampered session left in the browser.
    await page.context().addInitScript(() => localStorage.setItem('auth-token', 'not.a.real.token'));

    await page.goto(`${baseURL}/account/invoices`);

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(loginPage.submit).toBeVisible();
  });
});

test.describe('Signed-in session', () => {
  test.use({ asCustomer: true });

  test('a token from the API is enough to be signed in, no login form needed', async ({
    page,
    header,
    accountPage,
    customer,
  }) => {
    await accountPage.goto();

    await expect(accountPage.title).toHaveText('My account');
    await expect(header.userMenu).toContainText(customer.firstName);
    await expect(page).toHaveURL(/\/account$/);
  });

  test('signing out clears the session and locks the account pages again', async ({ page, header, loginPage }) => {
    await page.goto('/account');
    await header.signOut();

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(header.signIn).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth-token'))).toBeNull();

    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(loginPage.submit).toBeVisible();
  });
});
