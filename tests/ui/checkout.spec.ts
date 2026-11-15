import { test, expect } from '../../src/fixtures';
import { PaymentMethod } from '../../src/pages/checkout.page';
import { seedCart } from '../../src/support/seed';
import { billingAddress, products, usd } from '../../src/support/test-data';

const guest = { email: 'guest.shopper@example.com', firstName: 'Guest', lastName: 'Shopper' };

// Every checkout test needs something in the cart. Seeding it through the API
// takes a couple of requests instead of four page loads.
test.beforeEach(async ({ page, api }) => {
  await seedCart(page, api, [{ name: products.pliers }]);
});

test.describe('Checkout as a guest', () => {
  test.beforeEach(async ({ cart }) => {
    await cart.goto();
    await cart.proceed.click();
  });

  test('guest details are required', async ({ checkout, page }) => {
    await checkout.guestTab.click();
    await checkout.guestSubmit.click();

    await expect(page.getByTestId('guest-email-error')).toHaveText('Email is required');
    await expect(page.getByTestId('guest-first-name-error')).toHaveText('First name is required');
    await expect(page.getByTestId('guest-last-name-error')).toHaveText('Last name is required');
  });

  test('billing step stays locked until the address is complete', async ({ checkout }) => {
    await checkout.continueAsGuest(guest);
    await expect(checkout.proceedToPayment).toBeDisabled();

    await checkout.fillBillingAddress();
    await expect(checkout.proceedToPayment).toBeEnabled();

    await checkout.postcode.clear();
    await expect(checkout.proceedToPayment).toBeDisabled();
  });

  test('postcode lookup fills in the address it gets back', async ({ checkout, page }) => {
    // The real lookup returns generated data, so pin it down to check the wiring exactly.
    await page.route('**/postcode-lookup?*', (route) =>
      route.fulfill({
        json: {
          street: 'Avinashi Road',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          country: billingAddress.country,
          postcode: billingAddress.postcode,
          house_number: billingAddress.houseNumber,
        },
      }),
    );

    await checkout.continueAsGuest(guest);
    await checkout.fillBillingAddress();

    await expect(checkout.street).toHaveValue('Avinashi Road');
    await expect(checkout.city).toHaveValue('Coimbatore');
    await expect(checkout.state).toHaveValue('Tamil Nadu');
  });

  test('lookup sends the country, postcode and house number that were typed', async ({ checkout, page }) => {
    await checkout.continueAsGuest(guest);
    const lookup = page.waitForRequest((request) => request.url().includes('/postcode-lookup'));
    await checkout.fillBillingAddress();

    const query = new URL((await lookup).url()).searchParams;
    expect(query.get('country')).toBe(billingAddress.country);
    expect(query.get('postcode')).toBe(billingAddress.postcode);
    expect(query.get('house_number')).toBe(billingAddress.houseNumber);
  });

  test.describe('payment step', () => {
    test.beforeEach(async ({ checkout }) => {
      await checkout.continueAsGuest(guest);
      await checkout.fillBillingAddress();
      await checkout.proceedToPayment.click();
    });

    test('cannot pay before choosing a method', async ({ checkout }) => {
      await expect(checkout.paymentMethod).toBeVisible();
      await expect(checkout.finish).toBeDisabled();
    });

    // The last column: does the shop keep the pay button locked until the details are filled in?
    // Credit Card is the odd one out; its details are only checked when the payment is submitted.
    const extraFields: Array<[PaymentMethod, string[], boolean]> = [
      ['Bank Transfer', ['bank_name', 'account_name', 'account_number'], true],
      ['Credit Card', ['credit_card_number', 'expiration_date', 'cvv', 'card_holder_name'], false],
      ['Buy Now Pay Later', ['monthly_installments'], true],
      ['Gift Card', ['gift_card_number', 'validation_code'], true],
    ];

    for (const [method, fields, lockedUntilFilled] of extraFields) {
      test(`${method} asks for its own details`, async ({ checkout, page }) => {
        await checkout.choosePayment(method);

        for (const field of fields) await expect(page.getByTestId(field)).toBeVisible();
        if (lockedUntilFilled) await expect(checkout.finish).toBeDisabled();
      });
    }

    test('Cash on Delivery needs nothing more', async ({ checkout }) => {
      await checkout.choosePayment('Cash on Delivery');

      await expect(checkout.finish).toBeEnabled();
      await expect(checkout.finish).toHaveText('Check payment');
    });

    test('a declined payment shows an error and does not place the order', async ({ checkout, page }) => {
      let ordersPlaced = 0;
      await page.route('**/invoices**', (route) => {
        if (route.request().method() === 'POST') ordersPlaced += 1;
        return route.fallback();
      });
      await page.route('**/payment/check', (route) =>
        route.fulfill({ status: 500, json: { message: 'Card declined' } }),
      );

      await checkout.choosePayment('Cash on Delivery');
      await checkout.finish.click();

      await expect(checkout.paymentError).toBeVisible();
      await expect(checkout.paymentSuccess).toBeHidden();
      await expect(checkout.finish).toHaveText('Check payment');
      await expect(checkout.orderConfirmation).toBeHidden();
      expect(ordersPlaced).toBe(0);
    });

    test('a payment service that never answers leaves the shopper on the payment step', async ({
      checkout,
      page,
    }) => {
      await page.route('**/payment/check', (route) => route.abort('timedout'));

      await checkout.choosePayment('Cash on Delivery');
      await checkout.finish.click();

      await expect(checkout.paymentSuccess).toBeHidden();
      await expect(checkout.orderConfirmation).toBeHidden();
      await expect(checkout.paymentMethod).toBeVisible();
    });

    test('order confirmation shows the invoice number the API returned', async ({ checkout, page }) => {
      // Stubbing the order call proves the UI reads the number from the response,
      // and keeps this test from creating data.
      await page.route('**/invoices/guest', (route) =>
        route.fulfill({ status: 201, json: { id: 'stub', invoice_number: 'INV-STUB-0042', total: 0 } }),
      );

      await checkout.choosePayment('Cash on Delivery');
      const invoiceNumber = await checkout.placeOrder();

      expect(invoiceNumber).toBe('INV-STUB-0042');
    });

    test('the order request carries the cart, the address and the guest details', async ({ checkout, page }) => {
      await page.route('**/invoices/guest', (route) =>
        route.fulfill({ status: 201, json: { id: 'stub', invoice_number: 'INV-STUB-0043', total: 0 } }),
      );
      const order = page.waitForRequest((request) => request.url().endsWith('/invoices/guest'));

      await checkout.choosePayment('Cash on Delivery');
      await checkout.placeOrder();

      const body = (await order).postDataJSON();
      expect(body).toMatchObject({
        billing_country: billingAddress.country,
        billing_postal_code: billingAddress.postcode,
        payment_method: 'cash-on-delivery',
        guest_email: guest.email,
        guest_first_name: guest.firstName,
        guest_last_name: guest.lastName,
      });
      expect(body.cart_id).toBe(await page.evaluate(() => sessionStorage.getItem('cart_id')));
      expect(body.billing_street).not.toBe('');
    });
  });
});

