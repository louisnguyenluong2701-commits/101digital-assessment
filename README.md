# SimpleInvoice

A full-stack invoice management application built for the 101 Digital Full Stack Assessment (v2.3.1).

- **Frontend:** ReactJS + TypeScript (Vite, Tailwind CSS, React Query, React Hook Form)
- **Backend:** NestJS + TypeScript (TypeORM, Passport JWT, Swagger)
- **Database:** PostgreSQL

> See [PLAN.md](./PLAN.md) for the full design: architecture, ER diagram, sequence flows, and API spec.

---

## Features

1. **Authentication** — email/password login, JWT access tokens, guarded routes.
2. **Invoice list** — paginated home screen with search, status filter, sorting, and server-side pagination.
3. **Invoice detail** — full invoice view: customer, line items, subtotal, tax, discount, total, outstanding balance.
4. **Invoice creation** — validated form; totals are calculated by the backend.

---

## Architecture

A **monorepo** with two independently deployable apps and a shared Postgres database:

```
simple-invoice/
├── frontend/          # React SPA (Vite) served by nginx in Docker
├── backend/           # NestJS REST API
│   └── src/
│       ├── auth/        # login, JWT strategy, guard
│       ├── invoices/    # controller, service, entities, business logic
│       ├── users/       # user entity + lookup
│       ├── database/seed # seed script
│       └── common/      # global exception filter, decimal transformer
├── docker-compose.yml # postgres + backend + frontend
└── README.md
```

**Why a monorepo:** one clone, one `docker compose up`, shared documentation, and easy cross-stack review — while keeping the frontend and backend as separate buildable projects.

---

## Quick start (with Docker) — recommended

All commands below are run from the **project root** (the directory containing `docker-compose.yml` — i.e. this repository).

Bring up the database, backend, and frontend with a single command:

```bash
docker compose up --build
```

Then **seed the database** (one-off, in a second terminal):

```bash
docker compose exec backend npm run seed
```

Open:

| App | URL |
|-----|-----|
| Frontend (SPA) | http://localhost:8080 |
| Backend API | http://localhost:3000 |
| Swagger / OpenAPI docs | http://localhost:3000/api/docs |

**Exposed ports:** frontend `8080` → container `80`, backend `3000`, postgres `5432`.

Tear down (and wipe the database volume):

```bash
docker compose down -v
```

---

## Default login credentials (for reviewer access)

Created by the seed script:

| Email | Password |
|-------|----------|
| `admin@101digital.io` | `$Abc1234` |

These can be overridden via `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` (see `.env.example`).

---

## Running locally (without Docker)

**Prerequisites:** Node.js 20+ and a running PostgreSQL instance.

### 1. Database

