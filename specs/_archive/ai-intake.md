# AI Intake Module — Build Spec

**Module:** Phase 1 MVP, §9.1 of Engineering Documentation
**Status:** Draft 1 — pre-implementation
**Owner:** GDI Engineering
**Last updated:** 2026-04-25

---

## 1. Purpose

Public-facing chatbot on the GDI website that converts anonymous visitor intent into a structured lead. No login required. The conversation is captured, extracted into a structured payload, and persisted as a `Lead` in status `new`.

This is the front door of the entire client lifecycle (Stage 1: AI Discovery → Stage 2: Lead Submission). Everything downstream (Lead Mgmt, Scheduling, Consultation) consumes what this module produces.

## 2. Scope

**In scope (P1)**
- Multi-turn conversation with Claude (server-side)
- Structured extraction via Claude tool use
- Anonymous session model (session token, no account required)
- Lead creation on completion
- Optional account creation at submit time
- Bahasa Indonesia + English (auto-detect from first user message)
- Rate limiting & abuse controls
- Conversation resume within TTL

**Out of scope (defer to P2+)**
- File upload during conversation
- Voice input
- Multi-channel intake (WhatsApp inbound) — comes with WhatsApp module in P1.5
- Lead routing / round-robin assignment — that's Lead Mgmt
- Auto-scheduling from intake — Scheduling module owns this

## 3. Data model (PostgreSQL)

All UUIDs are `uuid_generate_v4()`. All tables get `created_at`, `updated_at` (engineering convention §12.3). Soft-delete pattern via `deleted_at`.

```sql
-- Anonymous conversation session
CREATE TABLE intake_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token   UUID NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','abandoned','blocked')),
  language        TEXT,                    -- 'id' | 'en', detected on first user msg
  visitor_ip      INET,
  user_agent      TEXT,
  message_count   INT  NOT NULL DEFAULT 0, -- cached for rate limiting
  lead_id         UUID REFERENCES leads(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_intake_conv_session ON intake_conversations(session_token);
CREATE INDEX idx_intake_conv_ip_started ON intake_conversations(visitor_ip, started_at);

-- Full message history (Claude-shaped)
CREATE TABLE intake_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES intake_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content         JSONB NOT NULL,          -- Claude content blocks (text/tool_use/tool_result)
  tokens_in       INT,
  tokens_out      INT,
  model           TEXT,                    -- e.g. 'claude-opus-4-7'
  cache_hit       BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_intake_msg_conv ON intake_messages(conversation_id, created_at);

-- Structured extraction (one per conversation, latest wins)
CREATE TABLE intake_extractions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id       UUID NOT NULL REFERENCES intake_conversations(id) ON DELETE CASCADE,
  problem_summary       TEXT,
  service_category      TEXT CHECK (service_category IN
                          ('web_development','data_engineering','ai_solution',
                           'erp_implementation','automation','consulting','other')),
  preliminary_scope     TEXT,
  urgency               TEXT CHECK (urgency IN ('low','medium','high')),
  estimated_budget_idr  BIGINT,
  preferred_timeline    TEXT,
  contact_name          TEXT,
  contact_email         TEXT,
  contact_phone         TEXT,
  company_name          TEXT,
  qualification_score   INT CHECK (qualification_score BETWEEN 0 AND 100),
  qualification_reason  TEXT,
  extracted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_intake_ext_conv ON intake_extractions(conversation_id);
```

`leads` (owned by Lead Mgmt module, referenced here for the FK):
```sql
-- Source field tracks origin so analytics can split AI-intake vs other
ALTER TABLE leads ADD COLUMN source TEXT
  CHECK (source IN ('ai_intake','manual','referral','imported'));
ALTER TABLE leads ADD COLUMN intake_conversation_id UUID REFERENCES intake_conversations(id);
```

## 4. API surface