test.describe('Checkout as a signed-in customer', () => {
  test.use({ asCustomer: true });

  test('skips the sign-in step and greets the customer by name', async ({ cart, checkout, customer }) => {
    await cart.goto();
    await cart.proceed.click();

    await expect(checkout.alreadySignedIn).toContainText(`Hello ${customer.firstName} ${customer.lastName}`);
    await expect(checkout.proceedSignedIn).toBeEnabled();
  });

  test('places an order that then appears under My invoices @smoke', async ({
    cart,
    checkout,
    accountPage,
    header,
    api,
  }) => {
    const pliers = await api.productByName(products.pliers);

    await cart.goto();
    await cart.proceed.click();
    await checkout.continueSignedIn();
    await checkout.fillBillingAddress();
    await checkout.proceedToPayment.click();
    await checkout.choosePayment('Cash on Delivery');
    const invoiceNumber = await checkout.placeOrder();

    expect(invoiceNumber).toMatch(/^INV-\d+$/);
    await expect(header.cartBadge).toBeHidden();

    await header.openAccountSection('invoices');
    await expect(accountPage.invoiceRow(invoiceNumber)).toContainText(usd(pliers.price));

    await accountPage.openInvoice(invoiceNumber);
    expect(await accountPage.read(accountPage.invoiceNumber)).toBe(invoiceNumber);
    expect(await accountPage.read(accountPage.paymentMethod)).toBe('Cash on Delivery');
    await expect(accountPage.invoiceLines).toHaveCount(1);
    await expect(accountPage.invoiceLines.first()).toContainText(pliers.name);
  });

  test('the API refuses an order whose address was changed after the lookup', async ({ cart, checkout, page }) => {
    await cart.goto();
    await cart.proceed.click();
    await checkout.continueSignedIn();
    await checkout.fillBillingAddress();
    // Overwrite what the lookup filled in with a city from somewhere else.
    await checkout.city.fill('Atlantis');
    await checkout.proceedToPayment.click();
    await checkout.choosePayment('Cash on Delivery');
    await checkout.finish.click();
    await expect(checkout.paymentSuccess).toBeVisible();

    const orderResponse = page.waitForResponse(
      (response) => response.url().endsWith('/invoices') && response.request().method() === 'POST',
    );
    await checkout.finish.click();
    const response = await orderResponse;

    expect(response.status()).toBe(422);
    expect(await response.text()).toContain('billing_country');
    await expect(checkout.orderConfirmation).toBeHidden();
  });
});
