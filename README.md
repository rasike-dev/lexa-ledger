# LEXA Ledger™

**The Operating System for Digital Loans**

Desktop-first, enterprise-grade digital loan intelligence platform that transforms complex LMA-style loan documents into structured, standardized digital loan objects.

---

## 📋 Documentation

This project contains comprehensive documentation to guide development and maintain focus:

- **[BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md)** - Product vision, problem statement, target users, core features, commercial viability
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture, folder structure, component contracts, state management, testing strategy
- **[ROADMAP.md](./ROADMAP.md)** - Implementation roadmap, phased execution plan, milestones, success criteria

---

## 🎯 Product Vision

LEXA Ledger turns LMA loan documents into living digital assets — improving efficiency, transparency, compliance, and sustainability across the full loan lifecycle.

**Think of it as**: DocuSign + Bloomberg + LegalTech AI + Compliance Engine — purpose-built for loans

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+ (for Tauri)
- pnpm 8+ (recommended)
- PostgreSQL 15+
- Redis 7+
- MinIO (or S3)
- Keycloak 23+ (for SSO)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Keycloak, PostgreSQL, Redis, MinIO credentials

# Run database migrations
pnpm prisma migrate dev

# Seed database
pnpm prisma db seed

# Seed additional data (optional)
pnpm --dir apps/api seed:servicing  # Covenant data
pnpm --dir apps/api seed:trading    # Trading readiness data
pnpm --dir apps/api seed:esg        # ESG KPIs and evidence
pnpm --dir apps/api seed:clauses    # Clause data for all loans

# Start services (in separate terminals)
pnpm api:dev          # Backend API (port 3000)
pnpm worker:dev       # Background worker
pnpm dev              # Frontend (port 5173)

# For desktop app
pnpm tauri dev
```

### Demo Credentials

```bash
# Tenant Admin (full access)
Username: rasike
Password: rasike

# Compliance Auditor (read-only)
Username: auditor
Password: auditor

# Different Tenant (isolation demo)
Username: testuser
Password: testuser
```

---

## 🏗️ Tech Stack

**Frontend**:
- Tauri v2 (Desktop framework with native security)
- React + TypeScript + Vite
- TanStack Query (data fetching & caching)
- Zustand (state management)
- React Router v6
- i18next (internationalization)

**Backend**:
- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- Redis + BullMQ (async job processing)
- MinIO (S3-compatible storage)
- Keycloak (OIDC/SSO authentication)

**Security**:
- JWT-based authentication (OIDC)
- Role-Based Access Control (RBAC)
- Tenant isolation (multi-tenancy)
- Stronghold (encrypted token vault for desktop)
- Helmet (security headers)
- Rate limiting (user/IP-based)

**Testing**:
- Vitest (Unit/Component tests)
- React Testing Library
- Playwright (E2E tests)

---

## 📁 Project Structure

```
LEXA-Ledger/
├── src/
│   ├── app/              # Application shell, routing, layout
│   ├── features/         # Business modules (portfolio, loans, etc.)
│   ├── shared/           # Shared components, utilities, theme, i18n
│   ├── mocks/            # Mock data and MSW handlers
│   └── tests/            # E2E tests
├── src-tauri/            # Tauri Rust backend
└── docs/                 # Documentation (this folder)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed structure.

---

## 🎯 Core Features

### Business Features
1. **Digital Loan Twin Engine** - Convert loan documents into structured digital records
   - Document upload and versioning
   - Automatic clause extraction and tagging
   - Document metadata tracking
   - Multi-version document management

2. **Clause Intelligence & Change Impact** - Clause-level parsing and amendment impact analysis
   - Clause extraction with risk tagging (PRICING, COVENANT, REPORTING, ESG, EOD)
   - Clause reference tracking and source linking
   - Amendment diff visualization
   - Impact preview panel for downstream effects
   - Seeded clauses for all loans (4-5 relevant clauses per loan)

