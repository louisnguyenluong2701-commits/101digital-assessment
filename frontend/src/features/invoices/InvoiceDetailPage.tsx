import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchInvoice } from '../../api/invoices';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, formatMoney } from '../../lib/format';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: inv, isLoading, isError, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoice(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <p className="py-10 text-center text-gray-500">Loading invoice…</p>;
  }
  if (isError || !inv) {
    return (
      <div className="py-10 text-center">
        <p className="text-red-600">{(error as Error)?.message ?? 'Invoice not found'}</p>
        <Link to="/" className="mt-3 inline-block text-indigo-600 hover:underline">
          ← Back to invoices
        </Link>
      </div>
    );
  }

  const sym = inv.currencySymbol;

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
        ← Back to invoices
      </Link>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{inv.invoiceNumber}</h1>
            {inv.invoiceReference && (
              <p className="text-sm text-gray-500">Ref: {inv.invoiceReference}</p>
            )}
            {inv.description && (
              <p className="mt-1 text-sm text-gray-600">{inv.description}</p>
            )}
          </div>
          <div className="sm:text-right">
            <StatusBadge status={inv.status} />
            <p className="mt-2 text-sm text-gray-500">
              Issued: {formatDate(inv.invoiceDate)}
            </p>
            <p className="text-sm text-gray-500">Due: {formatDate(inv.dueDate)}</p>
          </div>
        </div>

        {/* Customer */}
        <section className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bill To
            </h2>
            <p className="font-medium text-gray-900">{inv.customer.fullname}</p>
            <p className="text-sm text-gray-600">{inv.customer.email}</p>
            {inv.customer.mobileNumber && (
              <p className="text-sm text-gray-600">{inv.customer.mobileNumber}</p>
            )}
            {inv.customer.address && (
              <p className="text-sm text-gray-600">{inv.customer.address}</p>
            )}
          </div>
          <div className="sm:text-right">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Currency
            </h2>
            <p className="text-sm text-gray-700">
              {inv.currency} ({inv.currencySymbol})
            </p>
          </div>
        </section>

        {/* Line items */}
        <section>
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Item</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Qty</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Rate</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inv.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2 text-gray-900">{it.name}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{it.quantity}</td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatMoney(it.rate, sym)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {formatMoney(it.quantity * it.rate, sym)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Totals */}
        <section className="mt-5 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <Row label="Subtotal" value={formatMoney(inv.invoiceSubTotal, sym)} />
            <Row label="Tax" value={formatMoney(inv.totalTax, sym)} />
            <Row label="Discount" value={`- ${formatMoney(inv.totalDiscount, sym)}`} />
            <div className="border-t pt-2">
              <Row label="Total" value={formatMoney(inv.totalAmount, sym)} bold />
            </div>
            <Row label="Paid" value={formatMoney(inv.totalPaid, sym)} />
            <div className="border-t pt-2">
              <Row
                label="Outstanding balance"
                value={formatMoney(inv.balanceAmount, sym)}
                bold
              />
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? 'font-semibold text-gray-900' : 'text-gray-600'}>{label}</dt>
      <dd className={bold ? 'font-semibold text-gray-900' : 'text-gray-700'}>{value}</dd>
    </div>
  );
}
