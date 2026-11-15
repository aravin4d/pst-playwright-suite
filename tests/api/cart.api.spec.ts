import { test, expect } from '../../src/fixtures';
import { products } from '../../src/support/test-data';

// One test walks a cart through its whole life. The steps depend on each other,
// so they live in a single test with named steps instead of pretending to be independent.
test.describe('Cart API', () => {
  test('a cart can be created, filled, changed and deleted', async ({ api }) => {
    const pliers = await api.productByName(products.pliers);
    const hammer = await api.productByName(products.hammer);

    const cartId = await test.step('create', async () => {
      const response = await api.createCartRaw();
      expect(response.status()).toBe(201);
      const { id } = await response.json();
      expect(id).toEqual(expect.any(String));
      return id as string;
    });

    await test.step('add two products', async () => {
      const first = await api.addToCart(cartId, pliers.id, 1);
      expect(first.status()).toBe(200);
      expect(await first.json()).toEqual({ result: 'item added or updated' });
      expect((await api.addToCart(cartId, hammer.id, 2)).status()).toBe(200);

      expect(await itemsIn(cartId)).toEqual({ [pliers.id]: 1, [hammer.id]: 2 });
    });

    await test.step('adding the same product again increases its quantity', async () => {
      expect((await api.addToCart(cartId, pliers.id, 2)).status()).toBe(200);

      expect(await itemsIn(cartId)).toEqual({ [pliers.id]: 3, [hammer.id]: 2 });
    });

    await test.step('set a quantity directly', async () => {
      const response = await api.setCartQuantity(cartId, hammer.id, 5);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ success: true });

      expect(await itemsIn(cartId)).toEqual({ [pliers.id]: 3, [hammer.id]: 5 });
    });

    await test.step('remove one product', async () => {
      expect((await api.removeFromCart(cartId, pliers.id)).status()).toBe(204);

      expect(await itemsIn(cartId)).toEqual({ [hammer.id]: 5 });
    });

    await test.step('delete the cart', async () => {
      expect((await api.deleteCart(cartId)).status()).toBe(204);
      expect((await api.getCart(cartId)).status()).toBe(404);
    });

    async function itemsIn(id: string): Promise<Record<string, number>> {
      const response = await api.getCart(id);
      expect(response.status()).toBe(200);
      const cart: { cart_items: Array<{ product_id: string; quantity: number }> } = await response.json();
      return Object.fromEntries(cart.cart_items.map((item) => [item.product_id, item.quantity]));
    }
  });

  test('adding a product that does not exist is rejected', async ({ api }) => {
    const cartId = await api.createCart();

    const response = await api.addToCart(cartId, '01ARZ3NDEKTSV4RRFFQ69G5FAV', 1);

    expect(response.ok()).toBe(false);
    await api.deleteCart(cartId);
  });

  test('an unknown cart is a 404', async ({ api }) => {
    const response = await api.getCart('01ARZ3NDEKTSV4RRFFQ69G5FAV');

    expect(response.status()).toBe(404);
  });
});
