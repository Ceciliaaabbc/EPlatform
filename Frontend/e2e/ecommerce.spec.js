import { test, expect } from '@playwright/test';

test('user can open product page', async ({ page }) => {
  await page.goto('http://localhost:5173/products');

  await expect(page).toHaveURL(/products/);
  await expect(page.locator('body')).toContainText(/product|商品|cart|price/i);
});