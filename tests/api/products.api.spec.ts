import { test, expect } from '../../src/fixtures';

test.describe('Products API', () => {
  test('lists products in pages of nine with paging metadata @smoke', async ({ api }) => {
    const page = await api.products();

    expect(page.current_page).toBe(1);
    expect(page.per_page).toBe(9);
    expect(page.data).toHaveLength(9);
    expect(page.last_page).toBe(Math.ceil(page.total / page.per_page));
  });

  test('every product carries what the shop front needs to render it', async ({ api }) => {
    const { data } = await api.products();

    for (const product of data) {
      expect(product).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
        in_stock: expect.any(Boolean),
        is_eco_friendly: expect.any(Boolean),
        category: { name: expect.any(String), slug: expect.any(String) },
        brand: { name: expect.any(String) },
      });
      expect(product.price).toBeGreaterThan(0);
    }
  });

  test('pages do not overlap and together add up to the total', async ({ api }) => {
    const { total } = await api.products();
    const everything = await api.allProducts();
    const ids = everything.map((product) => product.id);

    expect(ids).toHaveLength(total);
    expect(new Set(ids).size).toBe(total);
  });

  test('asking for a page past the end returns an empty list, not an error', async ({ api }) => {
    const { last_page } = await api.products();
    const beyond = await api.products({ page: last_page + 1 });

    expect(beyond.data).toEqual([]);
  });

  const sorts: Array<[string, (a: number, b: number) => number]> = [
    ['price,asc', (a, b) => a - b],
    ['price,desc', (a, b) => b - a],
  ];

  for (const [sort, compare] of sorts) {
    test(`sort=${sort} holds across every page, not just the first`, async ({ api }) => {
      const prices = (await api.allProducts({ sort })).map((product) => product.price);

      expect(prices.length).toBeGreaterThan(9);
      expect(prices).toEqual([...prices].sort(compare));
    });
  }

  test('between=price,min,max returns only products inside the range', async ({ api }) => {
    const inRange = await api.allProducts({ between: 'price,10,20' });

    expect(inRange.length).toBeGreaterThan(0);
    for (const product of inRange) {
      expect(product.price).toBeGreaterThanOrEqual(10);
      expect(product.price).toBeLessThanOrEqual(20);
    }
  });

  test('eco_friendly=true returns only eco-friendly products', async ({ api }) => {
    const eco = await api.allProducts({ eco_friendly: true });

    expect(eco.length).toBeGreaterThan(0);
    expect(eco.every((product) => product.is_eco_friendly)).toBe(true);
  });

  test('filters combine: eco-friendly products under 20 dollars, cheapest first', async ({ api }) => {
    const result = await api.allProducts({ eco_friendly: true, between: 'price,1,20', sort: 'price,asc' });
    const prices = result.map((product) => product.price);

    expect(result.every((product) => product.is_eco_friendly && product.price <= 20)).toBe(true);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('search matches on the product name', async ({ api }) => {
    const { data } = await api.searchProducts('pliers');

    expect(data.length).toBeGreaterThan(0);
    for (const product of data) expect(product.name.toLowerCase()).toContain('pliers');
  });

  test('search with no match returns an empty page', async ({ api }) => {
    const result = await api.searchProducts('zzz-no-such-tool');

    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });

  test('a single product matches its entry in the list', async ({ api }) => {
    const [fromList] = (await api.products()).data;

    const response = await api.getProduct(fromList.id);

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: fromList.id, name: fromList.name, price: fromList.price });
  });

  test('an unknown product id is a clean 404', async ({ api }) => {
    const response = await api.getProduct('01ARZ3NDEKTSV4RRFFQ69G5FAV');

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ message: 'Requested item not found' });
  });
});

test.describe('Catalogue reference data', () => {
  test('categories form a tree whose children all point at a real parent', async ({ api }) => {
    const response = await api.categories();
    expect(response.status()).toBe(200);
    const categories: Array<{ id: string; slug: string; parent_id: string | null }> = await response.json();

    const topLevel = categories.filter((category) => category.parent_id === null);
    const ids = new Set(categories.map((category) => category.id));

    expect(topLevel.map((category) => category.slug)).toEqual(
      expect.arrayContaining(['hand-tools', 'power-tools', 'other']),
    );
    // Every child points at a category that exists.
    for (const category of categories.filter((c) => c.parent_id !== null)) {
      expect(ids.has(category.parent_id!)).toBe(true);
    }
  });

  test('brands have an id, a name and a slug', async ({ api }) => {
    const response = await api.brands();
    expect(response.status()).toBe(200);
    const brands: Array<Record<string, unknown>> = await response.json();

    expect(brands.length).toBeGreaterThan(0);
    for (const brand of brands) {
      expect(brand).toMatchObject({ id: expect.any(String), name: expect.any(String), slug: expect.any(String) });
    }
  });
});
