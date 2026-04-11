<div align="center">

# SprintHive

### Modern full-stack sprint & task management platform (Jira-lite)

Built with **Next.js · Prisma · PostgreSQL · Tailwind**

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql\&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss\&logoColor=white)

</div>

---

## Overview

SprintHive is a **multi-tenant project management platform** designed to demonstrate advanced relational modeling, ORM patterns, and polished UI engineering.

Teams organize work across:

```
Organization → Project → Sprint → Task
```

The platform includes Kanban workflows, analytics dashboards, full-text search, performance logging, and custom SVG data visualization — all without external charting libraries.

---

## Core Features

### Workflow

* Multi-tenant organizations with member invitations
* Project and sprint lifecycle management
* Kanban sprint board (`TODO → IN_PROGRESS → REVIEW → DONE`)
* Task CRUD with priority, due dates, comments, and assignments
* Many-to-many labels with project scoping

### Analytics

* Sprint velocity tracking
* Status distribution donut chart
* Team workload visualization
* Sprint burndown chart
* KPI tiles (completion rate, priority insights)

### Advanced Engineering

* PostgreSQL full-text search with highlighting
* Sprint timeline (Gantt-lite SVG)
* Optimistic concurrency via versioning
* Soft deletes using `deletedAt`
* Cursor pagination (keyset)
* Prisma query performance middleware
* Client-side stale-while-revalidate cache

### UI / UX

* Dark glassmorphism design system
* Custom SVG charts (zero chart libraries)
* Micro-interactions and skeleton loading
* Responsive grid + kanban layouts

---

## Database Design

SprintHive uses **8 Prisma models** with rich relational mapping.

```
Organization ──┬── User
               ├── Project
               └── Owner (User)

Project ───────┬── Sprint
               └── Label

Sprint ────────┬── Task

Task ──────────┬── Creator (User)
               ├── Assignee (User)
               ├── Comment
               └── Label (M:N via TaskLabel)
```

Enums:

```
TaskStatus   → TODO | IN_PROGRESS | REVIEW | DONE
TaskPriority → LOW | MEDIUM | HIGH | URGENT
```

Indexes:

* `(sprintId, status)`
* `(assigneeId, status)`
* `(sprintId, deletedAt, createdAt)`

---

## Project Structure

```
sprinthive/
├── app/
│   ├── orgs/              # Organization views
│   ├── projects/          # Project + timeline
│   ├── sprints/           # Kanban board
│   ├── analytics/         # Metrics dashboards
│   ├── search/            # Full-text search
│   ├── logs/              # Query performance monitor
│   └── api/               # REST endpoints
├── lib/
│   ├── prisma.ts          # Prisma singleton + logging
│   └── cache.ts           # Client cache
├── prisma/
│   └── schema.prisma
```

---

## Project Docs

Additional project-facing documentation lives in `docs/`:

* `docs/INTERVIEW_GUIDE.md` - how to explain the architecture, flows, and technical decisions in interviews
* `docs/FIGMA_HANDOFF.md` - design-system and screen handoff notes for building a matching Figma file

---

## Getting Started

### Prerequisites

* Node.js ≥ 18
* PostgreSQL database
* npm / pnpm / yarn

### Installation

```bash
git clone https://github.com/your-username/sprinthive.git
cd sprinthive

npm install

echo 'DATABASE_URL="postgresql://user:password@localhost:5432/sprinthive"' > .env

npx prisma migrate dev --name init
npx prisma generate

npm run dev
```

App runs at:

```
http://localhost:3000
```

---

## Scripts

| Command                | Purpose                  |
| ---------------------- | ------------------------ |
| npm run dev            | Start development server |
| npm run build          | Production build         |
| npm run start          | Start production server  |
| npm run lint           | Run ESLint               |
| npx prisma studio      | DB GUI                   |
| npx prisma migrate dev | Apply migrations         |

---

## Tech Stack

| Layer     | Tech                       |
| --------- | -------------------------- |
| Framework | Next.js (App Router)       |
| ORM       | Prisma                     |
| Database  | PostgreSQL                 |
| Styling   | Tailwind CSS + Vanilla CSS |
| Language  | TypeScript                 |
| Charts    | Custom SVG                 |
| Caching   | In-memory SWR pattern      |

---

## Engineering Patterns Demonstrated

* Multi-tenant data isolation
* Explicit many-to-many modeling
* Enum-driven state machine workflow
* Optimistic concurrency control
* Soft delete architecture
* Composite indexing strategy
* Prisma client extensions
* Cursor pagination
* Aggregation & analytics queries

---

## License

MIT License

---

<div align="center">

Built by Soumadeep

</div>
