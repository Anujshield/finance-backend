# Finance Backend

A role-based finance data processing API built with **Node.js + TypeScript + Express + SQLite**.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | Type safety catches entire classes of bugs at compile time |
| Framework | Express 4 | Minimal, well-understood, easy to reason about middleware ordering |
| Database | SQLite (better-sqlite3) | Zero infrastructure, synchronous API, perfect for a self-contained assignment |
| Auth | JWT (jsonwebtoken) | Stateless, simple to verify, no session store needed |
| Validation | Zod | Schema-first; coerces query strings, gives typed outputs |
| Password | bcryptjs | Industry standard adaptive hashing |
| Testing | Jest + Supertest | Full HTTP-level integration tests with an in-memory DB per test run |

---

## Project Structure

```
src/
├── __tests__/          # Integration tests (in-memory SQLite)
│   ├── helpers.ts      # Shared test DB setup and seeding
│   ├── auth.test.ts
│   ├── users.test.ts
│   ├── records.test.ts
│   └── dashboard.test.ts
├── config/
│   ├── database.ts     # SQLite singleton, schema creation
│   └── seed.ts         # Optional demo-data seeder
├── middleware/
│   ├── auth.ts         # JWT sign / authenticate / optionalAuth
│   ├── rbac.ts         # requirePermission / requireRole factories
│   ├── validate.ts     # Zod-backed request validation factory
│   └── errorHandler.ts # Central error handler (must be last middleware)
├── routes/
│   ├── auth.ts         # POST /auth/login, GET /auth/me
│   ├── users.ts        # CRUD /users
│   ├── records.ts      # CRUD /records
│   └── dashboard.ts    # GET /dashboard/summary
├── services/
│   ├── authService.ts       # login()
│   ├── userService.ts       # listUsers / createUser / updateUser / deleteUser
│   ├── recordService.ts     # listRecords / createRecord / updateRecord / deleteRecord
│   └── dashboardService.ts  # getDashboardSummary()
├── types/
│   └── index.ts        # Shared types, Role enum, ROLE_PERMISSIONS map
├── utils/
│   ├── errors.ts       # AppError subclass hierarchy
│   └── response.ts     # sendSuccess / sendError helpers
├── app.ts              # Express app (routes + middleware wired up)
└── server.ts           # HTTP server entry point
```

---

## Setup

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install & run

```bash
# 1. Install dependencies
npm install

# 2. (Optional) seed demo data
npm run seed

# 3. Start the dev server with auto-reload
npm run dev
# → http://localhost:3000
```

The SQLite database file is created automatically at `data/finance.db` on first run.

### Run tests

```bash
npm test
```

Tests use an in-memory SQLite database — no file I/O, no leftover state between runs.

### Production build

```bash
npm run build   # compiles TypeScript → dist/
npm start       # runs dist/server.js
```

---

## Roles & Permissions

| Permission | viewer | analyst | admin |
|---|:---:|:---:|:---:|
| `dashboard:read` | ✅ | ✅ | ✅ |
| `records:read` | ✅ | ✅ | ✅ |
| `records:create` | ❌ | ❌ | ✅ |
| `records:update` | ❌ | ❌ | ✅ |
| `records:delete` | ❌ | ❌ | ✅ |
| `users:read` | ❌ | ✅ | ✅ |
| `users:create` | ❌ | ❌ | ✅ |
| `users:update` | ❌ | ❌ | ✅ |
| `users:delete` | ❌ | ❌ | ✅ |

Permissions are declared once in `src/types/index.ts` (`ROLE_PERMISSIONS`) and enforced by the `requirePermission()` middleware factory. Adding a new role or permission means editing one map — nothing else.

---

## API Reference

All endpoints return:
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "message": "...", "code": "...", "details": {} } }
```

### Authentication

#### `POST /auth/login`
Exchange credentials for a JWT.

```json
// Request
{ "email": "admin@example.com", "password": "admin123" }

