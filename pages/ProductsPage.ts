import { Page, Locator, expect } from '@playwright/test';

// Confirmed on the live home page and product pages:
//   search-query, search-submit, search-reset, sort, eco-friendly-filter (label-based checkbox)
//   product-name and product-price on each card; eco-badge on eco-friendly cards
//   add-to-cart and unit-price on the product page; cards link to /product/<id>
export class ProductsPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly searchButton: Locator;
  readonly searchReset: Locator;
  readonly sortDropdown: Locator;
  readonly ecoFilter: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly ecoBadges: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.sortDropdown = page.getByTestId('sort');
    this.ecoFilter = page.getByLabel('Show only eco-friendly products');
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
    this.ecoBadges = page.getByTestId('eco-badge');
  }

  async goto() {
    await this.page.goto('/');
  }

  async search(term: string) {
    await this.searchBox.fill(term);
    await this.searchButton.click();
  }

  async sortBy(value: string) {
    await this.sortDropdown.selectOption(value);
  }

  async openCategory(slug: string) {
    await this.page.goto(`/category/${slug}`);
  }

  productCard(name: string): Locator {
    return this.productNames.filter({ hasText: name }).first();
  }

  async openProduct(name: string) {
    await this.productCard(name).click();
  }

  async addToCart() {
    await this.page.getByTestId('add-to-cart').click();
  }

  async addToCartByName(name: string) {
    await this.openProduct(name);
    await this.addToCart();
  }

  async expectResultsContain(term: string) {
    await expect(this.productNames.first()).toBeVisible();
    const names = await this.productNames.allTextContents();
    expect(names.some((n) => n.toLowerCase().includes(term.toLowerCase()))).toBeTruthy();
  }

  async priceValues(): Promise<number[]> {
    const texts = await this.productPrices.allTextContents();
    return texts.map((t) => parseFloat(t.replace(/[^0-9.]/g, ''))).filter((n) => !Number.isNaN(n));
  }
}
