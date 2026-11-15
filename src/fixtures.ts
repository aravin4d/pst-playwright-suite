import { test as base, expect } from '@playwright/test';
import { ApiClient } from './support/api-client';
import { Account, API_URL } from './support/test-data';
import { Header } from './pages/header';
import { CatalogPage } from './pages/catalog.page';
import { ProductPage } from './pages/product.page';
import { CartPage } from './pages/cart.page';
import { CheckoutPage } from './pages/checkout.page';
import { LoginPage } from './pages/login.page';
import { RegisterPage } from './pages/register.page';
import { ContactPage } from './pages/contact.page';
import { AccountPage } from './pages/account.page';

type Options = {
  /** `test.use({ asCustomer: true })` starts the test already signed in. */
  asCustomer: boolean;
};

type Fixtures = {
  api: ApiClient;
  customer: Account;
  header: Header;
  catalog: CatalogPage;
  productPage: ProductPage;
  cart: CartPage;
  checkout: CheckoutPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  contactPage: ContactPage;
  accountPage: AccountPage;
};

type WorkerFixtures = {
  workerApi: ApiClient;
};

// One account per worker process, created the first time a test needs it.
// The public demo logins get their passwords changed and locked by other people
// practising on the site, so the suite brings its own shopper instead.
let workerAccount: Promise<Account> | undefined;

function sharedAccount(api: ApiClient): Promise<Account> {
  if (!workerAccount) {
    const { PST_USER_EMAIL: email, PST_USER_PASSWORD: password } = process.env;
    workerAccount =
      email && password
        ? Promise.resolve({ email, password, firstName: '', lastName: '' })
        : api.register();
  }
  return workerAccount;
}

export const test = base.extend<Options & Fixtures, WorkerFixtures>({
  asCustomer: [false, { option: true }],

  workerApi: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({
        baseURL: API_URL,
        extraHTTPHeaders: { Accept: 'application/json' },
      });
      await use(new ApiClient(context));
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  api: async ({ workerApi }, use) => {
    await use(workerApi);
  },

  customer: async ({ workerApi }, use) => {
    await use(await sharedAccount(workerApi));
  },

  // Signing in through the form in every test is slow, and the shop's tokens only live
  // for five minutes, so a login saved once per run would go stale. Instead each signed-in
  // test gets a fresh token from the API and starts with it already in localStorage.
  storageState: async ({ asCustomer, workerApi, baseURL }, use) => {
    if (!asCustomer) {
      await use(undefined);
      return;
    }
    const token = await workerApi.login(await sharedAccount(workerApi));
    await use({
      cookies: [],
      origins: [{ origin: baseURL!, localStorage: [{ name: 'auth-token', value: token }] }],
    });
  },

  header: async ({ page }, use) => use(new Header(page)),
  catalog: async ({ page }, use) => use(new CatalogPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cart: async ({ page }, use) => use(new CartPage(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  contactPage: async ({ page }, use) => use(new ContactPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
});

export { expect };