3. **Covenant & Obligation Tracker** - Real-time covenant monitoring with early breach warnings
   - Financial covenant modeling (DSCR, Leverage, Liquidity, Interest Coverage)
   - Scenario-based testing (BASE/STRESS)
   - Real-time covenant status (PASS/WARN/FAIL)
   - Early breach warnings and projections
   - Covenant explanations with "Why?" panel

4. **Trade Readiness Snapshot** - Instant due diligence and trade readiness scoring
   - Trade Readiness Score (0-100) with banding (GREEN/AMBER/RED)
   - Automated due diligence checklist
   - Readiness explanations with AI-powered insights
   - Blocking issues identification
   - Contributing factors analysis

5. **ESG Performance Ledger** - Structured ESG metrics with comparability and verification
   - ESG KPI tracking (Emissions, Renewable Energy, Water, Waste, Safety, Diversity)
   - Target vs actual performance monitoring
   - Evidence attachment and verification workflow
   - ESG explanation panels with verification status
   - Portfolio-level ESG comparison

### Enterprise Security & Compliance (Week 2) ✅ COMPLETE
- **OIDC Authentication** - Single Sign-On via Keycloak
- **Multi-tenant Architecture** - Tenant isolation enforced at database level
- **Role-Based Access Control (RBAC)** - 12 enterprise roles with granular permissions
- **Comprehensive Audit Trail** - Immutable event logging with correlation ID tracing
- **Identity Debug Endpoint** - `/api/me` for support and demo visibility
- **Audit Viewer UI** - Advanced searchable, filterable audit events
  - Full-text search with factHash support
  - Filter by actor type, action, entity type, module, entity ID
  - Correlation ID tracking for request tracing
  - Export functionality for compliance reporting
  - URL parameter persistence for shareable filtered views
- **Desktop Security** - Stronghold encrypted token vault + system browser auth
- **Rate Limiting** - User/IP-based throttling to prevent abuse
- **Security Headers** - Helmet middleware + restricted CORS
- **Session Management** - Robust 401 handling with state cleanup

### Explainable Intelligence & AI-Ready Architecture (Week 3)
**Track A: Facts-First Explainability** ✅ COMPLETE
- **Explainable Trading Readiness** - Human-readable explanations for trading scores (AI explains, never computes facts)
  - Professional "Why?" drawer with facts panel, controls, and formatted explanations
  - Summary, contributing factors, recommendations, and confidence scoring
  - Role-aware verbosity (SHORT/STANDARD/DETAILED)
  - Audience-specific explanations (TRADING_ANALYST, TRADING_VIEWER, INVESTOR, COMPLIANCE)
- **ESG KPI Reasoning** - Contextual explanations for ESG compliance and verification status
  - ESG KPI fact snapshots with measurement, evidence, and verification data
  - Explanation panels with verification status and compliance insights
- **Covenant Breach Explanations** - Safety-bounded AI explanations of pre-evaluated covenant logic
  - Covenant evaluation fact snapshots with threshold vs observed values
  - Breach detail explanations with actionable recommendations
- **Portfolio Risk Explanations** - Aggregated risk distribution explanations with actionable recommendations
  - Portfolio-level risk fact snapshots with totals, distributions, and top drivers
  - Anomaly detection and risk concentration analysis
- **Explainability UI Drawer** - Generic, reusable "Why?" panel with role-aware verbosity
  - Professional design with gradient backgrounds and improved typography
  - Facts panel with formatted JSON viewer
  - Controls for audience, verbosity, and explanation generation
  - Formatted output with summary, factors, recommendations, and confidence
- **Cached Explanations** - Server-side caching with stable hashing to reduce AI costs

