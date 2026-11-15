import { Locator, Page } from '@playwright/test';

export type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};

export class ContactPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly subject: Locator;
  readonly message: Locator;
  readonly send: Locator;
  readonly confirmation: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.email = page.getByTestId('email');
    this.subject = page.getByTestId('subject');
    this.message = page.getByTestId('message');
    this.send = page.getByTestId('contact-submit');
    this.confirmation = page.locator('.alert-success');
  }

  async goto() {
    await this.page.goto('/contact');
  }

  fieldError(field: string): Locator {
    return this.page.getByTestId(`${field}-error`);
  }

  async fill(form: Partial<ContactForm>) {
    if (form.firstName !== undefined) await this.firstName.fill(form.firstName);
    if (form.lastName !== undefined) await this.lastName.fill(form.lastName);
    if (form.email !== undefined) await this.email.fill(form.email);
    if (form.subject !== undefined) await this.subject.selectOption({ label: form.subject });
    if (form.message !== undefined) await this.message.fill(form.message);
  }
}
