import { Page } from '@playwright/test';
import { ApiClient, Product } from './api-client';

/**
 * Builds a cart through the API and hands it to the browser before the app boots.
 * The shop keeps its cart id in sessionStorage, so an init script can plant it.
 * It only plants once per tab: after an order the shop clears the cart, and a later
 * page load must not bring it back.
 */
export async function seedCart(
  page: Page,
  api: ApiClient,
  items: Array<{ name: string; quantity?: number }>,
): Promise<Product[]> {
  const cartId = await api.createCart();
  const seeded: Product[] = [];
  let units = 0;

  for (const { name, quantity = 1 } of items) {
    const product = await api.productByName(name);
    const added = await api.addToCart(cartId, product.id, quantity);
    if (!added.ok()) throw new Error(`Could not add ${name} to cart: ${added.status()} ${await added.text()}`);
    seeded.push(product);
    units += quantity;
  }

  await page.addInitScript(
    ([id, count]) => {
      if (sessionStorage.getItem('seeded-cart')) return;
      sessionStorage.setItem('seeded-cart', id);
      sessionStorage.setItem('cart_id', id);
      sessionStorage.setItem('cart_quantity', count);
    },
    [cartId, String(units)],
  );

  return seeded;
}
