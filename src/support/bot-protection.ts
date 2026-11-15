import { expect, Locator, Page, test } from '@playwright/test';

/**
 * The demo site sits behind Cloudflare. From data-centre networks (GitHub's CI runners,
 * for one) a page load is now and then answered with a "Performing security verification"
 * page instead of the shop. It mostly hits full reloads: after login, registration,
 * sign-out, or an explicit page.reload().
 *
 * That is the site protecting itself, not a product failure, and a test suite has no
 * business trying to get around it. When it happens the test is skipped with the reason,
 * so the report shows "blocked by the environment" instead of a red herring.
 */
const SKIP_REASON =
  "Stopped by the demo site's bot protection on this network. Runs normally from a regular connection.";

const challengeOn = (page: Page) => page.getByRole('heading', { name: 'Performing security verification' });

/** Skips the running test if the page that just loaded is the challenge page. */
export async function skipIfChallenged(page: Page) {
  test.skip(await challengeOn(page).isVisible(), SKIP_REASON);
}

/**
 * For reloads the shop triggers itself (login, registration, sign-out): waits for
 * either the element that proves we arrived, or the challenge.
 */
export async function arriveAt(page: Page, landmark: Locator) {
  await expect(landmark.or(challengeOn(page)).first()).toBeVisible({ timeout: 20_000 });
  await skipIfChallenged(page);
}

/** Makes page.goto() and page.reload() check for the challenge once they have loaded. */
export function watchNavigations(page: Page) {
  const goto = page.goto.bind(page);
  const reload = page.reload.bind(page);

  page.goto = async (...args: Parameters<Page['goto']>) => {
    const response = await goto(...args);
    await skipIfChallenged(page);
    return response;
  };
  page.reload = async (...args: Parameters<Page['reload']>) => {
    const response = await reload(...args);
    await skipIfChallenged(page);
    return response;
  };
}
