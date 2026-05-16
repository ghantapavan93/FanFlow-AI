# Supabase Lite — the prototype's swap path

FanFlow's prototype runs on `localStorage` + custom window events. That's deliberate — see the [Honest Limitations](../README.md#honest-limitations-read-first) in the README. But the architecture is shaped so that swapping in a real backend is a **one-file change**, not a rewrite.

This doc explains the minimal Supabase schema (`supabase/schema.sql`), why it's intentionally tiny, and the exact steps to flip the prototype onto a real database.

---

## Why "Lite"

The full Phase 2 backend in [ARCHITECTURE.md](./ARCHITECTURE.md) lists ~12 tables (events, venues, gates, sections, tickets, users, preferences, guidance, support locations, fan updates, staff updates, conditions, incidents). That's the right model for production.

This schema is **only the 4 tables that have user-mutable state in the prototype**:

| Table | Purpose | Replaces |
|---|---|---|
| `demo_sessions` | Anonymous, per-browser identity | localStorage's implicit "single-user" assumption |
| `readiness_profiles` | The 4-step Readiness Check output | `fanflow_readiness` localStorage key |
| `live_signals` | Staff + fan condition reports | `fanflow_published_signals` localStorage key |
| `incidents` | Staff-managed incident log | `fanflow_incidents_overrides` localStorage key |

Everything else (events, venues, gates, support points) stays seeded in `lib/seed.ts` for now — those are static reference data that wouldn't change between demo and production *for this scenario*.

---

## What's deliberately out of scope

- **Auth.** No `auth.users`, no row-level security policies, no JWT. `demo_session_id` is a client-generated UUID stored in localStorage. Production would replace this with StubHub OAuth → `auth.users.id`.
- **Multi-event.** `event_id` is a text column today. No `events` table yet — the prototype is `wc2026-final` only.
- **Tickets, purchases, accounts.** Those live in StubHub. The prototype assumes the user already has a ticket.
- **Migrations / Prisma / ORMs.** Hand-edit the SQL or use `supabase db push`. The prototype isn't worth a migration tool yet.

Each of these is the same answer: *"this would matter for production, but it's not what the prototype is proving."*

---

## How to swap

1. **Create a Supabase project**, copy the project URL and the *service role* key.
2. **Install the SDK:**
   ```bash
   npm install @supabase/supabase-js
   ```
3. **Apply the schema:**
   ```bash
   psql "$DATABASE_URL" -f supabase/schema.sql
   # or
   supabase db push
   ```
4. **Add env vars** to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
5. **Fill in `lib/data/supabaseFanflowStore.ts`** with real `createClient(...)` calls. The interface is already defined and the local implementation is the reference.
6. **Enable Realtime** on `live_signals` and `incidents` in the Supabase dashboard → Replication.
7. **Subscribe in the UI:** in `lib/store.ts`, replace the custom-event listeners with Supabase Realtime channels. The store interface stays identical.

That's the entire swap. No UI changes, no route changes, no rule-engine changes.

---

## Why the abstraction matters

Without `lib/data/`, swapping localStorage for Supabase means touching every page that reads or writes — Hub, Guide, Staff Console, Readiness Check, Venue Map, HelpSheet. That's 6 files plus type concerns.

With the abstraction, the swap point is **one file** (`lib/data/index.ts` picks the implementation; `lib/data/supabaseFanflowStore.ts` provides the body). Everything else consumes through the same `FanflowStore` interface and doesn't notice.

This is what the README means by *"every limitation is a documented seam, not an oversight."*
