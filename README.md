# Toolshop test suite (Playwright + TypeScript)

Automated tests for [practicesoftwaretesting.com](https://practicesoftwaretesting.com), a demo web shop built for testers. The suite covers the shop front, the REST API behind it, and the places where the two have to agree.

I built it to show how I like a test suite to be put together: small page objects, state set up through the API rather than through clicks, and assertions on things a customer would actually notice.

## What it covers

| Area | Spec | Highlights |
|---|---|---|
| Sign in and sessions | `tests/ui/auth.spec.ts` | form validation, protected routes, token-based sessions, sign out |
| Registration | `tests/ui/register.spec.ts` | field validation, postcode lookup, duplicate email |
| Catalogue | `tests/ui/catalog.spec.ts` | search, sorting, category / eco / price filters, paging, UI checked against the API |
| Product page | `tests/ui/product.spec.ts` | price parity with the API, quantity stepper, out of stock, favourites |
| Cart | `tests/ui/cart.spec.ts` | totals maths, quantity changes, API-seeded carts, two shoppers in parallel |
| Checkout | `tests/ui/checkout.spec.ts` | guest and customer paths, payment methods, declined and timed-out payments, order payload |
| Contact | `tests/ui/contact.spec.ts` | validation, request payload, server failure |
| Navigation | `tests/ui/navigation.spec.ts` | links, language switch, mobile layout |
| Journeys | `tests/journeys/` | register → buy → invoice, guest purchase, slow and failing backend |
| API | `tests/api/` | products (paging, sort, filters), auth, cart lifecycle |
| Accessibility | `tests/a11y/` | axe scans, keyboard-only login |

## Running it

```bash
npm install
npx playwright install chromium

npm run test:smoke     # a handful of critical paths, about a minute
npm run test:ui        # all browser tests in Chromium
npm run test:api       # API tests only, no browser
npm test               # everything: API, Chromium, Firefox, WebKit, mobile
npm run report         # open the HTML report from the last run
```

Useful while writing tests: `npm run test:headed`, `npm run debug`, or `npx playwright test --ui`.

## How it is put together

```
src/
  fixtures.ts          test fixtures: page objects, API client, signed-in sessions
  pages/               one class per page or page section
  support/
    api-client.ts      typed wrapper around the shop's REST API
    seed.ts            builds a cart through the API and hands it to the browser
    test-data.ts       shoppers, addresses, small helpers
tests/
  ui/  api/  journeys/  a11y/
```

A few decisions worth explaining:

**The suite brings its own account.** The site's public demo logins are shared with everyone practising there; passwords get changed and accounts get locked. Each worker registers a throwaway shopper through the API instead, which also means a brand-new account has exactly the invoices the test created.

**Signed-in tests don't use the login form.** `test.use({ asCustomer: true })` fetches a token from the API and starts the browser with it in `localStorage`. The shop's tokens expire after five minutes, so a session saved once per run would go stale halfway through; a fresh token per test costs one request.

**State goes in through the API.** Checkout tests need a cart, not a tour of the catalogue. `seedCart` creates one with two API calls and plants its id in `sessionStorage` before the app boots.

**Expected values come from the API, not from constants.** Prices and product ids change whenever the demo database is reseeded, so tests look products up by name and compute totals from what the API returns.

**No sleeps.** Page objects wait for the specific response or element that signals "done" (for example, the grid's reload after a sort), and assertions retry on their own.

**Network stubs are used on purpose, not by default.** Happy paths hit the real backend. Stubs appear where the real thing can't be triggered on demand (a declined payment, a timeout, a slow API) or where a test would leave junk behind (contact messages).

## Things the tests taught me about the shop

- Paying takes two clicks: "Check payment" validates, then the same button turns into "Confirm" and places the order.
- Street, city and state are filled by a postcode lookup, and the order API rejects an address that doesn't match it with a 422. The UI shows nothing when that happens, which I'd raise as a bug. `checkout.spec.ts` pins the API behaviour down.
- The cart lives in `sessionStorage`, so it is per tab and survives a reload but not a new window.
- Unknown URLs redirect to the home page instead of showing a 404.

## CI

GitHub Actions runs the API, Chromium and mobile projects on every push and pull request, and the full browser matrix on weekday mornings. The HTML report is attached to each run; traces, screenshots and videos are kept for failures.

## Notes

- The tests create throwaway accounts and orders on the demo site. Its database is reset regularly.
- The target is a shared public site, so CI allows one retry; locally there are none.
- Automated accessibility checks only gate on critical violations; the full axe output is attached to the report.
