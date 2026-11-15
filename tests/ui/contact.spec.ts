import { test, expect } from '../../src/fixtures';
import { ContactForm } from '../../src/pages/contact.page';

const validMessage: ContactForm = {
  firstName: 'Aravind',
  lastName: 'Natarajan',
  email: 'aravind.qa@example.com',
  subject: 'Customer service',
  message: 'This message comes from an automated Playwright test. No reply is needed, thank you.',
};

test.describe('Contact form', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.goto();
  });

  test('every field is required', async ({ contactPage }) => {
    await contactPage.send.click();

    await expect(contactPage.fieldError('first-name')).toHaveText('First name is required');
    await expect(contactPage.fieldError('last-name')).toHaveText('Last name is required');
    await expect(contactPage.fieldError('email')).toHaveText('Email is required');
    await expect(contactPage.fieldError('subject')).toHaveText('Subject is required');
    await expect(contactPage.fieldError('message')).toHaveText('Message is required');
  });

  test('rejects a bad email and a message under 50 characters', async ({ contactPage }) => {
    await contactPage.fill({ ...validMessage, email: 'bad-email', message: 'Too short.' });
    await contactPage.send.click();

    await expect(contactPage.fieldError('email')).toHaveText('Email format is invalid');
    await expect(contactPage.fieldError('message')).toHaveText('Message must be minimal 50 characters');
  });

  test('offers the expected subjects', async ({ contactPage }) => {
    const options = await contactPage.subject.locator('option').allTextContents();

    expect(options.map((option) => option.trim()).slice(1)).toEqual([
      'Customer service',
      'Webmaster',
      'Return',
      'Payments',
      'Warranty',
      'Status of my order',
    ]);
  });

  test('sends what was typed and thanks the sender', async ({ contactPage, page }) => {
    // Stubbed so the shared demo inbox doesn't fill up with test messages.
    await page.route('**/messages', (route) => route.fulfill({ json: { success: true } }));
    const sent = page.waitForRequest((request) => request.url().endsWith('/messages') && request.method() === 'POST');

    await contactPage.fill(validMessage);
    await contactPage.send.click();

    expect((await sent).postDataJSON()).toEqual({
      name: `${validMessage.firstName} ${validMessage.lastName}`,
      email: validMessage.email,
      subject: 'customer-service',
      message: validMessage.message,
    });
    await expect(contactPage.confirmation).toContainText('Thanks for your message');
  });

  test('does not claim success when the server fails', async ({ contactPage, page }) => {
    await page.route('**/messages', (route) => route.fulfill({ status: 500, json: { message: 'Server error' } }));

    await contactPage.fill(validMessage);
    await contactPage.send.click();

    await expect(contactPage.confirmation).toBeHidden();
    await expect(contactPage.send).toBeVisible();
  });
});
