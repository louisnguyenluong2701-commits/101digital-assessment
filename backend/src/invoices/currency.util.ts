/** Best-effort mapping from ISO 4217 code to a display symbol. */
const SYMBOLS: Record<string, string> = {
  AUD: 'AU$',
  USD: 'US$',
  GBP: '£',
  EUR: '€',
  SGD: 'S$',
  NZD: 'NZ$',
};

export function currencySymbolFor(code: string): string {
  return SYMBOLS[code?.toUpperCase()] ?? code;
}
