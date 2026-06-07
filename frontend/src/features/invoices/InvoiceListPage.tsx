import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchInvoices } from '../../api/invoices';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, formatMoney } from '../../lib/format';
import type { InvoiceQuery, InvoiceStatus } from '../../lib/types';

const STATUS_OPTIONS: (InvoiceStatus | '')[] = ['', 'Draft', 'Pending', 'Paid', 'Overdue'];
const SORT_OPTIONS: { value: InvoiceQuery['sortBy']; label: string }[] = [
  { value: 'invoiceDate', label: 'Invoice Date' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'totalAmount', label: 'Total Amount' },
];
const PAGE_SIZES = [10, 20, 50];

/** Debounce a value so typing in the search box doesn't fire a request per keystroke. */
function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState('');
  const keyword = useDebounced(keywordInput);
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [sortBy, setSortBy] = useState<InvoiceQuery['sortBy']>('invoiceDate');
  const [ordering, setOrdering] = useState<InvoiceQuery['ordering']>('DESC');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 whenever a filter/search/sort changes.
  useEffect(() => setPage(1), [keyword, status, sortBy, ordering, pageSize]);

  const query: InvoiceQuery = useMemo(
    () => ({
      page,
      pageSize,
      sortBy,
      ordering,
      status: status || undefined,
      keyword: keyword || undefined,
    }),
    [page, pageSize, sortBy, ordering, status, keyword],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoices', query],
    queryFn: () => fetchInvoices(query),
    placeholderData: keepPreviousData,
  });

  const total = data?.paging.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Link
          to="/invoices/new"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Invoice
        </Link>
      </div>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Search by number or customer…"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          aria-label="Search invoices"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')}
          aria-label="Filter by status"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'All statuses' : s}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as InvoiceQuery['sortBy'])}
          aria-label="Sort by"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
        <select
          value={ordering}
          onChange={(e) => setOrdering(e.target.value as InvoiceQuery['ordering'])}
          aria-label="Order"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="DESC">Descending</option>
          <option value="ASC">Ascending</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Invoice #</Th>
                <Th>Customer</Th>
                <Th>Invoice Date</Th>
                <Th>Due Date</Th>
                <Th align="right">Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Loading invoices…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-red-600">
                    {(error as Error)?.message ?? 'Failed to load invoices'}
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No invoices match your filters.
                  </td>
                </tr>
              )}
              {data?.data.map((inv) => (
                <tr
                  key={inv.invoiceId}
                  onClick={() => navigate(`/invoices/${inv.invoiceId}`)}
                  className="cursor-pointer hover:bg-indigo-50"
                >
                  <td className="px-4 py-3 font-medium text-indigo-600">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{inv.customer.fullname}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                    {formatMoney(inv.totalAmount, inv.currencySymbol)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            {total === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Page size"
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-3 font-semibold text-gray-600 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      scope="col"
    >
      {children}
    </th>
  );
}
