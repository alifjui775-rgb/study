# Architecture Reference — Study Platform

> **⚠️ AI Agent Notice:** Read this document before modifying the Eligibility Checker, GPA
> Calculator, or any component that touches `unit_requirements` or `gpa_calculation_methods`.

---

## Table of Contents

1. [Tech Stack Summary](#tech-stack-summary)
2. [Project Structure](#project-structure)
3. [State Management](#state-management)
4. [Authentication](#authentication)
5. [Eligibility Checker](#eligibility-checker-eligibility-checker)
6. [GPA Calculator](#gpa-calculator-gpa-calculator)
7. [Exam Engine](#exam-engine)
8. [Admin Panel](#admin-panel)
9. [UI Component System](#ui-component-system)
10. [Data Fetching Patterns](#data-fetching-patterns)

---

## Tech Stack Summary

| Concern              | Solution                                      |
| -------------------- | --------------------------------------------- |
| Build tool           | Vite 6                                        |
| UI framework         | React 19                                      |
| Routing              | react-router-dom v7 (SPA, client-side only)   |
| Styling              | Tailwind CSS v4                               |
| Component primitives | Radix UI (via shadcn/ui)                      |
| Data fetching        | Supabase JS SDK + TanStack Query v5           |
| Forms                | react-hook-form v7 + Zod v4                   |
| Date handling        | dayjs                                         |
| Math rendering       | KaTeX                                         |
| Deployment           | Vercel (SPA with `vercel.json` rewrite rules) |

> This is **not** a Next.js project. There are no server components, server actions, or App Router
> constructs. All rendering is client-side.

---

## Project Structure

```
src/
├── app/                     # Page components (file-system-like naming convention)
│   ├── page.tsx             # Landing page (/)
│   ├── eligibility-checker/ # /eligibility-checker
│   ├── gpa-calculator/      # /gpa-calculator
│   ├── university/          # /university
│   ├── dashboard/           # /dashboard (authenticated students)
│   ├── admin/               # /admin (admin panel)
│   ├── course/              # /course/:id
│   ├── self-test/           # /self-test
│   ├── syllabus-tracker/    # /syllabus-tracker
│   ├── login/               # /login
│   └── register/            # /register
├── components/
│   ├── ui/                  # shadcn/ui primitives (do not modify these manually)
│   ├── landing/             # Header, Footer, and landing-page-specific components
│   ├── admin/               # Admin-only components
│   └── university/          # University detail components
├── context/
│   ├── AuthContext.tsx      # Student authentication context
│   └── AdminAuthContext.tsx # Admin authentication context
├── hooks/                   # Custom React hooks
├── layouts/                 # Shared layout wrappers
├── lib/
│   ├── supabase.ts          # Shared Supabase client (single instance)
│   ├── types.ts             # Core shared TypeScript types
│   ├── queries.ts           # Reusable Supabase query functions
│   ├── actions.ts           # Mutation actions
│   └── university-*.ts      # University domain queries and types
└── routes/                  # React Router route definitions
```

---

## State Management

The application uses **React's built-in primitives only** — no external state management library
(no Redux, Zustand, or Jotai).

### Patterns Used

| Pattern        | Where               | Purpose                                       |
| -------------- | ------------------- | --------------------------------------------- |
| `useState`     | All page components | Local component state                         |
| `useMemo`      | Eligibility Checker | Expensive derivation (eligibility evaluation) |
| `useEffect`    | Data fetching       | Side-effect-driven Supabase queries           |
| `useContext`   | Auth, AdminAuth     | Global session state                          |
| `localStorage` | Eligibility Checker | Input persistence across sessions             |
| TanStack Query | Admin panel pages   | Server state caching, background refetch      |

### localStorage Caching (Eligibility Checker)

All student inputs in the Eligibility Checker are persisted to `localStorage` under the key
**`"eligibility_checker_inputs"`**. The object structure is:

```typescript
{
  selectedGroupId: string;
  exclude4thSubject: boolean;
  sscGpa: string;
  hscGpa: string;
  sscYear: string;
  hscYear: string;
  sscGpaWithout4th: string;
  hscGpaWithout4th: string;
  marks: Record<string, string>; // { [short_code]: gradeString }
}
```

**Important:** When adding a new input field to the Eligibility Checker, it must be added to both:

1. The `getCachedValue()` initializer (state declaration with lazy init)
2. The `useEffect` that calls `localStorage.setItem()`

---

## Authentication

### Student Auth (`AuthContext.tsx`)

- Session stored in context, initialized from Supabase auth on mount.
- Protected routes redirect to `/login` if no session.
- `users` table stores student profiles (separate from Supabase Auth users if applicable).

### Admin Auth (`AdminAuthContext.tsx`)

- Separate context for admin users (stored in the `admins` table).
- Admin role is an enum: `'admin'` or `'moderator'`.
- Admin panel at `/admin` checks this context on every protected sub-route.

---

## Eligibility Checker (`/eligibility-checker`)

The most algorithmically complex page in the application. It evaluates a student's eligibility
against potentially hundreds of university/unit/group requirement combinations in real time on
the client.

### Data Loading (Two-Phase)

**Phase 1 — Initial load** (`useEffect` on mount):

1. Fetch all `groups` (HSC groups: Science, Humanities, Commerce, etc.).
2. Fetch ALL `unit_requirements` with nested joins:
   - `admission_units` (unit name, slug, `primary_group_id`)
   - `universities`, `clusters`, `colleges` (institution info + `institution_links`)
   - `unit_requirement_batches → batches` (batch year + `is_current` flag)
3. Fetch `subject_group_seats` for seat count display.

**Phase 2 — On group selection** (`useEffect` on `selectedGroupId`):

- Fetches `subjects` via the `subject_groups` join table for the selected group.
- Populates the dynamic subject marks input list (one input per subject).
- Resets the `marks` state when the group changes.

### Eligibility Evaluation Pipeline (`useMemo`)

The core evaluation runs inside a single `useMemo` that re-computes whenever any input changes.
It is a **pure derivation** — no side effects, no async calls.

```
Input: requirements[], selectedGroupId, sscGpa, hscGpa, sscYear, hscYear, marks, …
         │
         ▼
Step 1: Filter requirements to selected group_id
         │
         ▼
Step 2: Batch Deduplication (Best-Requirement Selection)
        - For each unique unit_id, compute priority score:
          score = hasCurrent ? (10000 + maxYear) : maxYear
        - Keep only the highest-scoring requirement per unit
         │
         ▼
Step 3: Multi-criteria Eligibility Filter
        ├── Year range check (ssc_year_min/max, hsc_year_min/max)
        ├── GPA check (ssc_min_gpa, hsc_min_gpa, total_min_gpa)
        ├── Without-4th-subject GPA check (conditional on toggle)
        ├── subject_requirements JSONB evaluation
        │     (each short_code must meet its minimum GPA)
        └── custom_checks JSONB evaluation
              ├── atLeastNSubjectsWithMinGPA
              ├── remainingSubjectsWithMinGPA
              └── targetSubjectsTotalGPA
         │
         ▼
Step 4: Group eligible requirements by parent institution
        - Resolve institution via Exclusive Arc: universities ?? clusters ?? colleges
        - Assign a UI group key (cluster, general, agri, engineering, sandt, medical,
          special, islamic, affiliated, other)
        - Deduplicate units per institution
        - Collect batch names (Set<string>) per institution
         │
         ▼
Output: Record<string, GroupedInstitution[]>
        (keyed by category, values are institution arrays with eligibleUnits)
```

### UI Grouping & Sort Order

Results are displayed in a fixed category order defined by `groupSortOrder`:

```typescript
const groupSortOrder = [
  "cluster",
  "general",
  "agri",
  "engineering",
  "sandt",
  "medical",
  "special",
  "islamic",
  "affiliated",
  "other",
];
```

**Clusters always appear first.** Within the `'cluster'` group, institutions are sub-sorted by
`cluster_type`: universities (`cluster_type === 'university'`) appear before colleges.

### Dynamic "Group Change" UI Split

`admission_units.primary_group_id` determines which HSC group a unit is "designed for".
When a unit's `primary_group_id` differs from the student's `selectedGroupId`, the UI renders
a special "Group Change Required" indicator — meaning the student would need to appear in a
different subject group for this unit's exam.

---

## GPA Calculator (`/gpa-calculator`)

A simpler, single-page calculator that uses dynamically fetched institution-specific formulas.

### Data Loading

On mount, fetches all rows from `gpa_calculation_methods` with nested institution joins
(Exclusive Arc: `universities`, `clusters`, `colleges`). Results are sorted alphabetically
by institution `name_bn`.

### Calculation Formulas

The calculator supports two `method` types:

#### GPA Method (`method = 'gpa'`)

Student inputs two GPA values. The score is computed as:

```
score = (SSC_GPA × ssc_weight) + (HSC_GPA × hsc_weight)
```

**Validation:** Each GPA must be ≤ `max_gpa` (typically 5.0).

#### Marks Method (`method = 'marks'`)

Student inputs raw marks. The score is normalized against the institution's maximum marks:

```
score = (SSC_marks / ssc_max_marks × ssc_weight)
      + (HSC_marks / hsc_max_marks × hsc_weight)
```

**Validation:** `ssc_max_marks` and `hsc_max_marks` must be > 0; marks may not exceed their
respective maximums.

The result display also breaks down the SSC and HSC contribution individually. The `notes` field
from the database is shown beneath the calculator if present.

---

## Exam Engine

### Exam Configuration (in `exams` table)

- `marks_per_question`: default 1, can be fractional.
- `negative_marks_per_wrong`: default 0.25.
- `mandatory_subjects` / `optional_subjects`: JSONB arrays of `{subject_id, question_count}`.
- `shuffle_sections_only` / `shuffle_questions`: control randomization behavior.

### Score Formula

```
score = (correct_answers × marks_per_question)
      - (wrong_answers × negative_marks_per_wrong)
```

This formula is applied both in real time (client) and enforced via a SQL migration for
historical score recalculation.

---

## Admin Panel

The admin panel (`/admin`) is a full CRUD interface for managing:

- Batches, exams, questions (via `src/lib/admin-crud-queries.ts`)
- University data, clusters, colleges (via `src/lib/university-admin-queries.ts`,
  `cluster-admin-queries.ts`, `college-admin-queries.ts`)
- University events and schedules (via `src/lib/university-events-queries.ts`)
- Institution management (via `src/lib/university-manage-queries.ts`)

All admin mutations use **TanStack Query** (`useMutation`) for cache invalidation and
optimistic UI. Queries use `useQuery` with appropriate `queryKey` arrays.

---

## UI Component System

Components follow the **shadcn/ui** pattern:

- Base primitives live in `src/components/ui/` (generated by shadcn CLI, do not edit manually
  unless extending behavior).
- Composed components live in `src/components/` (e.g., `ExamCard.tsx`, `SyllabusTracker.tsx`).
- Icons come exclusively from `lucide-react`.

### Category Icon Mapping (Eligibility Checker)

```typescript
const categoryMapping = {
  cluster: { label: "গুচ্ছ", icon: LayoutGrid },
  general: { label: "সাধারণ", icon: Building2 },
  agri: { label: "কৃষি", icon: Leaf },
  engineering: { label: "প্রকৌশল", icon: Settings },
  sandt: { label: "বিজ্ঞান ও প্রযুক্তি", icon: Atom },
  medical: { label: "মেডিকেল", icon: HeartPulse },
  special: { label: "বিশেষ", icon: Sparkles },
  islamic: { label: "ইসলামী", icon: Moon },
  affiliated: { label: "অধিভুক্ত", icon: Building },
  other: { label: "অন্যান্য", icon: Info },
};
```

---

## Data Fetching Patterns

### Direct Supabase (page-level, simple reads)

Used in public-facing pages (Eligibility Checker, GPA Calculator, University listing). Queries
run inside `useEffect` on mount, storing results in local `useState`.

```typescript
const { data, error } = await supabase
  .from("table_name")
  .select("col1, col2, related_table(col_a, col_b)")
  .eq("some_column", value);
```

### TanStack Query (admin panel, mutations)

Admin pages use `useQuery` / `useMutation` for server state management, automatic refetching,
and cache invalidation.

### Shared Query Functions (`src/lib/queries.ts`)

Reusable query functions are extracted to `src/lib/queries.ts` and domain-specific files
(`university-queries.ts`, etc.) rather than defined inline in components. New reusable queries
should follow this pattern.
