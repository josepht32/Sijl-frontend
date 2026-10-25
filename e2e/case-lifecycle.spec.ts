import { expect, test } from '@playwright/test';
import { ACCOUNTS, i18n, loginAs, logout } from './helpers';

test.describe('Case actions', () => {
  test('creates a case and lets secretariat forward it', async ({ page }) => {
    const title = `E2E lifecycle ${Date.now()}`;

    await loginAs(page, ACCOUNTS.employee, 'en');
    await page.getByRole('link', { name: i18n.en.cases }).click();
    await page.getByRole('button', { name: i18n.en.newCase }).click();
    await expect(page.getByRole('heading', { name: i18n.en.createTitle })).toBeVisible();
    await expect(page.getByText(/working-calendar days from creation/)).toBeVisible();
    await page.getByLabel(i18n.en.subject).fill(title);
    await page.getByLabel('Summary').fill('Created through the Playwright flow.');
    await page.getByRole('button', { name: i18n.en.newCase }).click();
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]{36}/);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: i18n.en.forward })).toHaveCount(0);
    await expect(page.getByText('No review actions are available for your account on this case.')).toBeVisible();
    const caseUrl = page.url();

    await logout(page);
    await loginAs(page, ACCOUNTS.secretariat, 'en');
    await page.goto(caseUrl);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: i18n.en.forward })).toBeVisible();
    await expect(page.getByRole('button', { name: i18n.en.return })).toBeVisible();

    await page.getByRole('button', { name: i18n.en.forward }).click();
    await page
      .getByLabel(i18n.en.instruction)
      .fill('Please study this file and record the committee recommendation.');
    await page.getByRole('button', { name: i18n.en.confirmForward }).click();
    await expect(page).toHaveURL(/\/cases(?:\?|$)/);

    await logout(page);
    await loginAs(page, ACCOUNTS.studies, 'en');
    await page.goto(caseUrl);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(
      page.getByText('Please study this file and record the committee recommendation.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: i18n.en.forward })).toBeVisible();
    await expect(page.getByRole('button', { name: i18n.en.return })).toBeVisible();

    await page.getByRole('button', { name: i18n.en.return }).click();
    await expect(page.locator('#returnTo')).toContainText('Previous office (Secretariat)');
    await page.locator('#returnTo').click();
    await expect(page.getByRole('option', { name: 'Originator' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Originating department' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page
      .getByLabel(i18n.en.instruction)
      .fill('Please re-check the routing note before studies continue.');
    await page.getByRole('button', { name: i18n.en.confirmReturn }).click();
    await expect(page).toHaveURL(/\/cases(?:\?|$)/);

    await logout(page);
    await loginAs(page, ACCOUNTS.secretariat, 'en');
    await page.goto(caseUrl);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(
      page.getByText('The file was returned to Secretariat for another review.'),
    ).toBeVisible();
    await expect(
      page.getByRole('blockquote').getByText('Please re-check the routing note before studies continue.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: i18n.en.forward })).toBeVisible();
  });
});
