import type { InvoiceStatus } from '../lib/types';

const STYLES: Record<InvoiceStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700 ring-gray-300',
  Pending: 'bg-amber-100 text-amber-800 ring-amber-300',
  Paid: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  Overdue: 'bg-red-100 text-red-800 ring-red-300',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
