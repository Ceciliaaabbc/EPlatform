import { test, expect } from '@playwright/test';

test('user can login and add product to cart', async ({ page }) => {
  const email = `cart${Date.now()}@example.com`;
  const password = '123456';

  // 1. 注册新用户
  await page.goto('http://localhost:5173/register');

  await page.getByPlaceholder('Username').fill('Cart User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);

  const registerResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/users/register') &&
    response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Register' }).click();
  await expect((await registerResponsePromise).status()).toBe(200);

  // 2. 登录
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

  // 3. 进入商品页
  await page.goto('http://localhost:5173/products');

  await expect(page.locator('body')).toContainText(/product|商品|price|\$/i);

  // 4. 点击第一个 Add to Cart 按钮
  const addToCartResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/cart') &&
    response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /add to cart|加入购物车/i }).first().click();
  await expect((await addToCartResponsePromise).status()).toBe(200);

  // 5. 进入购物车页面
  await page.goto('http://localhost:5173/cart');

  await expect(page.locator('body')).toContainText(/cart|购物车|checkout|total|总计/i);
});
