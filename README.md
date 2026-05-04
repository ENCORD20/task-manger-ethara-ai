# Task Manager

A full-stack task and project management app. **Admins** own projects: they create projects and tasks, assign work, edit details, and manage trash (soft delete → restore workflows with permanent purge). **Members** browse projects and task boards they can access, see tasks assigned to them, and update **status** on tasks assigned to them. Authentication uses **JWT** (Bearer token) stored in **`sessionStorage`** on the client.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| **Frontend** | [React](https://react.dev) 19, [TypeScript](https://www.typescriptlang.org), [Vite](https://vite.dev) 8 |
| **Routing** | [React Router](https://reactrouter.com) 7 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) v4 (`@tailwindcss/vite`) |
| **Backend** | [Node.js](https://nodejs.org), [Express](https://expressjs.com) 5 |
| **Database** | [MongoDB](https://www.mongodb.com) via [Mongoose](https://mongoosejs.com) |
| **Auth** | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |

---

## Project structure

```
task-manager/
├── src/                           # Frontend (Vite + React)
│   ├── main.tsx                   # React entry
│   ├── App.tsx
│   ├── index.css                  # Tailwind / global styles
│   ├── router/
│   │   └── index.tsx              # Route definitions (login, dashboards, project detail)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx          # Admin dashboard (projects, trash, profile)
│   │   ├── MemberDashboard.tsx     # Member dashboard (projects, assignments, trash view, profile)
│   │   └── ProjectDetails.tsx     # Single project + task board (Kanban-style UI)
│   └── assets/
├── server/                        # Backend (Express)
│   ├── index.js                   # App bootstrap, MongoDB connect, route mounting
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verify (`authenticate`), role guard (`authorize`)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   └── taskRoutes.js
│   ├── controller/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   └── taskController.js
│   └── model/
│       ├── User.js
│       ├── Project.js
│       └── Task.js
├── package.json                   # Frontend dependencies & scripts
├── vite.config.ts
├── tsconfig.json
└── server/package.json           # Backend dependencies & scripts
```

---

## API overview

Base path: **`/api`**. Protected routes expect:

```http
Authorization: Bearer <JWT>
```

JSON bodies use `Content-Type: application/json` unless noted.

### Root

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | Plain-text health: “Task Manager API is running”. |

---

### Authentication — `/api/auth`

| Method | Path | Roles | Description |
|--------|------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Register. Body: `username`, `password`, optional `role` (`admin` \| `member`). Defaults to `member` if omitted. Returns `token` + `user`. |
| `POST` | `/api/auth/login` | Public | Login. Body: `username`, `password`. Returns `token` + `user`. |
| `GET` | `/api/auth/profile` | Any authenticated user | Current user profile (password omitted). |
| `PUT` | `/api/auth/profile` | Any authenticated user | Update `username`, optional `password`, optional `profilePicture`. |
| `GET` | `/api/auth/users` | **Admin** | List users (`username`, `role`, `profilePicture`) — used when assigning tasks. |
| `GET` | `/api/auth/admin-dashboard` | **Admin** | Demo route returning `{ message: 'Welcome to the admin dashboard!' }`. |
| `GET` | `/api/auth/tasks` | **Admin** or **Member** | Demo route returning `{ message: 'List of tasks here.' }`. |

---

### Projects — `/api/projects`

All routes require authentication (`authenticate` middleware).

| Method | Path | Roles / rules | Description |
|--------|------|----------------|-------------|
| `GET` | `/api/projects` | Authenticated | List active projects (`isDeleted: false`), with `owner` and `members` populated. |
| `GET` | `/api/projects/trash` | Authenticated | List soft-deleted projects. |
| `DELETE` | `/api/projects/trash/empty` | **Admin** | Hard-delete **all** trashed projects and their tasks. |
| `DELETE` | `/api/projects/trash/:id` | **Admin** | Permanently delete one trashed project (and related tasks). |
| `GET` | `/api/projects/:id` | Authenticated | One project detail (must not be soft-deleted). |
| `POST` | `/api/projects` | **Admin** | Create project. Body: `name`, `description`, optional `members[]` (user IDs). Owner = current user. |
| `PUT` | `/api/projects/:id` | **Admin** | Update project; controller allows only if **`owner`** is the current user. |
| `DELETE` | `/api/projects/:id` | **Admin** | Soft-delete project (and soft-delete its tasks); owner must match current user. |

---

### Tasks — `/api/tasks`

All routes require authentication.

| Method | Path | Roles / rules | Description |
|--------|------|----------------|-------------|
| `GET` | `/api/tasks/trash` | Authenticated | List soft-deleted tasks. |
| `DELETE` | `/api/tasks/trash/empty` | **Admin** | Hard-delete **all** trashed tasks. |
| `DELETE` | `/api/tasks/trash/:id` | **Admin** | Permanently delete one trashed task. |
| `GET` | `/api/tasks/assigned` | Authenticated | Tasks assigned to the **current user** (`assignedTo`), not deleted. |
| `GET` | `/api/tasks/project/:projectId` | Authenticated | Active tasks for a project (`isDeleted: false`). |
| `POST` | `/api/tasks/project/:projectId` | **Admin** | Create task under project owned by current user. Body: `title`, `description`, `assignedTo`, `dueDate`, `priority`. |
| `PATCH` | `/api/tasks/:id/status` | **Admin** (project owner) **or** assignee | Body: `status`. |
| `PUT` | `/api/tasks/:id` | **Admin** with project ownership | Full field updates (`title`, `description`, `assignedTo`, `dueDate`, `status`, …). |
| `DELETE` | `/api/tasks/:id` | **Admin** with project ownership | Soft-delete task. |

---

## Who can do what (summary)

Rough matrix aligned with the **backend**. The UI hides some actions from members, but the API is the source of truth.

| Capability | Member | Admin |
|------------|:------:|:-----:|
| Register / Login | ✅ | ✅ |
| View/update own profile | ✅ | ✅ |
| List all active projects | ✅ | ✅ |
| View project detail & project tasks | ✅ | ✅ |
| Create / update / delete **projects** | ❌ | ✅ (update/delete **own** projects only) |
| Empty project trash / permanent delete projects | ❌ | ✅ |
| Create tasks | ❌ | ✅ (on **own** projects) |
| Update task fields (except via status PATCH rules) | ❌ | ✅ (project **owner**) |
| `PATCH …/tasks/:id/status` | ✅ if assigned to task | ✅ if owner of parent project |
| Soft-delete tasks | ❌ | ✅ (project owner) |
| Empty task trash / permanent delete tasks | ❌ | ✅ |
| List users (`GET /api/auth/users`) | ❌ | ✅ |
| See “assigned to me” tasks | ✅ | ✅ (admin UI also loads assigned tasks) |

**Notes**

- JWT payload contains `id` and `role` (`admin` or `member`).
- Registration accepts an optional `role`; the frontend lets users pick **member** or **admin** — treat production sign-up accordingly (e.g. restrict who can create admins).
- `authorize('admin')` only checks role; controllers additionally enforce **project owner** for many admin mutations.

---

## Database schema (MongoDB / Mongoose)

MongoDB databases are logical containers; Mongoose maps models to collections as below.

### `User` → collection **`admin-member`**

| Field | Type | Notes |
|-------|------|--------|
| `_id` | ObjectId | |
| `username` | String | Required, unique, trimmed |
| `password` | String | Stored hashed (`bcrypt`; `pre('save')` hook) |
| `role` | String | `'admin'` \| `'member'`, default `'member'` |
| `profilePicture` | String | Default `''` |
| `createdAt`, `updatedAt` | Date | From `timestamps: true` |

### `Project` → collection **`projects`** (default pluralization)

| Field | Type | Notes |
|-------|------|--------|
| `name` | String | Required |
| `description` | String | Optional |
| `owner` | ObjectId → User | Required |
| `members` | ObjectId[] → User | Optional team list |
| `status` | String | `'active'` \| `'completed'`, default `'active'` |
| `isDeleted` | Boolean | Soft-delete flag, default `false` |
| `createdAt`, `updatedAt` | Date | |

### `Task` → collection **`tasks`**

| Field | Type | Notes |
|-------|------|--------|
| `title` | String | Required |
| `description` | String | Optional |
| `project` | ObjectId → Project | Required |
| `assignedTo` | ObjectId → User | Optional (`null`) |
| `priority` | String | `'Low'` \| `'Mid'` \| `'High'`, default `'Low'` |
| `status` | String | `'todo'` \| `'in_progress'` \| `'done'`, default `'todo'` |
| `dueDate` | Date | Optional |
| `isDeleted` | Boolean | Default `false` |
| `createdAt`, `updatedAt` | Date | |

---

## Running locally

### Prerequisites

- [Node.js](https://nodejs.org) (current LTS recommended)
- A MongoDB instance (e.g. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or local `mongod`)

### 1. Backend (`server`)

```bash
cd server
npm install
```

Create `server/.env`:

```env
MONGODB_URI=mongodb+srv://...your-connection-string...
JWT_SECRET=use-a-long-random-secret-in-production
PORT=5000
```

Start the API:

```bash
npm start
```

The server prints when MongoDB connects and listens on **`PORT`** (default **5000**). Without `MONGODB_URI`, the process exits immediately by design (`index.js`).

### 2. Frontend (repo root)

```bash
# from repository root (parent of server/)
npm install
npm run dev
```

Vite prints a local URL (typically **http://localhost:5173**).

### 3. Client ↔ API URLs

Requests use **`src/apiUrl.ts`**: **`VITE_API_URL`** when set at build time, otherwise **`http://localhost:5000`**. Override locally with **`/.env.local`** (see `.env.example` at repo root). The API enables broad **`cors()`** so a separate HTTPS frontend hostname is OK.

---

## Deployment on Vercel (frontend + backend, from scratch)

Use **two Vercel projects** from the same GitHub repo. Deploy the **backend first** so you know the API URL for the frontend env var.

### Prerequisite: MongoDB Atlas

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Database Access** → database user + password.
3. **Network Access** → **`0.0.0.0/0`** (or restrict later).
4. **Connect** → copy the **`mongodb+srv://...`** URI into `server/.env` locally and into Vercel as **`MONGODB_URI`** (replace `<password>`).

### Project A — API (backend)

| Vercel setting | Value |
|----------------|--------|
| **Root Directory** | `server` |
| **Framework Preset** | Other |
| **Build Command** | *leave empty* (or `npm install` if forced) |
| **Output Directory** | *leave empty* |
| **Install Command** | `npm install` (default) |

**Environment variables (Production — and Preview if you use previews):**

| Name | Purpose |
|------|--------|
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | Long random string (signing JWTs; use a strong value in prod) |

**Do not rely on committing `server/.env`** — set these only in Vercel.

After deploy, open **`https://<your-api>.vercel.app/`** — you should see **`Task Manager API is running`**.  
All JSON routes stay under **`/api/...`** (same origin as this host).

**Config files used only for this project** (inside `server/`): `server/vercel.json` (routes everything to **`api/index.js`** serverless entry), `server/api/index.js`, `server/app.js`, `server/db.js`.

### Project B — SPA (frontend)

| Vercel setting | Value |
|----------------|--------|
| **Root Directory** | `.` (repository root — leave blank if whole repo is the project) |
| **Framework Preset** | Vite (auto-detected) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

**Environment variables:**

| Name | Value |
|------|--------|
| `VITE_API_URL` | **HTTPS** backend URL **only**, e.g. `https://<your-api>.vercel.app` — **no trailing slash** |

Vite replaces `VITE_*` **at build time**. After changing it, trigger a **new deployment** so the frontend rebuilds.

**Config files used for SPA routing:** **`vercel.json`** at repo root (rewrites to **`index.html`** for React Router).

### Order of operations

1. Push this repo to GitHub.
2. Create **backend** project → Root **`server`** → add **`MONGODB_URI`**, **`JWT_SECRET`** → Deploy → copy Production URL.
3. Create **frontend** project → root **`/`** → add **`VITE_API_URL`** = backend URL → Deploy.
4. Test: open frontend → **Login** / **Register** → Network tab shows requests to the **backend** host, not `localhost`.

---

## Deployment on Railway

Typical split: **one service for the API** and **one static service** for the Vite build (or host the SPA elsewhere).

### Backend service

1. New **Railway** project → **Deploy** from GitHub (or CLI).
2. Set **Root Directory** to `server`.
3. **Build**: `npm install` (Railway/Nixpacks usually infers this).
4. **Start**: use Node directly for production reliability, e.g. **`node index.js`**, instead of `nodemon` if you adjust `server/package.json` scripts accordingly.
5. **Variables**:  
   - `MONGODB_URI` — Atlas or Railway MongoDB plugin connection string  
   - `JWT_SECRET` — strong random string  
   - **`PORT`** is normally provided by Railway; the app already uses `process.env.PORT`.

Ensure Atlas **Network Access** allows Railway’s egress IPs if applicable (or use `0.0.0.0/0` for testing only).

### Frontend service (static)

1. Root directory: repository root (`task-manager`).
2. **Build command**: `npm install && npm run build` → output in `dist/`.
3. Publish `dist/` as a static site. Configure SPA fallback so client routes (`/dashboard`, `/project/:id`, …) serve `index.html`.
4. Update API base URLs from `http://localhost:5000` to your Railway API **public URL** (or introduce `VITE_API_URL` at build time and rebuild).

---

## Frontend routes (SPA)

| Path | Typical user |
|------|----------------|
| `/login` | All |
| `/register` | All |
| `/dashboard` | **Admin** (members are redirected away) |
| `/member-dashboard` | **Members** (admins redirected away) |
| `/project/:id` | Authenticated users with project/task UI based on role |

---

## Scripts reference

| Location | Command | Purpose |
|----------|---------|---------|
| Root | `npm run dev` | Vite dev server |
| Root | `npm run build` | Typecheck + production bundle to `dist/` |
| Root | `npm run preview` | Preview production build locally |
| `server/` | `npm start` | Runs `nodemon index.js` (dev-friendly) |