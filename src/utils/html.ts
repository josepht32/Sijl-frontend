export function htmlHasContent(html: string): boolean {
  if (!html) {
    return false;
  }
  if (/<img\b/i.test(html)) {
    return true;
  }
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}
