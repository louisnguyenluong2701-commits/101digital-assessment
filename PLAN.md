    # SimpleInvoice — Implementation Plan

> Full-stack invoice management application
> **Frontend:** ReactJS + TypeScript · **Backend:** NestJS + TypeScript · **Database:** PostgreSQL
> Reference: `Assessment_Fullstack_v2_3_1.pdf` (101 Digital Full Stack Assessment v2.3.1)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Repository Structure](#4-repository-structure)
5. [Data Model (ER Diagram)](#5-data-model-er-diagram)
6. [API Specification](#6-api-specification)
7. [Business Logic Rules](#7-business-logic-rules)
8. [Key Sequence Flows](#8-key-sequence-flows)
9. [Frontend Plan](#9-frontend-plan)
10. [Backend Plan](#10-backend-plan)
11. [Validation Rules](#11-validation-rules)
12. [Testing Strategy](#12-testing-strategy)
13. [Containerization & Environment](#13-containerization--environment)
14. [Data Seeding](#14-data-seeding)
15. [Deliverables Checklist](#15-deliverables-checklist)
16. [Build Order & Milestones](#16-build-order--milestones)

---

## 1. Overview

SimpleInvoice is a full-stack web application for managing invoices. It provides four core features:

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Authentication** | Secure JWT-based login and route protection |
| 2 | **Invoice Listing** | Paginated list with search, filter, and sort |
| 3 | **Invoice Details** | Detailed view of an individual invoice |
| 4 | **Invoice Creation** | Form to create and save new invoices |

**Non-negotiable principles from the spec:**
- Total amounts are **calculated by the backend**, never the frontend.
- `Overdue` is a **derived** status — never persisted to the database.
- Invoice numbers are **user-provided** and **unique at the database level**.
- All secrets/config via `.env`; **no hardcoded secrets**.
- The entire stack must come up with **a single Docker command**.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + TypeScript + Vite | Fast dev/build tooling |
| Routing | React Router v6 | Protected routes |
| Data fetching | TanStack Query (React Query) + Axios | Caching, server-state |
| Forms | React Hook Form + Zod | Client-side validation |
| Styling | Tailwind CSS | Responsive (mobile + desktop) |
| FE Testing | Vitest + React Testing Library | Critical flows & components |
| Backend | NestJS + TypeScript | Modular architecture |
| ORM | TypeORM | Entities, migrations, constraints |
| Database | PostgreSQL 16 | Relational, unique constraints, indexes |
| Auth | `@nestjs/jwt` + Passport JWT | Stateless JWT |
| Validation | `class-validator` + `class-transformer` | Global `ValidationPipe` |
| API Docs | `@nestjs/swagger` | Served at `/api/docs` |
| BE Testing | Jest + Supertest | Unit + e2e |
| Infra | Docker + docker-compose | One-command startup |

---

## 3. High-Level Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI["React SPA<br/>TypeScript and Vite"]
    end

    subgraph Backend["NestJS API"]
        direction TB
        Guard["JWT Auth Guard"]
        AuthM["Auth Module"]
        InvM["Invoices Module"]
        Common["Common<br/>Validation Pipe<br/>Exception Filter"]
    end

    subgraph DB["PostgreSQL"]
        Tables["users / invoices<br/>invoice_items"]
    end

    UI -->|"HTTP plus JWT Bearer"| Guard
    Guard --> AuthM
    Guard --> InvM
    AuthM --> Tables
    InvM --> Tables
    Common -.-> AuthM
    Common -.-> InvM

    Swagger["Swagger UI<br/>/api/docs"] -.documents.-> Backend
```

**Containers (docker-compose):**

```mermaid
flowchart TB
    subgraph compose["docker compose up"]
        FE["frontend<br/>port 5173 or 80 nginx"]
        BE["backend<br/>port 3000"]
        PG["postgres<br/>port 5432"]
    end
    FE -->|REST| BE
    BE -->|TCP| PG
```

---

## 4. Repository Structure

Monorepo (documented choice — single clone, single compose file):

```
simple-invoice/
├── frontend/                    # ReactJS + TypeScript (Vite)
│   ├── src/
│   │   ├── api/                 # Axios client + endpoints
│   │   ├── components/          # Reusable UI
│   │   ├── features/
│   │   │   ├── auth/            # Login, auth context, guard
│   │   │   └── invoices/        # List, Detail, Create
│   │   ├── hooks/
│   │   ├── lib/                 # utils, formatters
│   │   ├── routes/              # Router + ProtectedRoute
│   │   └── main.tsx
│   ├── tests/                   # Vitest + RTL
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── backend/                     # NestJS API
│   ├── src/
│   │   ├── auth/                # login, JWT strategy, guard
│   │   ├── invoices/            # controller, service, entities, dto
│   │   ├── users/               # user entity + service
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── seed/            # seed script (npm run seed)
│   │   ├── common/             # filters, pipes, decorators
│   │   └── main.ts             # bootstrap + Swagger
│   ├── test/                    # e2e tests
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
├── PLAN.md
└── README.md
```

---

## 5. Data Model (ER Diagram)

**Design decision:** Customer is stored as **embedded fields** on the `invoices` table (acceptable per spec, simpler for this scope). Invoice items are a **separate table** (FK to invoice) so the model supports multiple items in future, even though only one is required now.

```mermaid
erDiagram
    USER ||--o{ INVOICE : creates
    INVOICE ||--|{ INVOICE_ITEM : contains

    USER {
        uuid id PK
        string email UK "unique, login identifier"
        string passwordHash "bcrypt"
        string fullname
        datetime createdAt
    }

    INVOICE {
        uuid invoiceId PK
        string invoiceNumber UK "unique, user-provided"
        string invoiceReference "optional"
        date invoiceDate
        date dueDate "on or after invoiceDate"
        string currency "ISO 4217 code"
        string currencySymbol "display symbol"
        string description "optional"
        enum status "Draft Pending Paid - Overdue derived"
        string customer_fullname "embedded"
        string customer_email "embedded"
        string customer_mobileNumber "embedded, optional"
        string customer_address "embedded, optional"
        decimal invoiceSubTotal "quantity x rate"
        decimal totalTax "server-calculated"
        decimal totalDiscount "server-calculated"
        decimal totalAmount "final payable"
        decimal totalPaid "amount paid so far"
        decimal balanceAmount "totalAmount - totalPaid"
        datetime createdAt
        uuid createdBy FK
    }

    INVOICE_ITEM {
        uuid id PK
        uuid invoiceId FK
        string name
        integer quantity "positive"
        decimal rate "positive"
    }
```

**Constraints & indexes:**
- `invoices.invoiceNumber` → UNIQUE constraint (DB-level).
- `users.email` → UNIQUE constraint.
- Indexes on `invoices.invoiceDate`, `invoices.dueDate`, `invoices.totalAmount` (sortable columns).
- Index on `invoices.status` (filterable).
- Index/trigram (or `ILIKE`) support on `invoiceNumber` and `customer_fullname` (searchable).
- `CHECK (dueDate >= invoiceDate)` plus server-side validation.

---

## 6. API Specification

Base URL: `/` · All responses JSON · All `/invoices` routes require `Authorization: Bearer <jwt>`.

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/auth/login` | ✗ | Authenticate user, return JWT |
| GET | `/auth/me` | ✓ | Return current authenticated user profile |
| GET | `/invoices` | ✓ | List invoices (search, filter, sort, paginate) |
| GET | `/invoices/:id` | ✓ | Get invoice detail by ID |
| POST | `/invoices` | ✓ | Create a new invoice |

### GET /invoices — Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number, starting at 1 |
| `pageSize` | number | Records per page (configurable) |
| `sortBy` | string | `invoiceDate` \| `dueDate` \| `totalAmount` |
| `ordering` | string | `ASC` \| `DESC` |
| `status` | string | `Draft` \| `Pending` \| `Paid` \| `Overdue` |
| `keyword` | string | Partial, case-insensitive — invoice number or customer name |
| `fromDate` | string | Filter invoices on/after this date (YYYY-MM-DD) |
| `toDate` | string | Filter invoices on/before this date (YYYY-MM-DD) |

### GET /invoices — Response Shape

```json
{
  "data": [ /* invoice list items */ ],
  "paging": {
    "page": 1,
    "pageSize": 10,
    "total": 100
  }
}
```

> **Note:** `status=Overdue` filtering must operate against the *derived* status, since Overdue is never stored. The query must translate `Overdue` into `status != 'Paid' AND dueDate < today`.

### Error responses

```json
// Validation error
{ "statusCode": 400, "message": ["dueDate must be on or after invoiceDate"], "error": "Bad Request" }

// Not found
{ "statusCode": 404, "message": "Invoice not found", "error": "Not Found" }
```

---

## 7. Business Logic Rules

All financial calculations happen **server-side**:

```
subTotal      = quantity × rate
taxAmount     = subTotal × (tax% / 100)
totalAmount   = subTotal + taxAmount − discount
balanceAmount = totalAmount − totalPaid
```

**Status & rules:**
- New invoices are always created with status `Draft`.
- `tax%` defaults to `10` if not provided; `discount` defaults to `0`.
- Invoice numbers unique — enforced at the database level.
- `dueDate` must be on or after `invoiceDate` — validated server-side.

**Overdue derivation (read-time only):**

```mermaid
flowchart TD
    Read["Read invoice from DB<br/>status is Draft, Pending or Paid"] --> Check{"status is not Paid<br/>AND<br/>dueDate before today?"}
    Check -->|Yes| Overdue["Return status as Overdue"]
    Check -->|No| Persisted["Return persisted status"]
```

> The database stores only `Draft`, `Pending`, or `Paid`. `Overdue` is **never written** to the database.

---

## 8. Key Sequence Flows

### 8.1 Login & Authenticated Request

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant BE as NestJS API
    participant DB as PostgreSQL

    U->>FE: Enter email + password
    FE->>FE: Client-side validation
    FE->>BE: POST /auth/login
    BE->>DB: Find user by email
    DB-->>BE: User record (passwordHash)
    BE->>BE: bcrypt.compare(password, hash)
    alt Valid credentials
        BE->>BE: Sign JWT (exp = JWT_EXPIRES_IN, default 3600s)
        BE-->>FE: 200 { accessToken, user }
        FE->>FE: Store token (client-side)
        FE->>U: Redirect to Invoice List
    else Invalid
        BE-->>FE: 401 Unauthorized
        FE->>U: Show error
    end

    Note over FE,BE: Subsequent protected calls
    FE->>BE: GET /invoices with Authorization Bearer jwt
    BE->>BE: JWT Auth Guard validates token
    alt Token valid
        BE->>DB: Query invoices
        DB-->>BE: Rows
        BE->>BE: Derive Overdue status
        BE-->>FE: 200 { data, paging }
    else Token missing/expired
        BE-->>FE: 401 Unauthorized
        FE->>U: Redirect to Login
    end
```

### 8.2 Create Invoice (backend calculates totals)

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant BE as NestJS API
    participant DB as PostgreSQL

    U->>FE: Fill create form (customer, dates, item, tax, discount)
    FE->>FE: Client-side validation (Zod)
    FE->>BE: POST /invoices (Bearer token)
    BE->>BE: ValidationPipe (class-validator)
    BE->>BE: Validate dueDate >= invoiceDate
    BE->>BE: subTotal, tax, total, balance (server-side)
    BE->>DB: INSERT invoice (status=Draft) + item
    alt Unique invoiceNumber
        DB-->>BE: Created
        BE-->>FE: 201 Created (invoice)
        FE->>U: Success toast → redirect to List
    else Duplicate invoiceNumber
        DB-->>BE: Unique violation
        BE-->>FE: 409 Conflict
        FE->>U: Show "Invoice number already exists"
    end
```

### 8.3 Invoice List with Search/Filter/Sort/Paginate

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant BE as NestJS API
    participant DB as PostgreSQL

    U->>FE: Type keyword / pick filter / sort / change page
    FE->>BE: GET /invoices?keyword=&status=&sortBy=&ordering=&page=&pageSize=
    BE->>BE: JWT Guard
    BE->>BE: Build query (ILIKE search, status filter, date range, sort)
    BE->>DB: SELECT ... LIMIT pageSize OFFSET (page-1)*pageSize
    BE->>DB: COUNT total
    DB-->>BE: Rows + total
    BE->>BE: Derive Overdue per row
    BE-->>FE: 200 { data, paging: {page, pageSize, total} }
    FE->>U: Render table + pagination controls
```

---

## 9. Frontend Plan

**Screens / routes:**

| Route | Screen | Auth |
|-------|--------|:----:|
| `/login` | Login | Public |
| `/` or `/invoices` | Invoice List (default home) | Protected |
| `/invoices/:id` | Invoice Detail | Protected |
| `/invoices/new` | Create Invoice | Protected |

**Component breakdown:**
- `ProtectedRoute` — redirects unauthenticated users to `/login`.
- `AuthProvider` — stores token, exposes `login`/`logout`/`user`.
- `LoginForm` — email + password with client validation.
- `InvoiceListPage` — table, `SearchBar`, `StatusFilter`, `SortControls`, `Pagination`.
- `InvoiceDetailPage` — invoice info, customer info, line items, totals, balance, status badge.
- `CreateInvoicePage` — `InvoiceForm` (RHF + Zod), one line item, submit → toast → redirect.
- `StatusBadge` — color-coded Draft/Pending/Paid/Overdue.
- Shared: `Toast`/notifications, loading & error states.

**Requirements:**
- Fully responsive (mobile + desktop).
- Clean, documented, maintainable code.
- Unit tests for critical flows & key components.

---

## 10. Backend Plan

**Modules:**

```mermaid
flowchart TB
    App["AppModule"] --> Config["ConfigModule - env"]
    App --> TypeOrm["TypeOrmModule - Postgres"]
    App --> Auth["AuthModule"]
    App --> Inv["InvoicesModule"]
    App --> Users["UsersModule"]
    Auth --> JwtStrat["JwtStrategy and JwtAuthGuard"]
    Inv --> InvCtrl["InvoicesController"]
    Inv --> InvSvc["InvoicesService<br/>totals overdue query builder"]
    Inv --> Entities["Invoice and InvoiceItem entities"]
    App --> CommonM["Common<br/>GlobalExceptionFilter ValidationPipe"]
```

**Responsibilities:**
- `AuthModule` — `POST /auth/login`, `GET /auth/me`, JWT signing/verification, `JwtAuthGuard`.
- `InvoicesModule` — CRUD-lite (list/detail/create), query builder for search/filter/sort/paginate, server-side calculations, Overdue derivation.
- `UsersModule` — user entity + lookup, bcrypt hashing.
- `common/` — global exception filter (consistent error JSON), global `ValidationPipe`.
- `main.ts` — bootstrap, Swagger at `/api/docs`, enable CORS, global pipes/filters.

---

## 11. Validation Rules

| Field | Validation |
|-------|-----------|
| Customer name | Required, non-empty string |
| Customer email | Required, valid email format |
| Customer mobile | Optional |
| Customer address | Optional |
| Invoice number | Required, unique |
| Invoice date | Required, valid date |
| Due date | Required, must be on or after invoice date |
| Currency | Required (e.g. AUD, USD, GBP) |
| Item name | Required |
| Item quantity | Required, positive integer |
| Item rate | Required, positive number |
| Tax (%) | Non-negative number, defaults to 10 |
| Discount | Optional, non-negative number, defaults to 0 |

Implemented with `class-validator` + `class-transformer` via NestJS global `ValidationPipe`. Structured error responses as shown in [Error responses](#error-responses).

---

## 12. Testing Strategy

**Backend (Jest + Supertest) — mandatory:**
- Unit: invoice total calculations (subtotal/tax/total/balance).
- Unit: Overdue status derivation.
- Unit: due-date validation (dueDate ≥ invoiceDate).
- Unit: enforcement of unique invoice numbers.
- At least 1 integration/e2e test covering a key workflow (e.g. create invoice → verify it appears in the list).

**Frontend (Vitest + RTL) — mandatory:**
- Critical user flows (login, create invoice).
- Key UI components (list rendering, form validation, status badge).

No minimum coverage threshold, but core functionality must be covered.

---

## 13. Containerization & Environment

**docker-compose.yml** brings up `frontend`, `backend`, `postgres` with one command:

```bash
docker compose up        # modern Docker
# or
docker-compose up        # legacy
```

- Each service has its own `Dockerfile`.
- All exposed ports documented in README (e.g. frontend `5173/80`, backend `3000`, postgres `5432`).

**Environment configuration:**
- All env-specific values (DB connection string, JWT secret, JWT expiry, ports) via `.env`.
- `.env.example` provided per service with all keys, no real/sensitive values.
- `JWT_EXPIRES_IN` configurable, **default 3600 seconds**.
- No hardcoding of secrets anywhere in the codebase.

**Example `.env` keys (backend):**
```
DATABASE_URL=postgresql://user:pass@postgres:5432/simpleinvoice
JWT_SECRET=
JWT_EXPIRES_IN=3600
PORT=3000
```

---

## 14. Data Seeding

- Seed script runnable via a single command: **`npm run seed`**.
- Uses **Appendix A** mock dataset as the foundation for structure and relationships.
- Generates **~20–50 invoice records** with diverse:
  - statuses (Draft, Pending, Paid — **never seed Overdue**),
  - invoice dates, due dates, total amounts, customer names.
- Ensures search, filter, sort, and pagination are meaningfully testable.
- Seeds **at least one reviewer user account**, with credentials documented in the README.

---

## 15. Deliverables Checklist

- [ ] Source code in GitHub/GitLab repo (or ZIP fallback)
- [ ] **README.md** at project root containing:
  - [ ] Project overview & architecture description
  - [ ] Run instructions — **with and without Docker**
  - [ ] Default reviewer login credentials
  - [ ] Database seed instructions
  - [ ] Assumptions & design decisions
  - [ ] Known limitations / incomplete features
- [ ] Working Swagger docs at `/api/docs`
- [ ] All four features functional
- [ ] Single-command Docker startup
- [ ] Tests passing (backend + frontend)
- [ ] Submit to `ThanhNguyenBa@101digital.io` and `rajiv@101digital.io` with git repo ID + submitter email

**Assessment criteria (what reviewers score):** Packaging · Working app · API design · Database design · Business logic · Authentication · Code quality · Testing · Documentation · Docker setup · Value add.

---

## 16. Build Order & Milestones

```mermaid
flowchart LR
    M0["M0<br/>Scaffold<br/>monorepo"] --> M1["M1<br/>DB schema<br/>+ entities"]
    M1 --> M2["M2<br/>Auth - login JWT guard"]
    M2 --> M3["M3<br/>Invoices API<br/>and business logic"]
    M3 --> M4["M4<br/>Seed script"]
    M4 --> M5["M5<br/>Swagger and<br/>error handling"]
    M5 --> M6["M6<br/>Backend tests"]
    M6 --> M7["M7<br/>Frontend<br/>auth and screens"]
    M7 --> M8["M8<br/>Frontend tests"]
    M8 --> M9["M9<br/>Docker compose"]
    M9 --> M10["M10<br/>README + polish"]
```

| Milestone | Deliverable |
|-----------|-------------|
| **M0** | Monorepo scaffold (`frontend/`, `backend/`, compose, env examples) |
| **M1** | PostgreSQL schema, TypeORM entities, constraints & indexes |
| **M2** | Auth: `/auth/login`, `/auth/me`, JWT strategy, guard, bcrypt |
| **M3** | Invoices: list (search/filter/sort/paginate), detail, create; server-side totals + Overdue derivation |
| **M4** | Seed script (`npm run seed`) from Appendix A, 20–50 records + reviewer user |
| **M5** | Swagger at `/api/docs`, global exception filter, ValidationPipe |
| **M6** | Backend unit tests (totals, overdue, due-date, unique) + 1 e2e |
| **M7** | Frontend: login, protected routes, list, detail, create form |
| **M8** | Frontend unit tests (critical flows + components) |
| **M9** | Dockerfiles + docker-compose, single-command startup |
| **M10** | README (with/without Docker, credentials, seed, assumptions, limitations) + responsive polish |

---

*This plan is the single source of truth for the SimpleInvoice build. Update it as decisions evolve.*
