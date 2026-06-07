import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { Like, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';
import { Invoice } from '../src/invoices/entities/invoice.entity';
import { User } from '../src/users/user.entity';

/**
 * End-to-end coverage of the list endpoint's query features against a real
 * database: search, status filter (including the *derived* Overdue status),
 * sorting, and server-side pagination.
 *
 * Requires a running PostgreSQL (provided by `docker compose up`).
 */
describe('GET /invoices query features (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const email = `qry_${Date.now()}@example.com`;
  const password = 'Password123!';
  // Shared, unique invoice-number prefix so we can scope every assertion to
  // exactly the rows this test created (via the keyword search).
  const prefix = `QRY${Date.now()}`;

  const post = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await userRepo.save(
      userRepo.create({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        fullname: 'Query Tester',
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    token = res.body.accessToken;

    // A: past due + not paid -> derives to Overdue.
    await post({
      customerFullname: 'Zeta QueryTest',
      customerEmail: 'z@x.com',
      invoiceNumber: `${prefix}-A`,
      invoiceDate: '2020-01-01',
      dueDate: '2020-02-01',
      currency: 'AUD',
      items: [{ name: 'Item', quantity: 1, rate: 100 }],
    });
    // B: future due -> stays Draft. total ~ 1100.
    await post({
      customerFullname: 'Beta QueryTest',
      customerEmail: 'b@x.com',
      invoiceNumber: `${prefix}-B`,
      invoiceDate: '2030-01-01',
      dueDate: '2030-02-01',
      currency: 'AUD',
      items: [{ name: 'Item', quantity: 1, rate: 1000 }],
    });
    // C: future due -> stays Draft. total ~ 5500 (largest).
    await post({
      customerFullname: 'Alpha QueryTest',
      customerEmail: 'a@x.com',
      invoiceNumber: `${prefix}-C`,
      invoiceDate: '2030-01-01',
      dueDate: '2030-03-01',
      currency: 'AUD',
      items: [{ name: 'Item', quantity: 1, rate: 5000 }],
    });
  });

  afterAll(async () => {
    const invoiceRepo = app.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await invoiceRepo.delete({ invoiceNumber: Like(`${prefix}%`) });
    await userRepo.delete({ email });
    await app.close();
  });

  const list = (qs: string) =>
    request(app.getHttpServer())
      .get(`/invoices?keyword=${prefix}&${qs}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

  it('search (keyword) scopes to the three created invoices', async () => {
    const res = await list('pageSize=50');
    expect(res.body.paging.total).toBe(3);
  });

  it('filters by the derived Overdue status (only the past-due, unpaid one)', async () => {
    const res = await list('status=Overdue&pageSize=50');
    expect(res.body.paging.total).toBe(1);
    expect(res.body.data[0].invoiceNumber).toBe(`${prefix}-A`);
    expect(res.body.data[0].status).toBe('Overdue');
  });

  it('excludes a past-due invoice from the Draft filter (it reads as Overdue)', async () => {
    const res = await list('status=Draft&pageSize=50');
    const numbers = res.body.data.map((i: any) => i.invoiceNumber).sort();
    expect(numbers).toEqual([`${prefix}-B`, `${prefix}-C`]);
  });

  it('sorts by totalAmount descending', async () => {
    const res = await list('sortBy=totalAmount&ordering=DESC&pageSize=50');
    expect(res.body.data[0].invoiceNumber).toBe(`${prefix}-C`); // 5500 is largest
  });

  it('paginates server-side and reports total', async () => {
    const res = await list('pageSize=2&page=1');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.paging).toMatchObject({ page: 1, pageSize: 2, total: 3 });
  });

  it('filters by invoice date range', async () => {
    const res = await list('fromDate=2029-01-01&toDate=2031-01-01&pageSize=50');
    // Only B and C have invoiceDate in 2030; A is in 2020.
    expect(res.body.paging.total).toBe(2);
  });
});
