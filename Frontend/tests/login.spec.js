import { test, expect } from '@playwright/test';

test('user can register and login successfully', async ({ page }) => {
  const email = `test${Date.now()}@example.com`;
  const password = '123456';

  await page.goto('http://localhost:5173/register');

  await page.getByPlaceholder('Username').fill('Test User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);

  const registerResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/users/register') &&
    response.request().method() === 'POST'
  );

  await page.getByRole('button', { name: 'Register' }).click();

  const registerResponse = await registerResponsePromise;
  const registerStatus = registerResponse.status();
  const registerBody = await registerResponse.text();

  console.log('REGISTER URL:', registerResponse.url());
  console.log('REGISTER STATUS:', registerStatus);
  console.log('REGISTER BODY:', registerBody);

  expect(registerStatus).toBe(200);
  expect(registerBody).toContain('Register successful');

  await page.goto('http://localhost:5173/login');

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);

  const loginResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/users/login') &&
    response.request().method() === 'POST'
  );

  await page.getByRole('button', { name: 'Login' }).click();

  const loginResponse = await loginResponsePromise;
  const loginStatus = loginResponse.status();
  const loginBody = await loginResponse.text();

  console.log('LOGIN URL:', loginResponse.url());
  console.log('LOGIN STATUS:', loginStatus);
  console.log('LOGIN BODY:', loginBody);

  expect(loginStatus).toBe(200);

  await expect.poll(async () => {
    return await page.evaluate(() => localStorage.getItem('token'));
  }, { timeout: 10000 }).not.toBeNull();

  await expect(page).toHaveURL(/\/products/);
});