import { expect, Locator, Page, Request, Response } from '@playwright/test';
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

  private lookupsStarted = 0;
  private lookupsInFlight = 0;
  private lastLookup?: Response;

  constructor(private readonly page: Page) {
    const isLookup = (request: Request) => request.url().includes('/postcode-lookup');
    page.on('request', (request) => {
      if (!isLookup(request)) return;
      this.lookupsStarted += 1;
      this.lookupsInFlight += 1;
    });
    page.on('requestfinished', async (request) => {
      if (!isLookup(request)) return;
      this.lastLookup = (await request.response()) ?? this.lastLookup;
      this.lookupsInFlight -= 1;
    });
    page.on('requestfailed', (request) => {
      if (isLookup(request)) this.lookupsInFlight -= 1;
    });

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
   * lookup to settle and checks street, city and state hold what it returned.
   *
   * The lookup is easy to race. For a signed-in customer the shop prefills the saved
   * address and fires two lookups as soon as the checkout page loads; typing the same
   * values again fires nothing. If a test types into the street or city while those
   * are still in flight, the response lands afterwards and silently overwrites it.
   * (That is exactly how "the API refuses an order whose address was changed" once
   * placed a real order.) So lookups are tracked from the moment this page object is
   * created, and this method returns only when none are in flight.
   */
  async fillBillingAddress(address: Address = billingAddress) {
    await this.country.selectOption(address.country);
    await this.postcode.fill(address.postcode);
    await this.houseNumber.fill(address.houseNumber);

    await expect
      .poll(() => this.lookupsStarted > 0 && this.lookupsInFlight === 0, {
        message: 'postcode lookup did not run, or did not finish',
      })
      .toBe(true);

    const answer = await this.lastLookup!.json();
    await expect(this.street).toHaveValue(answer.street);
    await expect(this.city).toHaveValue(answer.city);
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
