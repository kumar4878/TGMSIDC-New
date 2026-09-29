# TGMSIDC Web App

React 19 + Vite + TailwindCSS frontend for the TGMSIDC Equipment Procurement Portal.

## Prerequisites
- Node.js 18+
- TGMSIDC API Server running (see `../server/`)

## Setup

```bash
# Install dependencies
npm install

# Copy env file and edit values
cp .env.example .env
# Edit .env: set VITE_API_URL to your server address

# Start development server
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Dev server port |
| `VITE_API_URL` | `http://localhost:5000` | Backend API base URL |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |

## Features

- **Dashboard** — KPIs, procurement pipeline chart, SLA metrics, vendor performance
- **Indents** — Create, approve, reject, and track procurement indents
- **Rate Contracts** — Manage active rate contracts with expiry alerts
- **Purchase Orders** — Create, approve, and cancel purchase orders
- **Tenders** — Tender workbench, bid evaluation and tracking
- **Deliveries** — Track dispatch → delivery → QA → acceptance
- **GRN** — Goods Receipt Notes management
- **Invoices & Payments** — Invoice review and payment workflows
- **Vendors** — Vendor onboarding, performance scoring
- **Institutions** — Facility/hospital management
- **Equipment** — Standardised equipment catalogue
- **Reports** — Executive overview, financial analytics, SLA compliance, vendor scorecards
- **Budget** — Budget allocation and utilisation tracking
- **Approval Inbox** — Role-based approval workflows
- **Stock Visibility** — Inter-facility stock positions
- **KPI Dashboard** — Key performance indicators tracking

## Role-Based Access

The portal supports 7 roles:
- `indent_initiator` — Clerks who raise indents
- `biomedical_engineer` — Reviews technical specs
- `gm` — General Manager approvals
- `director` — Director sanctions
- `finance` — Finance officer
- `supplier` — Vendor portal access
- `facility_receiver` — GRN and acceptance

Use the role switcher in the top navbar to switch between roles during demo.
