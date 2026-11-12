import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { ContactPage } from '../pages/ContactPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AccountPage } from '../pages/AccountPage';

type Pages = {
  loginPage: LoginPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  contactPage: ContactPage;
  registerPage: RegisterPage;
  accountPage: AccountPage;
};

// Page objects are injected into tests, so each spec stays short and readable.
// Logged-in state comes from the saved session (see tests/auth.setup.ts), not from a fixture.
export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  contactPage: async ({ page }, use) => use(new ContactPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
});

export { expect };
