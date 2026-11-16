# Instagram SaaS Automation Platform

This repository contains the fullstack application:
- **`instabotbac`**: Node.js + Express + TypeScript + MongoDB + BullMQ + Socket.IO backend
- **`instabotfr`**: React + Vite + TypeScript + Tailwind CSS frontend

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **MongoDB** running locally on port `27017` (e.g. `mongodb://127.0.0.1:27017/ig-saas`)
- **Redis** running locally on port `6379` *(Optional: BullMQ queue workers will connect automatically when Redis is active; if Redis is offline, the backend remains fully operable for API calls and sockets)*

### 2. Environment Variables

Both directories include configured `.env` files:
- **Backend (`instabotbac/.env`)**:
  - `PORT=5000`
  - `MONGO_URI=mongodb://127.0.0.1:27017/ig-saas`
  - `REDIS_HOST=127.0.0.1`
  - `REDIS_PORT=6379`
  - `JWT_ACCESS_SECRET=access-secret-key-12345`
  - `JWT_REFRESH_SECRET=refresh-secret-key-12345`
- **Frontend (`instabotfr/.env`)**:
  - `VITE_API_URL=http://localhost:5000/api/v1`
  - `VITE_BACKEND_URL=http://localhost:5000`

### 3. Running the Projects

You can run them individually or from the root:

```bash
# Start backend (Port 5000)
npm run dev:backend

# Start frontend (Port 5173)
npm run dev:frontend
```

Alternatively:
```bash
# In instabotbac:
npm run dev

# In instabotfr:
npm run dev
```

### 4. Seed Data & Demo Account
A demo user account has been registered for instant testing:
- **Email:** `admin@example.com`
- **Password:** `password123`
- **Workspace:** `My Test Agency`

To re-seed default workflows and knowledge base:
```bash
npm run seed
```