// Response 200
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "id": 1, "email": "...", "name": "...", "role": "admin" }
  }
}
```

#### `GET /auth/me` 🔒
Returns the currently authenticated user.

---

### Users  `🔒 admin only (except read for analyst)`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/users` | `users:read` | Paginated list |
| GET | `/users/:id` | `users:read` | Single user |
| POST | `/users` | `users:create` | Create user |
| PATCH | `/users/:id` | `users:update` | Partial update |
| DELETE | `/users/:id` | `users:delete` | Hard delete |

**Create user body:**
```json
{
  "email": "newuser@example.com",
  "password": "minEight1",
  "name": "New User",
  "role": "viewer"
}
```

**Update user body** (all fields optional):
```json
{
  "name": "Updated Name",
  "role": "analyst",
  "isActive": false,
  "password": "newpassword"
}
```

**Pagination query params:** `?page=1&limit=20`

---

### Financial Records  `🔒`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/records` | `records:read` | Filtered, paginated list |
| GET | `/records/:id` | `records:read` | Single record |
| POST | `/records` | `records:create` | Create record (admin) |
| PATCH | `/records/:id` | `records:update` | Partial update (admin) |
| DELETE | `/records/:id` | `records:delete` | Soft delete (admin) |

**Create / update body:**
```json
{
  "amount": 1500.00,
  "type": "income",
  "category": "Freelance",
  "date": "2024-05-01",
  "notes": "Optional description"
}
```

**Filter query params:**

| Param | Type | Example |
|---|---|---|
| `type` | `income\|expense` | `?type=income` |
| `category` | string | `?category=Rent` |
| `dateFrom` | YYYY-MM-DD | `?dateFrom=2024-01-01` |
| `dateTo` | YYYY-MM-DD | `?dateTo=2024-03-31` |
| `search` | string | `?search=salary` |
| `page` | number | `?page=2` |
| `limit` | 1–100 | `?limit=10` |

---

### Dashboard  `🔒 all roles`

#### `GET /dashboard/summary`

```json
{
  "totalIncome": 21800,
  "totalExpenses": 5390,
  "netBalance": 16410,
  "categoryTotals": [
    { "category": "Salary",    "type": "income",  "total": 20000 },
    { "category": "Rent",      "type": "expense", "total": 4800  }
  ],
  "monthlyTrends": [
    { "month": "2024-01", "income": 5800, "expense": 1650, "net": 4150 }
  ],
  "recentRecords": [ { "id": 20, "amount": 600, "type": "income", ... } ]
}
```

---

## Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Token valid but insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g. email already registered) |
| 422 | `VALIDATION_ERROR` | Schema validation failed — `details` contains per-field errors |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Design Decisions & Assumptions

### Why SQLite?
The assignment explicitly permits simplified storage. SQLite with WAL mode handles concurrent reads efficiently and requires zero infrastructure. Swapping it for Postgres would only require changing the `getDb()` implementation — all service logic stays identical.

### Soft deletes for records
Financial records are soft-deleted (`is_deleted = 1`) rather than hard-deleted. This preserves the audit trail — you never want to permanently destroy financial history. Users are hard-deleted instead since they are not financial data.

### Permission map over role checks
Instead of scattering `if (role === 'admin')` checks, all access rules live in a single `ROLE_PERMISSIONS` table. This makes it trivial to add a new role or tweak permissions without hunting through the codebase.

### Defence in depth
RBAC is enforced in two places:
1. **Route middleware** (`requirePermission`) — blocks the request before it reaches the service.
2. **Service layer** — a second guard for mutation operations. This protects against future routes that might accidentally bypass middleware.

### JWT over sessions
Stateless JWTs mean no session store is needed. Tokens expire in 8 hours. In a production system you would add a token refresh flow and a revocation list (Redis), but that is out of scope here.

### Validation with Zod
Zod schemas act as the single source of truth for input shape. Parsed values are written back to `req.body` / `req.query` with full TypeScript types, so handlers never need to cast.

### Error hierarchy
All HTTP errors extend `AppError` which carries `statusCode` and `code`. The central error handler reads these without any `instanceof` branching per error type — just one check for `AppError` vs unexpected errors.

---

## Seed Credentials

```
admin@example.com   / admin123
analyst@example.com / analyst123
viewer@example.com  / viewer123
```
