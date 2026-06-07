export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue';

export interface AuthUser {
  id: string;
  email: string;
  fullname: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

export interface Customer {
  fullname: string;
  email: string;
  mobileNumber?: string;
  address?: string;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description?: string;
  status: InvoiceStatus;
  customer: Customer;
  items: InvoiceItem[];
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceAmount: number;
  createdAt: string;
  createdBy?: string;
}

export interface Paginated<T> {
  data: T[];
  paging: { page: number; pageSize: number; total: number };
}

export interface InvoiceQuery {
  page: number;
  pageSize: number;
  sortBy: 'invoiceDate' | 'dueDate' | 'totalAmount';
  ordering: 'ASC' | 'DESC';
  status?: InvoiceStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateInvoicePayload {
  customerFullname: string;
  customerEmail: string;
  customerMobileNumber?: string;
  customerAddress?: string;
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  description?: string;
  tax?: number;
  discount?: number;
  totalPaid?: number;
  items: { name: string; quantity: number; rate: number }[];
}
