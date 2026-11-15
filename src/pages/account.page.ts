import { Locator, Page } from '@playwright/test';

/** "My account" and the invoice pages under it. */
export class AccountPage {
  readonly title: Locator;
  readonly invoiceRows: Locator;

  // invoice detail
  readonly invoiceNumber: Locator;
  readonly invoiceTotal: Locator;
  readonly paymentMethod: Locator;
  readonly invoiceLines: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByTestId('page-title');
    this.invoiceRows = page.locator('table tbody tr');
    this.invoiceNumber = page.getByTestId('invoice-number');
    this.invoiceTotal = page.getByTestId('total');
    this.paymentMethod = page.getByTestId('payment-method');
    this.invoiceLines = page.locator('table tbody tr');
  }

  async goto() {
    await this.page.goto('/account');
  }

  async gotoInvoices() {
    await this.page.goto('/account/invoices');
  }

  /** Invoice details are rendered as read-only inputs; this reads either an input or plain text. */
  async read(field: Locator): Promise<string> {
    await field.waitFor();
    return field.evaluate((el) => ((el as HTMLInputElement).value ?? el.textContent ?? '').trim());
  }

  invoiceRow(invoiceNumber: string): Locator {
    return this.invoiceRows.filter({ hasText: invoiceNumber });
  }

  async openInvoice(invoiceNumber: string) {
    await this.invoiceRow(invoiceNumber).getByRole('link', { name: 'Details' }).click();
    await this.page.waitForURL(/\/account\/invoices\/.+/);
  }
}
