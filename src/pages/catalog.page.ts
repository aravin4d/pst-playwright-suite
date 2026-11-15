import { expect, Locator, Page, Response } from '@playwright/test';
import { escapeRegExp, toNumber } from '../support/test-data';

export type SortOption = 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';

/**
 * True for the calls that load the product grid. The shop sends them with the
 * HTTP QUERY method and a JSON body, so match on the path, not on a query string.
 */
export function isProductListUrl(url: string | URL): boolean {
  return /\/products(\/search)?$/.test(new URL(url).pathname);
}

const isProductListCall = (response: Response) =>
  isProductListUrl(response.url()) && response.request().method() !== 'OPTIONS' && response.ok();

/** The home page: product grid with search, sort and filters. */
export class CatalogPage {
  readonly searchBox: Locator;
  readonly searchButton: Locator;
  readonly searchReset: Locator;
  readonly searchCaption: Locator;
  readonly noResults: Locator;
  readonly sort: Locator;
  readonly ecoOnly: Locator;
  readonly filtersToggle: Locator;
  readonly maxPriceHandle: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly ecoBadges: Locator;
  readonly outOfStockLabels: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.searchCaption = page.getByTestId('search-caption');
    this.noResults = page.getByTestId('no-results');
    this.sort = page.getByTestId('sort');
    this.ecoOnly = page.getByTestId('eco-friendly-filter');
    // The toggle button and the panel it opens share a test id, so go by role.
    this.filtersToggle = page.getByRole('button', { name: 'Filters' });
    this.maxPriceHandle = page.getByRole('slider', { name: 'ngx-slider-max' });
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
    this.ecoBadges = page.getByTestId('eco-badge');
    this.outOfStockLabels = page.getByTestId('out-of-stock');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.productNames.first()).toBeVisible();
  }

  /**
   * Search, sort and every filter re-fetch the grid. Waiting for that response
   * before returning means callers never read the grid from before the change.
   */
  private async afterGridReload(action: () => Promise<unknown>) {
    const reloaded = this.page.waitForResponse(isProductListCall);
    await action();
    await reloaded;
  }

  async search(term: string) {
    await this.searchBox.fill(term);
    await this.afterGridReload(() => this.searchButton.click());
  }

  async clearSearch() {
    await this.afterGridReload(() => this.searchReset.click());
  }

  async sortBy(option: SortOption) {
    await this.afterGridReload(() => this.sort.selectOption(option));
  }

  async filterByCategory(name: string) {
    await this.afterGridReload(() => this.page.getByRole('checkbox', { name, exact: true }).check());
  }

  async showEcoFriendlyOnly() {
    await this.afterGridReload(() => this.ecoOnly.check());
  }

  /** Drags the upper price handle down with the keyboard; one arrow press is one dollar. */
  async lowerMaxPriceBy(dollars: number): Promise<number> {
    await this.maxPriceHandle.focus();
    await this.afterGridReload(async () => {
      for (let i = 0; i < dollars; i++) await this.page.keyboard.press('ArrowLeft');
    });
    return Number(await this.maxPriceHandle.getAttribute('aria-valuenow'));
  }

  async goToPage(number: number) {
    await this.afterGridReload(() => this.page.getByLabel(`Page-${number}`).click());
  }

  /** The card whose name is exactly `name` ("Pliers" must not match "Slip Joint Pliers"). */
  card(name: string): Locator {
    return this.productNames.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`) });
  }

  async openProduct(name: string) {
    await this.search(name);
    await this.card(name).click();
    await this.page.waitForURL(/\/product\//);
  }

  async names(): Promise<string[]> {
    return (await this.productNames.allInnerTexts()).map((name) => name.trim());
  }

  async prices(): Promise<number[]> {
    return (await this.productPrices.allInnerTexts()).map(toNumber);
  }
}
