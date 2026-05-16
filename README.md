# FanFlow AI

**From ticket confirmed to venue ready.**

A post-purchase event-day guidance layer that turns a StubHub ticket confirmation into a personalized arrival plan, live conditions, and a context-aware support handoff — built around one real fan, one real venue, one complete journey.

---

## Honest limitations (read first)

This is a 3-day prototype, not production. Each of the following is a **documented seam, not an oversight** — the architecture is deliberately shaped to swap each piece out:

| Limitation | Why | Where it's documented / swap path |
|---|---|---|
| **`localStorage` state, not a database** | No auth, no DB, no backend infrastructure. Fan preferences, published signals, and incident overrides all live in `localStorage`. | `lib/store.ts` is the single swap point — replace its helpers with Supabase Postgres + Realtime in Phase 2. Hub and Staff Console consume through the same interface and don't care where data comes from. |
| **One seeded event** | The demo is `wc2026-final` only (FIFA World Cup 2026 Final at MetLife Stadium, Maria as the user). | `lib/seed.ts` is the only data source. `deriveArrivalPlan` is already parameterized — a real implementation queries by `params.id`. |
| **Template explanation by default** | The AI explanation card uses a deterministic template unless `GROQ_API_KEY` or `GEMINI_API_KEY` is set in the environment. | This is intentional. The demo must work with zero keys — adding one is a tone upgrade, never a dependency. See the fallback matrix in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). |
| **No auth or StubHub account integration** | Maria is hardcoded in `lib/seed.ts`. | Production would gate access behind StubHub OAuth; the seed ticket would be replaced by a query against the user's purchases. |
| **No real venue API** | All venue, gate, and support-point data is seeded. | The schema in `lib/types.ts` is already aligned with the Phase 2 Supabase tables in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). |
| **No streaming AI, no retries, no agent loops** | Single `POST /api/explain-arrival-plan` endpoint, single LLM call per request, 2500ms timeout, fall back to template. | Streaming buys nothing under 450 chars. Agentic systems would add surface area without value here. |
| **No tests** | Out of scope for a 3-day prototype. | The rule engine in `lib/seed.ts` is pure functions — trivial to add Vitest unit tests. The journey is straightforward to cover with Playwright. |

**Every "no" above is the answer to a real engineering question, not laziness.** The pitch is *"I shipped one complete journey end-to-end, with every cut documented and every fallback verified"* — not *"I built StubHub 2.0."*

---

## Backend and scenario coverage

The prototype isn't just a happy-path demo. Four pieces of engineering make the recommendation **debuggable, swappable, and provably correct across real fan personas**:

### 1. `localStorage` is the default demo store

`lib/store.ts` writes prefs, signals, and incidents to `localStorage` and dispatches three custom window events (`fanflow:readiness`, `fanflow:signals`, `fanflow:incidents`) so the Hub and Staff Console stay in sync across tabs without any backend. Zero infra, two-sided demo, demo-stable.

### 2. The data layer is a one-file swap

[`lib/data/`](lib/data/) wraps the store behind a `FanflowStore` interface:

```ts
interface FanflowStore {
  getReadiness(sessionId): Promise<ReadinessPrefs | null>
  saveReadiness(sessionId, prefs): Promise<void>
  getSignals(eventId): Promise<LiveSignal[]>
  publishSignal(signal): Promise<void>
  getIncidents(eventId): Promise<Incident[]>
  updateIncident(id, patch): Promise<void>
}
```

The default implementation (`localFanflowStore`) wraps the localStorage shim in `Promise.resolve()`. A stub `supabaseFanflowStore` lives alongside it, ready to be filled in. The factory in `lib/data/index.ts` selects between them based on env vars — set `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` and the Supabase path is selected automatically (still a stub until you complete the bodies). See [`docs/SUPABASE_LITE.md`](docs/SUPABASE_LITE.md) for the minimal 4-table schema (`demo_sessions`, `readiness_profiles`, `live_signals`, `incidents`) and the swap path.

### 3. Scenario fixtures prove the rule engine across multiple fan needs

[`lib/scenarios/scenarios.ts`](lib/scenarios/scenarios.ts) defines 7 scenarios with explicit expected behaviors:

