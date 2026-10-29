import * as composeEn from '@kronaut/i18n/compose/messages/en';
import * as en from '@kronaut/i18n/messages/en';
import { expect, test } from '@playwright/test';
import { Temporal } from 'temporal-polyfill';
import { appUrl, CHANNEL, TIME_ZONE } from './env.ts';

const TEXT = 'Ahoj svet, čaká nás ťažký deň';

test('schedules a post a week ahead and keeps it after a reload', async ({ page }) => {
  const date = Temporal.Now.plainDateISO(TIME_ZONE).add({ days: 7 }).toString();
  await page.goto(appUrl('/compose'));
  await expect(
    page.getByRole('heading', { name: composeEn.compose_title({}), level: 1 }),
  ).toBeVisible();

  await page.getByRole('textbox', { name: composeEn.compose_text_label({}) }).fill(TEXT);
  await page.getByRole('checkbox', { name: CHANNEL.displayName }).check();
  await page.getByRole('radio', { name: en.compose_schedule({}) }).check();
  await page.getByLabel(en.compose_date({}), { exact: true }).fill(date);
  await page.getByLabel(en.compose_time({}), { exact: true }).fill('10:30');
  await page.getByRole('button', { name: en.compose_schedule({}) }).click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/);

  await page.goto(appUrl(`/?view=list&date=${date}`));
  const chip = page.getByRole('link', { name: TEXT });
  await expect(chip).toContainText(en.destination_state_scheduled({}));
  await expect(chip).toContainText(en.provider_bluesky({}));
  await page.reload();
  await expect(chip).toContainText(en.destination_state_scheduled({}));
});

test('counts the text against Bluesky and blocks a post over its limit', async ({ page }) => {
  await page.goto(appUrl('/compose'));
  await page.getByRole('checkbox', { name: CHANNEL.displayName }).check();
  await page.getByRole('textbox', { name: composeEn.compose_text_label({}) }).fill('x'.repeat(301));
  const network = en.provider_bluesky({});
  await expect(page.getByText(`${network} 301/300`, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: en.compose_publish_now({}) })).toBeDisabled();
});

test('schedules a long default after customizing Bluesky with short text', async ({ page }) => {
  const date = Temporal.Now.plainDateISO(TIME_ZONE).add({ days: 8 }).toString();
  await page.goto(appUrl('/compose'));
  const text = page.getByRole('textbox', { name: composeEn.compose_text_label({}) });
  await text.fill('x'.repeat(301));
  await page.getByRole('checkbox', { name: CHANNEL.displayName }).check();
  await page.getByRole('radio', { name: en.compose_schedule({}) }).check();
  await page.getByLabel(en.compose_date({}), { exact: true }).fill(date);
  await page.getByLabel(en.compose_time({}), { exact: true }).fill('11:00');
  const submit = page.getByRole('button', { name: en.compose_schedule({}) });
  await expect(submit).toBeDisabled();

  await page.getByRole('tab', { name: CHANNEL.displayName }).click();
  const channel = CHANNEL.displayName;
  await page.getByRole('button', { name: composeEn.compose_customize({ channel }) }).click();
  await text.fill('Short and sweet');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/);
});
