import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { currencySymbolFor } from './currency.util';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { calculateTotals } from './invoice-calculations';
import { InvoiceStatus, DERIVED_OVERDUE } from './invoice-status.enum';
import { InvoiceView, toInvoiceView } from './invoice.presenter';

export interface PaginatedInvoices {
  data: InvoiceView[];
  paging: { page: number; pageSize: number; total: number };
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoices: Repository<Invoice>,
  ) {}

  async create(dto: CreateInvoiceDto, userId?: string): Promise<InvoiceView> {
    // ---- Validation that depends on relationships between fields ----
    if (!dto.items || dto.items.length !== 1) {
      throw new BadRequestException([
        'Exactly one line item is required for this assessment',
      ]);
    }
    if (new Date(dto.dueDate) < new Date(dto.invoiceDate)) {
      throw new BadRequestException(['dueDate must be on or after invoiceDate']);
    }

    // ---- Unique invoice number (checked before insert for a friendly 409) ----
    const existing = await this.invoices.findOne({
      where: { invoiceNumber: dto.invoiceNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Invoice number "${dto.invoiceNumber}" already exists`,
      );
    }

    const item = dto.items[0];
    const taxPercent = dto.tax ?? 10; // defaults to 10%
    const discount = dto.discount ?? 0; // defaults to 0
    const totalPaid = dto.totalPaid ?? 0;

    // ---- Server-side money math (never trust the client) ----
    const totals = calculateTotals({
      quantity: item.quantity,
      rate: item.rate,
      taxPercent,
      discount,
      totalPaid,
    });

    // An invoice total can never be negative — a discount larger than the
    // subtotal + tax would represent a credit note, not an invoice.
    if (totals.totalAmount < 0) {
      throw new BadRequestException([
        'Discount cannot exceed the invoice subtotal plus tax (total must be at least 0)',
      ]);
    }

    const invoice = this.invoices.create({
      invoiceNumber: dto.invoiceNumber,
      invoiceReference: dto.invoiceReference,
      invoiceDate: dto.invoiceDate,
      dueDate: dto.dueDate,
      currency: dto.currency,
      currencySymbol: dto.currencySymbol ?? currencySymbolFor(dto.currency),
      description: dto.description,
      status: InvoiceStatus.Draft, // new invoices are always Draft
      customerFullname: dto.customerFullname,
      customerEmail: dto.customerEmail,
      customerMobileNumber: dto.customerMobileNumber,
      customerAddress: dto.customerAddress,
      totalPaid,
      ...totals,
      createdBy: userId,
      items: [
        Object.assign(new InvoiceItem(), {
          name: item.name,
          quantity: item.quantity,
          rate: item.rate,
        }),
      ],
    });

    try {
      const saved = await this.invoices.save(invoice);
      return toInvoiceView(saved);
    } catch (err: any) {
      // Postgres unique-violation safety net (race condition / DB-level guard).
      if (err?.code === '23505') {
        throw new ConflictException(
          `Invoice number "${dto.invoiceNumber}" already exists`,
        );
      }
      throw err;
    }
  }

  async findAll(query: QueryInvoicesDto): Promise<PaginatedInvoices> {
    const qb = this.invoices
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'item');

    // ---- Search: partial, case-insensitive, on invoice number OR customer name ----
    if (query.keyword) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('invoice.invoiceNumber ILIKE :kw', {
            kw: `%${query.keyword}%`,
          }).orWhere('invoice.customerFullname ILIKE :kw', {
            kw: `%${query.keyword}%`,
          });
        }),
      );
    }

    // ---- Date range on invoiceDate ----
    if (query.fromDate) {
      qb.andWhere('invoice.invoiceDate >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('invoice.invoiceDate <= :toDate', { toDate: query.toDate });
    }

    // ---- Status filter (applied against the DERIVED status) ----
    // Overdue is never stored, so "Overdue" expands to: not Paid AND dueDate < today.
    // Conversely, a Draft/Pending invoice that is past due reads as Overdue, so it is
    // excluded when filtering by its persisted status.
    if (query.status === DERIVED_OVERDUE) {
      qb.andWhere('invoice.status != :paid', { paid: InvoiceStatus.Paid }).andWhere(
        'invoice.dueDate < CURRENT_DATE',
      );
    } else if (query.status === InvoiceStatus.Paid) {
      qb.andWhere('invoice.status = :status', { status: InvoiceStatus.Paid });
    } else if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status }).andWhere(
        'invoice.dueDate >= CURRENT_DATE',
      );
    }

    // ---- Sort ----
    qb.orderBy(`invoice.${query.sortBy}`, query.ordering);

    // ---- Server-side pagination ----
    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((r) => toInvoiceView(r)),
      paging: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findOne(id: string): Promise<InvoiceView> {
    const invoice = await this.invoices.findOne({ where: { invoiceId: id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return toInvoiceView(invoice);
  }
}
