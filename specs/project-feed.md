# Project Feed — Build Spec

**Module:** Phase 1 MVP, post-chat surface.
**Status:** Draft 1 — pre-implementation
**Owner:** GDI Engineering
**Last updated:** 2026-04-30

---

## 1. Purpose

A Twitter/Threads-style feed on each project's detail page. The admin posts top-level updates (text, files, or both); both admin and client comment under posts. Clients **cannot** create top-level posts — they can only comment and reply.

The feed gives both sides a durable, browseable record of project communication. Chat handles ad-hoc Q&A; the feed handles the project narrative — milestone updates, deliverables, decisions, document drops.

## 2. Scope

**In scope (P1)**
- One feed per project, embedded on the project detail page (admin + client surfaces).
- Top-level posts authored by admin: free-form text body + 0..N file attachments.
- Comments authored by admin or client under any post; comments may have a parent comment (one level of nesting — replies-to-comments — sufficient for MVP).
- Soft-delete on posts and comments; edit allowed for the original author only.
- Audit log entry for every create / edit / delete (consistent with existing admin-mutation policy).
- File visibility on a post is implied by the post's `client_visible` flag — no separate per-file flag on attachments.
- The existing standalone files page at `/admin/projects/[id]/files` is **retained for KB-only artifacts** (not on the feed) — see §4 below.

**Out of scope (defer)**
- Client-authored top-level posts. Hard rule, not a config toggle.
- File uploads in client comments. Comments are text-only at MVP.
- Reactions / likes.
- Mentions, threading deeper than one level, post pinning.
- Notifications (email, push, in-app badges) — admins poll the feed manually at MVP. Add in P2 if pain emerges.
- Real-time updates via SSE/websockets — feed is fetched on page load and after own posts/comments only.
- Feeding client comments into the AI assistant's `for_ai_context`. The existing `for_ai_context` flag stays admin-curated and applies to admin-authored content only. Reconsider if admins start asking for it.

## 3. Data model

Two new tables; one schema change to `project_files`. `project_notes` becomes obsolete and is migrated into `project_posts` (drop after migration).

### 3.1 `project_posts`

Top-level post authored by admin.

```ts
{
  id: uuid (pk, gen_random_uuid()),
  projectId: uuid (fk projects.id, cascade),
  authorAdminId: text (Clerk user id of admin author),
  body: text (nullable — file-only posts allowed),
  forAiContext: boolean (default false, admin-curated, P1 unchanged semantics),
  clientVisible: boolean (default false, controls whether the post appears in the client feed),
  createdAt, updatedAt, deletedAt: timestamptz (soft-delete pattern)
}
indexes:
  (projectId, createdAt desc)         -- feed pagination
  (projectId, clientVisible)          -- client-feed filter
  (projectId, forAiContext)           -- AI context selector
```

Constraint: `body IS NOT NULL OR EXISTS (project_files where post_id = this.id)` — enforce in the service layer (createPost validates), not as a DB CHECK (cross-row).

### 3.2 `project_files` schema change

Add nullable `post_id` FK to `project_posts(id) ON DELETE SET NULL`.

- `post_id IS NULL` → standalone KB file (not on the feed; admin-only at `/admin/projects/[id]/files`).
- `post_id IS NOT NULL` → attached to a post; visibility derived from the post's `client_visible`.

