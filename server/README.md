# TGMSIDC API Server

Express.js backend with MongoDB (Mongoose) for the TGMSIDC Equipment Procurement Portal.

## Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

## Setup

```bash
# Install dependencies
npm install

# Copy env file and edit values
cp .env.example .env
# Edit .env: set MONGODB_URI to your MongoDB connection string

# Seed the database
npm run seed

# Start development server
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/tgmsidc` | MongoDB connection string |
| `NODE_ENV` | `development` | Environment mode |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload (tsx watch) |
| `npm run seed` | Seed initial data into MongoDB |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/institutions` | Institutions CRUD |
| GET/POST | `/api/vendors` | Vendors CRUD |
| GET | `/api/vendors/:id` | Get single vendor |
| GET/POST | `/api/equipment` | Equipment CRUD |
| GET/POST | `/api/rate-contracts` | Rate Contracts CRUD |
| GET | `/api/rate-contracts/expiring-soon` | Expiring contracts |
| PATCH | `/api/rate-contracts/:id` | Update rate contract |
| GET/POST | `/api/indents` | Indents CRUD |
| GET | `/api/indents/:id` | Get single indent |
| PATCH | `/api/indents/:id` | Update indent |
| POST | `/api/indents/:id/approve` | Approve indent |
| POST | `/api/indents/:id/reject` | Reject indent |
| GET/POST | `/api/tenders` | Tenders CRUD |
| GET | `/api/tenders/:id` | Get single tender |
| PATCH | `/api/tenders/:id` | Update tender |
| GET/POST | `/api/purchase-orders` | Purchase Orders CRUD |
| POST | `/api/purchase-orders/:id/approve` | Approve PO |
| POST | `/api/purchase-orders/:id/cancel` | Cancel PO |
| GET/POST | `/api/deliveries` | Deliveries CRUD |
| PATCH | `/api/deliveries/:id` | Update delivery/QA |
| POST | `/api/deliveries/:id/accept` | Accept delivery |
| GET | `/api/dashboard/summary` | Dashboard KPIs |
| GET | `/api/dashboard/procurement-pipeline` | Pipeline stats |
| GET | `/api/dashboard/recent-activity` | Recent activity |
| GET | `/api/dashboard/vendor-performance` | Vendor metrics |
| GET | `/api/dashboard/sla-metrics` | SLA metrics |
