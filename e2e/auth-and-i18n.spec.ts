import { expect, test } from '@playwright/test';
import { ACCOUNTS, i18n, loginAs, prepareSession } from './helpers';

test.describe('Auth, validation, and translations', () => {
  test('rejects an invalid password in English and Arabic', async ({ page }) => {
    await prepareSession(page, 'en');
    await page.getByLabel(i18n.en.email).fill(ACCOUNTS.admin);
    await page.getByLabel(i18n.en.password).fill('WrongPass1');
    await page.getByRole('button', { name: i18n.en.signIn }).click();
    await expect(page.getByText(i18n.en.invalid)).toBeVisible();

    await page.getByRole('button', { name: i18n.en.switchToArabic }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: i18n.ar.welcome })).toBeVisible();
    await page.getByLabel(i18n.ar.password).fill('WrongPass1');
    await page.getByRole('button', { name: i18n.ar.signIn }).click();
    await expect(page.getByText(i18n.en.invalid)).toBeVisible();
  });

  test('switches the shell between English and Arabic', async ({ page }) => {
    await loginAs(page, ACCOUNTS.admin, 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('link', { name: i18n.en.cases })).toBeVisible();
    await expect(page.getByRole('link', { name: i18n.en.executive })).toBeVisible();

    await page.getByRole('button', { name: i18n.en.switchToArabic }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: i18n.ar.overview })).toBeVisible();
    await expect(page.getByRole('link', { name: i18n.ar.cases })).toBeVisible();
    await expect(page.getByRole('link', { name: i18n.ar.executive })).toBeVisible();
    await expect(page.getByRole('link', { name: i18n.ar.roles })).toBeVisible();
  });

  test('blocks creating a case with an empty subject', async ({ page }) => {
    await loginAs(page, ACCOUNTS.employee, 'en');
    await page.getByRole('link', { name: i18n.en.cases }).click();
    await page.getByRole('button', { name: i18n.en.newCase }).click();
    await expect(page.getByRole('heading', { name: i18n.en.createTitle })).toBeVisible();
    await page.getByRole('button', { name: i18n.en.newCase }).click();
    await expect(page).toHaveURL(/\/cases\/new/);
    await expect(page.getByRole('heading', { name: i18n.en.createTitle })).toBeVisible();
  });
});
