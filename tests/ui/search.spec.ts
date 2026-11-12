import { test, expect } from '../../fixtures';
import { searchTerms, categories } from '../../data/testData';

test.describe('Product search', () => {
  test('@smoke @mobile searching a known product returns matching results', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.search(searchTerms.known);
    await productsPage.expectResultsContain(searchTerms.known);
  });

  test('@regression unknown term shows no product cards', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.search(searchTerms.unknown);
    await expect(productsPage.productNames).toHaveCount(0);
  });

  test('@regression search is case-insensitive', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.search(searchTerms.known.toUpperCase());
    await productsPage.expectResultsContain(searchTerms.known);
  });

  test('@regression reset button clears the search box', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.searchBox.fill(searchTerms.known);
    await productsPage.searchReset.click();
    await expect(productsPage.searchBox).toHaveValue('');
  });

  test('@regression search for a specific product name finds it', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.search(searchTerms.secondProduct);
    await productsPage.expectResultsContain(searchTerms.secondProduct);
  });
});

test.describe('Sorting and filters', () => {
  test('@regression sort by price low to high orders products ascending', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.sortBy('price,asc');
    const prices = await productsPage.priceValues();
    expect(prices.length).toBeGreaterThan(1);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test('@regression sort by price high to low orders products descending', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.sortBy('price,desc');
    const prices = await productsPage.priceValues();
    expect(prices.length).toBeGreaterThan(1);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  test('@regression sort by name A to Z orders products alphabetically', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.sortBy('name,asc');
    const names = await productsPage.productNames.allTextContents();
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test('@regression eco-friendly filter shows only eco-friendly products', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.ecoFilter.check();
    const cards = await productsPage.productNames.count();
    expect(cards).toBeGreaterThan(0);
    // Every visible card must carry the eco badge.
    await expect(productsPage.ecoBadges).toHaveCount(cards);
  });

  // The slider is confirmed to exist. Its keyboard behaviour is not yet confirmed, so this test
  // is marked as needing a first-run check.
  test('@regression price slider lowers the price ceiling and hides products above it', async ({ productsPage, page }) => {
    await productsPage.goto();
    const max = page.getByRole('slider', { name: 'ngx-slider-max' });
    await max.focus();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    const newMax = Number(await max.getAttribute('aria-valuenow'));
    expect(newMax).toBeLessThan(200);
    for (const price of await productsPage.priceValues()) {
      expect(price).toBeLessThanOrEqual(newMax);
    }
  });

  for (const slug of categories) {
    test(`@regression category ${slug} loads products`, async ({ productsPage }) => {
      await productsPage.openCategory(slug);
      await expect(productsPage.productNames.first()).toBeVisible();
    });
  }

  test('@regression combined filters: category, eco-friendly and sort keep results valid', async ({ productsPage, page }) => {
    await productsPage.openCategory(categories[0]);
    await productsPage.ecoFilter.check();
    await productsPage.sortBy('price,asc');
    const prices = await productsPage.priceValues();
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });
});
