export function localizedName(
  language: string,
  nameEn?: string | null,
  nameAr?: string | null,
): string {
  if (language.startsWith('ar')) {
    return nameAr || nameEn || '';
  }
  return nameEn || nameAr || '';
}

export function formatDate(value: string | Date | null | undefined, language: string): string {
  if (!value) {
    return '—';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(language.startsWith('ar') ? 'ar' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, language: string): string {
  if (!value) {
    return '—';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(language.startsWith('ar') ? 'ar' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatBytes(bytes: number, language: string): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(language.startsWith('ar') ? 'ar' : 'en', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value);
  return `${formatted} ${units[unit]}`;
}

export function addDaysIso(days: number, from = new Date()): string {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  return Boolean(permissions?.includes(permission));
}

export function displayRoleName(
  language: string,
  role: string,
  nameEn?: string | null,
  nameAr?: string | null,
  fallback?: (key: string, options?: Record<string, unknown>) => string,
): string {
  const named = localizedName(language, nameEn, nameAr);
  if (named) {
    return named;
  }
  return fallback ? fallback(`role.${role}`) : role;
}
