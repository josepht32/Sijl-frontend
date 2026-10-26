import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Admin123!';

export const ACCOUNTS = {
  admin: 'admin@sijil.local',
  manager: 'layla@sijil.local',
  employee: 'omar@sijil.local',
  legal: 'sara@sijil.local',
  secretariat: 'nora@sijil.local',
  studies: 'fahad@sijil.local',
  technical: 'hind@sijil.local',
  chairman: 'khalid@sijil.local',
} as const;

export const i18n = {
  en: {
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    overview: 'Overview',
    cases: 'Cases',
    executive: 'Executive',
    roles: 'Roles',
    createTitle: 'Create case',
    subject: 'Subject',
    newCase: 'New case',
    forward: 'Forward',
    return: 'Return for completion',
    confirmForward: 'Confirm forward',
    confirmReturn: 'Confirm return',
    returnTo: 'Return to',
    instruction: 'Formal instruction',
    invalid: 'Invalid email or password',
    switchToArabic: 'العربية',
    welcome: 'Sign in to the registry',
    unauthorizedExec:
      'Executive analytics are limited to the Chairman office and administrators.',
  },
  ar: {
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'دخول',
    overview: 'لوحة المتابعة',
    cases: 'المراسلات',
    executive: 'لوحة الرئيس',
    roles: 'الأدوار',
    createTitle: 'إنشاء مراسلة',
    subject: 'الموضوع',
    newCase: 'مراسلة جديدة',
    forward: 'إحالة',
    return: 'إعادة للاستكمال',
    confirmForward: 'تأكيد الإحالة',
    instruction: 'التوجيه الرسمي',
    invalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    switchToEnglish: 'English',
    welcome: 'تسجيل الدخول إلى السجل',
  },
} as const;

export async function prepareSession(page: Page, language: 'en' | 'ar') {
  await page.goto('/login');
  await page.evaluate((lng) => {
    localStorage.setItem('i18nextLng', lng);
    localStorage.removeItem('sijil.token');
  }, language);
  await page.reload();
}

export async function loginAs(
  page: Page,
  email: string,
  language: 'en' | 'ar' = 'en',
) {
  const copy = i18n[language];
  await prepareSession(page, language);
  await expect(page.getByRole('heading', { name: copy.welcome })).toBeVisible();
  await page.getByLabel(copy.email).fill(email);
  await page.getByLabel(copy.password).fill(PASSWORD);
  await page.getByRole('button', { name: copy.signIn }).click();
  await expect(page.getByRole('heading', { name: copy.overview })).toBeVisible();
}

export async function logout(page: Page, language: 'en' | 'ar' = 'en') {
  await page.getByRole('button', { name: language === 'ar' ? 'خروج' : 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
}
