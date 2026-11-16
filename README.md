# Instagram SaaS Automation Platform

A complete fullstack Instagram AI marketing & automation platform:
- **`instabotbac`**: Node.js, Express, TypeScript, MongoDB, BullMQ, Socket.IO, Helmet, CORS.
- **`instabotfr`**: React, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router.

---

## 🚀 Local Development

### 1. Prerequisites
- **Node.js**: v18 or higher
- **MongoDB**: Local or MongoDB Atlas
- **Redis** *(Optional)*: BullMQ queues connect automatically when Redis is running; the backend remains operational even if Redis is temporarily offline.

### 2. Quick Start
```bash
# Install all dependencies (both backend and frontend)
npm run install:all

# Start backend (Port 5000)
npm run dev:backend

# Start frontend (Port 5173)
npm run dev:frontend
```

---

## 🚢 Production Deployment Guide

### Option A: Render (Backend) + Vercel (Frontend) — Recommended

#### 1. Backend on [Render.com](https://render.com)
1. Create a new **Web Service** and connect your GitHub repo.
2. Configure settings:
   - **Root Directory:** `instabotbac`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. Add Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGO_URI`: Your MongoDB Atlas connection URI (`mongodb+srv://...`)
   - `REDIS_URL`: *(Optional)* Your Redis connection URL (e.g. from Upstash or Render Redis)
   - `JWT_ACCESS_SECRET`: A long random secret string
   - `JWT_REFRESH_SECRET`: A long random secret string
   - `ALLOWED_ORIGINS`: Your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GEMINI_API_KEY`: *(Optional)* Your Gemini API key
   - `META_APP_ID`: Your Meta App ID
   - `META_APP_SECRET`: Your Meta App Secret
   - `META_WEBHOOK_VERIFY_TOKEN`: Your webhook verification token

#### 2. Frontend on [Vercel](https://vercel.com)
1. Import your GitHub repository into Vercel.
2. Select **Root Directory:** `instabotfr`.
3. Framework Preset: **Vite**.
4. Add Environment Variables in Vercel:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api/v1`
   - `VITE_BACKEND_URL`: `https://your-backend.onrender.com`
5. Click **Deploy**.

---

### Option B: 1-Click Render Blueprint
If deploying everything on Render, push to GitHub and click **New + -> Blueprint** in Render:
Render will automatically detect [render.yaml](file:///c:/Users/DELL/Desktop/python/instgram%20automation/render.yaml) and provision:
- Backend Web Service
- Redis instance for BullMQ
- Frontend Static Site

---

### Option C: Docker & Docker Compose (Self-Hosted / VPS)

Run the entire stack with MongoDB and Redis on any Docker-compatible server:

```bash
docker compose up --build -d
```

- **Frontend:** `http://your-server-ip`
- **Backend API:** `http://your-server-ip:5000`
- **Health Check:** `http://your-server-ip:5000/api/health`

---

## 🔒 Security Best Practices Implemented

- **CORS Allowlist**: Dynamic matching for development and production domains with regex protection.
- **Sanitized Errors**: Stack traces and internal error details are completely masked in production responses.
- **Helmet Headers**: Content security policy and security headers enabled.
- **Rate Limiting**: IP-based rate limiting enabled with `trust proxy` support for reverse proxies.
- **Graceful Shutdown**: Properly closes HTTP listeners and disconnects MongoDB connections upon `SIGTERM` / `SIGINT`.
