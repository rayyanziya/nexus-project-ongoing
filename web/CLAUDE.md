# Nexus — Web app conventions

This file is the source of truth for how code is organized in `web/`. Read before adding files.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Drizzle ORM + Postgres. Auth: Clerk. AI: Anthropic Claude Sonnet 4.6. Object storage: Cloudflare R2.

> **This is NOT the Next.js you know.** Next 16 has breaking changes from earlier majors. Before writing route handlers, server actions, or data fetching code, check `node_modules/next/dist/docs/` for the current API. Do not assume `pages/`-era patterns.

## Surfaces

Two route groups inside the same app:

- `app/(client)/...` → client portal at `nexus.dataverse.co.id`
- `app/(admin)/...` → GDI admin at `nexusadmin.dataverse.co.id`

Both are gated by Clerk. Admin pages additionally check `publicMetadata.role === "admin"` server-side. Public sign-up is disabled — admins provision client users via Clerk's API.

In dev, admin lives at `/admin/*` (same port). Cloudflare Access only sits in front in production.

## Schema map (`db/schema/`)

Domain-grouped, all re-exported from `db/schema/index.ts`:

| File          | Tables                                              | Notes                                                           |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `enums.ts`    | All `pgEnum` definitions                            | Single source of enum truth                                     |
| `tenancy.ts`  | `clients`, `client_users`                           | `client_users.clerk_user_id` joins to Clerk identity            |
| `projects.ts` | `projects`, `project_members`                       | Members are `client_users` entries                              |
| `knowledge.ts`| `project_files`, `project_notes`                    | Both carry `for_ai_context` and `client_visible` flags          |
| `chat.ts`     | `project_conversations`, `project_messages`         | One conversation per (project, client_user); token + cache stats|
| `billing.ts`  | `invoices`, `invoice_line_items`, `bank_accounts`   | IDR `bigint`; admin manually marks paid; bank fields snapshot to invoice at issue time |
| `audit.ts`    | `audit_log`                                         | Every admin mutation should append a row                        |
| `sequences.ts`| `document_sequences`                                | Backs `nextDocumentNumber()` — monotonic counter per `(year, doc_type, project_code)` |
| `notifications.ts` | `notifications`                                | In-app bell + per-role list; recipient is admin XOR client (check constraint) |
| `tasks.ts`    | `tasks`                                             | Admin-only project tasks; status/priority enums in `enums.ts`   |
| `documents.ts`| `documents`                                         | Number allocated only on issue; voids/deletes never reuse numbers — `nextDocumentNumber()` is monotonic. Hard-delete; no `deletedAt` column |

All tables: UUID PK via `gen_random_uuid()`, timestamps `created_at` / `updated_at`, soft-delete `deleted_at` where applicable (exception: `documents` is hard-delete). Don't redefine these elsewhere.

## Canonical homes for shared logic

**Before writing a helper, grep here first.** If a similar utility exists, import it.

| Concern                               | Location                                 |
| ------------------------------------- | ---------------------------------------- |
| DB client + schema re-export          | `lib/db.ts`                              |
| Auth guards (`requireAdmin`, etc.)    | `lib/auth.ts`                            |
| File storage (put/read/delete by key) | `lib/storage.ts` (local-fs in dev; R2 swap later) |
| Anthropic client + context builder    | `lib/anthropic.ts`                       |
| Domain queries                        | `lib/queries/<domain>.ts` (one per area) |
| Audit-log writers                     | `lib/audit.ts`                           |
| Document numbering format + sequence  | `lib/document-numbering-format.ts` (client-safe) + `lib/document-numbering.ts` (DB-backed `nextDocumentNumber`) |
| Display formatting (IDR, bytes, dates) | `lib/format.ts` — `formatIdr`, `formatBytes`, `toDateInputValue` |
| Form-data parsing helpers             | `lib/form.ts` — `parseDateFromForm`, `nullableTrim` |
| Confirm-and-call action button (any "Delete" / "Remove" with `confirm()` + transition) | `app/_components/confirm-action-button.tsx` (`variant: danger \| danger-soft \| danger-text \| pill`) |
| Status pills with style maps          | `app/_components/status-badge.tsx` (square/pill shape; one wrapper per domain owns the style map) |
| Markdown rendering                    | `app/_components/markdown.tsx`           |

A "domain query" is any query reused across more than one server component or route handler — e.g. "list visible files for a project", "get all `for_ai_context` artifacts", "compute outstanding invoice total". If you write the same Drizzle query in two places, extract it.

The same rule applies to UI: if you find yourself writing a `useTransition` + `confirm()` button or a status pill component twice, use the shared one.

## Code rules

1. **No duplicate functions.** Grep `lib/` before adding a helper.
2. **No comments unless the WHY is non-obvious.** Names should carry intent.
3. **No fallback / defensive code at internal boundaries.** Validate at edges (route handlers, webhooks); trust internal callers.
4. **Server-side by default.** Use `"use client"` only when interactivity demands it.
5. **Env access goes through one wrapper.** Don't sprinkle `process.env.X` across files — read once in `lib/env.ts` (when added), throw on missing required keys at boot.
6. **All admin mutations append to `audit_log`** via `lib/audit.ts`.

## Out of scope (Phase 1 MVP)

Public-facing AI intake bot, scheduling, contract/e-sign, payment gateways, monitoring, public marketing pages. Don't add infrastructure for these — they're explicitly deferred.
