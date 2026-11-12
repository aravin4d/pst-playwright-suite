import { test, expect } from '../../fixtures';
import { ProductsPage } from '../../pages/ProductsPage';
import { CartPage } from '../../pages/CartPage';
import { searchTerms, categories, newUser, AUTH_FILE, writesEnabled, paymentRoute } from '../../data/testData';

// Multi-step and multi-session flows. Slower and more sensitive to timing, so they run in the
// nightly suite. Tests that create accounts or orders need PST_ALLOW_WRITES=true.

test.describe('Journeys that create data', () => {
  test.skip(!writesEnabled, 'Set PST_ALLOW_WRITES=true to create accounts and orders on the demo site.');

  test('@regression new user registers, logs in, buys two products and sees the order', async ({
    registerPage,
    loginPage,
    productsPage,
    cartPage,
    checkoutPage,
    accountPage,
    page,
  }) => {
    const user = newUser();

    await test.step('register a new account', async () => {
      await registerPage.goto();
      await registerPage.firstName.fill(user.firstName);
      await registerPage.lastName.fill(user.lastName);
      await registerPage.dob.fill(user.dob);
      await registerPage.country.selectOption({ label: user.country });
      await registerPage.postalCode.fill(user.postcode);
      await registerPage.houseNumber.fill(user.houseNumber);
      await registerPage.street.fill(user.street);
      await registerPage.city.fill(user.city);
      await registerPage.state.fill(user.state);
      await registerPage.phone.fill(user.phone);
      await registerPage.email.fill(user.email);
      await registerPage.password.fill(user.password);
      await registerPage.submit.click();
      await expect(page).not.toHaveURL(/\/auth\/register/);
    });

    await test.step('log in as the new user', async () => {
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await loginPage.expectLoggedIn();
    });

    await test.step('add two different products to the cart', async () => {
      await productsPage.goto();
      await productsPage.addToCartByName(searchTerms.known);
      await productsPage.goto();
      await productsPage.addToCartByName(searchTerms.secondProduct);
      await cartPage.goto();
      await cartPage.expectItemCount(2);
    });

    await test.step('check out and confirm the order', async () => {
      await checkoutPage.goToPayment();
      await checkoutPage.pay();
      await checkoutPage.expectOrderPlaced();
    });

    await test.step('order appears in the invoices list', async () => {
      await accountPage.gotoInvoices();
      await expect(accountPage.invoiceRows.first()).toBeVisible();
    });
  });

  test('@regression double-clicking finish sends only one payment request', async ({
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    test.skip(!writesEnabled, 'Places a real order on the demo site. Set PST_ALLOW_WRITES=true to run.');
    let paymentCalls = 0;
    await page.route(paymentRoute, async (route) => {
      paymentCalls += 1;
      await route.continue();
    });
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await checkoutPage.goToPayment();
    await checkoutPage.paymentMethod.selectOption({ label: 'Cash on Delivery' });
    await checkoutPage.finish.dblclick();
    await checkoutPage.expectOrderPlaced();
    expect(paymentCalls).toBe(1);
  });
});

test.describe('Journeys (no data created)', () => {
  test('@regression cart is kept across a page reload during shopping', async ({ productsPage, cartPage, page }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await page.reload();
    await cartPage.goto();
    await cartPage.expectItemCount(1);
  });

  test('@regression back button from the payment step keeps the cart intact', async ({
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await page.getByTestId('proceed-1').click();
    await page.goBack();
    await cartPage.expectItemCount(1);
  });

  test('@regression two shoppers in separate sessions have isolated carts', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();
      const productsA = new ProductsPage(pageA);
      const cartA = new CartPage(pageA);
      const cartB = new CartPage(pageB);

      await productsA.goto();
      await productsA.addToCartByName(searchTerms.known);

      await cartB.goto();
      await cartB.expectItemCount(0);
      await cartA.goto();
      await cartA.expectItemCount(1);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('@regression expired session during payment does not show success (mocked 401)', async ({
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    await page.route(paymentRoute, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' }),
    );
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await checkoutPage.goToPayment();
    await checkoutPage.pay();
    await expect(checkoutPage.paymentSuccess).toHaveCount(0);
  });

  test('@regression product list keeps the page usable when the products API fails (mocked)', async ({ page }) => {
    await page.route('**/api.practicesoftwaretesting.com/products**', (route) => route.abort('connectionreset'));
    await page.goto('/');
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('@regression sorting by price stays valid in every top-level category', async ({ productsPage }) => {
    for (const slug of categories) {
      await productsPage.openCategory(slug);
      await productsPage.sortBy('price,asc');
      const prices = await productsPage.priceValues();
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    }
  });
});

test.describe('Journeys with a saved customer session', () => {
  test.use({ storageState: AUTH_FILE });

  test.beforeEach(async ({ cartPage }) => {
    await cartPage.clear();
  });

  test('@regression customer changes quantity and the total updates before checkout', async ({
    productsPage,
    cartPage,
  }) => {
    await productsPage.goto();
    await productsPage.search(searchTerms.known);
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    const before = await cartPage.totalValue();
    await cartPage.setQuantity(0, 3);
    await cartPage.expectTotalToBe(before * 3);
  });

  test('@regression billing details keep their values after a rejected postal code', async ({
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await page.getByTestId('proceed-1').click();
    await checkoutPage.proceedSignIn.click();
    await checkoutPage.fillAddress();
    await checkoutPage.postalCode.fill('!!!');
    await checkoutPage.proceedBilling.click();
    await expect(checkoutPage.street).toHaveValue(/Test Lane/);
    await expect(checkoutPage.city).toHaveValue('Coimbatore');
  });

  test('@regression invoice count grows by one after a real order (writes)', async ({
    productsPage,
    cartPage,
    checkoutPage,
    accountPage,
  }) => {
    test.skip(!writesEnabled, 'Places a real order on the demo site. Set PST_ALLOW_WRITES=true to run.');
    const before = await accountPage.invoiceCount();
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await checkoutPage.goToPayment();
    await checkoutPage.pay();
    await checkoutPage.expectOrderPlaced();
    await expect.poll(() => accountPage.invoiceCount(), { timeout: 20_000 }).toBeGreaterThan(before);
  });
});
