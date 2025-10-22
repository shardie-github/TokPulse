import { test, expect } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/); // adjust to your title
  // Example: check a key element renders
  await expect(page.getByText(/React Showcase/i)).toBeVisible();
});
