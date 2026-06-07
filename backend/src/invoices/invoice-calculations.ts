import { DERIVED_OVERDUE, InvoiceStatus } from './invoice-status.enum';

/** Round to 2 decimal places, avoiding floating point drift (e.g. 1.005). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface TotalsInput {
  quantity: number;
  rate: number;
  /** Tax percentage, e.g. 10 for 10%. */
  taxPercent: number;
  /** Flat discount amount. */
  discount: number;
  /** Amount already paid. Defaults to 0. */
  totalPaid?: number;
}

export interface Totals {
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  balanceAmount: number;
}

/**
 * Server-side money math. This is the single source of truth for invoice
 * totals — the frontend never calculates these.
 *
 *   subTotal      = quantity x rate
 *   taxAmount     = subTotal x (tax% / 100)
 *   totalAmount   = subTotal + taxAmount - discount
 *   balanceAmount = totalAmount - totalPaid
 */
export function calculateTotals(input: TotalsInput): Totals {
  const { quantity, rate, taxPercent, discount } = input;
  const totalPaid = input.totalPaid ?? 0;

  const invoiceSubTotal = round2(quantity * rate);
  const totalTax = round2(invoiceSubTotal * (taxPercent / 100));
  const totalDiscount = round2(discount);
  const totalAmount = round2(invoiceSubTotal + totalTax - totalDiscount);
  const balanceAmount = round2(totalAmount - totalPaid);

  return { invoiceSubTotal, totalTax, totalDiscount, totalAmount, balanceAmount };
}

/**
 * Overdue is a derived status — never persisted. An invoice reads as "Overdue"
 * when it is not Paid and its due date is strictly before today.
 *
 * @param today defaults to the current date; injectable for deterministic tests.
 */
export function deriveStatus(
  persistedStatus: InvoiceStatus,
  dueDate: string,
  today: Date = new Date(),
): InvoiceStatus | typeof DERIVED_OVERDUE {
  if (persistedStatus === InvoiceStatus.Paid) {
    return persistedStatus;
  }

  // Compare calendar dates only (ignore time-of-day).
  const due = new Date(`${dueDate}T00:00:00.000Z`);
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  return due.getTime() < todayUtc.getTime() ? DERIVED_OVERDUE : persistedStatus;
}