**Track B: AI Infrastructure & Governance** ✅ COMPLETE
- **Prompt Registry** - Versioned, code-based prompt templates with strict variable contracts
- **Output Schema Validation** - Zod-enforced JSON schemas preventing malformed AI outputs
- **LLM Gateway** - Centralized orchestration with prompt rendering, redaction, checksum, and schema validation
- **Provider Routing + Fallback** - Policy-based model selection with automatic transient error retry
- **Audit-Safe AI Calls** - Dual audit trail (AI module + domain module) with cost estimation
- **Full Gateway Integration** - All 4 explainers (Trading/ESG/Covenant/Portfolio) routed through governance layer
- **Asynchronous Explanation Jobs** - BullMQ-powered background processing for explanation generation
- **Drift Detection & Staleness** - Automatic invalidation of explanations when facts change
- **PII Redaction** - Sensitive data removal from AI prompts with redaction audit trail
- **AI Rate Limiting** - Redis-based throttling per tenant/user/module/template

**Track C: Operational Intelligence** ✅ COMPLETE
- **Scheduled Refresh Jobs** - BullMQ repeatable jobs for nightly fact/explanation recomputation
- **Manual Refresh Trigger** - On-demand tenant-wide refresh via `/api/ops/refresh/nightly`
- **Impact Detection** - Automatic detection of downstream effects when source data changes
- **Operational Dashboard** - Professional UI with gradient card design
  - Last Refresh tracking with job ID and completion time
  - Drift Events (24h) - Count of facts changed and explanations updated
  - Stale Explanations - Count of explanations needing recompute
  - AI Usage (24h) - Call count and estimated cost tracking
  - Deep links to filtered audit logs for each metric
  - Self-healing system information banner
- **Self-Healing Architecture** - Automated drift → recompute → explanation update pipeline

See [BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md) and [WEEK3_TRACK_C_COMPLETE.md](./WEEK3_TRACK_C_COMPLETE.md) for detailed feature descriptions.

---

## 🗺️ Implementation Roadmap

The project follows a 5-phase execution plan:

- **Phase 0**: LMA Reality Immersion (research, pain mapping)
- **Phase 1**: Product Core Definition (scope lock, messaging)
- **Phase 2**: Desktop UX & Prototype Flow (7 screens, routing, layout)
- **Phase 3**: Intelligence & Automation Layer (AI simulation, covenant engine)
- **Phase 4**: Commercial & Deployment Story (pricing, ROI, expansion)
- **Phase 5**: Winning Judge Narrative (demo polish, 3-minute script)

See [ROADMAP.md](./ROADMAP.md) for detailed phase breakdowns.

---

## 👥 Target Users

- **Primary Buyer**: Agent Banks
- **Secondary Users**: Syndicated Lenders, Borrowers, Secondary Market Buyers, ESG & Risk Teams, Law Firms

See [BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md) for user benefits.

---

## 🏆 Hackathon Context

**Event**: LMA EDGE Hackathon

**Focus Areas**: AI, LegalTech, DLT (Distributed Ledger Technology)

**Mission Alignment**: Advances LMA's mission across liquidity, efficiency, transparency, and sustainability

---

## 🧪 Development

### Running Tests

```bash
# Unit/Component tests
npm run test

# E2E tests
npm run test:e2e
```

### Code Quality

- TypeScript strict mode
- ESLint + Prettier
- Zod schema validation for all API boundaries
- Component tests for critical flows
- E2E test for happy path demo

---

## 📝 Key Principles

1. **Feature-first modularity** - Each module owns its UI, hooks, services, types
2. **No data fetching in components** - Only via hooks/services
3. **Zod-validated contracts** - At API boundary (even for mocks)
4. **Cross-cutting concerns centralized** - Theme, i18n, role, shell
5. **Navigation is config-driven** - Single source of truth
6. **Deterministic demo mode** - Fixtures → stable flows → reliable video

---

## 🎯 Success Criteria

### Hackathon Success
- ✅ Working desktop app
- ✅ 7 lifecycle screens functional
- ✅ Smooth 3-minute demo flow
- ✅ Compelling demo video
- ✅ Clear value proposition
- ✅ Commercial viability demonstrated

### Long-Term Success
- Agent bank pilot programs
- Loan volume on platform
- User adoption metrics
- Measured efficiency gains
- Quantified risk reduction

---

## 📄 License

[To be determined]

---

## 🤝 Contributing

This is a hackathon project. For collaboration, please coordinate with the team.

