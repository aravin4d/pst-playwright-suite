import { Page, Locator, expect } from '@playwright/test';
import { checkoutAddress } from '../data/testData';

// Confirmed on the live checkout wizard:
//   proceed-1 (cart), proceed-2 (sign-in step), proceed-3 (billing), finish ("Check payment")
//   billing fields: country (select), postal_code, house_number, street, city, state
//   payment-method select includes "Cash on Delivery"
//   success message: payment-success-message with text "Payment was success"
//   the payment request goes to api.practicesoftwaretesting.com/payment/check
export class CheckoutPage {
  readonly page: Page;
  readonly proceedSignIn: Locator;
  readonly proceedBilling: Locator;
  readonly proceedPayment: Locator;
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly paymentMethod: Locator;
  readonly finish: Locator;
  readonly paymentSuccess: Locator;

  constructor(page: Page) {
    this.page = page;
    this.proceedSignIn = page.getByTestId('proceed-2');
    this.proceedBilling = page.getByTestId('proceed-3');
    this.proceedPayment = page.getByTestId('proceed-3');
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.paymentMethod = page.getByTestId('payment-method');
    this.finish = page.getByTestId('finish');
    this.paymentSuccess = page.getByTestId('payment-success-message');
  }

  // Moves from the cart to the payment step through the wizard.
  async goToPayment() {
    await this.page.getByTestId('proceed-1').click();
    await this.proceedSignIn.click();
    await this.fillAddress();
    await this.proceedBilling.click();
    await expect(this.paymentMethod).toBeVisible();
  }

  async fillAddress() {
    await this.country.selectOption({ label: checkoutAddress.country });
    await this.postalCode.fill(checkoutAddress.postcode);
    await this.houseNumber.fill(checkoutAddress.houseNumber);
    await this.street.fill(checkoutAddress.street);
    await this.city.fill(checkoutAddress.city);
    await this.state.fill(checkoutAddress.state);
  }

  async pay(method = 'Cash on Delivery') {
    await this.paymentMethod.selectOption({ label: method });
    await this.finish.click();
  }

  async expectOrderPlaced() {
    await expect(this.paymentSuccess).toHaveText(/Payment was success/i);
  }

  async expectStillOnBilling() {
    await expect(this.paymentMethod).toHaveCount(0);
  }
}
