import { test, expect } from '../../src/fixtures';
import { products } from '../../src/support/test-data';

test.describe('Product page', () => {
  test('shows the same name and price the API has for the product', async ({ catalog, productPage, api }) => {
    const fromApi = await api.productByName(products.pliers);

    await catalog.goto();
    await catalog.openProduct(products.pliers);

    await expect(productPage.name).toHaveText(fromApi.name);
    expect(await productPage.price()).toBe(fromApi.price);
  });

  test('quantity stepper goes up and never drops below one', async ({ catalog, productPage }) => {
    await catalog.goto();
    await catalog.openProduct(products.pliers);
    await expect(productPage.quantity).toHaveValue('1');

    await productPage.increase.click();
    await productPage.increase.click();
    await expect(productPage.quantity).toHaveValue('3');

    for (let i = 0; i < 4; i++) await productPage.decrease.click();
    await expect(productPage.quantity).toHaveValue('1');
  });

  test('adding to cart confirms with a toast and updates the navbar badge @smoke', async ({
    catalog,
    productPage,
    header,
  }) => {
    await catalog.goto();
    await catalog.openProduct(products.pliers);
    await productPage.setQuantity(2);
    await productPage.addToCart();

    await expect(productPage.toast).toContainText('Product added to shopping cart');
    await expect(header.cartBadge).toHaveText('2');
  });

  test('an out-of-stock product cannot be added to the cart', async ({ page, catalog, productPage, header, api }) => {
    const soldOut = (await api.allProducts()).find((product) => !product.in_stock);
    test.skip(!soldOut, 'No out-of-stock product in the current seed data');

    await catalog.goto();
    await catalog.openProduct(soldOut!.name);

    await expect(productPage.outOfStock).toHaveText('Out of stock');
    await expect(productPage.addToCartButton).toBeDisabled();
    await expect(productPage.quantity).toBeDisabled();
    await expect(productPage.increase).toBeDisabled();
    await expect(header.cartBadge).toBeHidden();
    await expect(page).toHaveURL(/\/product\//);
  });

  test('suggests related products', async ({ catalog, productPage }) => {
    await catalog.goto();
    await catalog.openProduct(products.pliers);

    await expect(productPage.relatedProducts.first()).toBeVisible();
    expect(await productPage.relatedProducts.count()).toBeGreaterThan(0);
  });

  test('favourites need an account: a guest gets told so', async ({ catalog, productPage }) => {
    await catalog.goto();
    await catalog.openProduct(products.pliers);
    await productPage.addToFavorites.click();

    await expect(productPage.toast).toContainText('Unauthorized, can not add product to your favorite list.');
  });
});
