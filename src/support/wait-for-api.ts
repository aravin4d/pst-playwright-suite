import { API_URL } from './test-data';

/**
 * Runs once before any test. The demo API sometimes goes slow for a couple of minutes
 * (on one CI run, sign-in and registration calls hung for 30 seconds each between
 * 09:09 and 09:11, then answered normally). Starting the suite into that produces a
 * handful of timeouts that say nothing about the product.
 *
 * So wait until the API answers quickly, for up to three minutes, then start. If it
 * never does, stop with one clear message instead of dozens of timeouts.
 */
const checks = ['/products?page=1', '/users/me']; // the second should answer 401 straight away
const healthyWithinMs = 5_000;
const giveUpAfterMs = 180_000;

async function answersQuickly(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(healthyWithinMs),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

export default async function waitForApi() {
  const started = Date.now();
  let attempts = 0;

  while (Date.now() - started < giveUpAfterMs) {
    attempts += 1;
    const results = await Promise.all(checks.map(answersQuickly));
    if (results.every(Boolean)) {
      if (attempts > 1) {
        console.log(`API was slow; started after ${Math.round((Date.now() - started) / 1000)}s of waiting.`);
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  throw new Error(
    `${API_URL} did not answer within ${healthyWithinMs / 1000}s for ${giveUpAfterMs / 60_000} minutes. ` +
      'The demo site looks down or overloaded; no tests were run.',
  );
}
