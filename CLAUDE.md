# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 3000

# Build & Production
npm run build        # prisma generate + next build
npm run start        # Start production server

# Quality
npm run lint         # ESLint
npm run test         # Vitest (all tests)
npx vitest run src/path/to/file.test.ts  # Single test file

# Database
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open Prisma Studio
npx prisma generate      # Regenerate Prisma client after schema changes
```

## Architecture

**QuanLyChiTieu** is a shared expense tracker (split bills, track debts, confirm payments) built with Next.js 15 App Router, Prisma ORM, MySQL, and TypeScript throughout.

### Request Flow

```
Request → middleware.ts (JWT auth gate) → App Router page or API route
```

- `src/middleware.ts` — protects `/` route, redirects to `/login` if no valid JWT cookie
- `src/lib/auth.ts` — JWT sign/verify utilities
- API routes use `verifyAuth()` from `auth.ts` to extract the current user

### Data Model Hierarchy

```
User → Workspace → Sheet → Expense → Split
                         → Member (workspace-level, soft-deleted via status field)
```

- **Sheet**: a monthly or trip budget; groups expenses
- **Expense**: a bill (who paid, total amount, type SHARED or PRIVATE)
- **Split**: one member's share of an expense; tracks payment state

### Payment State Machine (core business logic)

Splits progress through these states:

| `isPending` | `isPaid` | Meaning |
|---|---|---|
| false | false | Not yet addressed |
| true | false | Debtor declared payment (awaiting payer confirmation) |
| true | true | Payer confirmed receipt (immutable without admin action) |

The flow: debtor marks split pending → payer gets notification → payer confirms via `PATCH /api/payments/confirm` → split is locked.

### Debt Calculation Pipeline (`src/services/expenseService.ts`)

1. `calculateFinalBalances()` — sums unpaid splits per member
2. `calculatePrivateMatrix()` — builds member→member debt matrix
3. `calculateDebts()` — resolves circular debts (A→B + B→A cancels out; A→B→C collapses to A→C)

These are called server-side inside `GET /api/sheets/[id]`, which returns pre-calculated results alongside raw expense data.

### API Routes Map

| Route | Purpose |
|---|---|
| `/api/auth/*` | Login, logout, `/me` session check, password change |
| `/api/expenses` | Create expense |
| `/api/expenses/[id]` | Update, delete expense |
| `/api/expenses/[id]/settle` | Mark expense globally settled |
| `/api/sheets/[id]` | Sheet data + pre-calculated balances/debts |
| `/api/payments/confirm` | Confirm a pending split payment |
| `/api/notifications` | Pending payment counts + details |
| `/api/members` | Member CRUD |
| `/api/workspaces` | Workspace data |
| `/api/activity-logs` | Audit trail |

### Frontend Components

- `src/app/page.tsx` — root dashboard; orchestrates all data fetching via SWR
- `src/components/Dashboard/` — Summary cards, History table, Debt matrix, Notifications
- `src/components/Forms/` — Add/Edit expense forms
- `src/components/Layout/` — Sidebar, Header, Footer

### Validation

All API input is validated with Zod schemas defined in `src/lib/schemas.ts`.

### i18n

UI strings are in `src/lib/i18n/` (Vietnamese `vi` and English `en`). The active locale is passed through component props from the top-level page.

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