Create a database and user (matching the values you'll put in `.env`):

```sql
CREATE DATABASE simpleinvoice;
CREATE USER simpleinvoice WITH PASSWORD 'simpleinvoice';
GRANT ALL PRIVILEGES ON DATABASE simpleinvoice TO simpleinvoice;
```

(Or just run the Postgres container alone: `docker compose up postgres`.)

### 2. Backend

```bash
cd backend
cp .env.example .env          # adjust DB_* and JWT_SECRET as needed
npm install
npm run seed                  # creates the admin user + ~36 invoices
npm run start:dev             # http://localhost:3000  (docs at /api/docs)
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev                   # http://localhost:5173
```

> When running locally the frontend dev server is on **5173**. Make sure the backend's
> `CORS_ORIGIN` includes `http://localhost:5173` (it does by default in `backend/.env.example`).

---

## Database seeding

```bash
# Docker
docker compose exec backend npm run seed

# Local
cd backend && npm run seed
```

The seed script:

- Wipes existing invoices/users, then creates the **admin account**.
- Inserts the **Appendix A** reference invoice verbatim.
- Generates **35 additional invoices** with varied statuses (Draft / Pending / Paid — never Overdue), dates, due dates, amounts, currencies, and customers, so search/filter/sort/pagination are all meaningful to test.

---

## API overview

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/auth/login` | – | Authenticate, returns JWT |
| GET | `/auth/me` | ✓ | Current user profile |
| GET | `/invoices` | ✓ | List with search/filter/sort/pagination |
| GET | `/invoices/:id` | ✓ | Invoice detail |
| POST | `/invoices` | ✓ | Create invoice |

**`GET /invoices` query params:** `page`, `pageSize`, `sortBy` (`invoiceDate`|`dueDate`|`totalAmount`), `ordering` (`ASC`|`DESC`), `status` (`Draft`|`Pending`|`Paid`|`Overdue`), `keyword`, `fromDate`, `toDate`.

**Response shape:**

```json
{ "data": [ ... ], "paging": { "page": 1, "pageSize": 10, "total": 100 } }
```

Full request/response schemas are documented in **Swagger** at `/api/docs`.

---

## Business logic (server-side)

```
subTotal      = quantity × rate
taxAmount     = subTotal × (tax% / 100)
totalAmount   = subTotal + taxAmount − discount
balanceAmount = totalAmount − totalPaid
```

- **Totals are computed by the backend only** — the frontend shows a non-authoritative preview.
- **New invoices are always `Draft`.**
- **Invoice numbers are unique**, enforced by a DB unique constraint (and a friendly `409` pre-check).
- **Due date must be on or after the invoice date** (validated server-side and client-side).
- **`Overdue` is derived, never stored.** At read time: `status != 'Paid' AND dueDate < today → Overdue`. The database only ever stores `Draft`, `Pending`, or `Paid`.

---

## Testing

### Backend (Jest)

```bash
cd backend
npm test          # unit tests (no DB required)
npm run test:e2e  # end-to-end (requires a running Postgres)
```

- **Unit tests** cover the mandated business logic: total calculations, Overdue derivation, due-date validation, and unique invoice-number enforcement.
- **E2E test** covers the key workflow: log in → create an invoice → verify it appears in the list (plus 401/409 paths).

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm test
```

Covers the login flow (validation, success redirect, server error), the status badge component, and money/date formatting.

---

## Assumptions & design decisions

- **Customer is embedded** on the invoice table (the spec permits either embedded or a separate table). Chosen for simplicity given the one-customer-per-invoice model. The API still nests customer data under a `customer` object, so normalizing later wouldn't change the public contract.
- **Line items are a separate table** with a FK to the invoice. Exactly one item is required per the assessment, but the schema and API (`items: [...]`) already support multiple.
- **`discount` is a flat amount** (not a percentage), consistent with the `totalAmount = subTotal + taxAmount − discount` formula. **`tax` is a percentage**, defaulting to 10.
- **Status filtering is applied against the *derived* status.** Filtering `Pending` returns invoices that are Pending *and* not past due; a past-due Pending invoice appears under `Overdue`. This keeps the list consistent with the badges shown.
- **`DB_SYNCHRONIZE=true`** is used so the schema is created automatically from entities — convenient for review. In production this would be replaced by explicit migrations.
- **JWT expiry** is configurable via `JWT_EXPIRES_IN` (seconds), defaulting to `3600`.
- **Token storage:** the JWT is stored in `localStorage`. Simple and sufficient for this assessment; a production app might prefer httpOnly cookies to mitigate XSS.
- **Passwords** are hashed with `bcryptjs` (pure-JS bcrypt — avoids native build steps in Alpine containers).

---

## Known limitations

- The create form supports a single line item (by design for this assessment).
- No invoice editing/deletion or payment-recording endpoints — out of scope for the four required features.
- Overdue filtering uses the database server's `CURRENT_DATE` (timezone of the DB) rather than a per-request timezone.
- `DB_SYNCHRONIZE` is used instead of migrations; not recommended for production data.
- The seed script clears existing data on each run (idempotent fresh state, not incremental).
