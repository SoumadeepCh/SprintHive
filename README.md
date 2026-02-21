<![CDATA[<div align="center">

# ⬡ SprintHive

**A modern, full-stack team task & sprint management platform**

Built with **Next.js 16** · **Prisma 5** · **PostgreSQL** · **Tailwind CSS 4**

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## ✨ What is SprintHive?

SprintHive is a **Jira-lite** project management app designed to showcase deep relational data modeling, ORM expertise, and a polished dark-themed UI. It lets teams organize work across **Organizations → Projects → Sprints → Tasks**, with real-time Kanban boards, rich analytics dashboards, full-text search, and query performance monitoring — all without external charting or state-management libraries.

---

## 🎯 Features

### Core Workflow
- **Multi-tenant organizations** — Create orgs, invite team members, scope all data per-org
- **Project & sprint lifecycle** — Create projects, manage sprints (start / end dates, active toggling)
- **Kanban sprint board** — Drag tasks through `TODO → IN_PROGRESS → REVIEW → DONE` status columns
- **Task management** — CRUD with priority levels (Low / Medium / High / Urgent), assignments, due dates, comments, and labels
- **Many-to-many labels** — Color-coded labels per project, attached to tasks via join table

### Analytics & Insights
- **Sprint velocity** — Bar chart comparing completed vs total tasks per sprint
- **Status breakdown** — SVG donut chart of task distribution by status
- **Team workload** — Horizontal stacked bars showing each member's task load by status
- **Burn-down chart** — Remaining vs ideal line chart for the active sprint
- **KPI tiles** — Completion rate, high-priority open count, avg tasks per sprint

### Advanced Capabilities
- **Full-text search** — PostgreSQL-powered search across tasks, projects, and sprints with highlighting
- **Sprint timeline (Gantt-lite)** — Visual timeline of all sprints with date ranges on an SVG axis
- **Optimistic concurrency** — Version-based conflict detection on task updates
- **Soft deletes** — `deletedAt` column with filtered queries (no data loss)
- **Cursor pagination** — Efficient keyset-based pagination for task lists
- **Query performance logs** — Prisma middleware captures every query with duration, slow-query flagging (> 200 ms), and per-model/operation aggregated stats
- **Client-side cache** — In-memory stale-while-revalidate cache with TTL for instant page transitions

### UI / UX
- **Dark glassmorphism theme** — Deep purple/black palette with `backdrop-filter: blur`, gradient accents, and custom scrollbars
- **Inter font** — Google Fonts Inter with multiple weights
- **Zero external UI libraries** — All charts (bar, donut, burndown, workload) are hand-rolled SVG
- **Micro-animations** — Fade-in, modal scale, skeleton shimmer, refresh pulse dot
- **Responsive grid layouts** — Auto-fill organization cards, kanban columns, analytics grids

---

## 🗄️ Database Schema

SprintHive uses **8 Prisma models** with rich relationships:

```
Organization ──┬── 1:N ──→ User      (members)
               ├── 1:N ──→ Project
               └── Owner (User)

Project ───────┬── 1:N ──→ Sprint
               └── 1:N ──→ Label

Sprint ────────┬── 1:N ──→ Task

Task ──────────┬── N:1 ──→ User (creator)
               ├── N:1 ──→ User (assignee)
               ├── 1:N ──→ Comment
               └── M:N ──→ Label (via TaskLabel join table)

Comment ───────┬── N:1 ──→ User
```

**Enums:** `TaskStatus` (TODO, IN_PROGRESS, REVIEW, DONE) · `TaskPriority` (LOW, MEDIUM, HIGH, URGENT)

**Indexes:** Composite indexes on `(sprintId, status)`, `(assigneeId, status)`, `(sprintId, deletedAt, createdAt)` for optimized querying.

---

## 📁 Project Structure

```
sprinthive/
├── app/
│   ├── page.tsx                       # Dashboard — org list + stats
│   ├── layout.tsx                     # Root layout, Inter font
│   ├── globals.css                    # Design tokens, glassmorphism, kanban, modals
│   ├── orgs/[id]/page.tsx             # Org detail — projects, members
│   ├── projects/[id]/page.tsx         # Project detail — sprints, labels
│   ├── projects/[id]/timeline/page.tsx # Sprint timeline (Gantt-lite)
│   ├── sprints/[id]/page.tsx          # Kanban board — task cards, status columns
│   ├── tasks/page.tsx                 # Global task browser with filters
│   ├── search/page.tsx                # Full-text search across all entities
│   ├── analytics/[id]/page.tsx        # Analytics dashboard (velocity, donut, burndown)
│   ├── logs/page.tsx                  # Query performance monitor
│   └── api/
│       ├── orgs/                      # CRUD + org-by-id
│       ├── projects/                  # CRUD + project-by-id
│       ├── sprints/                   # CRUD + sprint-by-id (activate, deactivate)
│       ├── tasks/                     # CRUD + task-by-id (status transitions, concurrency)
│       ├── comments/                  # Create comments on tasks
│       ├── labels/                    # Create labels for projects
│       ├── users/                     # User listing
│       ├── search/                    # Full-text search endpoint
│       ├── logs/                      # Query log + stats endpoint
│       └── analytics/
│           ├── summary/               # KPI summary for a project
│           ├── velocity/              # Sprint velocity data
│           ├── status/                # Task status distribution
│           ├── workload/              # Per-user workload breakdown
│           └── burndown/              # Burn-down series for active sprint
├── lib/
│   ├── prisma.ts                      # Prisma singleton + query logging middleware
│   └── cache.ts                       # Client-side in-memory cache with TTL
├── prisma/
│   └── schema.prisma                  # Full schema with 8 models, enums, indexes
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** running locally or a remote connection string
- **npm** (or pnpm / yarn)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/sprinthive.git
cd sprinthive

# 2. Install dependencies
npm install

# 3. Configure environment
#    Create a .env file with your PostgreSQL connection string:
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/sprinthive"' > .env

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Generate Prisma client
npx prisma generate

# 6. Start the dev server
npm run dev
```

The app will be running at **http://localhost:3000**.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server with hot-reload |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma Studio to browse your database |
| `npx prisma migrate dev` | Apply pending migrations |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router) | Server components, API routes, file-based routing |
| **ORM** | Prisma 5 | Type-safe queries, migrations, client extensions |
| **Database** | PostgreSQL | Relational integrity, full-text search, indexes |
| **Styling** | Tailwind CSS 4 + Vanilla CSS | Design tokens, glassmorphism, zero runtime |
| **Language** | TypeScript 5 | End-to-end type safety |
| **Font** | Inter (Google Fonts) | Clean, modern typography |
| **Charts** | Hand-rolled SVG | No external charting dependencies |
| **Caching** | Custom in-memory (client) | Stale-while-revalidate for instant UI |

---

## 🧠 ORM & Database Patterns Demonstrated

This project showcases production-ready patterns:

- **Multi-tenancy** — All queries scoped to `organizationId`
- **Self-referential relations** — `User` as both task creator and assignee
- **Many-to-many** — Labels ↔ Tasks via explicit join table (`TaskLabel`)
- **Enum-based state machine** — `TODO → IN_PROGRESS → REVIEW → DONE`
- **Optimistic concurrency control** — `version` column checked on every update
- **Soft deletes** — `deletedAt` timestamp with `WHERE deletedAt IS NULL` filtering
- **Composite indexes** — Covering indexes for common query patterns
- **Prisma Client Extensions** — Query middleware for automatic performance logging
- **Cursor pagination** — Keyset pagination using `createdAt` for large datasets
- **Aggregation queries** — `groupBy`, counts, and raw SQL for analytics

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ☕ and 🎧 by [Soumadeep](https://github.com/your-username)**

</div>
]]>
