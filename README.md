# FanFlow AI

**From ticket confirmed to venue ready.**

A post-purchase event-day guidance layer that turns a StubHub ticket confirmation into a personalized arrival plan, live conditions, and a context-aware support handoff — built around one real fan, one real venue, one complete journey.

---

## Why this exists

StubHub has already made discovery conversational through ChatGPT. Fans can find a game, filter by view, adjust budget, and buy a ticket in natural language.

That solves *finding*. It does not solve the 48-hour window between purchase and venue entry — where fans still feel stress, uncertainty, and friction.

FanFlow AI is the layer that picks up there. Not a chatbot. Not another discovery copilot. A confidence layer for the moment between *"I have a ticket"* and *"I am in my seat."*

---

## Demo flow (90 seconds)

1. **Landing** (`/`) — Problem framing, Maria scenario, what FanFlow does and doesn't do.
2. **Event Day Hub** (`/event/wc2026-final/hub`) — Live countdown, arrival plan, before-you-leave checklist, live conditions, fan pulse, nearby support.
3. **Readiness Check** (`/event/wc2026-final/readiness`) — 90-second guided flow: transport, group, accessibility needs, free-form notes. Plan re-derives on save.
4. **Arrival Guide** (`/event/wc2026-final/guide`) — Timeline, AI-rewritten explanation card (with a *Template* / *AI · groq* / *AI · gemini* source pill), route details, conditions at your gate, support.
5. **Venue Map** (`/event/wc2026-final/venue-map`) — Stylized SVG of MetLife with the recommended gate pulsing, walking path to seat, clickable support markers.
6. **Need Help** — Modal opens from Hub or Guide. Shows current plan + 6 issue categories with context-aware suggested actions, plus quick links to nearest support and StubHub Help.
7. **Staff Console** (`/staff/wc2026-final`) — Dark-mode operator view. Gate status panel, incident log with status controls, live signal feed, and a publish-update form. Publishing here updates the fan Hub within seconds.

---

## The locked scenario

- **Event:** FIFA World Cup 2026 Final at MetLife Stadium
- **Fan:** Maria, 34, from Medellín, Colombia
- **Context:** First World Cup, first time at MetLife, attending with her 6-year-old son, taking NJ Transit from Manhattan, Section 117 Row 12 Seat 4, mild crowd anxiety
- **Why this fan:** She naturally surfaces the real friction — international visitor, first-time venue, family group, public transit, accessibility-adjacent needs

One scenario, deep. Not generic.

---

## Architecture: Rules decide, AI explains

This is the architectural promise the entire product is built around.

### Rules decide

A deterministic rule engine (`lib/seed.ts → deriveArrivalPlan`) takes the user's readiness preferences and recent live signals and produces:

- Recommended gate (scored against section match, accessibility needs, family-friendliness, typical wait, and recent staff/fan signals)
- Leave-by time (transport buffer + group buffer + family buffer)
- Arrival time (30 min after doors open)
- Confidence level (`high` when prefs known, `medium` otherwise)
- Support points (prioritized by need: accessibility → family services → quiet space → first aid → others)

Staff signals are weighted **3× over fan signals**. Fan signals only meaningfully influence guidance when several recent reports agree, or when staff confirms.

### AI explains (and only explains)

A single endpoint, `POST /api/explain-arrival-plan`, takes the already-computed plan and produces a calm, plain-English explanation. AI **never** chooses the gate, changes a time, invents a venue fact, or claims certainty.

#### Provider cascade

1. Build a deterministic template explanation from the plan.
2. If `GROQ_API_KEY` is set → call Groq (`llama-3.3-70b-versatile`) with a 2500ms `AbortController` timeout. Use it on success.
3. Else if `GEMINI_API_KEY` is set → call Gemini (`gemini-1.5-flash`) with the same timeout. Use it on success.
4. On any failure, non-200 response, timeout, or malformed output → return the template.
5. Every LLM response passes through `sanitizeExplanation()` regardless — banned phrases get replaced (`guaranteed` → `recommended`, `definitely` → `likely`, `no wait` → `short wait`, etc.), the safety note is enforced, and the output is hard-capped at 450 characters at a sentence boundary.

The Guide page shows a source pill so reviewers can see this in action — `Template`, `AI · groq`, or `AI · gemini`.

**The demo works with no API key.** It just stays on the template.

---

## Pages and surfaces

