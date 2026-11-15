import { test, expect } from '../../src/fixtures';
import { ApiClient } from '../../src/support/api-client';
import { newShopper } from '../../src/support/test-data';

test.describe('Auth API', () => {
  test('login returns a short-lived bearer token @smoke', async ({ api, customer }) => {
    const response = await api.loginRaw(customer.email, customer.password);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      access_token: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/), // header.payload.signature
      token_type: 'bearer',
      expires_in: 300,
    });
  });

  test('wrong credentials get a 401 with no hint about what was wrong', async ({ api }) => {
    const response = await api.loginRaw('nobody@example.invalid', 'not-the-password');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  test('the token identifies its owner', async ({ api, customer }) => {
    const token = await api.login(customer);

    const response = await api.me(token);

    expect(response.status()).toBe(200);
    const me = await response.json();
    expect(me.email).toBe(customer.email);
    expect(me).not.toHaveProperty('password');
  });

  const protectedEndpoints: Array<[string, (api: ApiClient) => ReturnType<ApiClient['me']>]> = [
    ['/users/me', (api) => api.me()],
    ['/invoices', (api) => api.invoices()],
  ];

  for (const [name, call] of protectedEndpoints) {
    test(`${name} is closed without a token`, async ({ api }) => {
      const response = await call(api);

      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
    });
  }

  test('a made-up token is rejected', async ({ api }) => {
    const response = await api.me('not.a.real.token');

    expect(response.status()).toBe(401);
  });

  test('a new shopper can register and then log in', async ({ api }) => {
    const shopper = newShopper();

    const registered = await api.registerRaw(shopper);
    expect(registered.status()).toBe(201);
    const body = await registered.json();
    expect(body).toMatchObject({ first_name: shopper.firstName, last_name: shopper.lastName, email: shopper.email });
    expect(body).not.toHaveProperty('password');

    const login = await api.loginRaw(shopper.email, shopper.password);
    expect(login.status()).toBe(200);
  });

  test('registering the same email twice is refused', async ({ api, customer }) => {
    const response = await api.registerRaw({ ...newShopper(), email: customer.email });

    expect(response.status()).toBe(409);
    expect(JSON.stringify(await response.json())).toContain('already exists');
  });

  test('a weak password is refused', async ({ api }) => {
    const response = await api.registerRaw({ ...newShopper(), password: 'password' });

    expect(response.status()).toBe(422);
    expect(await response.json()).toHaveProperty('password');
  });

  test('a fresh account has no invoices', async ({ api }) => {
    const token = await api.login(await api.register());

    const response = await api.invoices(token);

    expect(response.status()).toBe(200);
    expect((await response.json()).data).toEqual([]);
  });
});
