# Changelog

All notable changes to the Study Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_Changes merged to `main` but not yet tagged as a release._

---

## [1.0.0] — 2026-06-10

### Added

- **Modular Documentation System** — Introduced `docs/DATABASE.md`, `docs/ARCHITECTURE.md`,
  `CHANGELOG.md`, and `.cursorrules` to replace the monolithic `README.md`. Prevents AI context
  window saturation and hallucination of column names in a 54+ table schema.
- **Eligibility Checker** (`/eligibility-checker`) — Full dynamic eligibility evaluation
  against university/cluster/college admission requirements fetched from Supabase. Supports:
  - SSC/HSC GPA and year range checks.
  - Optional "without 4th subject" GPA mode.
  - Per-subject minimum GPA requirements (`subject_requirements` JSONB).
  - Advanced composite rules (`custom_checks` JSONB): `atLeastNSubjectsWithMinGPA`,
    `remainingSubjectsWithMinGPA`, `targetSubjectsTotalGPA`.
  - Institution grouping by category with a fixed sort order (Clusters → General → Agri →
    Engineering → …).
  - Dynamic "Group Change" UI indicator driven by `admission_units.primary_group_id`.
- **GPA Calculator** (`/gpa-calculator`) — Institution-specific GPA/score calculator with
  dynamic fetching of `gpa_calculation_methods`. Supports both GPA-based and Marks-based
  calculation methods with formula breakdown in the UI.
- **Batch Fallback Logic** — Eligibility Checker selects the best requirement per admission unit
  using a priority score: current-batch requirements take absolute priority; most-recent-year
  historical data is used as a fallback when no current-batch entry exists.
- **Exclusive Arc Pattern** — Implemented and documented the polymorphic institution association
  on `unit_requirements` and `gpa_calculation_methods` (exactly one of `university_id`,
  `cluster_id`, `college_id` is non-null per row).
- **localStorage Input Caching** — Eligibility Checker persists all student inputs across page
  reloads under `"eligibility_checker_inputs"`.
- **Variable Marks Exam Engine** — `exams` table supports configurable `marks_per_question` and
  `negative_marks_per_wrong`. Historical scores recalculated via SQL migration.
- **Admin Panel** — Full CRUD for batches, exams, questions, universities, clusters, colleges,
  and university events.
- **Batch Management** — Student enrollment, attendance tracking (`student_attendance`), and
  daily task tracking (`student_tasks`).
- **Syllabus Tracker** — Chapter-level progress tracking per subject and batch.
- **Authentication** — Separate student and admin authentication contexts.
- **Dark Mode** — Theme toggle using `next-themes` with system preference detection.

### Changed

- **Eligibility Checker refactored to use dynamic DB queries** — Replaced any previously
  static/hardcoded requirement data with live Supabase queries joined across `unit_requirements`,
  `admission_units`, `universities`, `clusters`, `colleges`, and `batches`.
- **Single-unit institution UI** — Institutions with only one admission unit no longer display a
  redundant unit card; the eligibility result is presented at the institution level directly.

### Fixed

- Score precision overflow on `student_exams.score` — column type changed from bounded numeric
  to unbounded `numeric` via migration.

---

## Legend

| Tag          | Meaning                                    |
| ------------ | ------------------------------------------ |
| `Added`      | New features                               |
| `Changed`    | Changes to existing features               |
| `Deprecated` | Features to be removed in a future release |
| `Removed`    | Removed features                           |
| `Fixed`      | Bug fixes                                  |
| `Security`   | Security patches                           |
