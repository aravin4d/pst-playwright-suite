# Practice Software Testing: Playwright test suite

End-to-end, API, accessibility, visual and multi-step tests for [practicesoftwaretesting.com](https://practicesoftwaretesting.com), written in TypeScript with Playwright. [COVERAGE.md](COVERAGE.md) lists which selectors and endpoints were checked on the live site and which still need a first run.

## Running locally

```bash
npm install
npx playwright install
npm run test:smoke                 # @smoke tests, fastest check
npm test                           # everything, all browsers
PST_ALLOW_WRITES=true npm test     # also run tests that create accounts and orders
npm run report                     # open the Allure report after a run
```

Credentials can be overridden with `PST_USER_EMAIL` and `PST_USER_PASSWORD`. The defaults in `data/testData.ts` are the site's public demo account.

Tests that create real accounts or orders on the demo site are skipped unless `PST_ALLOW_WRITES=true`.

## Structure

```
tests/auth.setup.ts   logs in once and saves the session for logged-in tests
tests/ui/             search, cart and checkout, auth, account, contact, navigation
tests/journeys/       multi-step and multi-session flows
tests/api/            API status codes, shapes, pagination and sorting
tests/a11y/           axe-core scans for serious and critical WCAG issues
tests/visual/         screenshot comparisons
pages/                page objects, one per screen
fixtures/             injects page objects into tests
data/                 test data, credentials and the write-enable flag
.github/              CI: smoke on pull requests, full run nightly, Allure to GitHub Pages
```

## Design decisions

- **Locators** use the site's `data-test` attributes through `getByTestId`, then labels and roles. CSS chains are avoided.
- **Saved login session.** Logged-in tests reuse one session instead of logging in each time.
- **Clean state.** The shared customer account's cart is emptied before each logged-in test, and invoice counts are compared before and after.
- **No fixed waits.** Playwright's auto-waiting and web-first assertions handle timing.
- **Mocked failures** target the real payment route (`/payment/check`) so error paths are tested without a real payment.
- **Write gating.** Tests that create real data are off by default.
- **Retries on CI only**, with traces, screenshots and videos kept for failures, so flaky tests stay visible.

## Status

Live selectors and API responses were checked against the site. The suite itself has not been run yet, so expect a few first-run fixes. Items marked "To verify" in [COVERAGE.md](COVERAGE.md) are the most likely to need changes.
