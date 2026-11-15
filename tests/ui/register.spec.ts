import { test, expect } from '../../src/fixtures';
import { newShopper } from '../../src/support/test-data';

test.describe('Registration', () => {
  test('empty form lists what is missing, field by field', async ({ registerPage }) => {
    await registerPage.goto();
    await registerPage.submit.click();

    await expect(registerPage.fieldError('first-name')).toHaveText('First name is required');
    await expect(registerPage.fieldError('last-name')).toHaveText('Last name is required');
    await expect(registerPage.fieldError('country')).toHaveText('Country is required');
    await expect(registerPage.fieldError('postal_code')).toHaveText('Postcode is required');
    await expect(registerPage.fieldError('email')).toHaveText('Email is required');
    await expect(registerPage.fieldError('dob')).toContainText('Date of Birth is required');
    await expect(registerPage.fieldError('password')).toContainText('Password is required');
  });

  test('email must look like an email', async ({ registerPage }) => {
    await registerPage.goto();
    await registerPage.email.fill('not-an-email');
    await registerPage.submit.click();

    await expect(registerPage.fieldError('email')).toHaveText('Email format is invalid');
  });

  test('a short password is flagged while typing', async ({ registerPage }) => {
    await registerPage.goto();
    await registerPage.password.fill('abc');
    await registerPage.password.blur();

    await expect(registerPage.fieldError('password')).toContainText('Password must be minimal 6 characters long');
  });

  test('postcode and house number fill in street, city and state', async ({ registerPage }) => {
    await registerPage.goto();
    await registerPage.fillAddress();

    await expect(registerPage.street).not.toHaveValue('');
    await expect(registerPage.city).not.toHaveValue('');
    await expect(registerPage.state).not.toHaveValue('');
  });

  test('an email that already has an account is refused', async ({ registerPage, customer, page }) => {
    await registerPage.goto();
    await registerPage.fill({ ...newShopper(), email: customer.email });
    await registerPage.submit.click();

    await expect(registerPage.formError).toHaveText('A customer with this email address already exists.');
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});