| Surface | Path | Notes |
|---|---|---|
| Landing | `/` | Problem framing + Maria + How it works + Does/Doesn't trust panel |
| Event Day Hub | `/event/[id]/hub` | The most important page. Countdown, plan, checklist, live conditions, fan pulse, support, Need Help |
| Readiness Check | `/event/[id]/readiness` | 4-step guided flow, persists to localStorage |
| Arrival Guide | `/event/[id]/guide` | Journey timeline + AI-rewritten explanation + route + conditions at gate |
| Venue Map & Support | `/event/[id]/venue-map` | Stylized SVG with interactive markers |
| Staff Console | `/staff/[id]` | Dark mode. Gate status + incident log + signal feed + publish form |
| Explain API | `POST /api/explain-arrival-plan` | Zod-validated, Groq → Gemini → template cascade |

---

## Tech stack

- **Framework:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Validation:** Zod
- **State:** React hooks + `localStorage` with window events to share state across pages and tabs (Hub ↔ Staff Console)
- **LLM providers:** Groq (preferred) or Gemini, called via plain `fetch` with `AbortController` timeouts — no SDKs, no streaming, no retries. Stateless.
- **Hosting:** Vercel-ready

Deliberately **not** used: RAG, LangChain, LangGraph, vector DBs, Supabase (Phase 2), payment integrations, auth, native mobile, push notifications.

---

## State sharing between Hub and Staff Console

There's no backend. Hub and Staff Console share state through `localStorage` + a small set of custom window events:

- `fanflow:signals` — fired when a staff member publishes an update or a fan taps a pulse button
- `fanflow:readiness` — fired when the Readiness Check saves prefs
- `fanflow:incidents` — fired when an incident status changes

Open the Hub in one tab and the Staff Console in another. Publish a staff update from the console — it appears in the Hub's "Live Conditions" panel in under a second. This is mocked through `localStorage` events for the prototype; in production this would be Supabase Realtime or a similar pub/sub.

---

## Safety and limitations

This prototype includes explicit safety wording on every recommendation surface and inside the Need Help sheet:

- *"Always follow official venue signage and staff instructions."*
- *"For urgent medical or safety issues, contact venue staff or local emergency services (911). FanFlow provides guidance, not emergency response."*

Honest limitations:

- All venue, gate, and support data is seeded — production would need official venue data feeds.
- Live signals are mocked through `localStorage` — production would need Supabase Realtime, push, or similar.
- No StubHub account integration — Maria's ticket is hard-coded in `lib/seed.ts`.
- AI explanation is rewording only — it does not, and architecturally cannot, choose the gate or change a time.
- "Confidence: high" means *the rule engine had enough preference data to be specific*, not *we guarantee this outcome*.

---

## Running locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### Enabling the LLM rewrite (optional)

Create `.env.local`:

```bash
# Pick one. Groq is faster and has a free tier.
GROQ_API_KEY=...
# or
GEMINI_API_KEY=...
```

Restart the dev server. The Arrival Guide explanation card will show `AI · groq` (or `AI · gemini`) in the corner pill when the LLM responds within 2500ms, and `Template` otherwise.

### Build

```bash
npm run build
```

---

## Phase 2 roadmap

Deliberately out of v1 scope to keep the prototype focused:

- Supabase Postgres + Realtime (replace `localStorage` shim)
- StubHub account context — pull real ticket + order data
- Multi-event support (currently one hard-coded scenario)
- Push notifications when gate conditions change near leave-by time
- Official venue data feeds (gate status, wait times, lot availability)
- Accessibility audit (WCAG AA)
- Internationalization (Spanish first — the locked scenario is a Colombian visitor)
- Analytics: support contact deflection, plan-vs-actual arrival delta, NPS

Explicitly **not** planned: discounts, rewards, leaderboards, social shoutouts, AI chatbot, exact crowd prediction, real map APIs, 3D venue rendering.

---

## File layout

```
fanflow-ai-complete/
├── app/
│   ├── page.tsx                          Landing
│   ├── layout.tsx
│   ├── globals.css
│   ├── api/
│   │   └── explain-arrival-plan/route.ts AI explanation cascade
│   ├── event/[id]/
│   │   ├── hub/page.tsx                  Event Day Hub
│   │   ├── readiness/page.tsx            Readiness Check
│   │   ├── guide/page.tsx                Arrival Guide
│   │   └── venue-map/page.tsx            Venue Map & Support
│   └── staff/[id]/page.tsx               Staff Console
├── components/
│   └── shared/HelpSheet.tsx              Context-aware Need Help modal
├── lib/
│   ├── types.ts                          Domain types
│   ├── seed.ts                           Seed data + rule engine
│   ├── store.ts                          localStorage + window events
│   └── explain/arrivalExplanation.ts     Template + sanitizer + Zod schema
└── docs/
    └── ARCHITECTURE.md                   Data flow, rule engine, AI cascade detail
```

---

Built as a product-thinking exercise for StubHub's post-purchase journey. Rules first. AI second. White premium UI. One scenario, deep.
