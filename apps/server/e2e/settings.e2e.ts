import * as cs from '@kronaut/i18n/messages/cs';
import * as en from '@kronaut/i18n/messages/en';
import * as settingsCs from '@kronaut/i18n/settings/messages/cs';
import * as settingsEn from '@kronaut/i18n/settings/messages/en';
import { expect, type Page, test } from '@playwright/test';
import { appUrl } from './env.ts';

const NAME = 'Ada Lovelace';

function savedMe(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === '/v1/me' &&
      response.ok(),
  );
}

function channelsLink(page: Page, messages: typeof en | typeof cs) {
  return page
    .getByRole('navigation', { name: messages.nav_label({}) })
    .getByRole('link', { name: messages.nav_channels({}) });
}

test('keeps a new display name after a reload', async ({ page }) => {
  await page.goto(appUrl('/settings/account'));
  const name = page
    .getByRole('main')
    .getByLabel(settingsEn.settings_display_name({}), { exact: true });
  await name.fill(NAME);
  const saved = savedMe(page);
  await page
    .getByRole('main')
    .getByRole('button', { name: en.settings_save({}) })
    .click();
  await saved;
  await expect(page.getByRole('button', { name: NAME })).toBeVisible();

  await page.reload();
  await expect(name).toHaveValue(NAME);
  await expect(page.getByRole('button', { name: NAME })).toBeVisible();
});

test('switches the shell to Czech and back', async ({ page }) => {
  await page.goto(appUrl('/settings/account'));
  const main = page.getByRole('main');
  const toCzech = savedMe(page);
  await main.getByLabel(en.locale_label({}), { exact: true }).selectOption('cs');
  await toCzech;
  await expect(channelsLink(page, cs)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: settingsCs.settings_account_title({}) }),
  ).toBeVisible();

  await page.reload();
  await expect(channelsLink(page, cs)).toBeVisible();
  const toEnglish = savedMe(page);
  await main.getByLabel(cs.locale_label({}), { exact: true }).selectOption('en');
  await toEnglish;
  await expect(channelsLink(page, en)).toBeVisible();
});
