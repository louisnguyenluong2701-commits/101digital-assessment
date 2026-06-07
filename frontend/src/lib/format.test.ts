import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format';

describe('formatMoney', () => {
  it('formats with two decimal places and the given symbol', () => {
    expect(formatMoney(2180, 'AU$')).toBe('AU$2,180.00');
    expect(formatMoney(728.66, '$')).toBe('$728.66');
    expect(formatMoney(0, '£')).toBe('£0.00');
  });
});

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string into a readable date', () => {
    expect(formatDate('2026-06-03')).toMatch(/03 Jun 2026/);
  });
  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });
});
