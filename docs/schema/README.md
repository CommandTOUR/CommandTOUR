# Schema Snapshot

This folder is a **reference snapshot** of the live Supabase `public` schema, taken 2026-11-26.

- It is **not a migration and must never be run.**
- The live database is the source of truth. If this folder and the database disagree, the database wins.
- Every future migration must be idempotent (`create table if not exists`, `add column if not exists`, `drop policy if exists`) and numbered after `20261127100100`.

Contents: [live-schema-2026-11-26.md](live-schema-2026-11-26.md)
