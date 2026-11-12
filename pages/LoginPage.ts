import { Page, Locator, expect } from '@playwright/test';

// Confirmed on the live login page:
//   email/password fields are labelled "Email address *" and "Password *"
//   submit is data-test="login-submit"; error is data-test="login-error"
//   nav-sign-in is the top-nav link; nav-menu appears once logged in
export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel('Email address');
    this.password = page.getByLabel('Password', { exact: false }).first();
    this.submit = page.getByTestId('login-submit');
    this.errorMessage = page.getByTestId('login-error');
    this.registerLink = page.getByRole('link', { name: 'Register your account' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot your Password?' });
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectLoggedIn() {
    await expect(this.page.getByTestId('nav-menu')).toBeVisible();
  }
}
