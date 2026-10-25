import { expect, test } from '@playwright/test';
import { ACCOUNTS, i18n, loginAs, logout } from './helpers';

test.describe('Role navigation and data access', () => {
  test('shows admin-only navigation to the administrator', async ({ page }) => {
    await loginAs(page, ACCOUNTS.admin, 'en');
    await expect(page.getByRole('link', { name: i18n.en.executive })).toBeVisible();
    await expect(page.getByRole('link', { name: i18n.en.roles })).toBeVisible();
    await page.getByRole('link', { name: i18n.en.executive }).click();
    await expect(page.getByRole('heading', { name: 'Executive dashboard' })).toBeVisible();
  });

  test('hides executive analytics and roles from an employee', async ({ page }) => {
    await loginAs(page, ACCOUNTS.employee, 'en');
    await expect(page.getByRole('link', { name: i18n.en.cases })).toBeVisible();
    await expect(page.getByRole('link', { name: i18n.en.executive })).toHaveCount(0);
    await expect(page.getByRole('link', { name: i18n.en.roles })).toHaveCount(0);

    await page.goto('/executive');
    await expect(page.getByText(i18n.en.unauthorizedExec)).toBeVisible();

    await page.goto('/roles');
    await expect(page.getByText('You do not have access to this action.')).toBeVisible();
  });

  test('lets the chairman open executive analytics but not role management', async ({
    page,
  }) => {
    await loginAs(page, ACCOUNTS.chairman, 'en');
    await expect(page.getByRole('link', { name: i18n.en.executive })).toBeVisible();
    await expect(page.getByRole('link', { name: i18n.en.roles })).toHaveCount(0);
    await page.getByRole('link', { name: i18n.en.executive }).click();
    await expect(page.getByRole('heading', { name: 'Executive dashboard' })).toBeVisible();
  });

  test('keeps another department’s case out of an employee list', async ({ page }) => {
    await loginAs(page, ACCOUNTS.legal, 'en');
    await page.getByRole('link', { name: i18n.en.cases }).click();
    await page.getByRole('button', { name: i18n.en.newCase }).click();
    await expect(page.getByText(/working-calendar days from creation/)).toBeVisible();
    await page.getByLabel(i18n.en.subject).fill('Legal-only access fixture');
    await page.getByRole('button', { name: i18n.en.newCase }).click();
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]{36}/);
    const url = page.url();

    await logout(page);
    await loginAs(page, ACCOUNTS.employee, 'en');
    await page.goto(url);
    await expect(page.getByText('Case not found')).toBeVisible();
  });
});
