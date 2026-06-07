/** Format a monetary amount with the invoice's currency symbol. */
export function formatMoney(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Format a YYYY-MM-DD date string for display, e.g. "03 Jun 2026" (locale-independent). */
export function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