All routes under `/api/intake/`. Public (no auth) except where noted.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/intake/start` | Open a new conversation, get session_token + greeting |
| `POST` | `/api/intake/message` | Send user message, get assistant reply (and extraction if ready) |
| `GET`  | `/api/intake/:token` | Resume a conversation within TTL |
| `POST` | `/api/intake/submit` | Finalize → create Lead, optionally create user account |
| `POST` | `/api/intake/abandon` | Mark conversation abandoned (UI close hook) |

### 4.1 `POST /api/intake/start`
Request: `{}` (visitor IP / UA captured server-side)
Response:
```json
{
  "session_token": "uuid",
  "expires_at": "ISO8601",
  "greeting": "Hi! I'm GDI's discovery assistant…"
}
```
Rate limit: 3 starts per IP per hour.

### 4.2 `POST /api/intake/message`
Request:
```json
{ "session_token": "uuid", "content": "string (max 4000 chars)" }
```
Response:
```json
{
  "reply": "string",
  "conversation_state": "gathering" | "ready_to_submit" | "blocked",
  "extraction": { /* intake_extractions row, if extracted yet */ } | null,
  "message_count": 7
}
```
Throttle: 30s server-side cooldown between messages on same session. Hard cap 50 messages per conversation.

### 4.3 `POST /api/intake/submit`
Request:
```json
{
  "session_token": "uuid",
  "create_account": false,
  "account": { "email": "…", "password": "…", "name": "…" } // if create_account
}
```
Server flow:
1. Re-run final extraction if dirty.
2. Create `leads` row (`status='new'`, `source='ai_intake'`, `intake_conversation_id=…`).
3. If `create_account=true`: create `users` row (role=`prospect`), link to lead.
4. Set `intake_conversations.status='completed'`, `lead_id=…`.
5. Emit `lead.created` event → Notification module (WhatsApp/email to GDI engineering channel).

Response:
```json
{ "lead_id": "uuid", "lead_reference": "NEX-1234", "next_step_message": "string" }
```

## 5. Claude integration

**Model:** `claude-opus-4-7` for primary reasoning; can downgrade to `claude-sonnet-4-6` for cost-sensitive deployments via env var `INTAKE_MODEL`.
**SDK:** `@anthropic-ai/sdk` (TypeScript).
**Caching:** Use prompt caching on the system prompt (it's stable, ~2k tokens) and on conversation history blocks. Target ≥80% cache hit rate after turn 3.

### 5.1 System prompt (sketch)

```
You are GDI's AI discovery assistant. PT Global Dataverse Indonesia is a
technology consultancy in Bandung, Indonesia, offering web development, data
engineering, AI solutions, ERP (ERPNext) implementation, and automation.

