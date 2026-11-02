// Remember's core loop against a real backend: add a topic, see it on Today when due, recall it,
// undo, and find it in Topics and on its own page.
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
  const today = page.getByRole('button', { name: 'Add what you studied' });
  await expect(gate.or(today)).toBeVisible();
  if (await gate.isVisible()) {
    await page.getByLabel('Code').fill(await latestCode(email));
    await page.getByRole('button', { name: 'Confirm email' }).click();
    await expect(today).toBeVisible();
  }
}

test.beforeAll(async () => {
  test.skip(!(await backendUp()), 'No backend at API_URL: start one, then run again.');
});

test('add a topic, recall it on Today, undo, and open it', async ({ page }) => {
  await signUp(page, uniqueEmail('remember'), 'correct horse battery');
  await expect(page.getByRole('heading', { name: 'Studied something today?' })).toBeVisible();

  // Studied today: it comes back tomorrow, so today stays clear.
  await page.getByRole('button', { name: 'Add what you studied' }).click();
  await page.getByLabel('What did you study?').fill('Krebs cycle');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /First check-in tomorrow/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All done for today.' })).toBeVisible();

  // Studied earlier, with notes: its first check-in is already due.
  await page.getByRole('button', { name: 'Add what you studied' }).click();
  await page.getByLabel('What did you study?').fill('Contract law, chapter 4');
  await page.getByRole('radio', { name: '1 month' }).check();
  await page.getByRole('button', { name: 'Add notes, a link or the study date' }).click();
  await page.getByLabel('Notes').fill('Offer, acceptance, consideration.');
  await page.getByRole('radio', { name: 'Earlier' }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const today = page.getByRole('list', { name: 'To refresh today' });
  await expect(today.getByRole('button', { name: /Contract law, chapter 4/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('to refresh');

  // Recall: notes only on request, then Got it, then Undo brings it back.
  await today.getByRole('button', { name: /Contract law, chapter 4/ }).click();
  const card = page.getByRole('dialog', { name: 'Contract law, chapter 4' });
  await expect(card.getByText('What do you remember about it?')).toBeVisible();
  await expect(card.getByText('Offer, acceptance, consideration.')).toBeHidden();
  await card.getByRole('button', { name: 'Show my notes' }).click();
  await expect(card.getByText('Offer, acceptance, consideration.')).toBeVisible();
  await card.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Next check-in in \d+ days/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All done for today.' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(today.getByRole('button', { name: /Contract law, chapter 4/ })).toBeVisible();

  // Topics lists both; the topic's page has its notes and no check-ins after the undo.
  await page.getByRole('link', { name: 'Topics', exact: true }).click();
  await expect(page.getByRole('link', { name: /Krebs cycle/ })).toBeVisible();
  await page.getByRole('link', { name: /Contract law, chapter 4/ }).click();
  await expect(page.getByRole('heading', { name: 'Contract law, chapter 4', level: 1 })).toBeVisible();
  await expect(page.getByText('None yet')).toBeVisible();

  // Delete, after confirming.
  await page.getByRole('button', { name: 'Delete topic' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete topic' }).click();
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByRole('link', { name: /Contract law, chapter 4/ })).toHaveCount(0);
});

test('settings wait for Save, and Discard puts them back', async ({ page }) => {
  await signUp(page, uniqueEmail('settings'), 'correct horse battery');
  await page.getByRole('link', { name: 'Settings' }).click();
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeDisabled();
  await page.getByText('Relaxed', { exact: true }).click();
  await expect(page.getByText('Expect to recall about 8 in 10.')).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByText('Expect to recall about 9 in 10.')).toBeVisible();
  await page.getByLabel('Topics a day').selectOption('20');
  await save.click();
  await expect(page.getByText('Settings saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Topics a day')).toHaveValue('20');
});
