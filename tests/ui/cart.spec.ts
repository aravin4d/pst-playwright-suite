import { test, expect } from '../../src/fixtures';
import { CartPage } from '../../src/pages/cart.page';
import { CatalogPage } from '../../src/pages/catalog.page';
import { ProductPage } from '../../src/pages/product.page';
import { Header } from '../../src/pages/header';
import { seedCart } from '../../src/support/seed';
import { products, usd } from '../../src/support/test-data';

test.describe('Cart', () => {
  test('holds what was added, with the right line and cart totals @smoke', async ({
    catalog,
    productPage,
    header,
    cart,
    api,
  }) => {
    const pliers = await api.productByName(products.pliers);

    await catalog.goto();
    await catalog.openProduct(pliers.name);
    await productPage.setQuantity(2);
    await productPage.addToCart();
    await header.cartLink.click();

    await expect(cart.rows).toHaveCount(1);
    await expect(cart.quantity(pliers.name)).toHaveValue('2');
    await expect(cart.linePrice(pliers.name)).toHaveText(usd(pliers.price * 2));
    await expect(cart.total).toHaveText(usd(pliers.price * 2));
  });

  test('adds up several products', async ({ catalog, productPage, header, cart, api }) => {
    const pliers = await api.productByName(products.pliers);
    const slipJoint = await api.productByName(products.slipJointPliers);

    await catalog.goto();
    await catalog.openProduct(pliers.name);
    await productPage.addToCart();
    await catalog.goto();
    await catalog.openProduct(slipJoint.name);
    await productPage.setQuantity(3);
    await productPage.addToCart();
    await header.cartLink.click();

    await expect(cart.rows).toHaveCount(2);
    await expect(cart.linePrice(pliers.name)).toHaveText(usd(pliers.price));
    await expect(cart.linePrice(slipJoint.name)).toHaveText(usd(slipJoint.price * 3));
    await expect(cart.total).toHaveText(usd(pliers.price + slipJoint.price * 3));
    await expect(header.cartBadge).toHaveText('4');
  });

  test('changing a quantity recalculates the line, the total and the badge', async ({
    catalog,
    productPage,
    header,
    cart,
    api,
  }) => {
    const pliers = await api.productByName(products.pliers);

    await catalog.goto();
    await catalog.openProduct(pliers.name);
    await productPage.addToCart();
    await header.cartLink.click();
    await expect(cart.total).toHaveText(usd(pliers.price));

    await cart.setQuantity(pliers.name, 5);

    await expect(cart.linePrice(pliers.name)).toHaveText(usd(pliers.price * 5));
    await expect(cart.total).toHaveText(usd(pliers.price * 5));
    await expect(header.cartBadge).toHaveText('5');
  });

  test('removing the only item empties the cart', async ({ catalog, productPage, header, cart }) => {
    await catalog.goto();
    await catalog.openProduct(products.pliers);
    await productPage.addToCart();
    await header.cartLink.click();
    await expect(cart.rows).toHaveCount(1);

    await cart.remove(products.pliers);

    await expect(cart.rows).toHaveCount(0);
    await expect(header.cartBadge).toBeHidden();
  });

  test('survives a page reload', async ({ page, catalog, productPage, header, cart }) => {
    await catalog.goto();
    await catalog.openProduct(products.pliers);
    await productPage.addToCart();

    await page.reload();
    await expect(header.cartBadge).toHaveText('1');
    await header.cartLink.click();

    await expect(cart.row(products.pliers)).toBeVisible();
  });

  test('a cart built through the API shows up in the UI', async ({ page, cart, header, api }) => {
    // Setting state up through the API keeps the test on the thing it is about:
    // does the cart page render what the backend holds?
    const [hammer] = await seedCart(page, api, [{ name: products.hammer, quantity: 2 }]);

    await cart.goto();

    await expect(cart.row(hammer.name)).toBeVisible();
    await expect(cart.quantity(hammer.name)).toHaveValue('2');
    await expect(cart.total).toHaveText(usd(hammer.price * 2));
    await expect(header.cartBadge).toHaveText('2');
  });

  test('two shoppers at the same time never see each other\'s cart', async ({ browser }) => {
    const asha = await browser.newContext();
    const ben = await browser.newContext();
    try {
      const ashaPage = await asha.newPage();
      const benPage = await ben.newPage();

      // Both shop in parallel, the way real users would.
      await Promise.all([
        addToCart(ashaPage, products.pliers),
        addToCart(benPage, products.slipJointPliers),
      ]);

      const ashaCart = new CartPage(ashaPage);
      const benCart = new CartPage(benPage);
      await Promise.all([new Header(ashaPage).cartLink.click(), new Header(benPage).cartLink.click()]);

      await expect(ashaCart.rows).toHaveCount(1);
      await expect(ashaCart.row(products.pliers)).toBeVisible();
      await expect(benCart.rows).toHaveCount(1);
      await expect(benCart.row(products.slipJointPliers)).toBeVisible();
    } finally {
      await asha.close();
      await ben.close();
    }
  });
});

async function addToCart(page: import('@playwright/test').Page, productName: string) {
  const catalog = new CatalogPage(page);
  await catalog.goto();
  await catalog.openProduct(productName);
  await new ProductPage(page).addToCart();
}
