import { test, expect } from '../../src/fixtures';
import { isProductListUrl } from '../../src/pages/catalog.page';
import { newShopper, products, usd } from '../../src/support/test-data';

// Long, cross-page flows. Each one walks the shop the way a real person would,
// so they are slower than the focused specs and are the first place to look
// when something breaks between features rather than inside one.

test.describe('Shopping journeys', () => {
  test('a new visitor registers, signs in, buys two products and finds the invoice', async ({
    page,
    registerPage,
    loginPage,
    catalog,
    productPage,
    header,
    cart,
    checkout,
    accountPage,
    api,
  }) => {
    test.slow();
    const shopper = newShopper();
    const pliers = await api.productByName(products.pliers);
    const hammer = await api.productByName(products.hammer);
    const expectedTotal = pliers.price * 2 + hammer.price;

    await test.step('register', async () => {
      await registerPage.goto();
      await registerPage.fill(shopper);
      await registerPage.submit.click();
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    await test.step('sign in with the new account', async () => {
      await loginPage.signIn(shopper.email, shopper.password);
      await expect(page).toHaveURL(/\/account$/);
      await expect(header.userMenu).toContainText(`${shopper.firstName} ${shopper.lastName}`);
    });

    await test.step('fill the cart', async () => {
      await catalog.goto();
      await catalog.openProduct(pliers.name);
      await productPage.setQuantity(2);
      await productPage.addToCart();

      await catalog.goto();
      await catalog.openProduct(hammer.name);
      await productPage.addToCart();

      await header.cartLink.click();
      await expect(cart.rows).toHaveCount(2);
      await expect(cart.total).toHaveText(usd(expectedTotal));
    });

    const invoiceNumber = await test.step('check out', async () => {
      await cart.proceed.click();
      await checkout.continueSignedIn();
      await checkout.fillBillingAddress();
      await checkout.proceedToPayment.click();
      await checkout.choosePayment('Cash on Delivery');
      return checkout.placeOrder();
    });

    await test.step('find the order under My invoices', async () => {
      await accountPage.gotoInvoices();
      // A brand-new account has exactly this one order.
      await expect(accountPage.invoiceRows).toHaveCount(1);
      await expect(accountPage.invoiceRow(invoiceNumber)).toContainText(usd(expectedTotal));

      await accountPage.openInvoice(invoiceNumber);
      await expect(accountPage.invoiceLines).toHaveCount(2);
      await expect(accountPage.invoiceLines.filter({ hasText: pliers.name })).toContainText(usd(pliers.price * 2));
      await expect(accountPage.invoiceLines.filter({ hasText: hammer.name })).toContainText(usd(hammer.price));
    });
  });

  test('a guest buys without an account', async ({ catalog, productPage, header, cart, checkout }) => {
    await catalog.goto();
    await catalog.openProduct(products.slipJointPliers);
    await productPage.addToCart();
    await header.cartLink.click();

    await cart.proceed.click();
    await checkout.continueAsGuest({ email: 'guest.shopper@example.com', firstName: 'Guest', lastName: 'Shopper' });
    await checkout.fillBillingAddress();
    await checkout.proceedToPayment.click();
    await checkout.choosePayment('Cash on Delivery');
    const invoiceNumber = await checkout.placeOrder();

    expect(invoiceNumber).toMatch(/^INV-\d+$/);
    await expect(header.cartBadge).toBeHidden();
  });

  test('signing in halfway through checkout keeps the cart', async ({
    catalog,
    productPage,
    header,
    cart,
    loginPage,
    customer,
    api,
  }) => {
    const pliers = await api.productByName(products.pliers);

    await catalog.goto();
    await catalog.openProduct(pliers.name);
    await productPage.addToCart();
    await header.cartLink.click();
    await cart.proceed.click();

    // The sign-in step of the wizard reuses the normal login form.
    await loginPage.signIn(customer.email, customer.password);
    await expect(header.userMenu).toBeVisible();

    await cart.goto();
    await expect(cart.row(pliers.name)).toBeVisible();
    await expect(cart.total).toHaveText(usd(pliers.price));
  });
});

test.describe('When the backend misbehaves', () => {
  test('a slow product API still ends with a full grid, no fixed waits needed', async ({ page, catalog }) => {
    let delayed = 0;
    await page.route(isProductListUrl, async (route) => {
      delayed += 1;
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await route.continue();
    });

    await page.goto('/');

    await expect(catalog.productNames).toHaveCount(9, { timeout: 20_000 });
    expect(delayed).toBeGreaterThan(0);
  });

  test('a product API outage leaves the rest of the page usable', async ({ page, catalog, header }) => {
    await page.route(isProductListUrl, (route) => route.abort('failed'));
    const gridCallFailed = page.waitForEvent('requestfailed', (request) => isProductListUrl(request.url()));

    await page.goto('/');
    await gridCallFailed;

    await expect(header.signIn).toBeVisible();
    await expect(header.contact).toBeVisible();
    await expect(catalog.productNames).toHaveCount(0);

    await header.contact.click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('a cart that no longer exists on the server does not break the cart page', async ({ page, cart, header }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('cart_id', '00000000000000000000000000');
      sessionStorage.setItem('cart_quantity', '3');
    });

    await cart.goto();

    await expect(cart.rows).toHaveCount(0);
    await expect(header.signIn).toBeVisible();
  });
});
