import { test, expect } from '@playwright/test';

test('user can checkout successfully', async ({ page }) => {
  const email = `checkout${Date.now()}@example.com`;
  const password = '123456';

  await page.goto('http://localhost:5173/register');
  await page.getByPlaceholder('Username').fill('Checkout User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  const registerResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/users/register') &&
    response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Register' }).click();
  await expect((await registerResponsePromise).status()).toBe(200);

  await page.goto('http://localhost:5173/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  const loginResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/users/login') &&
    response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Login' }).click();
  await expect((await loginResponsePromise).status()).toBe(200);

  await expect.poll(async () => {
    return await page.evaluate(() => localStorage.getItem('token'));
  }, { timeout: 10000 }).not.toBeNull();

  await page.goto('http://localhost:5173/products');

  const addToCartResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/cart') &&
    response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /add to cart|加入购物车/i }).first().click();
  await expect((await addToCartResponsePromise).status()).toBe(200);

  await page.goto('http://localhost:5173/cart');

  await expect(page.locator('body')).toContainText(/cart|checkout|total|购物车|结账/i);

  await page.getByRole('button', { name: /checkout|place order|结账|下单/i }).click();

  await expect(page).toHaveURL(/\/checkout/);

  await page.goto('http://localhost:5173/orders');

  await expect(page.locator('body')).toContainText(/pending|order|orders|订单/i);
});
