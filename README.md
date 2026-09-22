# Study Platform

A comprehensive **university admission preparation platform** for Bangladeshi students — featuring
an eligibility checker, GPA calculator, exam practice, attendance tracking, and syllabus management,
all powered by a Supabase backend.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- `pnpm` (preferred) or `npm`

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root with the following keys:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Run Development Server

```bash
pnpm dev
# or
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

---

## Tech Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Framework  | Vite + React 19 (SPA, no SSR)              |
| Router     | react-router-dom v7                        |
| UI         | shadcn/ui (Radix UI + Tailwind CSS v4)     |
| Database   | Supabase (PostgreSQL)                      |
| Data Layer | @tanstack/react-query + direct supabase-js |
| Forms      | react-hook-form + Zod                      |
| Deployment | Vercel (vercel.json configured)            |

---

## Documentation Index

> For AI agents: read `.cursorrules` first, then the relevant doc below.

| Document                                        | Purpose                                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [📊 docs/DATABASE.md](docs/DATABASE.md)         | Full schema reference, table relationships, JSONB structures, batch/fallback logic, and the "Exclusive Arc" pattern. **Read before any DB work.** |
| [🏗️ docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Frontend architecture, state management patterns, Eligibility Checker algorithm, and GPA Calculator formula breakdown.                            |
| [📋 CHANGELOG.md](CHANGELOG.md)                 | Version history. Updated on every feature change.                                                                                                 |

---

## Key Features

- **Eligibility Checker** — Real-time university eligibility based on GPA, HSC group, passing year,
  and subject-level marks. Supports the Exclusive Arc (university / cluster / college) and batch
  fallback logic.
- **GPA Calculator** — Calculates institution-specific pre-admission GPA scores using dynamically
  fetched `gpa_calculation_methods` from the database.
- **Exam Practice** — Timed mock exams with negative marking, shuffling, mandatory/optional
  subject sections, and per-question marks configuration.
- **Batch Management** — Admin panel to create/manage batches, assign students, and track
  attendance and tasks.
- **Syllabus Tracker** — Chapter-level progress tracking per subject.
