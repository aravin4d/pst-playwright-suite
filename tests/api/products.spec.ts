import { test, expect, APIRequestContext } from '@playwright/test';
import { users } from '../../data/testData';

// API tests. Shapes and status codes below were confirmed against the live API.
const API = process.env.API_URL ?? 'https://api.practicesoftwaretesting.com';
const MISSING_ID = '00000000-0000-0000-0000-000000000000';

async function fetchAllProducts(request: APIRequestContext, sort?: string) {
  const products: Array<Record<string, unknown>> = [];
  const first = await (await request.get(`${API}/products${sort ? `?sort=${sort}` : ''}`)).json();
  products.push(...first.data);
  const lastPage: number = first.last_page;
  for (let page = 2; page <= lastPage; page++) {
    const url = `${API}/products?page=${page}${sort ? `&sort=${sort}` : ''}`;
    const body = await (await request.get(url)).json();
    products.push(...body.data);
  }
  return products;
}

test.describe('Products API', () => {
  test('@smoke GET /products returns 200 with a paginated data list', async ({ request }) => {
    const response = await request.get(`${API}/products`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body).toHaveProperty('current_page');
    expect(body).toHaveProperty('last_page');
    expect(body).toHaveProperty('total');
  });

  test('@regression each product has id, name, price, brand and category', async ({ request }) => {
    const body = await (await request.get(`${API}/products`)).json();
    for (const product of body.data) {
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('brand.name');
      expect(product).toHaveProperty('category.slug');
    }
  });

  test('@regression product prices are positive numbers', async ({ request }) => {
    const products = await fetchAllProducts(request);
    for (const product of products) {
      expect(Number(product.price)).toBeGreaterThan(0);
    }
  });

  test('@regression total matches the number of products across all pages', async ({ request }) => {
    const body = await (await request.get(`${API}/products`)).json();
    const products = await fetchAllProducts(request);
    expect(products.length).toBe(body.total);
  });

  test('@regression sort=price,asc orders products ascending across all pages', async ({ request }) => {
    const products = await fetchAllProducts(request, 'price,asc');
    const prices = products.map((p) => Number(p.price));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test('@regression sort=price,desc orders products descending across all pages', async ({ request }) => {
    const products = await fetchAllProducts(request, 'price,desc');
    const prices = products.map((p) => Number(p.price));
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  test('@regression unknown product id returns 404 with a message', async ({ request }) => {
    const response = await request.get(`${API}/products/${MISSING_ID}`);
    expect(response.status()).toBe(404);
    expect(await response.json()).toHaveProperty('message');
  });

  test('@regression GET /categories returns 200 with top-level category slugs', async ({ request }) => {
    const response = await request.get(`${API}/categories`);
    expect(response.status()).toBe(200);
    const categories: Array<{ slug: string; parent_id: string | null }> = await response.json();
    const topLevel = categories.filter((c) => c.parent_id === null).map((c) => c.slug);
    expect(topLevel).toEqual(expect.arrayContaining(['hand-tools', 'power-tools', 'other']));
  });

  test('@regression GET /brands returns 200', async ({ request }) => {
    const response = await request.get(`${API}/brands`);
    expect(response.status()).toBe(200);
  });
});

test.describe('Authentication API', () => {
  // The login and account endpoint paths below are not yet confirmed against the live API.
  test('@regression valid credentials return a token (endpoint to verify)', async ({ request }) => {
    const response = await request.post(`${API}/users/login`, {
      data: { email: users.customer.email, password: users.customer.password },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toHaveProperty('access_token');
  });

  test('@regression wrong password is rejected with 401 (endpoint to verify)', async ({ request }) => {
    const response = await request.post(`${API}/users/login`, {
      data: { email: users.customer.email, password: 'wrong-password' },
    });
    expect(response.status()).toBe(401);
  });

  test('@regression protected endpoint without a token returns 401 (endpoint to verify)', async ({ request }) => {
    const response = await request.get(`${API}/users/account`);
    expect(response.status()).toBe(401);
  });
});
