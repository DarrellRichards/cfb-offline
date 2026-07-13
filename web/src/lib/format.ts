/** Locale-stable formatting shared by server and client components. */
export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