| Scenario | What it proves |
|---|---|
| Maria — family, first-time visitor | The locked demo case end-to-end |
| Solo regular fan | The rule engine doesn't over-personalize when prefs are minimal |
| Accessibility-focused fan | Wheelchair need → accessible gate wins; Accessibility Services surfaces |
| Sensory / crowd-sensitive fan | Quiet Space surfaces in support points; gate with short wait wins |
| No live signals | Cold-start plan is sensible and confidence stays correct |
| Staff override vs fan noise | Staff `smooth` signal beats three fan `busy` signals (3× weighting) |
| LLM failure / template fallback | Endpoint behavior when no API key, gate mismatch, or timeout |

### 4. Score breakdown makes the recommendation debuggable

`deriveArrivalPlan` returns `gate_scores: GateScoreBreakdown[]` — every gate's score broken down into seven components (`section_proximity`, `accessibility_match`, `family_match`, `sensory_match`, `wait_penalty`, `staff_signal`, `fan_signal`) plus the total. The Arrival Guide renders this in a collapsible **"Why this gate?"** panel. No magic numbers, no black box — you can see exactly why a gate won.

Section proximity is tiered: exact match `+10`, within 10 sections `+6`, within 20 sections `+3`, otherwise `0`.

### Run the tests

```bash
npm test           # one-shot: 27 tests across 2 files
npm run test:watch # watch mode while iterating
```

`tests/rule-engine.test.ts` asserts the rule engine matches each scenario's expected behavior. `tests/explanation.test.ts` asserts the sanitizer scrubs banned phrases, enforces the safety note, hard-caps at 450 chars, and that `mentionsWrongGate()` discards any LLM output that names a different gate than the one rules already chose.

---

## Why this exists

StubHub has already made discovery conversational through ChatGPT. Fans can find a game, filter by view, adjust budget, and buy a ticket in natural language.

That solves *finding*. It does not solve the 48-hour window between purchase and venue entry — where fans still feel stress, uncertainty, and friction.

FanFlow AI is the layer that picks up there. Not a chatbot. Not another discovery copilot. A confidence layer for the moment between *"I have a ticket"* and *"I am in my seat."*

---

## Prior art and references

I studied the following products and projects to ground the FanFlow architecture in patterns that already exist at scale. **Each entry lists what was borrowed and what was deliberately not copied.** No SDKs were integrated; nothing here claims a partnership.

### Indoor wayfinding and stadium UX

