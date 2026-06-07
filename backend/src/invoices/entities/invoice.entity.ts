import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DecimalTransformer } from '../../common/decimal.transformer';
import { InvoiceStatus } from '../invoice-status.enum';
import { InvoiceItem } from './invoice-item.entity';

/**
 * Customer details are embedded directly on the invoice (design decision
 * documented in the README / PLAN). The data model could be normalised into a
 * separate customers table later without changing the public API shape.
 */
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  invoiceId: string;

  /** User-provided, unique across all invoices (enforced at the DB level). */
  @Index({ unique: true })
  @Column({ unique: true })
  invoiceNumber: string;

  /** Optional external reference. */
  @Column({ nullable: true })
  invoiceReference?: string;

  @Index()
  @Column('date')
  invoiceDate: string;

  @Index()
  @Column('date')
  dueDate: string;

  @Column()
  currency: string;

  @Column()
  currencySymbol: string;

  @Column({ nullable: true })
  description?: string;

  /** Only Draft | Pending | Paid are persisted. Overdue is derived at read time. */
  @Index()
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.Draft })
  status: InvoiceStatus;

  // ---- Embedded customer ----
  @Index()
  @Column()
  customerFullname: string;

  @Column()
  customerEmail: string;

  @Column({ nullable: true })
  customerMobileNumber?: string;

  @Column({ nullable: true })
  customerAddress?: string;

  // ---- Server-calculated monetary fields ----
  @Column('numeric', { precision: 14, scale: 2, transformer: DecimalTransformer })
  invoiceSubTotal: number;

  @Column('numeric', { precision: 14, scale: 2, transformer: DecimalTransformer })
  totalTax: number;

  @Column('numeric', { precision: 14, scale: 2, transformer: DecimalTransformer })
  totalDiscount: number;

  @Index()
  @Column('numeric', { precision: 14, scale: 2, transformer: DecimalTransformer })
  totalAmount: number;

  @Column('numeric', {
    precision: 14,
    scale: 2,
    default: 0,
    transformer: DecimalTransformer,
  })
  totalPaid: number;

  @Column('numeric', { precision: 14, scale: 2, transformer: DecimalTransformer })
  balanceAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, {
    cascade: true,
    eager: true,
  })
  items: InvoiceItem[];
}
