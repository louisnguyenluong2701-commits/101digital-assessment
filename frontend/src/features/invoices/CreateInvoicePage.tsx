import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../../api/client';
import { createInvoice } from '../../api/invoices';
import { useToast } from '../../components/Toast';
import { formatMoney } from '../../lib/format';
import type { CreateInvoicePayload } from '../../lib/types';

interface FormValues {
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
  tax: number;
  discount: number;
  itemName: string;
  itemQuantity: number;
  itemRate: number;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export function CreateInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { currency: 'AUD', tax: 10, discount: 0, itemQuantity: 1 },
  });

  // Live preview only — the backend computes the authoritative totals.
  const qty = Number(watch('itemQuantity')) || 0;
  const rate = Number(watch('itemRate')) || 0;
  const tax = Number(watch('tax')) || 0;
  const discount = Number(watch('discount')) || 0;
  const subTotal = qty * rate;
  const previewTotal = subTotal + subTotal * (tax / 100) - discount;

  const mutation = useMutation({
    mutationFn: (payload: CreateInvoicePayload) => createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      notify('success', 'Invoice created successfully');
      navigate('/');
    },
  });

  const onSubmit = (v: FormValues) => {
    // Client-side cross-field validation: due date must be on or after invoice date.
    if (new Date(v.dueDate) < new Date(v.invoiceDate)) {
      setError('dueDate', { message: 'Due date must be on or after invoice date' });
      return;
    }

    // An invoice total cannot be negative — guard against an over-large discount.
    // (The backend enforces this too; this gives immediate inline feedback.)
    if (previewTotal < 0) {
      setError('discount', {
        message: 'Discount cannot exceed the subtotal plus tax',
      });
      return;
    }

    const payload: CreateInvoicePayload = {
      customerFullname: v.customerFullname,
      customerEmail: v.customerEmail,
      customerMobileNumber: v.customerMobileNumber || undefined,
      customerAddress: v.customerAddress || undefined,
      invoiceNumber: v.invoiceNumber,
      invoiceReference: v.invoiceReference || undefined,
      invoiceDate: v.invoiceDate,
      dueDate: v.dueDate,
      currency: v.currency,
      description: v.description || undefined,
      tax: Number(v.tax),
      discount: Number(v.discount),
      items: [
        { name: v.itemName, quantity: Number(v.itemQuantity), rate: Number(v.itemRate) },
      ],
    };

    mutation.mutate(payload, {
      onError: (err) => notify('error', extractErrorMessage(err, 'Could not create invoice')),
    });
  };

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
        ← Back to invoices
      </Link>
      <h1 className="mb-5 text-2xl font-bold text-gray-900">New Invoice</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Customer */}
        <Section title="Customer">
          <Field label="Full name" error={errors.customerFullname?.message}>
            <input className={inputClass} {...register('customerFullname', { required: 'Customer name is required' })} />
          </Field>
          <Field label="Email" error={errors.customerEmail?.message}>
            <input
              type="email"
              className={inputClass}
              {...register('customerEmail', {
                required: 'Customer email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />
          </Field>
          <Field label="Mobile (optional)">
            <input className={inputClass} {...register('customerMobileNumber')} />
          </Field>
          <Field label="Address (optional)">
            <input className={inputClass} {...register('customerAddress')} />
          </Field>
        </Section>

        {/* Invoice */}
        <Section title="Invoice details">
          <Field label="Invoice number" error={errors.invoiceNumber?.message}>
            <input className={inputClass} {...register('invoiceNumber', { required: 'Invoice number is required' })} />
          </Field>
          <Field label="Reference (optional)">
            <input className={inputClass} {...register('invoiceReference')} />
          </Field>
          <Field label="Invoice date" error={errors.invoiceDate?.message}>
            <input type="date" className={inputClass} {...register('invoiceDate', { required: 'Invoice date is required' })} />
          </Field>
          <Field label="Due date" error={errors.dueDate?.message}>
            <input type="date" className={inputClass} {...register('dueDate', { required: 'Due date is required' })} />
          </Field>
          <Field label="Currency" error={errors.currency?.message}>
            <select className={inputClass} {...register('currency', { required: true })}>
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="SGD">SGD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
          <Field label="Description (optional)">
            <input className={inputClass} {...register('description')} />
          </Field>
        </Section>

        {/* Line item (exactly one) */}
        <Section title="Line item">
          <Field label="Item name" error={errors.itemName?.message}>
            <input className={inputClass} {...register('itemName', { required: 'Item name is required' })} />
          </Field>
          <Field label="Quantity" error={errors.itemQuantity?.message}>
            <input
              type="number"
              min={1}
              step={1}
              className={inputClass}
              {...register('itemQuantity', {
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be a positive integer' },
                valueAsNumber: true,
              })}
            />
          </Field>
          <Field label="Rate" error={errors.itemRate?.message}>
            <input
              type="number"
              min={0.01}
              step="0.01"
              className={inputClass}
              {...register('itemRate', {
                required: 'Rate is required',
                min: { value: 0.01, message: 'Rate must be a positive number' },
                valueAsNumber: true,
              })}
            />
          </Field>
        </Section>

        {/* Tax / discount + preview */}
        <Section title="Tax & discount">
          <Field label="Tax (%)" error={errors.tax?.message}>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              {...register('tax', { min: { value: 0, message: 'Tax must be non-negative' }, valueAsNumber: true })}
            />
          </Field>
          <Field label="Discount (amount)" error={errors.discount?.message}>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              {...register('discount', { min: { value: 0, message: 'Discount must be non-negative' }, valueAsNumber: true })}
            />
          </Field>
        </Section>

        <div className="rounded-md bg-indigo-50 p-4 text-sm text-indigo-900">
          <div className="flex justify-between">
            <span>Subtotal (preview)</span>
            <span>{formatMoney(subTotal)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold">
            <span>Estimated total</span>
            <span>{formatMoney(previewTotal)}</span>
          </div>
          <p className="mt-2 text-xs text-indigo-700">
            Final totals are calculated by the server on submit.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Creating…' : 'Create invoice'}
          </button>
          <Link to="/" className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border bg-white p-5 shadow-sm">
      <legend className="px-2 text-sm font-semibold text-gray-700">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