The existing per-file `for_ai_context` and `client_visible` flags are deprecated for post-attached files (use the post's flags). For standalone files, the flags continue to apply as today. **Migration policy:** files attached to a post during migration inherit their old flags onto the new post; the file row's flags are kept for backwards compatibility but no longer read on attached files (the queries select `post.client_visible`, `post.for_ai_context`).

### 3.3 `post_comments`

```ts
{
  id: uuid (pk),
  postId: uuid (fk project_posts.id, cascade),
  parentCommentId: uuid (fk post_comments.id, cascade, nullable — null = top-level reply),
  authorType: enum('admin','client') NOT NULL,
  authorAdminId: text (nullable; required when authorType='admin'),
  authorClientUserId: uuid (fk client_users.id, nullable; required when authorType='client'),
  body: text NOT NULL,
  createdAt, updatedAt, deletedAt: timestamptz
}
constraints:
  CHECK ((authorType='admin' AND authorAdminId IS NOT NULL AND authorClientUserId IS NULL)
      OR (authorType='client' AND authorClientUserId IS NOT NULL AND authorAdminId IS NULL))
indexes:
  (postId, createdAt asc)             -- comment thread render
  (parentCommentId, createdAt asc)    -- replies under a comment
```

One level of nesting only — the UI does not render nested replies-of-replies. If `parentCommentId` is set, the parent must itself have `parentCommentId IS NULL`. Enforce in the service layer.

### 3.4 Migration plan

One Drizzle migration, executed in order:

1. Create `project_posts`.
2. Add `post_id` column (nullable) to `project_files`.
3. Create `post_comments` (with the author check constraint).
4. **Data migration** (separate transaction):
   - For each `project_notes` row where `deleted_at IS NULL`: insert a `project_posts` row with `body = content`, copy `for_ai_context` and `client_visible`, copy timestamps, set `authorAdminId = created_by_admin_id`.
   - For each `project_files` row where `deleted_at IS NULL` AND not yet attached: create a `project_posts` row (body = NULL, copy flags, set `authorAdminId = uploaded_by_admin_id`) and update `project_files.post_id`.
   - **Decision needed before migration:** do existing standalone files become posts (visible on the feed) or stay standalone (invisible on the feed)? Lean: **stay standalone** (`post_id` left NULL) because they were uploaded with no narrative — promoting them silently into the feed would be confusing for clients. Admin can later "re-post" them by creating a new feed post that attaches the same file (requires a UI action to attach an existing standalone file — defer to P2 if not trivially built; otherwise just allow re-upload).
5. After migration verified: drop `project_notes` (separate migration).

## 4. Surface map

The standalone files page `/admin/projects/[id]/files` remains, but its role narrows:
- Admin uploads files **without a post body** for KB-only purposes (`for_ai_context: true, client_visible: false`).
- Admin uploads files **with a post body** via the feed compose UI — these create a `project_posts` row + attached file in one action.

Long-term, the standalone files page may be folded into "create a post with files" with a `clientVisible: false` toggle. P1 keeps both surfaces to avoid one big UX shift.

## 5. API surface

All under `app/(admin)/api/projects/[projectId]/...` and `app/(client)/api/projects/[projectId]/...` per existing route-group convention.

### 5.1 Posts (admin-only writes; reads gated by membership)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/projects/:id/posts` | client or admin (project member) | List posts paginated by `created_at desc`. Client sees only `client_visible=true`. |
| `POST` | `/api/admin/projects/:id/posts` | admin | Create post (body + file uploads via multipart). |
| `PATCH` | `/api/admin/projects/:id/posts/:postId` | admin (author or any admin) | Edit body / flags. Audit log entry. |
| `DELETE` | `/api/admin/projects/:id/posts/:postId` | admin | Soft-delete. Cascades visually but preserves comments for audit. |

### 5.2 Comments (both admin and client write)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/projects/:id/posts/:postId/comments` | project member | List comments (one level of nesting). |
| `POST` | `/api/projects/:id/posts/:postId/comments` | project member | Create comment. `authorType` derived from caller's role. Optional `parentCommentId` for a reply. |
| `PATCH` | `/api/projects/:id/posts/:postId/comments/:commentId` | author only | Edit own comment. |
| `DELETE` | `/api/projects/:id/posts/:postId/comments/:commentId` | author or any admin | Soft-delete. |

Authorization helpers: existing `requireAdmin()` and `requireClient()` from `lib/auth.ts`. Project membership check: existing pattern from chat routes — caller's `client_users.id` must be in `project_members`, OR caller is admin.

## 6. Queries — `lib/queries/feed.ts`

New domain query file. Functions (signatures, not impl):

- `listPostsForProject({ projectId, viewerKind, limit, cursor }) -> Post[]` — applies `client_visible` filter when `viewerKind = 'client'`.
- `getPostById({ postId, viewerKind, viewerId }) -> Post | null` — auth-aware.
- `createPost({ projectId, authorAdminId, body, files, forAiContext, clientVisible }) -> Post` — atomic: insert post + insert/attach files in one transaction.
- `updatePost({ postId, patch, editorAdminId }) -> Post`
- `softDeletePost({ postId, deleterAdminId }) -> void`
- `listCommentsForPost({ postId }) -> Comment[]` — flat array, sorted; UI groups by `parentCommentId`.
- `createComment({ postId, parentCommentId, authorType, authorId, body }) -> Comment`
- `updateComment({ commentId, body, editorId, editorType }) -> Comment` — verifies caller is author.
- `softDeleteComment({ commentId, deleterId, deleterType }) -> void` — author or any admin.

All admin mutations must call `lib/audit.ts` writer (existing convention).

## 7. UI

### 7.1 Admin (`app/(admin)/admin/projects/[id]/page.tsx` — extend)

Top of the project detail page: a **Compose Post** card (always present).
- Multiline textarea for body.
- File picker (multi-select), shows attached file chips with remove buttons.
- `client_visible` toggle (default ON — admin actively un-checks for internal-only posts).
- `for_ai_context` toggle (default OFF — admin opts in when the post is reference material for the AI).
- Submit → `POST /api/admin/projects/:id/posts` → optimistic insert into the feed list.

Below: chronological feed (newest first). Each post card shows:
- Author name (admin's Clerk profile), timestamp, body, file chips (download links), flag badges (`AI` / `Client visible`).
- Actions: Edit, Delete (soft).
- Comments section (lazy-expand or always-shown; lean: always-shown for posts with ≤5 comments, collapsed otherwise).
- Comment form at the bottom of the comments section.

### 7.2 Client (`app/(client)/dashboard/projects/[id]/page.tsx` — extend)

- No compose card.
- Feed list: only posts with `client_visible=true`. Same card layout as admin (minus admin-only flags).
- Comment form at the bottom of every post.
- Reply button on admin comments → expands a reply form with `parentCommentId` set.

### 7.3 Component file plan

- `app/(admin)/admin/projects/[id]/feed/compose.tsx` — client component, multipart submit.
- `app/_components/feed/post-card.tsx` — shared between admin/client surfaces (renders author, body, files, comments).
- `app/_components/feed/comment-thread.tsx` — flat list grouped by `parentCommentId`, recursive render disabled.
- `app/_components/feed/comment-form.tsx` — used by both admin and client.

Server components fetch data; client components handle interaction. Keep `"use client"` only where state is needed.

## 8. AI context interaction

Drop-in for the existing chat context builder in `lib/anthropic.ts`:
- The chat builder currently selects `project_files` and `project_notes` where `for_ai_context = true`.
- After this migration: select `project_posts` where `for_ai_context = true AND deleted_at IS NULL`. For each post, include `body` as text and walk its attached `project_files` for image / PDF / text blocks.
- `project_notes` no longer queried (table dropped).

This is a one-file change in the chat builder. Test: a freshly migrated project should produce identical context to the pre-migration build.

## 9. Authorization summary

| Action | Admin | Client (project member) | Anyone else |
|---|---|---|---|
| List posts (client_visible=true) | ✅ | ✅ | 403 |
| List posts (any visibility) | ✅ | ❌ (filtered) | 403 |
| Create post | ✅ | ❌ 403 | 403 |
| Edit/delete own post | ✅ (author) | n/a | 403 |
| Edit/delete other admin's post | ✅ | n/a | 403 |
| List comments | ✅ | ✅ | 403 |
| Create comment | ✅ | ✅ | 403 |
| Edit own comment | ✅ | ✅ | 403 |
| Delete own comment | ✅ | ✅ | 403 |
| Delete other's comment | ✅ (admin override) | ❌ 403 | 403 |

## 10. Build order

1. Schema: add `project_posts`, `post_comments`, `project_files.post_id`. Generate Drizzle migration.
2. `lib/queries/feed.ts` — pure functions, unit-testable.
3. Admin POST/PATCH/DELETE post routes + audit log writes.
4. Comment routes (shared admin + client).
5. GET routes (admin + client surfaces).
6. Data migration script: notes → posts; files → standalone (post_id NULL) per §3.4 decision.
7. Update `lib/anthropic.ts` chat context builder to read posts instead of notes/files-by-flag.
8. Compose post UI (admin).
9. Feed list + comment thread UI (shared).
10. Wire into admin project detail page.
11. Wire into client project detail page.
12. Drop `project_notes` table (separate migration after staging verification).
13. Smoke test end-to-end with a real project: post → client sees → client comments → admin replies → admin edits → admin soft-deletes.

## 11. Open questions

1. **Standalone-file promotion at migration.** §3.4 leans toward leaving existing files standalone (not on feed). Confirm before running migration. *Lean: leave standalone; admin re-posts as needed.*
2. **Comment edit window.** Allow indefinite editing or freeze after N minutes? *Lean: indefinite for MVP; revisit if the audit log gets noisy.*
3. **Admin-can-delete-client-comment.** §9 grants admin override. Required for moderation, but should the deletion be visible (tombstone "comment removed by GDI") or invisible? *Lean: tombstone — the client should know their comment was removed, not silently disappeared.*
4. **Notifications (P2).** Email when a client comments under a post? Or daily digest? Defer until admins ask. Memory says "likely needed so admins notice without polling" — agreed, but not P1.
5. **Pagination.** Cursor-based on `created_at`? Or simple `LIMIT 20 OFFSET N`? *Lean: cursor (consistent with chat messages).*
6. **Live updates.** Should clients see new posts without a refresh? *Lean: no for P1 — the chat surface already covers urgent comms; the feed is durable record, refresh is fine.*