| Reference | What was borrowed | What was deliberately not implemented |
|---|---|---|
| [Mappedin — Stadiums](https://www.mappedin.com/industries/stadiums/) | "Event-day scale" framing for gates / concessions / exits / seats; mobile + web venue guidance language | Mappedin SDK, real venue API, dynamic 3D rendering |
| [Mappedin — Stadium web app (car-to-seat)](https://www.mappedin.com/resources/blog/product-101-stadium-web-app/) | The car-to-seat mental model, adapted as *"ticket confirmed to venue ready"* | Native turn-by-turn, real-time positioning |
| [Mappedin — Wayfinding SDK for stadiums](https://www.mappedin.com/resources/blog/wayfinding-sdk-stadiums/) | "Parking lot → gate → seat" journey; shops/services *along the route* | Pathfinding engine, route computation |
| [OpenIndoorMaps](https://github.com/openindoormaps/openindoormaps) | Open-source indoor-navigation thinking; venue zones; self-hosted approach is honest about scale | Full GeoJSON pipeline; tiled map data |
| [KnotzerIO — indoor-wayfinder](https://github.com/KnotzerIO/indoor-wayfinder) | Interactive React+TS SVG floorplan; marker-click interaction; route overlay style | Full pathfinding graph; floor-switcher UX |
| [Google Indoor Maps](https://www.google.com/maps/about/partners/indoormaps/) | Indoor floorplans are a *familiar* user pattern; validates SVG approach | Google Maps integration, satellite tiles |
| [MapsIndoors / MapsPeople](https://www.mapspeople.com/mapsindoors) | 2D/3D map progression as Phase 3 thinking; map-update automation as Phase 3 framing | Map SDK, automated update pipeline |

**FanFlow's choice:** a single hand-drawn stylized SVG (`app/event/[id]/venue-map/page.tsx`) with clickable gate + support markers and a dashed purple route from gate to seat. Filter chips at the top let users switch between All / Gates / First Aid / Family / Accessibility / Quiet Space / Restrooms / Guest Services. This sits in the same product category as the above without claiming any of them.

### Accessibility and support

| Reference | What was borrowed | What was deliberately not implemented |
|---|---|---|
| [RightHear — Stadiums](https://www.right-hear.com/stadiums/) | Accessibility wayfinding language; gates / restrooms / amenities / sections vocabulary; calm copy | Audio positioning, beacon-based wayfinding, sensor hardware |
| [Sports Illustrated Stadium + RightHear announcement](https://www.newyorkredbulls.com/news/sports-illustrated-stadium-introduces-righthear-to-assist-accessibility-wayfinding) | Real-world validation that stadium accessibility is a product, not an afterthought | Anything that requires venue-deployed hardware |

**FanFlow's choice:** explicit `accessibility` and `quiet_space` support types in `lib/types.ts`, scored into the gate-selection rules. Accessibility-need fans are routed to accessible gates with a +6 score boost, and Accessibility Services / Quiet Space surface in the support points.

### Event-day visitor companion apps

| Reference | What was borrowed | What was deliberately not implemented |
|---|---|---|
| [Attractions.io — Sport and entertainment venues](https://attractions.io/use-case/mobile-apps-for-sport-and-entertainment-venues) | Pre-visit / during-visit support framing; live updates; mobile event-companion language | Theme-park monetization patterns, loyalty programs, F&B ordering |
| [Attractions.io — Interactive wayfinding](https://attractions.io/feature-library/interactive-wayfinding) | Route-focused map language; quick destination finding; simple CTAs | Full route engine, AR overlays |

**FanFlow's choice:** the Hub *is* the during-visit companion — countdown, plan, checklist, live conditions, fan pulse, support tiles, Need Help. Mobile-first by design.

### Staff console / internal operations

| Reference | What was borrowed | What was deliberately not implemented |
|---|---|---|
| [Kiranism — next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | Dark dashboard layout; status cards; incident-log tables; publish-update form structure; admin UI patterns | shadcn/ui migration (Phase 2 polish); the full starter template; sidebar navigation |

**FanFlow's choice:** the Staff Console at `/staff/[id]` is dark-mode, hand-built in Tailwind, with a gate-status grid + incident log (open/monitoring/resolved status pills) + live signal feed + publish-update form. Same shape, smaller surface area.

### Backend and real-time

| Reference | What was borrowed | What was deliberately not implemented |
|---|---|---|
| [Supabase — Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) | Subscription pattern; staff→fan UI architecture; channel-based design | Full Supabase wiring in v1 |
| [Supabase — Realtime overview](https://supabase.com/docs/guides/realtime) | The production architecture that replaces `localStorage` + custom events | Same — Phase 2 |

**FanFlow's choice:** the `FanflowStore` interface in `lib/data/fanflowStore.ts` is the swap seam. Today: `localFanflowStore` wraps localStorage with same-tab custom events + cross-tab `storage` events. Tomorrow: `supabaseFanflowStore` (the stub is alongside) gets filled in. Same interface, zero UI rewrite. See [`docs/SUPABASE_LITE.md`](docs/SUPABASE_LITE.md).

### The pattern: borrow framing, refuse SDKs

Every reference above is a real product or open-source project doing some piece of the venue / event / wayfinding / accessibility / real-time problem. FanFlow does **none of their work** — it sits in the post-purchase confidence layer where none of them sit. What it borrows is **vocabulary and validation**:

- *"Event-day scale"* is Mappedin's phrase. It's the right phrase.
- *"Car-to-seat"* is Mappedin's mental model. The post-purchase version is *"ticket-confirmed-to-venue-ready"* — same shape, earlier moment.
- *"Accessibility wayfinding is a real product category"* is RightHear's validation. FanFlow's job is to participate in that category honestly, not to ship hardware.
- *"Indoor floorplans are a familiar pattern"* is Google's validation. FanFlow uses an SVG, not their tiles.

The list above is the answer to a recruiter asking *"why did you make these choices?"* — every choice has prior art, and every non-choice has a named reason.

---

## 75-second walkthrough script

For the demo video. Each beat is 8–12 seconds; the whole thing is ~75 seconds.

| Beat | URL | Action | What it proves |
|---|---|---|---|
| 1 · Hook | `/` | Pause on the hero — "Discovery is solved. Arrival is not." | The wedge: post-purchase, not discovery |
| 2 · Story | `/` | Scroll past the phone-mockup chaos animation, Maria scenario, 5-step timeline | Real fan, real venue, full journey |
| 3 · Enter Hub | `/event/wc2026-final/hub` | Show countdown, plan card, live conditions, support tiles | Shipped end-to-end fan surface |
| 4 · Personalize | `/event/wc2026-final/readiness` | Quick 4-step: transit, family with young kids, stroller need | 90-second readiness check |
| 5 · Plan changes live | Back to `/hub` | Highlight: impact cards now show "Tailored to you" with 4 reasons | Rules respond to prefs |
| 6 · Why this gate | `/event/wc2026-final/guide` | Expand "Why this gate?" → show 7-component score breakdown per gate | Recommendation is debuggable, not magic |
| 7 · AI explains | Same page | Point at the explanation card + source pill (`Template` or `AI · groq`) | Rules decide. AI explains. |
| 8 · Two-sided | New tab → `/staff/wc2026-final` | Publish a `busy` signal at Gate 1. Switch back to Hub tab | Cross-tab signal bus refreshes the fan view live |
| 9 · Scenario coverage | `/debug` | Click "Apply" on the **Accessibility scenario** → open Hub | Same code, different fan, different gate picked |
| 10 · Close | Back to `/` | Footer trust statement | *"Fans don't need more data. They need a plan they can trust."* |

---

## Scenario test matrix

The rule engine isn't hardcoded around Maria. Seven scenarios live in [`lib/scenarios/scenarios.ts`](lib/scenarios/scenarios.ts), each with explicit assertions verified by Vitest:

| Scenario | Prefs | Signals | Expected behavior | Test file |
|---|---|---|---|---|
| Maria — family, first-time | transit / family_young_kids / stroller | none | Gate 3 wins, Family Services surfaces, confidence high | `tests/rule-engine.test.ts` |
| Solo regular fan | transit / solo / none | none | Gate 3 (section proximity), no family surfaces, defaults to first_aid | `tests/rule-engine.test.ts` |
| Accessibility-focused | rideshare / couple / wheelchair | none | Accessible gate (≠ Gate 7), Accessibility Services in plan | `tests/rule-engine.test.ts` |
| Sensory / crowd-sensitive | transit / solo / sensory_sensitive | none | Quiet Space surfaces, short-wait gate wins | `tests/rule-engine.test.ts` |
| No live signals | family / stroller | empty array | Gate 3, finite scores, confidence high | `tests/rule-engine.test.ts` |
| Staff override vs fan noise | family / stroller | 3× fan "busy" at Gate 3 + 1× staff "smooth" at Gate 3 | Gate 3 still wins; gate_scores show staff +6, fan −6 | `tests/rule-engine.test.ts` |
| LLM failure / template fallback | — | — | No key → template. Wrong-gate mention → template. > 2.5s → template. Sanitizer scrubs banned phrases. Safety note always present. | `tests/explanation.test.ts` |

Run: `npm test` — **27 tests passing, ~900ms total.**

The same scenarios are available in the live demo at [`/debug`](/debug) — click any one to apply it to localStorage and watch the Hub + Staff Console respond.

---

## Production path: prototype → Phase 2

The single architectural claim that makes the prototype credible:

> **The UI consumes a `FanflowStore` interface, not a storage implementation.**
> Swapping localStorage for Supabase Realtime is a one-file change, not a UI rewrite.

```
Prototype (today):
┌─────────────────────────────────────────────────────────┐
│ Next.js UI (Hub, Guide, Staff Console, Readiness, ...)  │
│            │                                            │
│            ▼                                            │
│ FanflowStore interface  ◀── lib/data/fanflowStore.ts    │
│            │                                            │
│            ▼                                            │
│ localFanflowStore       ◀── lib/data/localFanflowStore  │
│            │                                            │
│            ▼                                            │
│ lib/store.ts → localStorage + window custom events      │
│             + storage events (cross-tab)                │
└─────────────────────────────────────────────────────────┘

Production (Phase 2):
┌─────────────────────────────────────────────────────────┐
│ Next.js UI (zero changes — same interface)              │
│            │                                            │
│            ▼                                            │
│ FanflowStore interface  ◀── same interface              │
│            │                                            │
│            ▼                                            │
│ supabaseFanflowStore    ◀── filled in from stub         │
│            │                                            │
│            ▼                                            │
│ Supabase Postgres + Realtime channels                   │
│   - demo_sessions                                       │
│   - readiness_profiles                                  │
│   - live_signals (replicated → Realtime)                │
│   - incidents (replicated → Realtime)                   │
└─────────────────────────────────────────────────────────┘
```

The full swap procedure is documented in [`docs/SUPABASE_LITE.md`](docs/SUPABASE_LITE.md). The 4-table schema is in [`supabase/schema.sql`](supabase/schema.sql), intentionally tiny: no auth, no events table (events are static reference data in `lib/seed.ts`), no users (uses `demo_session_id`).

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
