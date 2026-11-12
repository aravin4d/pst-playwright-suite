// Central test data. Credentials can be overridden with environment variables
// so the suite never depends on a hard-coded password in CI.

// Saved login state, created once by tests/auth.setup.ts and reused by logged-in tests.
export const AUTH_FILE = 'playwright/.auth/customer.json';

// Tests that create real accounts or real orders on the public demo site are skipped
// unless PST_ALLOW_WRITES=true. Read-only and mocked tests always run.
export const writesEnabled = process.env.PST_ALLOW_WRITES === 'true';

export const users = {
  customer: {
    email: process.env.PST_USER_EMAIL ?? 'customer@practicesoftwaretesting.com',
    password: process.env.PST_USER_PASSWORD ?? 'welcome01',
  },
  invalid: {
    email: 'nobody@example.invalid',
    password: 'wrong-password',
  },
};

// Billing details used by the checkout wizard.
export const checkoutAddress = {
  street: 'Test Lane',
  houseNumber: '12',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  country: 'India',
  postcode: '641001',
};

// Unique per call, so repeated or parallel runs never collide on the same account.
export const newUser = () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return {
    firstName: 'Test',
    lastName: 'User',
    dob: '01-01-1990',
    street: checkoutAddress.street,
    houseNumber: checkoutAddress.houseNumber,
    postcode: checkoutAddress.postcode,
    city: checkoutAddress.city,
    state: checkoutAddress.state,
    country: checkoutAddress.country,
    phone: '9999999999',
    email: `tester+${stamp}@example.com`,
    password: 'Passw0rd!2026',
  };
};

// Confirmed on the live site and API.
export const searchTerms = {
  known: 'Pliers',
  secondProduct: 'Slip Joint Pliers',
  unknown: 'zzz-no-such-product-xyz',
};

// Top-level category slugs confirmed from the API.
export const categories = ['hand-tools', 'power-tools', 'other'];

// Route patterns for mocking. The payment call is confirmed as api.practicesoftwaretesting.com/payment/check.
export const paymentRoute = '**/payment/check**';

export const contactMessage = {
  firstName: 'QA',
  lastName: 'Tester',
  email: 'tester@example.com',
  message: 'This is an automated test message. Please ignore.',
};
