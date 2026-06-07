import { Invoice } from './entities/invoice.entity';
import { deriveStatus } from './invoice-calculations';
import { DERIVED_OVERDUE, InvoiceStatus } from './invoice-status.enum';

export interface InvoiceItemView {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

export interface CustomerView {
  fullname: string;
  email: string;
  mobileNumber?: string;
  address?: string;
}

export interface InvoiceView {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description?: string;
  /** Derived status: Draft | Pending | Paid | Overdue. */
  status: InvoiceStatus | typeof DERIVED_OVERDUE;
  customer: CustomerView;
  items: InvoiceItemView[];
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceAmount: number;
  createdAt: Date;
  createdBy?: string;
}

/** Maps a persisted Invoice entity to the public API shape with derived status. */
export function toInvoiceView(invoice: Invoice, today: Date = new Date()): InvoiceView {
  return {
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceReference: invoice.invoiceReference,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    currencySymbol: invoice.currencySymbol,
    description: invoice.description,
    status: deriveStatus(invoice.status, invoice.dueDate, today),
    customer: {
      fullname: invoice.customerFullname,
      email: invoice.customerEmail,
      mobileNumber: invoice.customerMobileNumber,
      address: invoice.customerAddress,
    },
    items: (invoice.items ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      rate: i.rate,
    })),
    invoiceSubTotal: invoice.invoiceSubTotal,
    totalTax: invoice.totalTax,
    totalDiscount: invoice.totalDiscount,
    totalAmount: invoice.totalAmount,
    totalPaid: invoice.totalPaid,
    balanceAmount: invoice.balanceAmount,
    createdAt: invoice.createdAt,
    createdBy: invoice.createdBy,
  };
}
