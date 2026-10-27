import { randomBytes } from 'node:crypto';
import * as en from '@kronaut/i18n/messages/en';
import { expect, type Page, test } from '@playwright/test';
import { AUTH_FILE, fromEnv, OWNER } from './env.ts';

const password = randomBytes(18).toString('base64url');

async function signIn(page: Page, secret: string): Promise<void> {
  await page.getByLabel(en.login_email({}), { exact: true }).fill(OWNER.email);
  await page.getByLabel(en.login_password({}), { exact: true }).fill(secret);
  await page.getByRole('button', { name: en.login_submit({}) }).click();
}

async function expectSignedIn(page: Page): Promise<void> {
  await expect(page.getByRole('navigation', { name: en.nav_label({}) })).toBeVisible();
  await expect(page.getByRole('button', { name: OWNER.name })).toBeVisible();
}

test('sets a password, signs out, rejects a wrong password and signs in', async ({ page }) => {
  await page.goto(fromEnv('E2E_SETUP_LINK'));
  await expect(page.getByRole('heading', { name: en.reset_title({}) })).toBeVisible();
  await page.getByLabel(en.reset_password({}), { exact: true }).fill(password);
  await page.getByLabel(en.reset_confirm({}), { exact: true }).fill(password);
  await page.getByRole('button', { name: en.reset_submit({}) }).click();

  await expect(
    page.getByRole('status').filter({ hasText: en.login_password_set({}) }),
  ).toBeVisible();
  await signIn(page, password);
  await expectSignedIn(page);

  await page.getByRole('button', { name: OWNER.name }).click();
  await page.getByRole('button', { name: en.account_logout({}) }).click();
  await expect(page.getByRole('heading', { name: en.login_title({}) })).toBeVisible();

  await signIn(page, `${password}-wrong`);
  await expect(
    page.getByRole('alert').filter({ hasText: en.error_invalid_credentials({}) }),
  ).toBeVisible();

  await signIn(page, password);
  await expectSignedIn(page);
  await page.context().storageState({ path: AUTH_FILE });
});
