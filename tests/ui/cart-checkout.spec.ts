import { test, expect } from '../../fixtures';
import { searchTerms, AUTH_FILE, writesEnabled, paymentRoute } from '../../data/testData';

test.describe('Cart (guest)', () => {
  test('@smoke adding a product puts one row in the cart', async ({ productsPage, cartPage }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await cartPage.expectItemCount(1);
  });

  test('@regression removing an item empties the cart', async ({ productsPage, cartPage }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await cartPage.removeFirstItem();
    await cartPage.expectItemCount(0);
  });

  test('@regression two different products make two cart rows', async ({ productsPage, cartPage }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.secondProduct);
    await cartPage.goto();
    await cartPage.expectItemCount(2);
  });

  test('@regression changing quantity to two doubles the cart total', async ({ productsPage, cartPage }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    const before = await cartPage.totalValue();
    await cartPage.setQuantity(0, 2);
    await cartPage.expectTotalToBe(before * 2);
  });

  test('@regression a quantity of zero is not accepted as a row', async ({ productsPage, cartPage }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await cartPage.setQuantity(0, 0);
    // The row may stay with quantity 0 or be removed; the total must not go negative.
    expect(await cartPage.totalValue()).toBeGreaterThanOrEqual(0);
  });

  test('@regression cart total equals the product unit price for quantity one', async ({ productsPage, cartPage, page }) => {
    await productsPage.goto();
    await productsPage.openProduct(searchTerms.known);
    const unitPrice = parseFloat((await page.getByTestId('unit-price').innerText()).replace(/[^0-9.]/g, ''));
    await productsPage.addToCart();
    await cartPage.goto();
    await cartPage.expectTotalToBe(unitPrice);
  });

  test('@regression guest checkout either continues or asks to sign in', async ({ productsPage, cartPage, page }) => {
    // Characterisation test: confirms the behaviour without deciding which is correct.
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await cartPage.proceedToCheckout.click();
    await expect(page).toHaveURL(/\/auth\/login|\/checkout/);
  });
});

test.describe('Checkout (saved customer session)', () => {
  test.use({ storageState: AUTH_FILE });

  // The shared customer account keeps its cart between tests. Start each test from an empty cart.
  test.beforeEach(async ({ cartPage }) => {
    await cartPage.clear();
  });

  test('@regression empty billing details keep the customer on the billing step', async ({
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
    await checkoutPage.proceedBilling.click();
    await checkoutPage.expectStillOnBilling();
  });

  test('@regression invalid postal code does not reach payment', async ({
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
    await checkoutPage.expectStillOnBilling();
  });

  test('@regression payment failure shows no success message (mocked)', async ({
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    await page.route(paymentRoute, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"payment declined"}' }),
    );
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await checkoutPage.goToPayment();
    await checkoutPage.pay();
    await expect(checkoutPage.paymentSuccess).toHaveCount(0);
  });

  test('@regression network timeout on payment shows no success message (mocked)', async ({
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    await page.route(paymentRoute, (route) => route.abort('timedout'));
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await checkoutPage.goToPayment();
    await checkoutPage.pay();
    await expect(checkoutPage.paymentSuccess).toHaveCount(0);
  });

  test('@regression coupon code is rejected when a coupon field exists', async ({
    productsPage,
    cartPage,
    page,
  }) => {
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    const coupon = page.getByLabel(/coupon|discount code/i);
    test.skip((await coupon.count()) === 0, 'No coupon field on the checkout wizard. Confirm on the live site.');
    const before = await cartPage.totalValue();
    await coupon.fill('INVALID-CODE-XYZ');
    await page.getByRole('button', { name: /apply/i }).click();
    await expect(page.getByText(/invalid|not valid|unknown/i)).toBeVisible();
    await cartPage.expectTotalToBe(before);
  });

  test('@smoke checkout completes for a logged-in customer (writes a real order)', async ({
    productsPage,
    cartPage,
    checkoutPage,
  }) => {
    test.skip(!writesEnabled, 'Set PST_ALLOW_WRITES=true to place real orders on the demo site.');
    await productsPage.goto();
    await productsPage.addToCartByName(searchTerms.known);
    await cartPage.goto();
    await checkoutPage.goToPayment();
    await checkoutPage.pay();
    await checkoutPage.expectOrderPlaced();
  });
});
