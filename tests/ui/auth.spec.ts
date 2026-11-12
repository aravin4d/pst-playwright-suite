import { test, expect } from '../../fixtures';
import { users, newUser, AUTH_FILE, writesEnabled } from '../../data/testData';

test.describe('Authentication', () => {
  test('@smoke valid customer can log in', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(users.customer.email, users.customer.password);
    await loginPage.expectLoggedIn();
  });

  test('@regression invalid credentials show "Invalid email or password"', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(users.invalid.email, users.invalid.password);
    await expect(loginPage.errorMessage).toHaveText(/invalid email or password/i);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('@regression empty login form does not sign in', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.submit.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('@regression login page links to register and forgot password', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.registerLink).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test('@regression password field masks input', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.password).toHaveAttribute('type', 'password');
  });

  test.describe('with a saved session', () => {
    test.use({ storageState: AUTH_FILE });

    test('@regression saved session is still logged in on a fresh page', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('nav-menu')).toBeVisible();
    });

    // Signing out can invalidate the shared session, so this test only runs when writes are enabled.
    test('@regression logged-in user can sign out', async ({ page, accountPage }) => {
      test.skip(!writesEnabled, 'Signs out the shared demo account. Set PST_ALLOW_WRITES=true to run.');
      await page.goto('/');
      await page.getByTestId('nav-menu').click();
      await accountPage.signOut.click();
      await expect(page.getByTestId('nav-sign-in')).toBeVisible();
    });
  });
});

test.describe('Registration', () => {
  test('@regression register page does not submit an empty form', async ({ registerPage, page }) => {
    await registerPage.goto();
    await registerPage.submit.click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('@regression registration rejects an already-used email', async ({ registerPage, page }) => {
    const user = newUser();
    await registerPage.goto();
    await registerPage.firstName.fill(user.firstName);
    await registerPage.lastName.fill(user.lastName);
    await registerPage.dob.fill(user.dob);
    await registerPage.country.selectOption({ label: user.country });
    await registerPage.postalCode.fill(user.postcode);
    await registerPage.houseNumber.fill(user.houseNumber);
    await registerPage.street.fill(user.street);
    await registerPage.city.fill(user.city);
    await registerPage.state.fill(user.state);
    await registerPage.phone.fill(user.phone);
    await registerPage.email.fill(users.customer.email);
    await registerPage.password.fill(user.password);
    await registerPage.submit.click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('@regression registering a new account completes', async ({ registerPage, page }) => {
    test.skip(!writesEnabled, 'Creates a real account on the demo site. Set PST_ALLOW_WRITES=true to run.');
    const user = newUser();
    await registerPage.goto();
    await registerPage.firstName.fill(user.firstName);
    await registerPage.lastName.fill(user.lastName);
    await registerPage.dob.fill(user.dob);
    await registerPage.country.selectOption({ label: user.country });
    await registerPage.postalCode.fill(user.postcode);
    await registerPage.houseNumber.fill(user.houseNumber);
    await registerPage.street.fill(user.street);
    await registerPage.city.fill(user.city);
    await registerPage.state.fill(user.state);
    await registerPage.phone.fill(user.phone);
    await registerPage.email.fill(user.email);
    await registerPage.password.fill(user.password);
    await registerPage.submit.click();
    await expect(page).not.toHaveURL(/\/auth\/register/);
  });
});
