import { expect, Locator, Page } from '@playwright/test';
import { Header } from './header';
import { toNumber } from '../support/test-data';

export class ProductPage {
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly quantity: Locator;
  readonly increase: Locator;
  readonly decrease: Locator;
  readonly addToCartButton: Locator;
  readonly addToFavorites: Locator;
  readonly outOfStock: Locator;
  readonly relatedProducts: Locator;
  readonly toast: Locator;
  private readonly header: Header;

  constructor(private readonly page: Page) {
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.quantity = page.getByTestId('quantity');
    this.increase = page.getByTestId('increase-quantity');
    this.decrease = page.getByTestId('decrease-quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.addToFavorites = page.getByTestId('add-to-favorites');
    this.outOfStock = page.getByTestId('out-of-stock');
    this.relatedProducts = page.locator('.card-title');
    this.toast = page.locator('.toast-container');
    this.header = new Header(page);
  }

  async price(): Promise<number> {
    return toNumber(await this.unitPrice.innerText());
  }

  async setQuantity(target: number) {
    let current = Number(await this.quantity.inputValue());
    while (current < target) {
      await this.increase.click();
      current += 1;
    }
    await expect(this.quantity).toHaveValue(String(target));
  }

  /**
   * Adds the chosen quantity and waits for the navbar badge to catch up.
   * The cart call is asynchronous; leaving the page before it lands loses the item.
   */
  async addToCart() {
    const before = await this.header.cartCount();
    const adding = Number(await this.quantity.inputValue());
    await this.addToCartButton.click();
    await expect(this.header.cartBadge).toHaveText(String(before + adding));
  }
}
