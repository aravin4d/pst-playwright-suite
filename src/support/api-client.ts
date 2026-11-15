import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { Account, billingAddress, newShopper } from './test-data';

export type Product = {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
  is_eco_friendly: boolean;
  is_rental: boolean;
  category: { name: string; slug: string };
  brand: { name: string };
};

export type ProductPage = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  data: Product[];
};

/**
 * Thin wrapper over the shop's REST API. UI tests use it to set things up
 * (accounts, tokens, carts) and to look up expected values, API tests use it directly.
 */
export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  // --- products ---

  listProducts(params: Record<string, string | number | boolean> = {}): Promise<APIResponse> {
    return this.request.get('/products', { params });
  }

  async products(params: Record<string, string | number | boolean> = {}): Promise<ProductPage> {
    const response = await this.listProducts(params);
    expect(response, `GET /products ${JSON.stringify(params)}`).toBeOK();
    return response.json();
  }

  /** Every product across all pages, in the order the API returns them. */
  async allProducts(params: Record<string, string | number | boolean> = {}): Promise<Product[]> {
    const first = await this.products({ ...params, page: 1 });
    const rest = await Promise.all(
      Array.from({ length: first.last_page - 1 }, (_, i) => this.products({ ...params, page: i + 2 })),
    );
    return [first, ...rest].flatMap((page) => page.data);
  }

  async searchProducts(query: string): Promise<ProductPage> {
    const response = await this.request.get('/products/search', { params: { q: query } });
    expect(response, `search for "${query}"`).toBeOK();
    return response.json();
  }

  /** Looks a product up by its exact name. IDs change whenever the demo database is reseeded. */
  async productByName(name: string): Promise<Product> {
    const { data } = await this.searchProducts(name);
    const match = data.find((product) => product.name === name);
    expect(match, `product named "${name}"`).toBeTruthy();
    return match!;
  }

  getProduct(id: string): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  categories(): Promise<APIResponse> {
    return this.request.get('/categories');
  }

  brands(): Promise<APIResponse> {
    return this.request.get('/brands');
  }

  // --- users ---

  registerRaw(shopper: ReturnType<typeof newShopper>): Promise<APIResponse> {
    return this.request.post('/users/register', {
      data: {
        first_name: shopper.firstName,
        last_name: shopper.lastName,
        dob: shopper.dob,
        phone: shopper.phone,
        email: shopper.email,
        password: shopper.password,
        address: {
          street: 'Test Lane',
          house_number: billingAddress.houseNumber,
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          country: billingAddress.country,
          postal_code: billingAddress.postcode,
        },
      },
    });
  }

  async register(shopper = newShopper()): Promise<Account> {
    const response = await this.registerRaw(shopper);
    expect(response.status(), `register ${shopper.email}: ${await response.text()}`).toBe(201);
    return shopper;
  }

  loginRaw(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/users/login', { data: { email, password } });
  }

  async login(account: Pick<Account, 'email' | 'password'>): Promise<string> {
    const response = await this.loginRaw(account.email, account.password);
    expect(response.status(), `login as ${account.email}`).toBe(200);
    return (await response.json()).access_token;
  }

  me(token?: string): Promise<APIResponse> {
    return this.request.get('/users/me', { headers: token ? bearer(token) : {} });
  }

  invoices(token?: string): Promise<APIResponse> {
    return this.request.get('/invoices', { headers: token ? bearer(token) : {} });
  }

  // --- carts ---

  createCartRaw(): Promise<APIResponse> {
    return this.request.post('/carts');
  }

  async createCart(): Promise<string> {
    const response = await this.createCartRaw();
    expect(response.status(), 'create cart').toBe(201);
    return (await response.json()).id;
  }

  addToCart(cartId: string, productId: string, quantity = 1): Promise<APIResponse> {
    return this.request.post(`/carts/${cartId}`, { data: { product_id: productId, quantity } });
  }

  setCartQuantity(cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.request.put(`/carts/${cartId}/product/quantity`, {
      data: { product_id: productId, quantity },
    });
  }

  removeFromCart(cartId: string, productId: string): Promise<APIResponse> {
    return this.request.delete(`/carts/${cartId}/product/${productId}`);
  }

  getCart(cartId: string): Promise<APIResponse> {
    return this.request.get(`/carts/${cartId}`);
  }

  deleteCart(cartId: string): Promise<APIResponse> {
    return this.request.delete(`/carts/${cartId}`);
  }
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
