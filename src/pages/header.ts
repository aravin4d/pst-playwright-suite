import { Locator, Page } from '@playwright/test';

/** The navbar that sits on top of every page. */
export class Header {
  readonly signIn: Locator;
  readonly userMenu: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly contact: Locator;
  readonly categories: Locator;
  readonly languageButton: Locator;
  readonly menuToggle: Locator;

  constructor(private readonly page: Page) {
    this.signIn = page.getByTestId('nav-sign-in');
    this.userMenu = page.getByTestId('nav-menu');
    this.cartLink = page.getByTestId('nav-cart');
    this.cartBadge = page.getByTestId('cart-quantity');
    this.contact = page.getByTestId('nav-contact');
    this.categories = page.getByTestId('nav-categories');
    this.languageButton = page.getByTestId('language-select');
    this.menuToggle = page.getByRole('button', { name: 'Toggle navigation' });
  }

  /** Items in the cart according to the badge. The badge is not rendered for an empty cart. */
  async cartCount(): Promise<number> {
    if ((await this.cartBadge.count()) === 0) return 0;
    return Number(await this.cartBadge.innerText());
  }

  async openCategory(name: 'hand-tools' | 'power-tools' | 'other' | 'special-tools' | 'rentals') {
    await this.categories.click();
    await this.page.getByTestId(`nav-${name}`).click();
  }

  async switchLanguage(code: 'de' | 'en' | 'es' | 'fr' | 'nl' | 'tr') {
    await this.languageButton.click();
    await this.page.getByTestId(`lang-${code}`).click();
  }

  async signOut() {
    await this.userMenu.click();
    await this.page.getByTestId('nav-sign-out').click();
  }
}
