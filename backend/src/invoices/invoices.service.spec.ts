import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

/** Minimal in-memory stub of the TypeORM repository used by the service. */
function createRepoMock() {
  const store: Invoice[] = [];
  return {
    store,
    findOne: jest.fn(({ where }: any) => {
      if (where.invoiceNumber) {
        return Promise.resolve(
          store.find((i) => i.invoiceNumber === where.invoiceNumber) ?? null,
        );
      }
      if (where.invoiceId) {
        return Promise.resolve(
          store.find((i) => i.invoiceId === where.invoiceId) ?? null,
        );
      }
      return Promise.resolve(null);
    }),
    create: jest.fn((data: any) => data as Invoice),
    save: jest.fn((inv: any) => {
      const saved = {
        ...inv,
        invoiceId: inv.invoiceId ?? `id-${store.length + 1}`,
        createdAt: new Date(),
      } as Invoice;
      store.push(saved);
      return Promise.resolve(saved);
    }),
  };
}

function baseDto(overrides: Partial<CreateInvoiceDto> = {}): CreateInvoiceDto {
  return {
    customerFullname: 'Paul',
    customerEmail: 'paul@101digital.io',
    invoiceNumber: 'IV-001',
    invoiceDate: '2026-06-03',
    dueDate: '2026-07-03',
    currency: 'AUD',
    items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
    ...overrides,
  } as CreateInvoiceDto;
}

describe('InvoicesService', () => {
  let service: InvoicesService;
  let repo: ReturnType<typeof createRepoMock>;

  beforeEach(async () => {
    repo = createRepoMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(InvoicesService);
  });

  it('creates an invoice as Draft with backend-calculated totals', async () => {
    const view = await service.create(baseDto(), 'user-1');
    expect(view.status).toBe('Draft');
    expect(view.invoiceSubTotal).toBe(2000);
    expect(view.totalTax).toBe(200); // default 10%
    expect(view.totalAmount).toBe(2200); // no discount
    expect(view.createdBy).toBe('user-1');
  });

  it('rejects when due date is before invoice date', async () => {
    await expect(
      service.create(baseDto({ dueDate: '2026-06-01' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces unique invoice numbers', async () => {
    await service.create(baseDto({ invoiceNumber: 'DUP-1' }));
    await expect(
      service.create(baseDto({ invoiceNumber: 'DUP-1' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires exactly one line item', async () => {
    await expect(
      service.create(baseDto({ items: [] })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a discount that pushes the total below zero', async () => {
    // item 1 x 100 = 100 subtotal; 10% tax = 110 total; discount 500 -> negative
    await expect(
      service.create(
        baseDto({
          items: [{ name: 'Item', quantity: 1, rate: 100 }],
          discount: 500,
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a discount equal to subtotal plus tax (total exactly 0)', async () => {
    // item 1 x 100 = 100 subtotal; 10% tax = 110 total; discount 110 -> 0
    const view = await service.create(
      baseDto({
        items: [{ name: 'Item', quantity: 1, rate: 100 }],
        discount: 110,
      }),
    );
    expect(view.totalAmount).toBe(0);
  });

  it('throws NotFound for a missing invoice', async () => {
    await expect(service.findOne('does-not-exist')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
