/**
 * Statuses that are physically persisted in the database.
 * NOTE: "Overdue" is intentionally NOT part of this enum because it is a
 * derived status, computed at read time and never written to the database.
 */
export enum InvoiceStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Paid = 'Paid',
}

/**
 * Derived status that can appear in API responses and be used as a filter,
 * but is never stored. See InvoicesService.deriveStatus().
 */
export const DERIVED_OVERDUE = 'Overdue';

/** All status values a client may filter by. */
export const FILTERABLE_STATUSES = [
  InvoiceStatus.Draft,
  InvoiceStatus.Pending,
  InvoiceStatus.Paid,
  DERIVED_OVERDUE,
] as const;

export type FilterableStatus = (typeof FILTERABLE_STATUSES)[number];
