# SyncSpace — Real-Time Collaborative Platform

A production-ready, full-stack real-time collaboration platform built with React 19, TypeScript, Socket.IO, Prisma, and PostgreSQL.

## Features

- **Real-time collaboration** — multiple users edit simultaneously with instant sync
- **OT-inspired conflict resolution** — version tracking with last-write-wins + conflict detection
- **Live cursors** — see other users' mouse positions with color-coded name flags
- **User presence** — online/offline status, active user panels
- **Version history** — auto-snapshots with restore capability
- **Activity feed** — full audit trail of all workspace actions
- **Export system** — JSON, Markdown, PDF export
- **Notifications** — real-time in-app notifications
- **JWT auth** — access + refresh token rotation
- **Dark mode** — persisted theme toggle
- **Responsive** — works on desktop and mobile

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, ShadCN UI, Framer Motion |
| State | Zustand |
| Real-time | Socket.IO Client |
| Routing | React Router v6 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh tokens), bcrypt |
| Deployment | Render (Web Service + Static Site + PostgreSQL) |

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL (local or remote)
- npm or yarn

### 1. Clone and install

```bash
git clone <your-repo>
cd collab-platform

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/syncspace
JWT_SECRET=your-32-char-secret-here
JWT_REFRESH_SECRET=your-32-char-refresh-secret
CLIENT_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

**Frontend** (`frontend/.env.local`):
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### 3. Database setup

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Optional: seed demo data
npm run db:seed
```

### 4. Start development servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173`

---

## Render Deployment

### Option A: render.yaml (Recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repo
4. Render will read `render.yaml` and provision:
   - PostgreSQL database
   - Backend web service
   - Frontend static site

### Option B: Manual setup

#### 1. Create PostgreSQL Database
- Dashboard → New → PostgreSQL
- Name: `syncspace-db`
- Region: Oregon (or nearest)
- Copy the **Internal Database URL**

#### 2. Deploy Backend
- Dashboard → New → Web Service
- Connect your GitHub repo
- Settings:
  - **Root Directory**: `backend`
  - **Environment**: Node
  - **Build Command**: `npm install && npx prisma generate && npm run build && npx prisma migrate deploy`
  - **Start Command**: `node dist/index.js`
- Environment Variables:
  ```
  DATABASE_URL=<Internal DB URL from step 1>
  JWT_SECRET=<random 32+ char string>
  JWT_REFRESH_SECRET=<random 32+ char string>
  CLIENT_URL=<your frontend URL, e.g. https://syncspace.onrender.com>
  NODE_ENV=production
  PORT=3001
  ```

#### 3. Deploy Frontend
- Dashboard → New → Static Site
- Connect your GitHub repo
- Settings:
  - **Root Directory**: `frontend`
  - **Build Command**: `npm install && npm run build`
  - **Publish Directory**: `dist`
- Environment Variables:
  ```
  VITE_API_URL=https://<your-backend>.onrender.com/api
  VITE_SOCKET_URL=https://<your-backend>.onrender.com
  ```
- Add Rewrite Rule: `/*` → `/index.html` (for SPA routing)

### Post-deployment

After first deploy, the migration runs automatically via the build command. To seed demo data:
```bash
# Via Render Shell (backend service → Shell tab)
npm run db:seed
```

---

## Project Structure

```
collab-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Demo data seeder
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── workspace.controller.ts
│   │   │   ├── document.controller.ts
│   │   │   ├── activity.controller.ts
│   │   │   └── export.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT middleware
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   └── index.ts           # All routes
│   │   ├── socket/
│   │   │   └── index.ts           # Socket.IO handlers
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── logger.ts
│   │   │   └── prisma.ts
│   │   ├── types/index.ts
│   │   └── index.ts               # App entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # ShadCN components
│   │   │   ├── layout/            # Navbar, AppLayout, AuthGuard
│   │   │   ├── workspace/         # ActivityFeed, UserPresence, LiveCursor
│   │   │   └── editor/            # VersionHistory, ExportModal
│   │   ├── pages/                 # All page components
│   │   ├── store/                 # Zustand stores
│   │   ├── hooks/                 # Custom hooks
│   │   ├── lib/                   # API client, socket, utils
│   │   ├── types/                 # TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── package.json
│
├── render.yaml                    # Render deployment config
└── README.md
```

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/me` | Update profile |

### Workspaces
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces` | List user's workspaces |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/:id` | Get workspace |
| PATCH | `/api/workspaces/:id` | Update workspace |
| DELETE | `/api/workspaces/:id` | Delete workspace |
| POST | `/api/workspaces/:id/invite` | Invite member |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove member |
| PATCH | `/api/workspaces/:id/members/:userId` | Update member role |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/:wid/documents` | List documents |
| POST | `/api/workspaces/:wid/documents` | Create document |
| GET | `/api/documents/:id` | Get document |
| PATCH | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |
| GET | `/api/documents/:id/versions` | List versions |
| POST | `/api/documents/:id/versions` | Create version snapshot |
| POST | `/api/documents/:id/versions/:vid/restore` | Restore version |
| GET | `/api/documents/:id/export/:format` | Export (json/markdown/pdf) |

### Socket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `workspace:join` | Client → Server | Join workspace room |
| `workspace:leave` | Client → Server | Leave workspace room |
| `document:operation` | Client → Server | Broadcast document edit |
| `document:update` | Server → Client | Receive remote edit |
| `document:conflict` | Server → Client | Version conflict detected |
| `cursor:move` | Client → Server | Send cursor position |
| `cursor:update` | Server → Client | Receive cursor positions |
| `presence:update` | Server → Client | Active users list |
| `user:join` | Server → Client | User joined workspace |
| `user:leave` | Server → Client | User left workspace |
| `version:create` | Client → Server | Request version snapshot |
| `activity:new` | Server → Client | New activity event |

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT access tokens expire in 15 minutes
- Refresh tokens expire in 7 days, stored in DB
- Rate limiting: 20 req/15min on auth, 500 req/15min on API
- Helmet.js security headers
- CORS restricted to `CLIENT_URL`
- Input validation with Zod
- Role-based access control (OWNER / EDITOR / VIEWER)

---

## Demo Account

After seeding:
- **Email**: demo@syncspace.io
- **Password**: demo123456
