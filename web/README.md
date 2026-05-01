# Nexus — Web

Next.js app powering the Nexus client and admin portals for PT Global Dataverse Indonesia.

See `CLAUDE.md` for project conventions and the schema map.

## Local development

Prerequisites: `pnpm`, Docker (for Postgres).

```bash
# 1. Start Postgres (defined in repo-root docker-compose.yml)
docker compose up -d

# 2. Install deps
pnpm install

# 3. Configure env
cp .env.example .env.local
# fill in Clerk, Anthropic, R2 keys

# 4. Apply migrations
pnpm db:migrate

# 5. Run the dev server
pnpm dev
```

Open <http://localhost:3000>.

## Database scripts

| Command            | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `pnpm db:generate` | Emit a new SQL migration from schema changes  |
| `pnpm db:migrate`  | Apply pending migrations to the configured DB |
| `pnpm db:push`     | Push schema directly (dev iteration only)     |
| `pnpm db:studio`   | Open Drizzle Studio against the configured DB |

## Surfaces

- `nexus.dataverse.co.id` — client portal (Clerk auth)
- `nexusadmin.dataverse.co.id` — GDI admin (Cloudflare Access + Clerk in prod; Clerk only in dev)
