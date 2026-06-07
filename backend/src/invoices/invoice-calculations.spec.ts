import {
  calculateTotals,
  deriveStatus,
  round2,
} from './invoice-calculations';
import { DERIVED_OVERDUE, InvoiceStatus } from './invoice-status.enum';

describe('invoice calculations', () => {
  describe('calculateTotals', () => {
    it('computes subtotal, tax, total and balance per the spec formulas', () => {
      // quantity 2 x rate 1000 = 2000 subtotal; 10% tax = 200; discount 20
      // total = 2000 + 200 - 20 = 2180; paid 1451.34 -> balance 728.66
      const totals = calculateTotals({
        quantity: 2,
        rate: 1000,
        taxPercent: 10,
        discount: 20,
        totalPaid: 1451.34,
      });
      expect(totals.invoiceSubTotal).toBe(2000);
      expect(totals.totalTax).toBe(200);
      expect(totals.totalDiscount).toBe(20);
      expect(totals.totalAmount).toBe(2180);
      expect(totals.balanceAmount).toBe(728.66);
    });

    it('defaults totalPaid to 0, making balance equal to total', () => {
      const totals = calculateTotals({
        quantity: 3,
        rate: 150,
        taxPercent: 10,
        discount: 0,
      });
      expect(totals.invoiceSubTotal).toBe(450);
      expect(totals.totalTax).toBe(45);
      expect(totals.totalAmount).toBe(495);
      expect(totals.balanceAmount).toBe(495);
    });

    it('handles zero tax and zero discount', () => {
      const totals = calculateTotals({
        quantity: 1,
        rate: 499,
        taxPercent: 0,
        discount: 0,
      });
      expect(totals.totalTax).toBe(0);
      expect(totals.totalAmount).toBe(499);
    });

    it('rounds to 2 decimal places without floating point drift', () => {
      const totals = calculateTotals({
        quantity: 3,
        rate: 33.33,
        taxPercent: 7,
        discount: 0,
      });
      expect(totals.invoiceSubTotal).toBe(99.99);
      expect(totals.totalTax).toBe(7);
      expect(totals.totalAmount).toBe(106.99);
    });
  });

  describe('round2', () => {
    it('rounds half up correctly', () => {
      expect(round2(1.005)).toBe(1.01);
      expect(round2(2.675)).toBe(2.68);
    });
  });

  describe('deriveStatus (Overdue derivation)', () => {
    const today = new Date('2026-06-05T10:00:00.000Z');

    it('returns Overdue when not paid and due date is in the past', () => {
      expect(deriveStatus(InvoiceStatus.Pending, '2026-06-01', today)).toBe(
        DERIVED_OVERDUE,
      );
      expect(deriveStatus(InvoiceStatus.Draft, '2026-06-04', today)).toBe(
        DERIVED_OVERDUE,
      );
    });

    it('never marks a Paid invoice as Overdue, even if past due', () => {
      expect(deriveStatus(InvoiceStatus.Paid, '2020-01-01', today)).toBe(
        InvoiceStatus.Paid,
      );
    });

    it('keeps the persisted status when due date is today or in the future', () => {
      expect(deriveStatus(InvoiceStatus.Pending, '2026-06-05', today)).toBe(
        InvoiceStatus.Pending,
      );
      expect(deriveStatus(InvoiceStatus.Draft, '2026-12-31', today)).toBe(
        InvoiceStatus.Draft,
      );
    });
  });
});
