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
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

---

## 🏗️ Tech Stack

**Frontend**:
- Tauri (Desktop framework)
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router
- TanStack Query
- Zustand
- i18next

**Backend** (Future):
- NestJS or FastAPI (for production API)
- Currently: Mock services with MSW

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

1. **Digital Loan Twin Engine** - Convert loan documents into structured digital records
2. **Clause Intelligence & Change Impact** - Clause-level parsing and amendment impact analysis
3. **Covenant & Obligation Tracker** - Real-time covenant monitoring with early breach warnings
4. **Trade Readiness Snapshot** - Instant due diligence and trade readiness scoring
5. **ESG Performance Ledger** - Structured ESG metrics with comparability and verification

See [BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md) for detailed feature descriptions.

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

**Status**: In Development  
**Last Updated**: Phase 2 - AppShell + Routing Skeleton

