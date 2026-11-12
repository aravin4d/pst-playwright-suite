import { Page, Locator, expect } from '@playwright/test';

// Confirmed on the live site:
//   the order history is "My invoices" at /account/invoices
//   invoices are table rows (no data-test attributes); pagination-next and pagination-prev exist
//   nav-sign-out signs the customer out
// The invoice list is shared on the demo site, so tests should compare counts before and after.
export class AccountPage {
  readonly page: Page;
  readonly invoiceRows: Locator;
  readonly paginationNext: Locator;
  readonly signOut: Locator;

  constructor(page: Page) {
    this.page = page;
    this.invoiceRows = page.locator('table tbody tr');
    this.paginationNext = page.getByTestId('pagination-next');
    this.signOut = page.getByTestId('nav-sign-out');
  }

  async gotoInvoices() {
    await this.page.goto('/account/invoices');
    await expect(this.invoiceRows.first()).toBeVisible();
  }

  async invoiceCount(): Promise<number> {
    await this.gotoInvoices();
    return this.invoiceRows.count();
  }
}
