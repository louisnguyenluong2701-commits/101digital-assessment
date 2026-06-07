import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { currencySymbolFor } from '../../invoices/currency.util';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceItem } from '../../invoices/entities/invoice-item.entity';
import { calculateTotals } from '../../invoices/invoice-calculations';
import { InvoiceStatus } from '../../invoices/invoice-status.enum';
import { User } from '../../users/user.entity';

// ---- Deterministic-ish pseudo random helpers (so re-seeds are varied) ----
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const CUSTOMERS = [
  { fullname: 'Paul Tan', email: 'paul@101digital.io', address: 'Singapore' },
  { fullname: 'Alice Wong', email: 'alice@example.com', address: 'Sydney, AU' },
  { fullname: 'Bob Martin', email: 'bob@example.com', address: 'London, UK' },
  { fullname: 'Carol Lee', email: 'carol@example.com', address: 'Auckland, NZ' },
  { fullname: 'David Chen', email: 'david@example.com', address: 'Melbourne, AU' },
  { fullname: 'Emma Davis', email: 'emma@example.com', address: 'Singapore' },
  { fullname: 'Frank Miller', email: 'frank@example.com', address: 'New York, US' },
  { fullname: 'Grace Kim', email: 'grace@example.com', address: 'Seoul, KR' },
  { fullname: 'Henry Ford', email: 'henry@example.com', address: 'Detroit, US' },
  { fullname: 'Ivy Nguyen', email: 'ivy@example.com', address: 'Hanoi, VN' },
];

const ITEMS = [
  { name: 'Honda RC150', rate: 1000 },
  { name: 'Consulting (hours)', rate: 150 },
  { name: 'Web design package', rate: 2500 },
  { name: 'Annual subscription', rate: 499 },
  { name: 'Hardware unit', rate: 320 },
  { name: 'Support retainer', rate: 800 },
];

const CURRENCIES = ['AUD', 'USD', 'GBP', 'SGD'];

// Only persisted statuses — never seed "Overdue" (it is derived at read time).
const STATUSES = [
  InvoiceStatus.Draft,
  InvoiceStatus.Pending,
  InvoiceStatus.Paid,
];

function buildInvoice(index: number): Partial<Invoice> {
  const customer = pick(CUSTOMERS);
  const item = pick(ITEMS);
  const currency = pick(CURRENCIES);
  const status = pick(STATUSES);
  const quantity = randInt(1, 6);

  // Spread invoice dates across the last ~120 days; due 14-45 days later.
  // This mix guarantees some Pending/Draft invoices fall past due so the
  // derived "Overdue" status is demonstrable without ever storing it.
  const invoiceDate = addDays(new Date(), -randInt(0, 120));
  const dueDate = addDays(invoiceDate, randInt(14, 45));

  const tax = pick([10, 10, 10, 0, 7, 15]);
  const discount = pick([0, 0, 0, 20, 50, 100]);
  const totalAmountEstimate = quantity * item.rate;
  const totalPaid =
    status === InvoiceStatus.Paid
      ? totalAmountEstimate
      : pick([0, 0, randInt(0, Math.floor(totalAmountEstimate / 2))]);

  const totals = calculateTotals({
    quantity,
    rate: item.rate,
    taxPercent: tax,
    discount,
    totalPaid,
  });

  return {
    invoiceNumber: `IV${Date.now().toString().slice(-6)}${String(index).padStart(4, '0')}`,
    invoiceReference: `#${randInt(1000000, 9999999)}`,
    invoiceDate: ymd(invoiceDate),
    dueDate: ymd(dueDate),
    currency,
    currencySymbol: currencySymbolFor(currency),
    description: `Invoice issued to ${customer.fullname}`,
    status,
    customerFullname: customer.fullname,
    customerEmail: customer.email,
    customerMobileNumber: String(randInt(900000000000, 999999999999)),
    customerAddress: customer.address,
    totalPaid,
    ...totals,
    items: [
      Object.assign(new InvoiceItem(), {
        name: item.name,
        quantity,
        rate: item.rate,
      }),
    ],
  };
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const config = app.get(ConfigService);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const invoiceRepo = app.get<Repository<Invoice>>(getRepositoryToken(Invoice));

  // ---- Clean slate ----
  console.log('Clearing existing invoices and users...');
  await invoiceRepo.createQueryBuilder().delete().execute();
  await userRepo.createQueryBuilder().delete().execute();

  // ---- Default reviewer account ----
  const email = config.get<string>('SEED_USER_EMAIL', 'admin@101digital.io');
  const password = config.get<string>('SEED_USER_PASSWORD', '$Abc1234');
  const fullname = config.get<string>('SEED_USER_FULLNAME', 'Admin');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepo.save(
    userRepo.create({ email, passwordHash, fullname }),
  );
  console.log(`Created admin user: ${email} / ${password}`);

  // ---- Appendix A reference invoice (verbatim shape from the assessment) ----
  const appendixTotals = calculateTotals({
    quantity: 2,
    rate: 1000,
    taxPercent: 10,
    discount: 20,
    totalPaid: 1451.34,
  });
  const appendix = invoiceRepo.create({
    invoiceNumber: 'IV1780488206995',
    invoiceReference: '#5721662',
    invoiceDate: '2026-06-03',
    dueDate: '2026-07-03',
    currency: 'AUD',
    currencySymbol: 'AU$',
    description: 'Invoice is issued to Kanglee',
    status: InvoiceStatus.Pending,
    customerFullname: 'Paul',
    customerEmail: 'paul@101digital.io',
    customerMobileNumber: '947717364111',
    customerAddress: 'Singapore',
    totalPaid: 1451.34,
    ...appendixTotals,
    createdBy: user.id,
    items: [
      Object.assign(new InvoiceItem(), {
        name: 'Honda RC150',
        quantity: 2,
        rate: 1000,
      }),
    ],
  });
  await invoiceRepo.save(appendix);

  // ---- 35 additional varied invoices ----
  const count = 35;
  for (let i = 1; i <= count; i++) {
    const data = buildInvoice(i);
    await invoiceRepo.save(invoiceRepo.create({ ...data, createdBy: user.id }));
  }

  const total = await invoiceRepo.count();
  console.log(`Seeded ${total} invoices (1 Appendix A reference + ${count} generated).`);

  await app.close();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
