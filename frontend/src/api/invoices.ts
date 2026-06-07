import { api } from './client';
import type {
  CreateInvoicePayload,
  Invoice,
  InvoiceQuery,
  Paginated,
} from '../lib/types';

export async function fetchInvoices(
  query: InvoiceQuery,
): Promise<Paginated<Invoice>> {
  const params: Record<string, string | number> = {
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    ordering: query.ordering,
  };
  if (query.status) params.status = query.status;
  if (query.keyword) params.keyword = query.keyword;
  if (query.fromDate) params.fromDate = query.fromDate;
  if (query.toDate) params.toDate = query.toDate;

  const { data } = await api.get<Paginated<Invoice>>('/invoices', { params });
  return data;
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(
  payload: CreateInvoicePayload,
): Promise<Invoice> {
  const { data } = await api.post<Invoice>('/invoices', payload);
  return data;
}
