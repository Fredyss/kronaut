import * as en from '@kronaut/i18n/messages/en';
import { expect, test } from '@playwright/test';
import { appUrl, CHANNEL } from './env.ts';

test('lists the seeded Bluesky channel and offers to connect Bluesky', async ({ page }) => {
  await page.goto(appUrl('/'));
  await page
    .getByRole('navigation', { name: en.nav_label({}) })
    .getByRole('link', { name: en.nav_channels({}) })
    .click();
  await expect(page.getByRole('heading', { name: en.channels_title({}), level: 1 })).toBeVisible();

  const channel = page.getByRole('listitem').filter({ hasText: CHANNEL.displayName });
  await expect(channel).toContainText(en.provider_bluesky({}));
  await expect(channel).toContainText(CHANNEL.handle);
  await expect(channel).toContainText(en.channel_status_active({}));

  await expect(page.getByRole('heading', { name: en.channels_connect_title({}) })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: en.channels_connect_button({ name: en.provider_bluesky({}) }),
    }),
  ).toBeEnabled();
});
