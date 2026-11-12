import { test, expect } from '../../fixtures';
import { searchTerms, contactMessage, AUTH_FILE } from '../../data/testData';

test.describe('Account and invoices', () => {
  test.use({ storageState: AUTH_FILE });

  test('@regression invoices page loads with a table for a logged-in customer', async ({ accountPage, page }) => {
    await accountPage.gotoInvoices();
    await expect(page).toHaveURL(/\/account\/invoices/);
    await expect(accountPage.invoiceRows.first()).toBeVisible();
  });

  test('@regression invoices page has pagination controls', async ({ accountPage }) => {
    await accountPage.gotoInvoices();
    await expect(accountPage.paginationNext).toBeVisible();
  });
});

test.describe('Contact form', () => {
  test('@regression contact form submits with valid data (mocked)', async ({ contactPage, page }) => {
    await page.route('**/contact**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }),
    );
    await contactPage.goto();
    await contactPage.firstName.fill(contactMessage.firstName);
    await contactPage.lastName.fill(contactMessage.lastName);
    await contactPage.email.fill(contactMessage.email);
    await contactPage.subject.selectOption({ index: 1 });
    await contactPage.message.fill(contactMessage.message);
    await contactPage.send.click();
    // The success message selector is not yet confirmed on the live site.
    await expect(contactPage.successMessage).toBeVisible();
  });

  test('@regression contact form does not submit an empty form', async ({ contactPage, page }) => {
    await contactPage.goto();
    await contactPage.send.click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('@regression contact form rejects a malformed email', async ({ contactPage, page }) => {
    await contactPage.goto();
    await contactPage.firstName.fill(contactMessage.firstName);
    await contactPage.lastName.fill(contactMessage.lastName);
    await contactPage.email.fill('bad-email');
    await contactPage.message.fill(contactMessage.message);
    await contactPage.send.click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('@regression contact server error shows no success message (mocked)', async ({ contactPage, page }) => {
    await page.route('**/contact**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false}' }),
    );
    await contactPage.goto();
    await contactPage.firstName.fill(contactMessage.firstName);
    await contactPage.lastName.fill(contactMessage.lastName);
    await contactPage.email.fill(contactMessage.email);
    await contactPage.subject.selectOption({ index: 1 });
    await contactPage.message.fill(contactMessage.message);
    await contactPage.send.click();
    await expect(contactPage.successMessage).toHaveCount(0);
  });
});

test.describe('Navigation and pages', () => {
  test('@smoke @mobile home page loads with its heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /toolshop/i }).first()).toBeVisible();
  });

  test('@regression unknown URL does not return a product page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz');
    expect(response?.status()).not.toBe(200);
  });

  test('@regression privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy/);
  });

  test('@regression language switcher changes the document language', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', /en/);
    await page.getByTestId('language-select').click();
    await page.getByTestId('lang-fr').click();
    await expect(page.locator('html')).toHaveAttribute('lang', /fr/);
  });

  test('@regression GitHub footer link points to the source repository', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('footer-learn-github')).toHaveAttribute(
      'href',
      'https://github.com/testsmith-io/practice-software-testing',
    );
  });

  test('@regression top navigation shows Sign in when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('nav-sign-in')).toBeVisible();
  });

  test('@regression category links in the navigation are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('nav-hand-tools')).toBeVisible();
    await expect(page.getByTestId('nav-power-tools')).toBeVisible();
    await expect(page.getByTestId('nav-other')).toBeVisible();
  });

  test('@regression search from the home page returns the requested product', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.search(searchTerms.known);
    await productsPage.expectResultsContain(searchTerms.known);
  });
});
