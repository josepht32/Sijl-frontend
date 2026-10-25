export function casesListPath(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `/cases?${query}` : '/cases';
}
