import * as en from '@kronaut/i18n/messages/en';
import { expect, test } from '@playwright/test';
import { appUrl } from './env.ts';

test('shows the pointer cursor on buttons and selects', async ({ page }) => {
  await page.goto(appUrl('/settings/account'));
  await expect(page.getByRole('button', { name: en.theme_system({}) })).toHaveCSS(
    'cursor',
    'pointer',
  );
  await expect(page.getByRole('main').getByLabel(en.locale_label({}), { exact: true })).toHaveCSS(
    'cursor',
    'pointer',
  );
});

test('cycles the theme without a native tooltip', async ({ page }) => {
  await page.goto(appUrl('/settings/account'));
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: en.theme_system({}) });
  await expect(toggle).not.toHaveAttribute('title');

  await toggle.click();
  await expect(page.getByRole('button', { name: en.theme_light({}) })).toBeVisible();
  await expect(html).toHaveClass(/\blight\b/);

  await page.getByRole('button', { name: en.theme_light({}) }).click();
  await expect(page.getByRole('button', { name: en.theme_dark({}) })).toBeVisible();
  await expect(html).toHaveClass(/\bdark\b/);

  await page.getByRole('button', { name: en.theme_dark({}) }).click();
  await expect(toggle).toBeVisible();
  await expect(html).not.toHaveClass(/\b(light|dark)\b/);
});
