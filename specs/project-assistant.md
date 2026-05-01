# Per-Project AI Assistant — Build Spec

**Module:** Phase 1 MVP, replaces the descoped public AI intake bot.
**Status:** Draft 1 — pre-implementation
**Owner:** GDI Engineering
**Last updated:** 2026-04-27

---

## 1. Purpose

A project-scoped AI assistant that authenticated clients can chat with about their own GDI engagement. Each project has its own conversation, grounded in artifacts (files + notes) that GDI admin has flagged `for_ai_context`.

The assistant exists so clients can ask about *their project* — status, decisions, deliverables, what's in their uploaded documents — without having to ping a human for every question.

This is **not** the public lead-acquisition chatbot (that was descoped from Phase 1; see `_archive/ai-intake.md`).

## 2. Scope

**In scope (P1)**
- One conversation per `(project_id, client_user_id)` pair
- Multimodal context: text notes + files (PDF, HTML, DOCX, PNG, JPEG)
- Context built per-message from artifacts where `for_ai_context = true`
- Prompt caching on the system prompt + assembled project context
- Streaming responses (SSE or Next 16 streaming response)
- Token + cache usage logged on every assistant message
- Hard message cap per conversation (reset by admin if needed)

**Out of scope (defer)**
- Vector retrieval / embeddings — start with context-stuffing into the 1M token window. Add retrieval only when a project's KB outgrows that.
- File upload from the client side — clients are read-only; only admins upload.
- Cross-project answers — assistant is strictly scoped to one project.
- MCP server interface — architecture-compatible, but not built in P1.
- Conversation summarization / compaction — not needed at MVP scale.

## 3. Data model

Already defined in `web/db/schema/chat.ts`:

- `project_conversations` — one row per `(project_id, client_user_id)`. Unique index enforces 1:1.
- `project_messages` — append-only history. Stores Claude content blocks (`jsonb`), `tokens_in`, `tokens_out`, `cache_read_tokens`, `cache_creation_tokens`, `model`, `cache_hit`.

No new tables needed.

## 4. API surface

All routes under `app/(client)/api/projects/[projectId]/chat/`. Auth-required (Clerk). Authorization: caller's `client_user_id` must be in `project_members` for the project.

| Method | Path                                          | Purpose                                  |
| ------ | --------------------------------------------- | ---------------------------------------- |
| `GET`  | `/api/projects/:projectId/chat`               | Load conversation + recent messages      |
| `POST` | `/api/projects/:projectId/chat/messages`      | Send a user message, stream the reply    |

`GET` paginates messages (cursor on `created_at`). `POST` returns a streaming response; the assistant message row is committed when the stream closes.

## 5. Claude integration

**Model:** `claude-sonnet-4-6` (env: `ANTHROPIC_MODEL`, default to this).
**SDK:** `@anthropic-ai/sdk`.
**Multimodal:** images go in as native image blocks. **No OCR layer.** PDFs use the SDK's PDF document blocks where supported; otherwise we extract text on upload (`project_files.extracted_text`) and feed that.

### 5.1 Context assembly (`lib/anthropic.ts`)

Per request:

1. Load project metadata (`projects` row).
2. Load all `project_notes` where `project_id = X AND for_ai_context = true AND deleted_at IS NULL`.
3. Load all `project_files` where same predicates. For each file:
   - Image (`image/*`) → image block with R2 signed URL.
   - PDF → document block (or `extracted_text` fallback).
   - Text-like (`text/*`, DOCX-derived) → text block from `extracted_text`.
4. Compose the user/system payload:
   - **System prompt** (stable, cached): assistant role, project name + description, tone rules, guardrails.
   - **Project context block** (cached, `cache_control: ephemeral`): notes concat + file blocks. Cache breakpoint placed at the end of this block so adding new chat turns doesn't invalidate it.
   - **Conversation history**: prior `project_messages` for this conversation, oldest first.
   - **New user turn**: the incoming message.

### 5.2 System prompt (sketch)

```
You are the project assistant for "{project.name}", a GDI engagement.

Your job is to help the client understand the state of their project — what's
been delivered, what's in the documents and notes shared with them, and what
the next steps are.

GROUND RULES
- Only answer from the project context provided. If the answer isn't there,
  say so and suggest the client message their GDI account manager.
- Don't speculate about pricing, timelines, or commitments not stated in the
  context.
- Match the client's language (Bahasa Indonesia or English).
- Be concise. Cite file or note titles when you reference them.
```

### 5.3 Caching strategy

- Mark the system prompt as `cache_control: { type: "ephemeral" }`.
- Mark the project context block as `cache_control: { type: "ephemeral" }`.
- Cache breakpoint **after** the context, **before** conversation history. Result: turn-to-turn additions don't invalidate the project context cache.
- Target ≥80% cache_read ratio after turn 2.

## 6. Authorization

`requireClient()` (in `lib/auth.ts`) returns the caller's `client_users` row. Then verify `project_members` membership. 403 if not a member; 404 if project doesn't exist (or is in a different client). Don't leak existence across tenant boundaries.

## 7. UI

Client-side, embedded in the project detail page (`app/(client)/projects/[id]/page.tsx`):

- Message list (server component for initial load, client component for streaming).
- Composer with multiline input.
- "Thinking…" indicator while streaming.
- Show token/cache stats only in dev (gated by `NODE_ENV !== "production"`).

No conversation list UI — conversation is implicit per project.

## 8. Rate limiting & cost controls

- Per-conversation message cap: 200 (configurable; admin can reset).
- Per-client daily Anthropic spend cap: env `ANTHROPIC_DAILY_USD_CAP`. Pre-call check sums the day's `tokens_in` + `tokens_out` * model price. Exceeded → 429 with friendly message; admin sees the breach in the audit log.
- Throttle: 1 in-flight message per conversation (UI disables composer while streaming).

## 9. Build order

1. `lib/anthropic.ts` — client + context assembly (pure functions, unit-testable).
2. `lib/queries/chat.ts` — get-or-create conversation, append message, list messages.
3. `app/(client)/api/projects/[id]/chat/route.ts` — `GET` handler.
4. `app/(client)/api/projects/[id]/chat/messages/route.ts` — `POST` streaming handler.
5. Client chat component (consumes the stream).
6. Wire into project detail page.
7. Smoke test end-to-end with a real project + uploaded artifact.

## 10. Open questions

1. **PDF handling.** Does Sonnet 4.6's PDF document block work for the file sizes GDI typically deals with (10–50MB design docs)? If yes, skip the `extracted_text` path. *Lean: try native first; fall back to extraction only if size/cost forces it.*
2. **Conversation reset.** Admin-only "reset conversation" action — soft-delete messages or hard-delete? *Lean: soft-delete via `deleted_at` on a per-message basis (schema change needed: add `deleted_at` to `project_messages`).*
3. **Image-only files.** When the only `for_ai_context` artifact is an image, should we still send a system prompt about "documents and notes shared with you"? *Lean: yes, the wording is general enough.*
