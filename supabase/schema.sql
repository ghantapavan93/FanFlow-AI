-- FanFlow AI — Supabase Lite schema
--
-- 4 tables. No auth — uses demo_session_id text so the prototype's
-- localStorage shim has a clean swap path.
--
-- Apply: psql or `supabase db push` against your project.
-- Then wire lib/data/supabaseFanflowStore.ts to read/write these tables.

-- ────────────────────────────────────────────────────────────────────────────
-- demo_sessions: anonymous, single-tab "users" of the prototype.
--   No auth. Stable per-browser via a UUID issued at first visit and stored
--   in localStorage. This is what Phase 2 would replace with StubHub OAuth.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists demo_sessions (
  id            text primary key,         -- client-generated UUID
  created_at    timestamptz default now() not null,
  display_name  text                      -- optional, never exposed
);

-- ────────────────────────────────────────────────────────────────────────────
-- readiness_profiles: the 4-step Readiness Check output, per session.
--   1:1 with demo_sessions. Re-saving replaces the row (upsert).
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists readiness_profiles (
  session_id    text primary key references demo_sessions(id) on delete cascade,
  transport     text not null check (transport in ('transit', 'driving', 'rideshare', 'walking')),
  group_type    text not null check (group_type in ('solo', 'couple', 'family_young_kids', 'family_teens', 'large_group')),
  needs         text[] not null default '{}',
  notes         text,
  updated_at    timestamptz default now() not null
);

-- ────────────────────────────────────────────────────────────────────────────
-- live_signals: staff + fan condition reports.
--   Append-only. Sorted by created_at desc when queried.
--   Indexed by event_id for the Hub's live feed.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists live_signals (
  id            text primary key,
  event_id      text not null,
  gate_id       text not null,
  source        text not null check (source in ('staff', 'fan')),
  sentiment     text not null check (sentiment in ('smooth', 'moderate', 'busy', 'difficult')),
  message       text not null,
  created_at    timestamptz default now() not null
);

create index if not exists live_signals_event_idx
  on live_signals (event_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- incidents: the staff-managed log shown in the Staff Console.
--   Mutable status: open → monitoring → resolved.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists incidents (
  id            text primary key,
  event_id      text not null,
  type          text not null check (type in (
                  'family_assistance', 'long_line', 'accessibility_question',
                  'lost_ticket', 'medical', 'lost_person', 'other'
                )),
  source        text not null check (source in ('staff', 'fan')),
  gate_id       text not null,
  status        text not null default 'open' check (status in ('open', 'monitoring', 'resolved')),
  note          text not null,
  action        text,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

create index if not exists incidents_event_idx
  on incidents (event_id, updated_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime: enable replication on signals + incidents so the Hub and Staff
-- Console can subscribe to changes — this is what replaces the localStorage
-- + custom-event signal bus in the prototype.
-- ────────────────────────────────────────────────────────────────────────────
-- (Supabase project settings → Replication → toggle on for live_signals + incidents)
