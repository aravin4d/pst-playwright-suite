import { expect, Locator, Page, Request } from '@playwright/test';
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
   * lookup to finish and fill in street, city and state.
   *
   * Two traps here. The lookup overwrites street and city when it lands, and the order
   * API rejects an address that doesn't match it, so tests never type those fields
   * first. And "the street field has a value" is not proof the lookup is done: in
   * failed CI runs the field was already filled before either lookup answered (the
   * shop fires two per address), the test typed its own city, and the lookup then
   * overwrote it. So this waits for every lookup request to answer, then checks the
   * fields hold what the last one returned.
   */
  async fillBillingAddress(address: Address = billingAddress) {
    const lookups: Request[] = [];
    const track = (request: Request) => {
      if (request.url().includes('/postcode-lookup')) lookups.push(request);
    };
    this.page.on('request', track);

    try {
      await this.country.selectOption(address.country);
      await this.postcode.fill(address.postcode);
      await this.houseNumber.fill(address.houseNumber);

      await expect.poll(() => lookups.length, { message: 'postcode lookup was not called' }).toBeGreaterThan(0);
      // Wait for everything sent so far, and again if more went out while we waited.
      let settled = 0;
      while (settled < lookups.length) {
        settled = lookups.length;
        await Promise.all(lookups.map((request) => request.response()));
      }

      const answer = await (await lookups[lookups.length - 1].response())?.json();
      await expect(this.street).toHaveValue(answer.street);
      await expect(this.city).toHaveValue(answer.city);
      await expect(this.proceedToPayment).toBeEnabled();
    } finally {
      this.page.off('request', track);
    }
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
