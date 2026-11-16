import { test, expect } from '../../src/fixtures';
import { isProductListUrl, SortOption } from '../../src/pages/catalog.page';
import { products } from '../../src/support/test-data';

test.describe('Search', () => {
  test.beforeEach(async ({ catalog }) => {
    await catalog.goto();
  });

  test('finds products by name and says what was searched @smoke', async ({ catalog }) => {
    await catalog.search(products.pliers);

    await expect(catalog.searchCaption).toHaveText(`Searched for: ${products.pliers}`);
    await expect(catalog.card(products.pliers)).toBeVisible();
    await expect(async () => {
      const names = await catalog.names();
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) expect(name.toLowerCase()).toContain('pliers');
    }).toPass();
  });

  test('shows exactly what the search API returns', async ({ catalog, api }) => {
    const expected = (await api.searchProducts(products.pliers)).data.map((product) => product.name);

    await catalog.search(products.pliers);

    await expect.poll(() => catalog.names()).toEqual(expected);
  });

  test('ignores letter case', async ({ catalog }) => {
    await catalog.search(products.pliers.toUpperCase());

    await expect(catalog.card(products.pliers)).toBeVisible();
  });

  test('tells the shopper when nothing matches', async ({ catalog }) => {
    await catalog.search('zzz-no-such-tool');

    await expect(catalog.noResults).toHaveText('There are no products found.');
    await expect(catalog.productNames).toHaveCount(0);
  });

  test('reset brings the full grid back', async ({ catalog }) => {
    await catalog.search(products.pliers);
    await expect(catalog.searchCaption).toBeVisible();

    await catalog.clearSearch();

    await expect(catalog.searchBox).toHaveValue('');
    await expect(catalog.productNames).toHaveCount(9);
  });
});

test.describe('Sorting', () => {
  const byPrice: Array<[SortOption, string, (a: number, b: number) => number]> = [
    ['price,asc', 'cheapest first', (a, b) => a - b],
    ['price,desc', 'most expensive first', (a, b) => b - a],
  ];

  for (const [option, label, compare] of byPrice) {
    test(`by price, ${label}`, async ({ catalog }) => {
      await catalog.goto();
      await catalog.sortBy(option);

      await expect(async () => {
        const prices = await catalog.prices();
        expect(prices).toHaveLength(9);
        expect(prices).toEqual([...prices].sort(compare));
      }).toPass();
    });
  }

  const byName: Array<[SortOption, string, 1 | -1]> = [
    ['name,asc', 'A to Z', 1],
    ['name,desc', 'Z to A', -1],
  ];

  for (const [option, label, direction] of byName) {
    test(`by name, ${label}`, async ({ catalog }) => {
      await catalog.goto();
      await catalog.sortBy(option);

      await expect(async () => {
        const names = await catalog.names();
        expect(names).toHaveLength(9);
        expect(names).toEqual([...names].sort((a, b) => direction * a.localeCompare(b)));
      }).toPass();
    });
  }

  test('choosing a sort order sends it to the API along with the active filters', async ({ catalog, page }) => {
    await catalog.goto();
    const gridCall = page.waitForRequest(
      (request) => isProductListUrl(request.url()) && request.postDataJSON()?.sort === 'name,desc',
    );

    await catalog.sortBy('name,desc');

    expect((await gridCall).postDataJSON()).toMatchObject({ sort: 'name,desc', is_rental: 'false' });
  });

  test('the first page of "cheapest first" matches the API', async ({ catalog, api }) => {
    // Same defaults the shop front sends: purchasable items only, default price range.
    const expected = (
      await api.products({ sort: 'price,asc', between: 'price,1,100', is_rental: false, page: 1 })
    ).data.map((product) => product.price);

    await catalog.goto();
    await catalog.sortBy('price,asc');

    await expect.poll(() => catalog.prices()).toEqual(expected);
  });
});

test.describe('Filters', () => {
  test.beforeEach(async ({ catalog }) => {
    await catalog.goto();
  });

  test('category filter narrows the grid to that category', async ({ catalog }) => {
    await catalog.filterByCategory(products.hammer);

    await expect(async () => {
      const names = await catalog.names();
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) expect(name.toLowerCase()).toContain('hammer');
    }).toPass();
  });

  test('eco-friendly filter leaves only products with the eco badge', async ({ catalog }) => {
    await catalog.showEcoFriendlyOnly();

    await expect(async () => {
      const cards = await catalog.productNames.count();
      expect(cards).toBeGreaterThan(0);
      expect(await catalog.ecoBadges.count()).toBe(cards);
    }).toPass();
  });

  test('lowering the price ceiling hides everything above it', async ({ catalog }) => {
    const ceiling = 20;
    await catalog.setMaxPrice(ceiling);

    await expect(async () => {
      const prices = await catalog.prices();
      expect(prices.length).toBeGreaterThan(0);
      for (const price of prices) expect(price).toBeLessThanOrEqual(ceiling);
    }).toPass();
  });

  test('filter and sort work together', async ({ catalog }) => {
    await catalog.filterByCategory(products.hammer);
    await catalog.sortBy('price,desc');

    await expect(async () => {
      const names = await catalog.names();
      const prices = await catalog.prices();
      expect(names.length).toBeGreaterThan(1);
      for (const name of names) expect(name.toLowerCase()).toContain('hammer');
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    }).toPass();
  });
});

test.describe('Browsing', () => {
  test('page two shows a different set of products', async ({ catalog }) => {
    await catalog.goto();
    const firstPage = await catalog.names();

    await catalog.goToPage(2);

    await expect(async () => {
      const secondPage = await catalog.names();
      expect(secondPage).toHaveLength(9);
      expect(secondPage.filter((name) => firstPage.includes(name))).toEqual([]);
    }).toPass();
  });

  test('out-of-stock products are labelled in the grid', async ({ page, catalog, api }) => {
    const soldOut = (await api.products({ page: 1 })).data.find((product) => !product.in_stock);
    test.skip(!soldOut, 'No out-of-stock product on the first page in the current seed data');

    await catalog.goto();

    const card = page.locator('a[href*="/product/"]', { has: catalog.card(soldOut!.name) });
    await expect(card.getByTestId('out-of-stock')).toHaveText('Out of stock');
  });

  test('a category page lists only that category', async ({ page, header, catalog, api }) => {
    const handTools = (await api.allProducts({ by_category_slug: 'hand-tools' })).map((product) => product.name);

    await page.goto('/');
    await header.openCategory('hand-tools');

    await expect(page).toHaveURL(/\/category\/hand-tools/);
    await expect(page.getByTestId('page-title')).toHaveText('Category: Hand Tools');
    await expect(async () => {
      const shown = await catalog.names();
      expect(shown.length).toBeGreaterThan(0);
      for (const name of shown) expect(handTools).toContain(name);
    }).toPass();
  });
});
