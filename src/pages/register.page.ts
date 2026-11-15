import { expect, Locator, Page } from '@playwright/test';
import { billingAddress, newShopper } from '../support/test-data';

export class RegisterPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly dob: Locator;
  readonly country: Locator;
  readonly postcode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly formError: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.dob = page.getByTestId('dob');
    this.country = page.getByTestId('country');
    this.postcode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.phone = page.getByTestId('phone');
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('register-submit');
    this.formError = page.getByTestId('register-error');
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  /** The message under a field, e.g. fieldError('first-name'). */
  fieldError(field: string): Locator {
    return this.page.getByTestId(`${field}-error`);
  }

  async fillAddress() {
    await this.country.selectOption(billingAddress.country);
    await this.postcode.fill(billingAddress.postcode);
    await this.houseNumber.fill(billingAddress.houseNumber);
    // Same postcode lookup as checkout: street, city and state arrive on their own.
    await expect(this.street).not.toHaveValue('');
  }

  async fill(shopper: ReturnType<typeof newShopper>) {
    await this.firstName.fill(shopper.firstName);
    await this.lastName.fill(shopper.lastName);
    await this.dob.fill(shopper.dob);
    await this.fillAddress();
    await this.phone.fill(shopper.phone);
    await this.email.fill(shopper.email);
    await this.password.fill(shopper.password);
  }
}
