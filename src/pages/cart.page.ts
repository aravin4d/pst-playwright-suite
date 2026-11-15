import { Locator, Page } from '@playwright/test';
import { escapeRegExp } from '../support/test-data';

/** Step one of the checkout wizard: the cart table. */
export class CartPage {
  readonly rows: Locator;
  readonly total: Locator;
  readonly proceed: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.locator('tbody tr').filter({ has: page.getByTestId('product-title') });
    this.total = page.getByTestId('cart-total');
    this.proceed = page.getByTestId('proceed-1');
  }

  async goto() {
    await this.page.goto('/checkout');
  }

  row(productName: string): Locator {
    const title = this.page
      .getByTestId('product-title')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(productName)}\\s*$`) });
    return this.rows.filter({ has: title });
  }

  quantity(productName: string): Locator {
    return this.row(productName).getByTestId('product-quantity');
  }

  linePrice(productName: string): Locator {
    return this.row(productName).getByTestId('line-price');
  }

  async setQuantity(productName: string, quantity: number) {
    const input = this.quantity(productName);
    await input.fill(String(quantity));
    // The cart saves on change, which the browser fires when the field loses focus.
    await input.blur();
  }

  async remove(productName: string) {
    // The delete control is an icon-only link with no test id.
    await this.row(productName).locator('a.btn-danger').click();
  }
}
