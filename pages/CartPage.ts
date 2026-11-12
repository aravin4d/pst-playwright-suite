import { Page, Locator, expect } from '@playwright/test';

// Confirmed on the live checkout page, which is also the cart page:
//   each cart row is a <tr> containing data-test="product-title" and "product-quantity"
//   quantity is a number input; changing it updates the totals without an update button
//   remove is an icon-only link with class btn-danger inside the row
//   cart-total and line-price show totals; proceed-1 starts checkout
export class CartPage {
  readonly page: Page;
  readonly cartRows: Locator;
  readonly total: Locator;
  readonly proceedToCheckout: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartRows = page.locator('tr', { has: page.getByTestId('product-title') });
    this.total = page.getByTestId('cart-total');
    this.proceedToCheckout = page.getByTestId('proceed-1');
  }

  async goto() {
    await this.page.goto('/checkout');
  }

  row(index: number): Locator {
    return this.cartRows.nth(index);
  }

  quantityInput(index: number): Locator {
    return this.row(index).getByTestId('product-quantity');
  }

  async setQuantity(index: number, qty: number) {
    const input = this.quantityInput(index);
    await input.fill(String(qty));
    await input.press('Tab');
  }

  async expectItemCount(count: number) {
    await expect(this.cartRows).toHaveCount(count);
  }

  async removeFirstItem() {
    const before = await this.cartRows.count();
    await this.row(0).locator('a.btn-danger').click();
    await expect(this.cartRows).toHaveCount(before - 1);
  }

  // Empties the cart. Needed because the shared customer account keeps its cart between tests.
  async clear(maxItems = 20) {
    await this.goto();
    for (let i = 0; i < maxItems; i++) {
      if ((await this.cartRows.count()) === 0) return;
      await this.removeFirstItem();
    }
  }

  async totalValue(): Promise<number> {
    await expect(this.total).not.toHaveText('');
    const text = await this.total.innerText();
    return parseFloat(text.replace(/[^0-9.]/g, ''));
  }

  // Waits until the total changes from the given value, so tests don't read a stale total.
  async expectTotalToBe(value: number) {
    await expect
      .poll(async () => this.totalValue(), { timeout: 10_000 })
      .toBeCloseTo(value, 2);
  }
}
