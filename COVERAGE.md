# Coverage map

Status key:
- **Confirmed**: checked on the live site or API.
- **To verify**: written from an assumption, not yet checked on the live site.
- **Out of scope**: needs an app the tester controls, so it can't run against the public demo.

## UI

| Area | Status | Notes |
|---|---|---|
| Login form, invalid-login error | Confirmed | `login-submit`, `login-error` ("Invalid email or password") |
| Login as the demo customer | Confirmed | Redirects to `/account`; `nav-menu` appears |
| Sign out | To verify | `nav-sign-out` exists; the menu it sits in is not confirmed. Runs only with `PST_ALLOW_WRITES=true` |
| Register form (fields and submit) | Confirmed (fields) | Submission and success are not confirmed |
| Register with an already-used email | To verify | Expected to stay on the register page; not yet submitted |
| Home page, nav, language switcher, footer | Confirmed | `nav-*`, `language-select`, `lang-fr`, `footer-learn-github` |
| Search box, reset, submit | Confirmed | `search-query`, `search-reset`, `search-submit` |
| Sort dropdown | Confirmed | `sort`; `price,asc` and `price,desc` ordering confirmed via the API |
| Eco-friendly filter | Confirmed (label and badge) | Checkbox label confirmed; `eco-badge` exists. Filtering on a narrow pane is not confirmed |
| Price slider | To verify | The slider exists (`ngx-slider-max`). Keyboard behaviour is not confirmed |
| Category pages | Confirmed (slugs) | From the categories API |
| Product cards | Confirmed | `product-name`, `product-price`, links to `/product/<id>` |
| Product page add to cart | Confirmed | `add-to-cart`, `unit-price`, `quantity` |
| Cart rows | Confirmed | `<tr>` rows with `product-title` and `product-quantity` |
| Cart quantity | Confirmed | Changing the input updates the total; there is no update button |
| Cart remove | Confirmed | Icon-only `a.btn-danger` inside the row |
| Checkout wizard steps | Confirmed | `proceed-1`, `proceed-2`, `proceed-3`, `finish` |
| Billing fields | Confirmed | `country`, `postal_code`, `house_number`, `street`, `city`, `state` |
| Payment method and success | Confirmed | `payment-method` includes "Cash on Delivery"; `payment-success-message` |
| Payment request | Confirmed | `api.practicesoftwaretesting.com/payment/check` |
| Empty or invalid billing stays on billing | To verify | Expected behaviour; the exact validation was not tested live |
| Coupon field | Not found | The test skips itself when there is no coupon field |
| Guest checkout | To verify | The test accepts either sign-in or checkout |
| Contact form fields | Confirmed | `first-name`, `last-name`, `email`, `subject`, `message`, `contact-submit` |
| Contact form submission and success | To verify | Not submitted on the live site; the success selector is a guess |
| Invoices (order history) | Confirmed | `/account/invoices`; table rows; `pagination-next`. Shared list, so counts are compared before and after |
| Mocked payment failure and timeout | Built | Routes `**/payment/check**`, confirmed path |
| Mocked expired session (401) | Built | Route `**/payment/check**` |
| Mocked products API failure | Built | Route on `api.practicesoftwaretesting.com/products` |
| Two shoppers, isolated carts | Built | Separate browser contexts |
| Double-click on finish | Built | Counts payment requests; places a real order, so it is gated |
| Cart persists across reload | Built | Uses the confirmed cart flow |
| Price-ceiling and combined-filter checks | Built | Depend on the slider and filters, which are partly confirmed |

## API

| Endpoint | Status | Notes |
|---|---|---|
| `GET /products` | Confirmed | Paginated: `data`, `current_page`, `last_page`, `total`, `per_page` (9) |
| `GET /products?page=n` | Confirmed | Page 2 returns `current_page` 2 |
| `GET /products?sort=price,asc` | Confirmed | Ascending across pages |
| `GET /products/{id}` (missing UUID) | Confirmed | Returns 404 with `message` |
| `GET /categories` | Confirmed | Top-level slugs `hand-tools`, `power-tools`, `other` |
| `GET /brands` | To verify | Status only |
| `POST /users/login` | To verify | Path not confirmed. The login page sends a request, but this was not captured |
| Protected account endpoint | To verify | Path not confirmed |

## Out of scope on the public demo site

- Real-time updates and WebSocket events
- Database seeding, reset and integrity checks
- Multi-role workflows (shopper, store staff, driver) across sessions
- Real payment provider integration
- Load and performance testing

## Known gaps

- Items marked "To verify" are the most likely first-run failures.
- Tests that create accounts or orders need `PST_ALLOW_WRITES=true`. They add real data to the public demo site.
- The shared customer account keeps its cart and invoices between runs. Tests reset the cart first and compare invoice counts before and after.
- The date of birth on registration is written as `01-01-1990`, which is not confirmed against the form's format.
- Accessibility scans cover automated WCAG checks only, not manual testing.
- The suite has not been run. Only the live selectors and API responses above have been checked.
