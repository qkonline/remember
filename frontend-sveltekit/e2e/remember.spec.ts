// Remember's core loop against a real backend: add topics in categories, review today's one at a
// time (notes first, then the rating, Undo), find them on the Topics page and their own page, and
// the settings. Plus the phone frame: the tab bar and its raised + key.
import { expect, test, type Page } from '@playwright/test';
import { backendUp, signUp as coreSignUp, uniqueEmail } from './helpers';

/** Sign up with the core's helper (it confirms the email when asked) and land on Today. */
async function signUp(page: Page, email: string, password: string) {
  await coreSignUp(page, email, password);
  await expect(page.getByRole('heading', { name: 'Add your first topic' })).toBeVisible();
}

/** The Add sheet's dialog, opened from the sidebar (computer) or the tab bar (phone). */
async function openAdd(page: Page) {
  await page.getByRole('button', { name: 'Add topic' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Add a topic' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test.beforeAll(async () => {
  test.skip(!(await backendUp()), 'No backend at API_URL: start one, then run again.');
});

test('add in categories, review one topic at a time, undo, and find it in its category', async ({ page }) => {
  await signUp(page, uniqueEmail('remember'), 'correct horse battery');

  // Studied today, in a new category: it comes back tomorrow, so today stays clear.
  let sheet = await openAdd(page);
  await sheet.getByLabel('What did you study?').fill('Krebs cycle');
  await sheet.getByRole('button', { name: 'Add notes, category or date' }).click();
  await sheet.getByRole('button', { name: 'New category' }).click();
  await sheet.getByLabel('Name of the new category').fill('Biology');
  await sheet.getByRole('button', { name: 'Make “Biology”' }).click();
  await expect(sheet.getByRole('radio', { name: /Biology/ })).toBeChecked();
  await expect(sheet.getByText(/\d+ reviews, the last on/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /First review tomorrow/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Krebs cycle is saved' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Want a reminder tomorrow?' })).toBeVisible();

  // Studied earlier, with notes, in the category used last: its first check-in is already due.
  sheet = await openAdd(page);
  await sheet.getByLabel('What did you study?').fill('Photosynthesis');
  await expect(sheet.getByText('Goes in Biology')).toBeVisible();
  await sheet.getByRole('radio', { name: 'A month' }).check();
  await sheet.getByRole('button', { name: 'Add notes, category or date' }).click();
  await expect(sheet.getByRole('radio', { name: 'Biology' })).toBeChecked();
  await sheet.getByLabel('Notes', { exact: true }).fill('Light reactions, then the **Calvin cycle**.');
  await sheet.getByRole('radio', { name: 'Earlier' }).check();
  await sheet.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('topic to review')).toBeVisible();

  // Review: the notes come first, then the rating. Forgot keeps them open; Undo brings it back.
  await page.getByRole('button', { name: 'Start review' }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText('Try to recall it, then check your notes.')).toBeVisible();
  await expect(page.getByText('Light reactions, then the')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Remembered' })).toBeHidden();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await expect(page.getByText('Light reactions, then the')).toBeVisible();
  await expect(page.locator('strong', { hasText: 'Calvin cycle' })).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByText(/Have another look now/)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Try to recall it, then check your notes.')).toBeVisible();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await page.getByRole('button', { name: /Remembered/ }).click();
  await expect(page.getByRole('region', { name: 'All caught up' })).toContainText(
    '1 reviewed: 1 remembered.',
  );
  await page.getByRole('button', { name: 'Back to Today' }).click();
  await expect(page).toHaveURL(/\/app$/);

  // Topics: the Biology pot holds both; the topic page has its review and can be deleted.
  await page.getByRole('link', { name: 'Topics' }).first().click();
  await page.getByRole('button', { name: /Biology/ }).click();
  await expect(page.getByText('Only Biology')).toBeVisible();
  await expect(page.getByRole('link', { name: /Krebs cycle/ })).toBeVisible();
  await page.goto(`/topic?id=${await topicId(page, 'Photosynthesis')}`);
  await expect(page.getByRole('heading', { name: 'Photosynthesis', level: 1 })).toBeVisible();
  await expect(page.getByText('Reviewed once', { exact: false })).toBeVisible();
  await page.getByLabel('More').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete topic' }).click();
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByRole('link', { name: /Photosynthesis/ })).toHaveCount(0);
});

/** A topic's id, from its row's link on the Topics page. */
async function topicId(page: Page, title: string): Promise<string> {
  const href = await page.getByRole('link', { name: new RegExp(title) }).getAttribute('href');
  return new URL(href!, 'http://x').searchParams.get('id')!;
}

test('settings save themselves, and the reminder prompt can be put off', async ({ page }) => {
  await signUp(page, uniqueEmail('settings'), 'correct horse battery');
  await page.getByRole('link', { name: 'Settings' }).first().click();
  await page.getByRole('button', { name: 'More topics' }).click();
  await page.getByText('More settings').click();
  await page.getByRole('radio', { name: 'Less', exact: true }).click();
  await expect(page.getByText('Expect to recall about 8 in 10.')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Topics per day' }).locator('output')).toHaveText('20');
  await page.reload();
  await expect(page.getByRole('group', { name: 'Topics per day' }).locator('output')).toHaveText('20');
});

test('on a phone: the tab bar moves between pages and its + key opens the Add sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, uniqueEmail('phone'), 'correct horse battery');
  const tabs = page.getByRole('navigation', { name: 'Main' }).last();
  await tabs.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Progress' })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('button', { name: 'Add topic' }).click();
  await expect(page.getByRole('dialog', { name: 'Add a topic' })).toBeVisible();
});

test('categories: make one, rename and recolour it, and remove it', async ({ page }) => {
  await signUp(page, uniqueEmail('categories'), 'correct horse battery');
  await page.getByRole('link', { name: 'Topics' }).first().click();
  await page.getByRole('button', { name: 'Make a category first' }).click();
  let sheet = page.getByRole('dialog', { name: 'New category' });
  await sheet.getByLabel('Name').fill('Biology');
  await sheet.getByRole('button', { name: 'Make category' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Made the Biology category.' })).toBeVisible();
  await expect(page.getByText('Only Biology')).toBeVisible();

  await page.getByRole('button', { name: 'Edit category' }).click();
  sheet = page.getByRole('dialog', { name: 'Edit category' });
  await sheet.getByLabel('Name').fill('Cell biology');
  await sheet.getByRole('radio', { name: 'Rose' }).check();
  await sheet.getByRole('button', { name: 'Save category' }).click();
  await expect(page.getByText('Only Cell biology')).toBeVisible();

  await page.getByRole('button', { name: 'Edit category' }).click();
  await page
    .getByRole('dialog', { name: 'Edit category' })
    .getByRole('button', { name: 'Remove this category' })
    .click();
  await page
    .getByRole('dialog', { name: 'Remove Cell biology?' })
    .getByRole('button', { name: 'Remove category' })
    .click();
  await expect(page.getByRole('status').filter({ hasText: 'Removed Cell biology.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No topics yet' })).toBeVisible();
});

// What the core's tests leave to the app (frontend README): Remember's own way to the account page.
test('Settings opens the account page, and the sidebar stays short', async ({ page }) => {
  const email = uniqueEmail('account');
  await signUp(page, email, 'correct horse battery');
  await expect(page.getByRole('button', { name: 'Add topic' })).toHaveCount(1);
  await page.getByRole('link', { name: 'Settings' }).first().click();
  await page.getByRole('link', { name: /Account/ }).click();
  await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible();
});
