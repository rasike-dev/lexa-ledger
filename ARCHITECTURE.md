# LEXA Ledger™ - Architecture & Contracts (LOCKED)

**Status**: ✅ Finalized and locked  
**Phase**: Step 1A - Architecture & Structure  
**Date**: Phase 2 - Option 1 (AppShell + Routing Skeleton)

---

## 1. Non-Negotiable Principles

These principles keep the architecture enterprise-grade:

1. **Feature-first modularity** - Each module owns its UI, hooks, services, types
2. **No data fetching in components** - Only via hooks/services
3. **Zod-validated contracts at API boundary** - Even for mocks
4. **Cross-cutting concerns live centrally** - Theme, i18n, role, shell
5. **Navigation is config-driven** - Single source of truth
6. **Deterministic demo mode** - Fixtures → stable flows → reliable video

---

## 2. Final Folder Structure

```
LEXA-Ledger/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── routes/
│   │   │   ├── nav.ts            # Nav config (labels, icons, paths, roles)
│   │   │   └── paths.ts          # Route path constants
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── RightDrawer.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── providers/
│   │   │   ├── QueryProvider.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── I18nProvider.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── guards/
│   │   │   └── RequireRole.tsx
│   │   ├── store/
│   │   │   └── uiStore.ts        # Zustand: theme/lang/role/drawer/activeLoanId/dataset
│   │   └── config/
│   │       ├── env.ts
│   │       └── featureFlags.ts
│   │
│   ├── features/
│   │   ├── portfolio/
│   │   │   ├── pages/
│   │   │   │   └── PortfolioHome.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types.ts
│   │   │   ├── schemas.ts
│   │   │   ├── i18n.json
│   │   │   ├── index.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── origination/
│   │   │   ├── pages/
│   │   │   │   └── IngestLoan.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types.ts
│   │   │   ├── schemas.ts
│   │   │   ├── i18n.json
│   │   │   ├── index.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── loans/
│   │   │   ├── pages/
│   │   │   │   ├── LoanOverview.tsx
│   │   │   │   ├── LoanDocuments.tsx
│   │   │   │   ├── LoanServicing.tsx
│   │   │   │   ├── LoanTrading.tsx
│   │   │   │   └── LoanESG.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types.ts
│   │   │   ├── schemas.ts
│   │   │   ├── i18n.json
│   │   │   ├── index.ts
│   │   │   └── __tests__/
│   │   │
│   │   └── sharedDomain/        # (optional) shared types used across features
│   │       ├── loan.ts
│   │       └── audit.ts
│   │
│   ├── shared/
│   │   ├── ui/                  # shadcn re-exports + wrappers
│   │   ├── components/          # reusable building blocks (KpiTile, PageHeader)
│   │   ├── hooks/               # useDebounce/useHotkeys
│   │   ├── lib/                 # formatters, date/currency, classnames
│   │   ├── api/
│   │   │   ├── httpClient.ts    # fetch wrapper + zod parsing
│   │   │   └── errors.ts
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   └── locales/
│   │   │       ├── en/
│   │   │       │   ├── common.json
│   │   │       │   └── nav.json
│   │   │       └── de/
│   │   │           ├── common.json
│   │   │           └── nav.json
│   │   ├── theme/
│   │   │   ├── tokens.css
│   │   │   └── themes.ts
│   │   └── telemetry/
│   │       └── events.ts        # optional UI events
│   │
│   ├── mocks/
│   │   ├── fixtures/
│   │   │   ├── portfolio.json
│   │   │   ├── loan_demo_001.json
│   │   │   ├── clauses_demo_001.json
│   │   │   ├── covenants_demo_001.json
│   │   │   ├── esg_demo_001.json
│   │   │   └── audit_demo_001.json
│   │   └── msw/
│   │       ├── handlers.ts
│   │       └── server.ts
│   │
│   ├── tests/
│   │   └── e2e/
│   │       └── loan-lifecycle.spec.ts
│   │
│   └── main.tsx
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   └── commands.rs
│   ├── tauri.conf.json
│   └── Cargo.toml
│
├── public/
│   └── favicon.ico
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

**Why this is right**: New modules drop into `features/<module>` without touching core shell.

---

## 3. Ownership & Boundaries

### `app/` (Application Orchestration)

**Owns**:
- Routing
- Layout shell
- Global providers
- Global UI store
- Nav config and route constants

### `features/*` (Business Modules)

**Owns**:
- Pages for that module
- Local components
- Data hooks for that module
- Service clients for that module
- Module types/schemas
- Module tests

### `shared/` (Cross-Cutting Reusable)

**Owns**:
- Design system wrappers
- Generic components
- Formatting helpers
- i18n + theme tokens
- API base client

### `mocks/` (Demo Truth)

**Owns**:
- Fixtures
- Handlers
- Simulated latency/errors for realism

---

## 4. AppShell Component Contracts

### AppShell.tsx
- Renders layout grid
- Contains `<Outlet />`
- Controls RightDrawer open/close state
- **No business logic**

### Sidebar.tsx
- Renders from `nav.ts`
- Highlights active route
- Hides items by role (via `rolesAllowed`)
- Emits navigation events
- **Data-testid**: `app-sidebar`

### Topbar.tsx
- Global search (mock for now)
- Theme toggle
- Language switch
- Role switch
- Notifications badge (mock)
- **Data-testid**: `app-topbar`

### RightDrawer.tsx
- Reads `activeLoanId` from `uiStore`
- Renders:
  - Loan Snapshot (from mocked `useLoan(activeLoanId)`)
  - Audit Timeline mini list
- Shows contextual actions:
  - Export summary
  - Generate diligence pack (later)
- **Data-testid**: `app-rightdrawer`

### StatusBar.tsx
- Shows dataset ("Demo")
- Last extraction run timestamp (from store/mock)
- Connectivity status (mock)
- **Data-testid**: `app-statusbar`

**Main content area**: **Data-testid**: `page-content`

This contract keeps everything testable and avoids future refactors.

---

## 5. Route Table + Navigation Mapping

### Route Groups (Lifecycle-Centric)

- Portfolio
- Origination
- Loan Workspace (nested under `/loans/:loanId/*`)
  - Overview
  - Documents
  - Servicing
  - Trading
  - ESG

### Route Constants (`app/routes/paths.ts`)

```typescript
export const PATHS = {
  PORTFOLIO: '/portfolio',
  INGEST: '/origination/ingest',
  LOAN_OVERVIEW: '/loans/:loanId/overview',
  LOAN_DOCUMENTS: '/loans/:loanId/documents',
  LOAN_SERVICING: '/loans/:loanId/servicing',
  LOAN_TRADING: '/loans/:loanId/trading',
  LOAN_ESG: '/loans/:loanId/esg',
} as const;
```

### Nav Config (`app/routes/nav.ts`)

**Structure**:
```typescript
interface NavItem {
  key: string;
  labelKey: string;        // i18n key (e.g., 'nav.portfolio')
  icon: string;            // Icon name (lucide-react)
  path: string;
  matchStrategy?: 'exact' | 'prefix';
  rolesAllowed: AppRole[];
  children?: NavItem[];
}

type AppRole = 'Agent' | 'Lender' | 'Borrower' | 'Buyer';
```

**Rule**: No hardcoded labels in Sidebar; everything via i18n keys.

**Usage**: Drives Sidebar, breadcrumbs, page titles, role-based filtering

---

## 6. State Management Rules

### Zustand `uiStore` (`app/store/uiStore.ts`)

**Owns ONLY**:
```typescript
interface UIStore {
  activeLoanId: string | null;
  activeRole: 'Agent' | 'Lender' | 'Borrower' | 'Buyer';
  language: 'en' | 'de' | 'fr';
  theme: 'light' | 'dark';
  rightDrawerOpen: boolean;
  datasetMode: 'demo' | 'production';
  lastExtractionAt: string | null;  // Demo timestamp
}
```

**Rules**:
- ✅ Global UI preferences
- ✅ Session-level context (active loan, role)
- ✅ Layout state (drawer open/close)
- ❌ No business data (loans, covenants, etc.)
- ❌ No API responses
- ❌ No computed/derived state
- ❌ UI store never stores full loan objects

### TanStack Query

**Owns**:
- All fetched data (even from mocks)
- Caches by:
  - `["portfolio"]`
  - `["loan", loanId]`
  - `["clauses", loanId]`
  - `["covenants", loanId]`
  - `["esg", loanId]`
  - `["audit", loanId]`

**Pattern**:
```typescript
// features/loans/hooks/useLoan.ts
export const useLoan = (loanId: string) => {
  return useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => loansApi.getLoan(loanId),
  });
};
```

---

## 7. Multilingual & Theming Conventions

### i18n

**Namespaces**:
- `nav`
- `common`
- `portfolio`, `origination`, `loans`, etc.

**Keys**:
- `nav.portfolio`
- `common.search`
- `loans.kpi.exposure`

**Structure**:
- Global: `shared/i18n/locales/{lang}/common.json`, `nav.json`
- Per-feature: `features/{module}/i18n.json`

### Theming

**Semantic tokens in `tokens.css`**:
```css
:root {
  --bg: ...;
  --fg: ...;
  --muted: ...;
  --border: ...;
  --primary: ...;
  --success: ...;
  --warning: ...;
  --danger: ...;
}
```

**Classes**:
- `theme-light`
- `theme-dark`
- (later) `brand-bank-blue`, etc.

**Rule**: Components must use semantic tokens, not raw colors.

---

## 8. Demo-Mode Realism

**Fixtures represent 1-3 realistic loans**

**Simulate**:
- Extraction running → completed (fake progress)
- Covenant changes via "simulate updated financials"
- "Generate diligence pack" produces a report view (later)

**Rule**: Demo actions always write to audit timeline fixture in memory.

---

## 9. Testing Architecture Hooks

### Unit Tests
- Schemas & formatters in `shared/lib` and `features/*/schemas.ts`

### Component Tests
- AppShell renders regions
- Sidebar renders nav items by role
- Topbar toggles theme/lang

### E2E (Single Green Path)
- Route navigation + region existence
- `loan-lifecycle.spec.ts`: Launch → Portfolio → Origination → Loan route → Assert regions exist

**Rule**: All layout regions have data-testid:
- `app-sidebar`
- `app-topbar`
- `app-rightdrawer`
- `app-statusbar`
- `page-content`

---

## 10. Phase A Exit Criteria

✅ **Folder structure accepted**  
✅ **Component responsibilities frozen**  
✅ **Route constants + nav config approach frozen**  
✅ **State boundaries frozen**  
✅ **Theming + i18n conventions frozen**  
✅ **Test hooks frozen**

---

**Status**: ✅ **ARCHITECTURE LOCKED**  
**Next Step**: Step 1B - Generate starter code skeleton
