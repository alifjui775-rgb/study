# Database Reference — Study Platform

> **⚠️ AI Agent Notice:** Always read this file in full before writing any Supabase query, SQL
> migration, or TypeScript type that references a database column. Do NOT guess column names.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Schema Tables](#core-schema-tables)
3. [The "Exclusive Arc" Pattern](#the-exclusive-arc-pattern)
4. [Subject Domain Refactoring](#subject-domain-refactoring)
5. [Batch & Fallback Logic](#batch--fallback-logic)
6. [JSONB Structures](#jsonb-structures)
7. [Indexes](#indexes)
8. [Enum Types](#enum-types)

---

## Overview

The database is hosted on **Supabase (PostgreSQL)**. The schema currently contains **54+ tables**
in a heavily normalized design. Three major functional domains exist:

| Domain                   | Tables (examples)                                                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Users & Auth**         | `users`, `admins`                                                                                                                                                                                                                                                                |
| **Courses & Exams**      | `batches`, `exams`, `student_exams`, `student_attendance`, `student_tasks`                                                                                                                                                                                                       |
| **University Admission** | `universities`, `clusters`, `colleges`, `admission_units`, `unit_requirements`, `groups`, `study_disciplines`, `curriculum_papers`, `degree_programs`, `gpa_calculation_methods`, `unit_requirement_batches`, `subject_groups`, `subject_group_seats`, `institution_subjects`, … |

All UUID primary keys use `extensions.uuid_generate_v4()`. All timestamps are stored as
`timestamp with time zone` defaulting to `timezone('utc', now())`.

---

## Core Schema Tables

### `users`

| Column             | Type          | Notes                            |
| ------------------ | ------------- | -------------------------------- |
| `uid`              | `uuid` PK     | Auto-generated                   |
| `name`             | `text`        | Display name                     |
| `roll`             | `text` UNIQUE | Student roll number              |
| `pass`             | `text`        | Hashed password                  |
| `enrolled_batches` | `uuid[]`      | Array of batch IDs (GIN-indexed) |
| `created_at`       | `timestamptz` |                                  |

### `batches`

| Column        | Type            | Notes                     |
| ------------- | --------------- | ------------------------- |
| `id`          | `uuid` PK       |                           |
| `name`        | `text` NOT NULL | Batch display name        |
| `description` | `text`          |                           |
| `icon_url`    | `text`          |                           |
| `is_public`   | `boolean`       | Default `false`           |
| `status`      | `text`          | CHECK `'live'` or `'end'` |

### `exams`

| Column                     | Type                  | Notes                                     |
| -------------------------- | --------------------- | ----------------------------------------- |
| `id`                       | `uuid` PK             |                                           |
| `name`                     | `text` NOT NULL       |                                           |
| `batch_id`                 | `uuid` FK → `batches` | CASCADE delete                            |
| `duration_minutes`         | `integer`             | Default 120                               |
| `negative_marks_per_wrong` | `numeric`             | Default 0.25                              |
| `marks_per_question`       | `numeric`             | Default 1, NOT NULL                       |
| `is_practice`              | `boolean`             |                                           |
| `start_at` / `end_at`      | `timestamptz`         | Scheduled window                          |
| `shuffle_sections_only`    | `boolean`             |                                           |
| `shuffle_questions`        | `boolean`             |                                           |
| `total_subjects`           | `int2`                |                                           |
| `mandatory_subjects`       | `jsonb`               | See [JSONB Structures](#jsonb-structures) |
| `optional_subjects`        | `jsonb`               | See [JSONB Structures](#jsonb-structures) |

### `student_exams`

| Column            | Type                | Notes                                                          |
| ----------------- | ------------------- | -------------------------------------------------------------- |
| `id`              | `uuid` PK           |                                                                |
| `exam_id`         | `uuid` FK → `exams` |                                                                |
| `student_id`      | `uuid` FK → `users` |                                                                |
| `score`           | `numeric`           | Computed: `(correct × marks_per_q) - (wrong × negative_marks)` |
| `correct_answers` | `integer`           |                                                                |
| `wrong_answers`   | `integer`           |                                                                |
| `unattempted`     | `integer`           |                                                                |
| `submitted_at`    | `timestamptz`       |                                                                |

> **UNIQUE constraint:** `(student_id, exam_id)` — a student can only submit once per exam.

### `unit_requirements`

The central table driving the Eligibility Checker. Each row encodes the admission requirement for
one HSC group within one admission unit of one institution.

| Column                          | Type                          | Notes                                                                      |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| `id`                            | `uuid` PK                     |                                                                            |
| `university_id`                 | `uuid` FK → `universities`    | Exclusive Arc — only one non-null                                          |
| `cluster_id`                    | `uuid` FK → `clusters`        | Exclusive Arc                                                              |
| `college_id`                    | `uuid` FK → `colleges`        | Exclusive Arc                                                              |
| `unit_id`                       | `uuid` FK → `admission_units` |                                                                            |
| `group_id`                      | `uuid` FK → `groups`          | HSC group (Science/Humanities/Commerce)                                    |
| `ssc_min_gpa`                   | `numeric`                     | Minimum SSC GPA (with 4th subject)                                         |
| `hsc_min_gpa`                   | `numeric`                     | Minimum HSC GPA (with 4th subject)                                         |
| `total_min_gpa`                 | `numeric`                     | Minimum SSC + HSC combined                                                 |
| `ssc_min_gpa_without_4th`       | `numeric`                     | Optional — only set if institution demands it                              |
| `hsc_min_gpa_without_4th`       | `numeric`                     | Optional                                                                   |
| `total_min_gpa_without_4th`     | `numeric`                     | Optional                                                                   |
| `ssc_year_min` / `ssc_year_max` | `integer`                     | Allowed SSC passing year range (nullable = no restriction)                 |
| `hsc_year_min` / `hsc_year_max` | `integer`                     | Allowed HSC passing year range (nullable = no restriction)                 |
| `requirement_text`              | `text`                        | Human-readable note for the UI                                             |
| `subject_requirements`          | `jsonb`                       | Per-discipline minimum GPA map. See [JSONB Structures](#jsonb-structures). |
| `custom_checks`                 | `jsonb`                       | Advanced rule array. See [JSONB Structures](#jsonb-structures).            |

### `admission_units`

| Column             | Type      | Notes                                                                          |
| ------------------ | --------- | ------------------------------------------------------------------------------ |
| `id`               | `uuid` PK |                                                                                |
| `unit_name_bn`     | `text`    | Bengali name (e.g., "ক ইউনিট")                                                 |
| `unit_name_en`     | `text`    | English name                                                                   |
| `unit_slug`        | `text`    | URL-safe identifier                                                            |
| `primary_group_id` | `uuid`    | The group for which this unit is "primary"; drives the "Group Change" UI split |

### `gpa_calculation_methods`

Applies the same **Exclusive Arc** pattern (university / cluster / college). Each row defines how
an institution converts SSC + HSC scores into a pre-admission GPA.

| Column          | Type      | Notes                                                  |
| --------------- | --------- | ------------------------------------------------------ |
| `id`            | `uuid` PK |                                                        |
| `university_id` | `uuid`    | Exclusive Arc                                          |
| `cluster_id`    | `uuid`    | Exclusive Arc                                          |
| `college_id`    | `uuid`    | Exclusive Arc                                          |
| `method`        | `text`    | `'gpa'` or `'marks'`                                   |
| `max_gpa`       | `numeric` | Used only when `method = 'gpa'` (typically 5.0)        |
| `ssc_max_marks` | `numeric` | Used only when `method = 'marks'`                      |
| `hsc_max_marks` | `numeric` | Used only when `method = 'marks'`                      |
| `ssc_weight`    | `numeric` | Weighting factor for SSC contribution                  |
| `hsc_weight`    | `numeric` | Weighting factor for HSC contribution                  |
| `total_score`   | `numeric` | The maximum possible output score                      |
| `notes`         | `text`    | Displayed in the calculator UI as special instructions |

---

## The "Exclusive Arc" Pattern

Several tables use a **polymorphic-style "Exclusive Arc"** to associate a row with exactly one
type of institution:

```
unit_requirements
├── university_id  ──→  universities  (standalone public university)
├── cluster_id     ──→  clusters      (a multi-institution admission cluster)
└── college_id     ──→  colleges      (an affiliated college)
```

**Rule:** On any given row, **exactly ONE** of these three FK columns will be non-null. The other
two will be `NULL`.

The same pattern applies to `gpa_calculation_methods`.

### How to query safely

Always resolve the institution dynamically. In TypeScript:

```typescript
// Resolve the parent institution regardless of type
const institution = row.universities ?? row.clusters ?? row.colleges;
```

In SQL, use `COALESCE`:

```sql
COALESCE(u.name_en, cl.name_en, co.name_en) AS institution_name
```

> ⚠️ **Do NOT assume** a row always has a `university_id`. Omitting the cluster/college branch
> will silently drop results.

---

## Subject Domain Refactoring

There are **three distinct subject-related tables** with very different semantics, partitioned into distinct business domains. Confusing them is a critical bug.

### `study_levels` (New Table)

- **ID Type:** `int2` / `smallint` (Primary Key)
- **Purpose:** A small lookup table managing education sectors/levels globally across the app.
- **Data Rows:**
  - `1`: `General/Common` (`general`)
  - `2`: `Higher Secondary` (`hsc`)
  - `3`: `Secondary` (`ssc`)
  - `4`: `Admission` (`admission`)

### A. `study_disciplines` (Renamed from `subjects`)

- **ID Type:** UUID
- **Purpose:** Represents core branches of knowledge (e.g., Physics, Chemistry, Bangla, English, IQ, General Knowledge).
- **New Column:** `level_id` (`smallint`) referencing `study_levels(id)`.
- **Filtering Logic:** Academic subjects like Physics/Bangla use `level_id = 1 (general)`, whereas admission-only components like IQ/GK use `level_id = 4 (admission)`. This allows the eligibility form to query and exclude admission-specific test items easily from HSC GPA input forms.

### B. `curriculum_papers` (Renamed from `hsc_subjects`)

- **ID Type:** UUID
- **Purpose:** Represents specific academic papers or textbooks (e.g., Bangla 1st Paper, Physics 2nd Paper, ICT) across any education level.
- **Foreign Key Added:** `discipline_id` (UUID) referencing `study_disciplines(id) ON DELETE CASCADE`.
- **Future-Proof Design:** This table eliminates the need for creating separate `ssc_subjects` or `jsc_subjects` tables, as any curriculum paper can link to a discipline and assign its class tier via `level_id`.

### C. `degree_programs` (Renamed from `master_subjects`)

- **ID Type:** UUID
- **Purpose:** Completely isolated domain representing university departments, degrees, or majors (e.g., CSE, EEE, Law, BBA). It stands independently from secondary curriculum subjects to avoid global context collision.

### Relationships

```text
study_disciplines
  └── curriculum_papers  [many papers per discipline]

study_disciplines
  └── subject_groups  [maps disciplines to HSC groups]
        └── groups (Science, Humanities, Commerce)

degree_programs
  └── institution_subjects  [maps degree programs to units/institutions]
```

### Usage in Eligibility Checker

The `subject_requirements` JSONB field in `unit_requirements` references `study_disciplines.short_code` (not `curriculum_papers`) to define minimum per-discipline GPA requirements. The `subject_groups` join table is queried at runtime when the user selects an HSC group to populate the dynamic discipline marks input list.

---

## Batch & Fallback Logic

### `unit_requirement_batches`

This is a **many-to-many join table** connecting `unit_requirements` to `batches`. A requirement
row may be valid for multiple admission batches (years).

```
unit_requirements  ←──  unit_requirement_batches  ──→  batches
```

`batches` has a key boolean column: **`is_current`**. Only one batch should be marked as
`is_current = true` at a time — this represents the active admission cycle.

### Fallback Algorithm

The Eligibility Checker must select the **best applicable requirement** for each unique
`unit_id`. The priority score is calculated as:

```
score = is_current ? (10000 + max_year) : max_year
```

Where `max_year` is the highest `year` value among all batches linked to that requirement.

**Effect:**

1. A requirement tagged to the **current batch** always wins (score ≥ 10001).
2. If no current-batch requirement exists (new university added mid-cycle, or historical data
   only), the requirement from the **most recent year** is used as a fallback.

This ensures the checker always shows relevant data even when a university hasn't updated its
current-year requirements yet.

---

## JSONB Structures

### `exams.mandatory_subjects` / `exams.optional_subjects`

```json
[
  { "subject_id": "<uuid>", "question_count": 20 },
  { "subject_id": "<uuid>", "question_count": 15 }
]
```

### `unit_requirements.subject_requirements`

A flat map of `short_code → minimum_gpa`:

```json
{
  "PHY": 3.5,
  "CHE": 3.0,
  "MAT": 4.0
}
```

> `short_code` maps to `study_disciplines.short_code`. Always verify the code exists in the `study_disciplines`
> table before inserting.

### `unit_requirements.custom_checks`

An array of rule objects. Supported `type` values:

#### `atLeastNSubjectsWithMinGPA`

The student must achieve `gpa` or higher in at least `count` of the listed disciplines.

```json
{
  "type": "atLeastNSubjectsWithMinGPA",
  "subjects": ["PHY", "CHE", "MAT", "BIO"],
  "count": 3,
  "gpa": 3.5
}
```

#### `remainingSubjectsWithMinGPA`

After the `atLeastN` rule is satisfied using the top-scoring disciplines, the _remaining_ disciplines
must each meet `gpa`. Typically paired with an `atLeastNSubjectsWithMinGPA` rule on the same
discipline list.

```json
{
  "type": "remainingSubjectsWithMinGPA",
  "subjects": ["PHY", "CHE", "MAT", "BIO"],
  "gpa": 3.0
}
```

#### `targetSubjectsTotalGPA`

The sum of GPAs across all listed disciplines must be ≥ `minTotalGPA`.

```json
{
  "type": "targetSubjectsTotalGPA",
  "subjects": ["PHY", "CHE"],
  "minTotalGPA": 7.0
}
```

---

## Indexes

| Table           | Index                            | Type          | Purpose                                  |
| --------------- | -------------------------------- | ------------- | ---------------------------------------- |
| `users`         | `idx_users_enrolled_batches`     | GIN           | Fast lookup of users by batch membership |
| `exams`         | `idx_exams_batch_id`             | B-tree        | List exams for a batch                   |
| `student_exams` | `idx_student_exams_student_id`   | B-tree        | Student exam history                     |
| `student_exams` | `idx_student_exams_exam_id`      | B-tree        | All submissions for an exam              |
| `student_exams` | `idx_student_exams_student_exam` | UNIQUE B-tree | Prevent duplicate submissions            |

---

## Enum Types

```sql
CREATE TYPE admin_role AS ENUM ('admin', 'moderator');
```

Used in `admins.role`. When querying, always compare as text or use the enum literal — do not
cast to integer.