---

## 📚 Additional Resources

- **LMA (Loan Market Association)**: https://www.lma.eu.com/
- **Tauri Documentation**: https://tauri.app/
- **shadcn/ui**: https://ui.shadcn.com/

---

## 🔐 Architecture Highlights

### Multi-Tenancy
- Tenant ID derived from JWT claims (no header spoofing)
- Prisma Client Extensions for automatic tenant filtering
- AsyncLocalStorage for request-scoped context
- All queries tenant-safe by default

### Authentication & Authorization
- OIDC/OAuth 2.0 flow via Keycloak
- JWT validation on every API request
- 12 enterprise roles: TENANT_ADMIN, COMPLIANCE_AUDITOR, TRADING_ANALYST, etc.
- Controller-level `@Roles()` decorators + global `RolesGuard`
- UI role simulation for demo purposes (UI-only, backend still enforces)

### Audit & Observability
- Every mutation logged to `AuditEvent` table
- Enriched with: actor, roles, tenant, correlation ID, IP, user agent
- Centralized `AuditService` ensures consistency
- Immutable by design (no updates/deletes)
- Audit viewer UI with filters and export

### Desktop Security (Tauri v2)
- **Stronghold Plugin** - Encrypted vault for refresh tokens
- **Argon2-based Key Derivation** - Brute-force resistant
- **System Browser Auth** - RFC 8252 compliant (no embedded webview)
- **Deep Link Callback** - `lexa-ledger://auth/callback`
- **OS-level Security** - Credentials managed by system keychain

### Data Pipeline
```
User Action
    ↓
NestJS Controller (JWT validated, roles checked)
    ↓
Service Layer (business logic)
    ↓
Prisma (tenant-filtered queries via extension)
    ↓
PostgreSQL (row-level tenant isolation)
    ↓
Audit Trail (immutable event log)
    ↓
Redis + BullMQ (async processing)
    ↓
Worker (SERVICE actor, tenant context preserved)
```

---

## 🎭 Demo Features

### Role Simulation (UI-only)
- Switch between role sets instantly
- Shows UI changes without backend login
- Clear "UI Role Simulation" badge
- Backend always enforces real token
- **Note**: Guided demo features can be disabled via feature flags for production

### Identity Panel
- Shows user, tenant, roles from JWT
- Server-validated identity (proof panel)
- Correlation ID for request tracing
- One-click copy for debugging

### Audit Trail Demo
1. Perform action (create loan, upload doc, etc.)
2. Copy correlation ID from Identity Panel
3. Open Audit Viewer (`/audit`)
4. Search by correlation ID
5. See complete request trace with actor context

### Loan Workspace Pages
- **Portfolio Home** (`/portfolio`) - Portfolio overview with KPI tiles and loan grid
- **Loan Overview** (`/loans/:loanId/overview`) - Loan summary with parties, facilities, and key metrics
- **Documents** (`/loans/:loanId/documents`) - Clause explorer with extracted clauses and tags
- **Servicing** (`/loans/:loanId/servicing`) - Covenant monitoring with scenario testing
- **Trading** (`/loans/:loanId/trading`) - Trade readiness score with checklist and explanations
- **ESG** (`/loans/:loanId/esg`) - ESG KPI tracking with evidence and verification
- **Operational Intelligence** (`/ops`) - System health dashboard with drift and AI usage metrics

---

**Status**: ✅ Production-Ready (v2.0.0)  
**Last Updated**: January 2026  
**Version**: 2.0.0

### Recent Updates (v2.0.0)
- ✅ Professional UI redesign for Operational Intelligence dashboard
- ✅ Clause seeding script for all loans (4-5 relevant clauses per loan)
- ✅ Enhanced explainability UI with improved styling and readability
- ✅ Production-ready feature flags (guided demo disabled by default)
- ✅ Updated branding and status indicators (LEXA Ledger v1.0, Production environment)
- ✅ Comprehensive audit viewer with advanced filtering and search
- ✅ All core features implemented and tested

