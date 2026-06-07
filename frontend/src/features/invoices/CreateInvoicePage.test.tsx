import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { CreateInvoicePage } from './CreateInvoicePage';

vi.mock('../../api/invoices', () => ({
  createInvoice: vi.fn(),
}));
import { createInvoice } from '../../api/invoices';

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/invoices/new']}>
          <Routes>
            <Route path="/invoices/new" element={<CreateInvoicePage />} />
            <Route path="/" element={<div>Invoice List Home</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Test Co');
  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
  await userEvent.type(screen.getByLabelText('Invoice number'), 'IV-100');
  await userEvent.type(screen.getByLabelText('Item name'), 'Widget');
  // Quantity defaults to 1; set a rate.
  await userEvent.clear(screen.getByLabelText('Rate'));
  await userEvent.type(screen.getByLabelText('Rate'), '1000');
}

describe('CreateInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a live total preview from quantity, rate, tax and discount', async () => {
    renderPage();
    await userEvent.clear(screen.getByLabelText('Rate'));
    await userEvent.type(screen.getByLabelText('Rate'), '1000');
    // qty 1 x 1000 = 1000 subtotal; default tax 10% = 100; discount 0 -> 1100
    expect(await screen.findByText('$1,100.00')).toBeInTheDocument();
  });

  it('rejects a due date earlier than the invoice date (no API call)', async () => {
    renderPage();
    await fillValidForm();
    await userEvent.type(screen.getByLabelText('Invoice date'), '2026-07-03');
    await userEvent.type(screen.getByLabelText('Due date'), '2026-06-03');

    await userEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(
      await screen.findByText(/due date must be on or after invoice date/i),
    ).toBeInTheDocument();
    expect(createInvoice).not.toHaveBeenCalled();
  });

  it('rejects a discount larger than the total (no API call)', async () => {
    renderPage();
    await fillValidForm(); // qty 1 x rate 1000, default tax 10% -> total 1100
    await userEvent.type(screen.getByLabelText('Invoice date'), '2026-06-03');
    await userEvent.type(screen.getByLabelText('Due date'), '2026-07-03');
    await userEvent.clear(screen.getByLabelText('Discount (amount)'));
    await userEvent.type(screen.getByLabelText('Discount (amount)'), '99999');

    await userEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(
      await screen.findByText(/discount cannot exceed the subtotal plus tax/i),
    ).toBeInTheDocument();
    expect(createInvoice).not.toHaveBeenCalled();
  });

  it('submits a valid invoice and redirects to the list', async () => {
    (createInvoice as ReturnType<typeof vi.fn>).mockResolvedValue({ invoiceId: 'x' });
    renderPage();
    await fillValidForm();
    await userEvent.type(screen.getByLabelText('Invoice date'), '2026-06-03');
    await userEvent.type(screen.getByLabelText('Due date'), '2026-07-03');

    await userEvent.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => expect(createInvoice).toHaveBeenCalledTimes(1));
    const payload = (createInvoice as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload).toMatchObject({
      customerFullname: 'Test Co',
      invoiceNumber: 'IV-100',
      items: [{ name: 'Widget', quantity: 1, rate: 1000 }],
    });
    expect(await screen.findByText(/invoice list home/i)).toBeInTheDocument();
  });
});
