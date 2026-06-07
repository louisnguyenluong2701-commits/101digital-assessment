import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invoice, Paginated } from '../../lib/types';
import { InvoiceListPage } from './InvoiceListPage';

vi.mock('../../api/invoices', () => ({
  fetchInvoices: vi.fn(),
}));
import { fetchInvoices } from '../../api/invoices';

function makeInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    invoiceId: 'id-1',
    invoiceNumber: 'IV-001',
    invoiceDate: '2026-06-03',
    dueDate: '2026-07-03',
    currency: 'AUD',
    currencySymbol: 'AU$',
    status: 'Draft',
    customer: { fullname: 'Paul', email: 'p@x.com' },
    items: [],
    invoiceSubTotal: 2000,
    totalTax: 200,
    totalDiscount: 0,
    totalAmount: 2200,
    totalPaid: 0,
    balanceAmount: 2200,
    createdAt: '2026-06-03T00:00:00Z',
    ...overrides,
  };
}

function mockResult(data: Invoice[], total = data.length): Paginated<Invoice> {
  return { data, paging: { page: 1, pageSize: 10, total } };
}

function renderList() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('InvoiceListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invoices returned by the API', async () => {
    (fetchInvoices as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResult([
        makeInvoice({ invoiceId: '1', invoiceNumber: 'IV-001', status: 'Overdue' }),
        makeInvoice({
          invoiceId: '2',
          invoiceNumber: 'IV-002',
          customer: { fullname: 'Alice', email: 'a@x.com' },
          status: 'Paid',
        }),
      ]),
    );

    renderList();

    expect(await screen.findByText('IV-001')).toBeInTheDocument();
    expect(screen.getByText('IV-002')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // "Overdue"/"Paid" also appear as filter <option>s; scope to the badge span.
    expect(screen.getByText('Overdue', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Paid', { selector: 'span' })).toBeInTheDocument();
  });

  it('passes the selected status filter to the API', async () => {
    (fetchInvoices as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult([]));
    renderList();

    await waitFor(() => expect(fetchInvoices).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/filter by status/i), 'Paid');

    await waitFor(() =>
      expect(fetchInvoices).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'Paid', page: 1 }),
      ),
    );
  });

  it('shows an empty state when there are no matching invoices', async () => {
    (fetchInvoices as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult([]));
    renderList();
    expect(await screen.findByText(/no invoices match your filters/i)).toBeInTheDocument();
  });
});
