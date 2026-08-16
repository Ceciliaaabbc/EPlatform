import { test, expect } from '@playwright/test';

test('normal user should not access admin page', async ({ page }) => {
  const email = `user${Date.now()}@example.com`;
  const password = '123456';

  await page.goto('http://localhost:5173/register');
  await page.getByPlaceholder('Username').fill('Normal User');
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

  await page.goto('http://localhost:5173/admin');

  await expect(page.locator('body')).not.toContainText(/add product|admin dashboard|manage orders/i);
});


test('admin can access admin page', async ({ page }) => {
  await page.goto('http://localhost:5173/login');

  await page.getByPlaceholder('Email').fill('admin@test.com');
  await page.getByPlaceholder('Password').fill('123456');

  await page.getByRole('button', { name: 'Login' }).click();

  await expect.poll(async () => {
    return await page.evaluate(() => localStorage.getItem('userRole'));
  }).toBe('ADMIN');

  await page.goto('http://localhost:5173/admin');

  await expect(page.locator('body')).toContainText(/admin|product|order|manage/i);
});
