import { test, expect } from '@playwright/test';

/**
 * Example E2E test
 * Server should be running via `bun run dev` (mprocs)
 */
test('homepage loads', async ({ page }) => {
  await page.goto('/');

  // Check that the page loaded
  await expect(page).toHaveTitle(/Vite \+ React \+ TS/);
});

test('API is reachable', async ({ request }) => {
  // Test backend API
  const response = await request.get('http://localhost:3000');
  expect(response.ok()).toBeTruthy();
});
