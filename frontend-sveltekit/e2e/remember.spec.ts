// Remember's core loop against a real backend: plant topics on shelves, refresh today's cards one
// at a time (notes on request, Undo), find them on the Shelves page and their own page, and the
// settings on You. Plus the phone frame: the tab bar and its raised + key.
import { expect, test, type Page } from '@playwright/test';
import { backendUp, latestCode, uniqueEmail } from './helpers';

/** Sign up and land on Today, confirming the email first when the backend asks for it. */
async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/app$/);
  const gate = page.getByRole('heading', { name: 'Confirm your email' });
  const today = page.getByRole('heading', { name: 'Studied something today?' });
  await expect(gate.or(today)).toBeVisible();
  if (await gate.isVisible()) {
    await page.getByLabel('Code').fill(await latestCode(email));
    await page.getByRole('button', { name: 'Confirm email' }).click();
    await expect(today).toBeVisible();
  }
}

/** The Add sheet's dialog, opened from the sidebar (computer) or the tab bar (phone). */
async function openAdd(page: Page) {
  await page.getByRole('button', { name: 'Add what you studied' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Plant something new' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test.beforeAll(async () => {
  test.skip(!(await backendUp()), 'No backend at API_URL: start one, then run again.');
});

test('plant on shelves, refresh one card at a time, undo, and find it on its shelf', async ({ page }) => {
  await signUp(page, uniqueEmail('remember'), 'correct horse battery');

  // Studied today, on a new shelf: it comes back tomorrow, so today stays clear.
  let sheet = await openAdd(page);
  await sheet.getByLabel('What did you study?').fill('Krebs cycle');
  await sheet.getByRole('radio', { name: 'New shelf' }).check();
  await sheet.getByLabel('Name of the new shelf').fill('Biology');
  await expect(sheet.getByText(/It comes back \d+ times/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Plant it' }).click();
  await expect(page.getByRole('status').filter({ hasText: /First check-in tomorrow/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All caught up' })).toBeVisible();

  // Studied earlier, with notes, on the shelf used last: its first check-in is already due.
  sheet = await openAdd(page);
  await sheet.getByLabel('What did you study?').fill('Photosynthesis');
  await expect(sheet.getByRole('radio', { name: 'Biology' })).toBeChecked();
  await sheet.getByRole('radio', { name: '1 month' }).check();
  await sheet.getByRole('button', { name: 'Notes, a link or the day you studied' }).click();
  await sheet.getByLabel('Notes').fill('Light reactions, then the Calvin cycle.');
  await sheet.getByRole('radio', { name: 'Earlier' }).check();
  await sheet.getByRole('button', { name: 'Plant it' }).click();
  await expect(page.getByText('card to refresh')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Photosynthesis' })).toBeVisible();

  // Refresh: notes only on request. Forgot opens them; Undo brings the card back.
  await page.getByRole('button', { name: 'Start refreshing' }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText('What do you remember about it?')).toBeVisible();
  await expect(page.getByText('Light reactions, then the Calvin cycle.')).toBeHidden();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await expect(page.getByText('Light reactions, then the Calvin cycle.')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByText(/Have another look now/)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('What do you remember about it?')).toBeVisible();
  await page.getByRole('button', { name: /Got it/ }).click();
  await expect(page.getByRole('region', { name: 'All caught up' })).toContainText('1 refreshed: 1 got it.');
  await page.getByRole('button', { name: 'Back to Today' }).click();
  await expect(page).toHaveURL(/\/app$/);

  // Shelves: the Biology pot holds both; the topic page has its check-in and can be deleted.
  await page.getByRole('link', { name: 'Shelves' }).first().click();
  await page.getByRole('button', { name: /Biology/ }).click();
  await expect(page.getByText('Only Biology')).toBeVisible();
  await expect(page.getByRole('link', { name: /Krebs cycle/ })).toBeVisible();
  await page.goto(`/topic?id=${await topicId(page, 'Photosynthesis')}`);
  await expect(page.getByRole('heading', { name: 'Photosynthesis', level: 1 })).toBeVisible();
  await expect(page.getByText('Got it', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete topic' }).click();
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByRole('link', { name: /Photosynthesis/ })).toHaveCount(0);
});

/** A topic's id, from its row's link on the Shelves page. */
async function topicId(page: Page, title: string): Promise<string> {
  const href = await page.getByRole('link', { name: new RegExp(title) }).getAttribute('href');
  return new URL(href!, 'http://x').searchParams.get('id')!;
}

test('settings on You wait for Save, and Discard puts them back', async ({ page }) => {
  await signUp(page, uniqueEmail('settings'), 'correct horse battery');
  await page.getByRole('link', { name: 'You' }).first().click();
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeDisabled();
  await page.getByRole('radio', { name: 'Lightly' }).click();
  await expect(page.getByText('Expect to recall about 8 in 10.')).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByText('Expect to recall about 9 in 10.')).toBeVisible();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await save.click();
  await expect(page.getByText('Settings saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Cards a day', { exact: true })).toHaveText('20');
});

test('on a phone: the tab bar moves between pages and its + key opens the Add sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, uniqueEmail('phone'), 'correct horse battery');
  const tabs = page.getByRole('navigation', { name: 'Main' }).last();
  await tabs.getByRole('link', { name: 'Growth' }).click();
  await expect(page.getByRole('heading', { name: 'Growth', level: 1 })).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Growth' })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('button', { name: 'Add what you studied' }).click();
  await expect(page.getByRole('dialog', { name: 'Plant something new' })).toBeVisible();
});
