# Nexus

GDI's internal client OS — a Next.js web app that hosts client portals, project workspaces, document numbering, invoicing, and an AI assistant. This README walks you through running it locally.

## Just want to run it? Let an AI agent walk you through it

If you're not comfortable in a terminal, install [Claude Code](https://claude.com/claude-code) (or another AI coding agent like Cursor / Codex CLI) and paste the prompt below. The agent will detect your OS, check your prerequisites, clone the repo, start the database, install dependencies, walk you through the API keys you need (pausing for you to paste them), run the migrations, and start the dev server.

> Copy everything inside the box below and paste it into your AI agent's chat:

```text
I want to run a Next.js app called "Nexus" locally on my computer (for testing or deployment). The repo is at https://github.com/rayyanziya/nexus-project-ongoing.

Please walk me through it step by step:

1. Detect my OS and check whether I already have Node.js 20+, pnpm 9+, Docker Desktop, and git installed. If anything is missing, give me the exact commands to install it on my OS.
2. Clone the repo into a folder I pick, then cd into it.
3. From the repo root, start the local Postgres container by running `docker compose up -d`. Confirm it reports as healthy with `docker compose ps` before continuing.
4. Inside the `web/` folder, run `pnpm install`.
5. Copy `web/.env.example` to `web/.env.local`. Then walk me through filling in the real values — pause after each one and wait for me to paste it back:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — from https://clerk.com (free tier; sign up, create a Development instance, copy from API Keys)
   - `ANTHROPIC_API_KEY` — from https://console.anthropic.com (API Keys)
   The `DATABASE_URL` default already matches docker-compose. `R2_*`, `RESEND_API_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET` can stay as placeholders for local development.
6. From `web/`, run `pnpm db:migrate` to set up the database schema.
7. Run `pnpm dev` and tell me to open http://localhost:3000.
8. After I sign up at /sign-up, walk me through promoting my user to admin: open the Clerk dashboard, go to Users → my user → Metadata → Public, paste `{"role": "admin"}`, save, then sign out and back in.

If any step fails, diagnose the error and either fix it or tell me exactly what to do next. Don't skip steps. Stop and ask me before doing anything destructive.
```

Once the agent finishes you should have the app running at [http://localhost:3000](http://localhost:3000). The rest of this README is the manual version of the same instructions plus reference material.

## Stack at a glance

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Postgres 16** via Docker (local dev)
- **Drizzle ORM** for schema + migrations
- **Clerk** for authentication
- **Anthropic Claude** for the AI assistant
- **Cloudflare R2** for file storage in production (local filesystem in dev)

## Prerequisites

Install these before anything else:

| Tool | Version | Why |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 20 LTS or newer | Runtime for Next.js + Drizzle CLI |
| [pnpm](https://pnpm.io/installation) | 9+ | Package manager |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest | Runs the local Postgres container |
| [Git](https://git-scm.com/) | any recent | Clone the repo |

You will also need free accounts at:

- [clerk.com](https://clerk.com) — authentication (free tier is enough)
- [console.anthropic.com](https://console.anthropic.com) — AI API key

## Step-by-step setup

### 1. Clone the repository

```bash
git clone <your-repo-url> nexus
cd nexus
```

### 2. Start Postgres

From the repo root (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

This starts a Postgres 16 container named `nexus-postgres` on port **5433**. Data is bind-mounted to `./.pgdata/` so it survives container restarts (this directory is gitignored).

Verify it's healthy:

```bash
docker compose ps
```

You should see `nexus-postgres` with status `(healthy)`.

### 3. Install web dependencies

```bash
cd web
pnpm install
```

### 4. Configure environment variables

Still inside `web/`:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in real values:

- `DATABASE_URL` — leave the default; it matches the Docker container.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — from your Clerk dashboard → API Keys (use the **Development** instance keys).
- `CLERK_WEBHOOK_SIGNING_SECRET` — only needed if you wire up Clerk webhooks; can leave the placeholder during local dev.
- `ANTHROPIC_API_KEY` — from console.anthropic.com → API Keys.
- `R2_*` — optional in dev. The app falls back to local filesystem storage under `.uploads/` if R2 isn't configured. Leave the placeholders.
- `RESEND_API_KEY` — optional, can be left as-is.

### 5. Run database migrations

```bash
pnpm db:migrate
```

This applies all schemas in `db/migrations/`. Re-run any time you `git pull` and new migrations have landed.

### 6. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First-time user setup

Public sign-up is **disabled by design** — admins provision client users. To get into the app the first time:

1. Sign up at `/sign-up` using your Clerk dashboard's "Invite user" flow, OR temporarily enable sign-up in the Clerk dashboard, create an account, then disable it again.
2. In the Clerk dashboard, find your user → **Metadata** → **Public** and add:
   ```json
   { "role": "admin" }
   ```
3. Sign in. You will be routed to `/admin/*`. From there you can create clients, projects, invoices, documents, and tasks.
4. To test the client portal: create a client + a client user from the admin UI; sign in as that user; you'll land on `/dashboard/*`.

## Useful URLs

| URL | Who | What |
| --- | --- | --- |
| `/sign-in` | everyone | Clerk login |
| `/admin` | admin only | Admin home — clients, projects, tasks, documents, invoices, notifications |
| `/dashboard` | client users | Client portal — their projects, invoices, AI assistant |

## Useful scripts

Run from `web/`:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server with Turbopack |
| `pnpm build` | Production build (also runs typecheck) |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript-only check (no build) |
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly to DB (dev shortcut, no migration file) |
| `pnpm db:studio` | Open Drizzle Studio (web UI for the DB) on `https://local.drizzle.studio` |

## Troubleshooting

**Migrations fail with "connect ECONNREFUSED 127.0.0.1:5433"** — Postgres isn't running. Run `docker compose up -d` from the repo root.

**`pnpm dev` shows a stale page or weird hydration errors after a schema change (Windows + Turbopack)** — stop the dev server, delete `web/.next/`, and restart. Turbopack's snapshot can corrupt across some edits.

**Clerk redirects in a loop** — confirm the `NEXT_PUBLIC_CLERK_*` keys in `.env.local` come from the same Clerk instance and that you've restarted `pnpm dev` after editing them.

**"All client users are already members" / can't add anyone to a project** — admins need to create at least one client user in the Clerk dashboard with `role` *unset* (admins have `role: "admin"`); regular signed-in users without that role become client users.

**File uploads silently disappear** — local-fs storage writes to `web/.uploads/`. If you delete that directory, all uploaded posts/document files are gone. R2 is the production target.

## Project structure

```
nexus/
├── docker-compose.yml      # Postgres 16 for local dev
├── web/                    # The Next.js app — primary codebase
│   ├── app/                # App Router routes
│   │   ├── (admin)/        # Admin surface — /admin/*
│   │   ├── (client)/       # Client portal — /dashboard/*
│   │   ├── api/            # Route handlers
│   │   └── _components/    # Shared client/server components
│   ├── db/                 # Drizzle schema + migrations
│   │   ├── schema/         # One file per domain (tenancy, projects, billing, …)
│   │   └── migrations/     # Generated SQL — committed
│   ├── lib/                # Auth, db client, queries, storage, anthropic, audit
│   └── CLAUDE.md           # In-repo conventions doc (read it before editing web/)
├── claude-memory-compiler/ # Tooling for AI assistant context (separate workflow)
└── specs/                  # Architecture / build plan markdown
```

## License

Released under the MIT License with an explicit grant to PT Global Dataverse Indonesia. See [`LICENSE`](./LICENSE).
