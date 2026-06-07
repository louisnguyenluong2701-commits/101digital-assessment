import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DecimalTransformer } from '../../common/decimal.transformer';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  name: string;

  /** Positive integer. */
  @Column('int')
  quantity: number;

  /** Positive number. Stored as decimal for currency precision. */
  @Column('numeric', { precision: 14, scale: 2, transformer: DecimalTransformer })
  rate: number;
}
