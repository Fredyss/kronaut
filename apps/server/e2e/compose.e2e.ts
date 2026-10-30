import * as calendarEn from '@kronaut/i18n/calendar/messages/en';
import * as composeEn from '@kronaut/i18n/compose/messages/en';
import * as en from '@kronaut/i18n/messages/en';
import { expect, test } from '@playwright/test';
import { Temporal } from 'temporal-polyfill';
import { appUrl, CHANNEL, TIME_ZONE } from './env.ts';

const TEXT = 'Ahoj svet, čaká nás ťažký deň';
const ADDED = ', zajtra bude ľahšie';
const DRAFT = 'Koncept na neskôr';
const TAGGED = 'Príspevok so štítkom';
const TAG = 'Kampaň';

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

  await page
    .getByRole('button', { name: calendarEn.calendar_entry_options({ text: TEXT }) })
    .click();
  await page.getByRole('menuitem', { name: en.post_action_edit({}) }).click();
  const dialog = page.getByRole('dialog', { name: en.post_edit_title({}) });
  const editor = dialog.getByRole('textbox', { name: composeEn.compose_text_label({}) });
  await expect(editor).toHaveText(TEXT);
  await editor.click();
  await editor.pressSequentially(ADDED);
  await dialog.getByRole('button', { name: en.compose_schedule({}) }).click();
  await expect(dialog).toHaveCount(0);
  const edited = page.getByRole('link', { name: `${TEXT}${ADDED}` });
  await expect(edited).toContainText(en.destination_state_scheduled({}));

  await page
    .getByRole('button', { name: calendarEn.calendar_entry_options({ text: `${TEXT}${ADDED}` }) })
    .click();
  await page.getByRole('menuitem', { name: en.post_action_delete({}) }).click();
  await page.getByRole('button', { name: en.post_delete_confirm({}) }).click();
  await expect(edited).toHaveCount(0);
});

test('keeps a draft, then edits it from the calendar draft list', async ({ page }) => {
  await page.goto(appUrl('/compose'));
  await page.getByRole('textbox', { name: composeEn.compose_text_label({}) }).fill(DRAFT);
  await page.getByRole('checkbox', { name: CHANNEL.displayName }).check();
  await page.getByRole('radio', { name: composeEn.compose_keep_draft({}) }).check();
  await page.getByRole('button', { name: en.compose_save_draft({}) }).click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/);

  await page.getByRole('link', { name: en.post_action_edit({}) }).click();
  const overPost = page.getByRole('dialog', { name: en.post_edit_title({}) });
  await expect(overPost).toBeVisible();
  await overPost.getByRole('button', { name: en.close({}) }).click();
  await expect(overPost).toHaveCount(0);
  await expect(page).toHaveURL(/\/posts\/[^/?]+$/);

  await page.goto(appUrl('/?view=list'));
  await page.getByRole('link', { name: DRAFT }).click();
  const dialog = page.getByRole('dialog', { name: en.post_edit_title({}) });
  const editor = dialog.getByRole('textbox', { name: composeEn.compose_text_label({}) });
  await expect(editor).toHaveText(DRAFT);
  await expect(dialog.getByRole('radio', { name: composeEn.compose_keep_draft({}) })).toBeChecked();
  await editor.click();
  await editor.pressSequentially(ADDED);
  await dialog.getByRole('button', { name: en.compose_save_draft({}) }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('link', { name: `${DRAFT}${ADDED}` })).toBeVisible();
});

test('tags a post in the composer and shows it on the calendar', async ({ page }) => {
  const date = Temporal.Now.plainDateISO(TIME_ZONE).add({ days: 9 }).toString();
  await page.goto(appUrl('/compose'));
  await page.getByRole('textbox', { name: composeEn.compose_text_label({}) }).fill(TAGGED);
  await page.getByRole('checkbox', { name: CHANNEL.displayName }).check();
  await page.getByRole('combobox', { name: en.tags_add({}) }).fill(TAG);
  await page.getByRole('option', { name: en.tags_create({ name: TAG }) }).click();
  await expect(page.getByRole('button', { name: en.tags_remove({ name: TAG }) })).toBeVisible();
  await page.getByRole('radio', { name: en.compose_schedule({}) }).check();
  await page.getByLabel(en.compose_date({}), { exact: true }).fill(date);
  await page.getByLabel(en.compose_time({}), { exact: true }).fill('12:00');
  await page.getByRole('button', { name: en.compose_schedule({}) }).click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/);

  await page.goto(appUrl(`/?view=list&date=${date}`));
  await expect(page.getByRole('link', { name: `Tags: ${TAG}` })).toBeVisible();
});

test('opens the composer over the calendar and closes back to it', async ({ page }) => {
  await page.goto(appUrl('/?view=list'));
  await page.getByRole('link', { name: calendarEn.calendar_create_post({}), exact: true }).click();
  const dialog = page.getByRole('dialog', { name: en.post_new_title({}) });
  const editor = dialog.getByRole('textbox', { name: composeEn.compose_text_label({}) });
  // A click reaches the leave guard before the next step; typed text arrives a tick after the key.
  await dialog.getByRole('checkbox', { name: CHANNEL.displayName }).check();
  await editor.click();
  await editor.pressSequentially('x');
  await editor.press('Escape');
  await dialog.getByRole('button', { name: en.post_discard_keep({}) }).click();
  await expect(editor).toBeFocused();
  await dialog.getByRole('button', { name: en.close({}) }).click();
  await dialog.getByRole('button', { name: en.post_discard_confirm({}) }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/\?view=list$/);
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