YOUR JOB
Have a friendly, focused conversation with a website visitor to understand:
  1. The business problem they're trying to solve
  2. Which service category fits (web_development, data_engineering,
     ai_solution, erp_implementation, automation, consulting, other)
  3. A preliminary scope (what they need built / fixed / advised on)
  4. Urgency (low / medium / high)
  5. Estimated budget in IDR (gentle ask — don't push)
  6. Preferred timeline
  7. Contact info (name, email, company) — at the end

LANGUAGE
Match the visitor's language. They will likely write in Bahasa Indonesia or
English. Set the conversation language from their first message.

TONE
Warm, professional, curious. Ask one focused question at a time. Don't
interview them with a checklist — let it feel like a conversation.

GUARDRAILS
- Never quote prices or commit GDI to deliverables.
- Don't claim capabilities outside the categories above.
- Don't ask for sensitive info (passwords, IDs, payment details).
- If the visitor goes off-topic or seems hostile, gently redirect once.
  After three off-topic turns, call mark_blocked.

WHEN YOU HAVE ENOUGH INFO
Call extract_lead_info with everything you've gathered. The user will then
see a summary and decide whether to submit.

You MUST call extract_lead_info before saying goodbye.
```

### 5.2 Tools (Claude tool use)

```ts
const tools = [
  {
    name: "extract_lead_info",
    description: "Call when you have enough info to qualify the visitor as a lead.",
    input_schema: {
      type: "object",
      required: ["problem_summary", "service_category", "qualification_score"],
      properties: {
        problem_summary:      { type: "string" },
        service_category:     { type: "string", enum: [...] },
        preliminary_scope:    { type: "string" },
        urgency:              { type: "string", enum: ["low","medium","high"] },
        estimated_budget_idr: { type: "integer", minimum: 0 },
        preferred_timeline:   { type: "string" },
        contact_name:         { type: "string" },
        contact_email:        { type: "string" },
        contact_phone:        { type: "string" },
        company_name:         { type: "string" },
        qualification_score:  { type: "integer", minimum: 0, maximum: 100 },
        qualification_reason: { type: "string" }
      }
    }
  },
  {
    name: "mark_blocked",
    description: "Call if visitor is abusive, off-topic for 3+ turns, or testing the bot.",
    input_schema: {
      type: "object",
      required: ["reason"],
      properties: { reason: { type: "string" } }
    }
  }
];
```

### 5.3 Qualification scoring (Claude-decided, not server-decided)

Claude sets `qualification_score` based on:
- Clear problem statement (up to 30)
- Identifiable service category (up to 15)
- Urgency signal (up to 15)
- Budget signal (up to 20)
- Timeline signal (up to 10)
- Contact info given (up to 10)

Server uses score as a triage hint only — actual `qualified`/`rejected`/`deferred`
transition still requires engineer review per §3 Lifecycle Stage 4.

## 6. UI states (Next.js client)

Embedded chat widget on `/` (and floating button on all marketing pages).

| State | Trigger | UI |
|---|---|---|
| `closed` | initial | Floating bubble, bottom-right |
| `greeting` | user opens widget | Greeting message + suggested prompts ("I need a website", "Bantu data analytics", …) |
| `chatting` | first user msg sent | Message list + composer + typing indicator |
| `extracting` | Claude calls `extract_lead_info` | Inline summary card: "Here's what I understood — look right?" with [Edit] / [Looks good] |
| `submitting` | user confirms | Lightweight form: name, email, optional phone, optional "create account" |
| `submitted` | API success | Success state with lead reference + "We'll be in touch within 1 business day" + WhatsApp join link |
| `resumed` | visitor returns with valid token | Loads message history, drops user back into `chatting` |
| `blocked` | server returns blocked state | "Looks like we're not the right fit yet — leave a note and we'll review." |
| `expired` | token TTL exceeded | "This conversation expired — start fresh?" CTA |

TTL: session_token valid for 24h. After 24h, conversation is `abandoned` if not completed.

## 7. Rate limiting & abuse

| Control | Limit | Where enforced |
|---|---|---|
| Conversation starts | 3 / IP / hour | API gateway middleware |
| Messages per conversation | 50 hard cap | `intake_messages.message_count` check |
| Message frequency | 1 / 30s per session | `last_activity_at` diff check |
| Daily Claude spend | configurable env `INTAKE_DAILY_USD_CAP` | Pre-call check against day's token total |
| Blocked sessions | `mark_blocked` tool result | `status='blocked'`, future messages 403 |

## 8. Notifications on lead creation

Per §12.4, notifications must be idempotent. On `lead.created`:
- WhatsApp template `lead_new_v1` to GDI engineering channel (primary)
- Email fallback if WhatsApp delivery fails after 3 retries
- In-app notification to all users with role `engineer`

Payload includes lead reference, qualification score, service category, summary (truncated to 200 chars).

## 9. Engineering conventions applied (from §12)

- UUID primary keys ✓
- `created_at`, `updated_at`, `deleted_at` on all entities ✓
- RESTful endpoints under `/api/intake/*` ✓
- `intake_*` table prefix matching module name ✓
- JWT used for `submit` only (when account created); start/message routes are public ✓
- Server validates: max content length, session ownership (token match), rate limits ✓

## 10. Open questions (need decision before build)

1. **Account creation gate** — do we require email at submit, or accept anonymous leads with phone-only? *Lean: email optional, phone required for follow-up.*
2. **Lead reference format** — `NEX-{seq}` or `GDI-{yyyy}-{seq}`? *Lean: `NEX-{seq}` (5-digit padded).*
3. **WhatsApp inbound parity** — when WhatsApp inbound ships in P1.5, do those conversations also use this module's tables, or get their own? *Lean: same tables, add `channel` column to `intake_conversations`.*
4. **Claude prompt versioning** — store prompt version on `intake_messages` for A/B testing? *Lean: yes, add `prompt_version` column now to avoid migration later.*
5. **Cost cap behavior** — when `INTAKE_DAILY_USD_CAP` hits, do we hard-block new starts or fall back to a static form? *Lean: fall back to static form so the funnel doesn't go dark.*

## 11. Build order (when we move to code)

1. Migrations + models (`intake_conversations`, `intake_messages`, `intake_extractions`, `leads.source`).
2. Anthropic client wrapper with caching + token logging.
3. Conversation engine (the loop: append user msg → call Claude → handle tool use → persist).
4. API routes (`start`, `message`, `submit`, resume).
5. Rate-limit middleware.
6. Chat widget UI (Next.js client component + composer + summary card).
7. Submit form + lead creation flow.
8. `lead.created` notification hook (stubbed until Notification module ships).
9. Smoke-test happy path end-to-end on a staging URL.
