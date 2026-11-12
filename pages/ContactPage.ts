import { Page, Locator } from '@playwright/test';

// Confirmed on the live contact page:
//   first-name, last-name, email, subject (select), message, attachment, contact-submit
// Not yet confirmed: the success message. The form has not been submitted on the live site,
// so the success selector below is a guess and is marked in COVERAGE.md.
export class ContactPage {
  readonly page: Page;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly subject: Locator;
  readonly message: Locator;
  readonly send: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.email = page.getByTestId('email');
    this.subject = page.getByTestId('subject');
    this.message = page.getByTestId('message');
    this.send = page.getByTestId('contact-submit');
    this.successMessage = page.locator('.alert-success');
  }

  async goto() {
    await this.page.goto('/contact');
  }
}
