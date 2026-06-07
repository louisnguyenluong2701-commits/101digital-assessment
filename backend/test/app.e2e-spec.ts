import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';
import { User } from '../src/users/user.entity';
import { Invoice } from '../src/invoices/entities/invoice.entity';

/**
 * End-to-end test of the key workflow: log in, create an invoice, and verify it
 * appears in the invoice list (searchable by its number).
 *
 * Requires a running PostgreSQL instance configured via the backend .env
 * (the same one used by `npm run start`). `docker compose up` provides this.
 */
describe('SimpleInvoice (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const testEmail = `e2e_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const invoiceNumber = `E2E-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    // Seed a dedicated test user directly.
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await userRepo.save(
      userRepo.create({
        email: testEmail,
        passwordHash: await bcrypt.hash(testPassword, 10),
        fullname: 'E2E User',
      }),
    );
  });

  afterAll(async () => {
    // Clean up test artifacts.
    const invoiceRepo = app.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await invoiceRepo.delete({ invoiceNumber });
    await userRepo.delete({ email: testEmail });
    await app.close();
  });

  it('rejects login with bad credentials (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrong' })
      .expect(401);
  });

  it('logs in and returns a JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    token = res.body.accessToken;
  });

  it('blocks /invoices without a token (401)', async () => {
    await request(app.getHttpServer()).get('/invoices').expect(401);
  });

  it('creates an invoice with backend-calculated totals (Draft)', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerFullname: 'E2E Customer',
        customerEmail: 'customer@example.com',
        invoiceNumber,
        invoiceDate: '2026-06-03',
        dueDate: '2026-07-03',
        currency: 'AUD',
        items: [{ name: 'Widget', quantity: 2, rate: 1000 }],
      })
      .expect(201);

    expect(res.body.status).toBe('Draft');
    expect(res.body.invoiceSubTotal).toBe(2000);
    expect(res.body.totalTax).toBe(200);
    expect(res.body.totalAmount).toBe(2200);
  });

  it('rejects a duplicate invoice number (409)', async () => {
    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerFullname: 'E2E Customer',
        customerEmail: 'customer@example.com',
        invoiceNumber,
        invoiceDate: '2026-06-03',
        dueDate: '2026-07-03',
        currency: 'AUD',
        items: [{ name: 'Widget', quantity: 1, rate: 100 }],
      })
      .expect(409);
  });

  it('finds the created invoice in the list via search', async () => {
    const res = await request(app.getHttpServer())
      .get(`/invoices?keyword=${invoiceNumber}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.paging.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((i: any) => i.invoiceNumber === invoiceNumber)).toBe(
      true,
    );
  });
});
