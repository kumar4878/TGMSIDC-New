# TGMSIDC — Equipment Procurement Portal

Telangana Government Medical Services & Infrastructure Development Corporation  
Equipment Procurement and Order Management System

## Project Structure

```
TGMSIDC/
├── server/   ← Express.js API with MongoDB (Mongoose)
└── web/      ← React 19 + Vite + TailwindCSS frontend
```

## Quick Start

### 1. Start MongoDB
Make sure MongoDB is running locally:
```bash
# Windows (if MongoDB is installed as a service)
net start MongoDB

# Or start manually
mongod --dbpath C:\data\db
```

### 2. Start the Server
```bash
cd server
npm install
npm run seed      # Seed initial data (run once)
npm run dev       # Start on http://localhost:5000
```

### 3. Start the Web App
```bash
cd web
npm install
npm run dev       # Start on http://localhost:3000
```

Open http://localhost:3000 in your browser.

## Apps

| App | Port | Description |
|-----|------|-------------|
| `server` | 5000 | REST API (Express + MongoDB) |
| `web` | 3000 | React frontend |

## Environment Variables

### `server/.env`
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tgmsidc
NODE_ENV=development
```

### `web/.env`
```
PORT=3000
VITE_API_URL=http://localhost:5000
```

See each app's `README.md` for detailed documentation.
