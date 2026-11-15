import { expect, Locator, Page } from '@playwright/test';
import { Address, billingAddress } from '../support/test-data';

export type PaymentMethod =
  | 'Bank Transfer'
  | 'Cash on Delivery'
  | 'Credit Card'
  | 'Buy Now Pay Later'
  | 'Gift Card';

/** Steps two to four of the checkout wizard: sign in, billing address, payment. */
export class CheckoutPage {
  // step 2: sign in or continue as guest
  readonly alreadySignedIn: Locator;
  readonly proceedSignedIn: Locator;
  readonly guestTab: Locator;
  readonly guestEmail: Locator;
  readonly guestFirstName: Locator;
  readonly guestLastName: Locator;
  readonly guestSubmit: Locator;
  readonly proceedAsGuest: Locator;

  // step 3: billing address
  readonly country: Locator;
  readonly postcode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly proceedToPayment: Locator;

  // step 4: payment
  readonly paymentMethod: Locator;
  readonly finish: Locator;
  readonly paymentSuccess: Locator;
  readonly paymentError: Locator;
  readonly orderConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.alreadySignedIn = page.getByText('you are already logged in');
    this.proceedSignedIn = page.getByTestId('proceed-2');
    this.guestTab = page.getByRole('tab', { name: 'Continue as Guest' });
    this.guestEmail = page.getByTestId('guest-email');
    this.guestFirstName = page.getByTestId('guest-first-name');
    this.guestLastName = page.getByTestId('guest-last-name');
    this.guestSubmit = page.getByTestId('guest-submit');
    this.proceedAsGuest = page.getByTestId('proceed-2-guest');

    this.country = page.getByTestId('country');
    this.postcode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.proceedToPayment = page.getByTestId('proceed-3');

    this.paymentMethod = page.getByTestId('payment-method');
    this.finish = page.getByTestId('finish');
    this.paymentSuccess = page.getByTestId('payment-success-message');
    this.paymentError = page.getByTestId('payment-error-message');
    this.orderConfirmation = page.locator('#order-confirmation');
  }

  async continueAsGuest(guest: { email: string; firstName: string; lastName: string }) {
    await this.guestTab.click();
    await this.guestEmail.fill(guest.email);
    await this.guestFirstName.fill(guest.firstName);
    await this.guestLastName.fill(guest.lastName);
    await this.guestSubmit.click();
    await this.proceedAsGuest.click();
  }

  async continueSignedIn() {
    await expect(this.alreadySignedIn).toBeVisible();
    await this.proceedSignedIn.click();
  }

  /**
   * Types country, postcode and house number, then waits for the shop's postcode
   * lookup to fill in the rest. Typing street or city by hand is a trap: the lookup
   * overwrites them, and the order API rejects an address that doesn't match it.
   */
  async fillBillingAddress(address: Address = billingAddress) {
    await this.country.selectOption(address.country);
    await this.postcode.fill(address.postcode);
    await this.houseNumber.fill(address.houseNumber);
    await expect(this.street).not.toHaveValue('');
    await expect(this.city).not.toHaveValue('');
    await expect(this.proceedToPayment).toBeEnabled();
  }

  async choosePayment(method: PaymentMethod) {
    await this.paymentMethod.selectOption({ label: method });
  }

  /**
   * Paying takes two clicks on the same button: the first validates the payment,
   * the second ("Confirm") places the order. Returns the invoice number.
   */
  async placeOrder(): Promise<string> {
    await this.finish.click();
    await expect(this.paymentSuccess).toHaveText('Payment was successful');
    await this.finish.click();
    await expect(this.orderConfirmation).toContainText('Thanks for your order!');
    const text = await this.orderConfirmation.innerText();
    return text.match(/INV-[\w-]+/)?.[0] ?? '';
  }
}
