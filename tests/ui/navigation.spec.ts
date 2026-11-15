import { test, expect } from '../../src/fixtures';

test.describe('Navigation', () => {
  test('navbar links go where they say', async ({ page, header }) => {
    await page.goto('/');

    await header.contact.click();
    await expect(page).toHaveURL(/\/contact$/);

    await header.signIn.click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    await header.openCategory('rentals');
    await expect(page).toHaveURL(/\/rentals$/);
  });

  test('an unknown address is redirected to the home address', async ({ page, header }) => {
    await page.goto('/this-page-does-not-exist');

    // The shop has no "not found" page; it rewrites the address to the home page.
    await expect(page).toHaveURL(/practicesoftwaretesting\.com\/$/);
    await expect(header.contact).toBeVisible();
  });

  test('switching to German translates the page and sticks after a reload', async ({ page, header, catalog }) => {
    await page.goto('/');
    const translations = page.waitForResponse((response) => response.url().endsWith('/assets/i18n/de.json'));
    await header.switchLanguage('de');
    test.skip(!(await translations).ok(), 'The German translation file was not served on this network');

    await expect(header.contact).toHaveText('Kontakt');
    await expect(header.signIn).toHaveText('Einloggen');
    await expect(catalog.searchButton).toHaveText('Suche');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await page.reload();
    await expect(header.contact).toHaveText('Kontakt');

    await header.switchLanguage('en');
    await expect(header.contact).toHaveText('Contact');
  });

  test('footer links to the project source', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('footer-learn-github')).toHaveAttribute(
      'href',
      'https://github.com/testsmith-io/practice-software-testing',
    );
  });
});

test.describe('On a phone', () => {
  test('the menu is tucked behind the hamburger @mobile', async ({ page, header }) => {
    await page.goto('/');
    await expect(header.contact).toBeHidden();

    await header.menuToggle.click();

    await expect(header.contact).toBeVisible();
    await expect(header.signIn).toBeVisible();
  });

  test('sorting is tucked behind the Filters button @mobile', async ({ catalog }) => {
    await catalog.goto();
    await expect(catalog.sort).toBeHidden();

    await catalog.filtersToggle.click();
    await expect(catalog.sort).toBeVisible();

    await catalog.sortBy('price,asc');
    await expect(async () => {
      const prices = await catalog.prices();
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }).toPass();
  });

  test('a product can be added to the cart from a phone @mobile', async ({ page, catalog, productPage, header }) => {
    await catalog.goto();
    // The search box is desktop-only, so tap the first card that is in stock.
    const inStock = page
      .locator('a[href*="/product/"]')
      .filter({ hasNot: page.getByTestId('out-of-stock') })
      .first();
    await inStock.click();
    await page.waitForURL(/\/product\//);

    await productPage.addToCartButton.click();
    await expect(productPage.toast).toContainText('Product added to shopping cart');

    await header.menuToggle.click();
    await expect(header.cartBadge).toHaveText('1');
  });
});
