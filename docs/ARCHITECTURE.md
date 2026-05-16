# FanFlow AI — Architecture Notes

This document covers the architectural decisions behind FanFlow AI's prototype. It is intentionally precise about what the system does, and even more precise about what it does *not* do.

## Guiding principle: Rules decide. AI explains.

This is not a design preference. It is the only way a post-purchase guidance product earns trust.

- **Rules** produce the structured plan: which gate, which times, which support points, which confidence level.
- **AI** rewords the plan in a warmer, more human tone. It cannot change any of the facts.
- A fan-facing recommendation that says *"AI predicted Gate 3 will be smooth"* is reckless. A fan-facing recommendation that says *"Based on your section, your group, and recent staff updates, Gate 3 is recommended"* is shipped.

Every architectural decision below serves that principle.

---

## Data flow

```
┌──────────────────┐                    ┌──────────────────┐
│  Readiness Check │  saveReadiness     │  Hub (fan)       │
│  /event/.../     │  ─────────────────▶│  /event/.../hub  │
│  readiness       │  localStorage +    │                  │
└──────────────────┘  window event      │  deriveArrival   │
                                        │  Plan(prefs,     │
                                        │  signals)        │
                                        └────────┬─────────┘
                                                 │ POST plan
                                                 ▼
                              ┌────────────────────────────────┐
                              │  /api/explain-arrival-plan     │
                              │  1. Zod-validate body          │
                              │  2. buildTemplateExplanation() │
                              │  3. (optional) call Groq       │
                              │  4. (optional) call Gemini     │
                              │  5. sanitizeExplanation()      │
                              │  → { explanation, source,      │
                              │      generatedAt }             │
                              └────────────────────────────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  Arrival Guide   │
                                        │  /event/.../     │
                                        │  guide           │
                                        └──────────────────┘

┌──────────────────┐                    ┌──────────────────┐
│  Staff Console   │  publishSignal     │  Hub (fan)       │
│  /staff/[id]     │  ─────────────────▶│  Live Conditions │
│                  │  localStorage +    │                  │
│  Incident Log    │  fanflow:signals   │  refreshes via   │
│  Publish form    │  event             │  window event    │
└──────────────────┘                    └──────────────────┘
```

---

## Seed data structure

All venue, gate, ticket, support, signal, and incident data lives in `lib/seed.ts`. This is intentional for the prototype — there is no database. Production would replace this with Supabase tables for `events`, `venues`, `gates`, `sections`, `tickets`, `user_preferences`, `arrival_guidance`, `support_locations`, `fan_updates`, `staff_updates`, `live_conditions`, and `incidents`.

Domain types live in `lib/types.ts`:

- `Event` — id, name, date (ISO), image_url, venue_id
- `Venue` — id, name, gates[], support_points[]
- `Gate` — id, name, sections[], accessibility, family_friendly, typical_wait_minutes, map_x/y for the SVG
- `Ticket` — id, section, row, seat
- `SupportPoint` — id, type, name, description, walk_time_minutes, map_x/y
- `SupportType` — `first_aid | family_services | accessibility | restroom | guest_services | quiet_space | concessions`
- `ReadinessPrefs` — transport, group, needs[], optional notes, updated_at
- `LiveSignal` — id, gate_id, source (`staff | fan`), sentiment (`smooth | moderate | busy | difficult`), message, created_at
- `Incident` — id, type, source, gate_id, status (`open | monitoring | resolved`), created_at, updated_at, note, optional action

The seed file exports the demo event (FIFA World Cup 2026 Final), demo venue (MetLife Stadium with 3 gates and 6 support points including a quiet/sensory space), demo ticket (Maria, Section 117 Row 12 Seat 4), three seeded live signals, and three seeded incidents.

---

## Rule engine — `deriveArrivalPlan(prefs, signals)`

Lives in `lib/seed.ts`. Pure function. No I/O, no LLM, no randomness. Same inputs always produce the same plan.

### Gate scoring

Each gate gets a numeric score:

| Factor | Weight |
|---|---|
| Gate serves the fan's section | +10 |
| Fan needs wheelchair access AND gate is accessible | +6 |
| Fan has stroller AND gate is family-friendly | +4 |
| Fan group is `family_young_kids` or `family_teens` AND gate is family-friendly | +3 |
| Fan is sensory-sensitive AND typical wait ≤ 6 min | +2 |
| Typical wait time | `−wait_min / 3` |
| Recent signal at this gate (last 2 hours), staff source | `sentiment_score × 3` |
| Recent signal at this gate, fan source | `sentiment_score × 1` |

`sentiment_score` is `{smooth: +2, moderate: 0, busy: −2, difficult: −4}`.

The highest-scoring gate wins. This is why staff signals dominate — a single staff "smooth" report is worth six points more than a single fan "smooth" report.

### Leave-by time

```
arrival_time   = doors_open + 30 min
transport_buf  = transit 45 / driving 60 / rideshare 35 / walking 25
group_buf      = solo 0 / couple 5 / family_young_kids 20 / family_teens 10 / large_group 15
leave_by_time  = arrival_time − (transport_buf + group_buf)
```

### Support point prioritization

The first three support points in the plan are prioritized in this order, deduped:

1. Accessibility services (if fan needs wheelchair/hearing/visual support)
2. Family services (if family with young kids or stroller need)
3. Quiet/sensory space (if fan is sensory-sensitive)
4. First aid (always included if not already)
5. Everything else, in seed order

### Confidence

- `high` — readiness prefs known
- `medium` — no readiness prefs (default plan)

The UI badge color matches: emerald / amber / rose. The plan's `confidence_reason` field is plain English explaining what produced the level.

---

## Explanation endpoint — `POST /api/explain-arrival-plan`

Implemented in `app/api/explain-arrival-plan/route.ts`. Stateless, runtime `nodejs`, `dynamic = 'force-dynamic'`.

### Request shape (Zod-validated)

```ts
{
  plan: {
    recommended_gate: { id, name, typical_wait_minutes, accessibility, family_friendly, sections[] },
    leave_by_time, arrival_time, route_summary, confidence, confidence_reason,
    support_points: [{ id, type, name }]
  },
  user:       { transport, group, needs[], section },
  event:      { name, venue },
  conditions: { recent_staff_sentiment, recent_fan_signal_count }
}
```

Invalid bodies return `400` with Zod's flattened issues.

### Cascade

1. `buildTemplateExplanation(req)` produces a deterministic, sanitized, factually correct paragraph from the structured plan. This is the baseline — it is what fans see if everything else fails.
2. If `process.env.GROQ_API_KEY` is present, call Groq's OpenAI-compatible chat completions endpoint (`llama-3.3-70b-versatile`, temperature 0.4, max tokens 220). The request carries a tight system prompt with explicit "never say guaranteed/definitely/zero wait/medical advice" rules. The user prompt includes the deterministic template and asks for a tone rewrite — *facts unchanged*.
3. If Groq is not configured but `GEMINI_API_KEY` is, call Gemini 1.5 Flash with the same prompt structure.
4. Each provider call is wrapped in an `AbortController` with a 2500ms timeout. Any non-200, parse failure, abort, or thrown error → fall through to the template.
5. Whatever string comes back from the LLM **always** passes through `sanitizeExplanation()` before being returned.

### Sanitizer

`sanitizeExplanation()` in `lib/explain/arrivalExplanation.ts`:

- Trims, strips surrounding quotes, collapses whitespace.
- Regex-replaces banned phrases — even if the LLM ignored the system prompt:
  - `guaranteed` → `recommended`
  - `definitely`, `certainly` → `likely`
  - `will definitely` → `is expected to`
  - `100% sure/certain` → `confident`
  - `no wait`, `zero wait` → `short wait`
  - `will not` → `is unlikely to`
  - `safe to drink/take/consume` → `available`
  - `emergency` → `urgent issue`
  - `medical advice` → `medical assistance on site`
- Appends *"Follow venue signage and staff instructions."* if the LLM forgot it.
- Hard-caps total length at 450 characters. When trimming, prefers cutting at the last sentence-ending period after character 200. Re-checks the safety note after trimming and re-appends if it now fits.

### Response

```ts
{
  explanation: string,                        // ≤ 450 chars, sanitized
  source: 'template' | 'groq' | 'gemini',
  generatedAt: string                         // ISO timestamp
}
```

The Arrival Guide UI renders this with a small source pill so reviewers can see live which path produced the explanation.

---

## Fallback behavior

The product is designed to **always have an answer**, no matter what fails:

| If this fails | The user sees |
|---|---|
| `GROQ_API_KEY` missing | Template explanation, source: `template` |
| `GEMINI_API_KEY` missing (no Groq key either) | Template explanation, source: `template` |
| LLM call returns non-200 | Template explanation, source: `template` |
| LLM call hangs > 2500ms | Aborted, template explanation, source: `template` |
| LLM returns malformed JSON or empty `content` | Template explanation, source: `template` |
| LLM tries to inject `guaranteed` / `no wait` / etc. | LLM output, sanitized — banned phrases scrubbed |
| LLM forgets safety note | LLM output, sanitized — note appended |
| LLM output > 450 chars | LLM output, sanitized — cut at sentence boundary |
| Request body is malformed | 400 with Zod issues |
| Network down on client | Guide page falls back to `plan.explanation_text` (the in-engine template) |

The demo therefore works **with no API keys at all**. Adding a key is purely an upgrade in tone, never a dependency.

---

## Staff/fan signal loop

There is no backend in the prototype. Hub ↔ Staff Console communicate through `localStorage` and three custom window events:

- `fanflow:signals` — fired by `publishSignal()` (used by Staff Console's publish form and Hub's fan pulse buttons) and `clearPublishedSignals()`. Hub and Staff Console both listen and re-read signals.
- `fanflow:readiness` — fired by `saveReadiness()` and `clearReadiness()`. Hub and Guide re-derive the plan when this fires.
- `fanflow:incidents` — fired by `updateIncident()` and `clearIncidentOverrides()`. Staff Console refreshes the incident log.

This is intentionally simple. Across browser tabs, the `storage` event would also work — for the prototype, the custom events keep the implementation small and obvious. In production, this layer would be Supabase Realtime (Postgres replication channel) or similar.

`lib/store.ts` exports the load/save helpers. The pattern is:

```ts
export function publishSignal(signal: LiveSignal): void {
  const existing = loadPublishedSignals()
  const next = [signal, ...existing].slice(0, 30)
  window.localStorage.setItem(SIGNALS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('fanflow:signals'))
}
```

Consumers do:

```ts
useEffect(() => {
  const refresh = () => setSignals(getAllSignals())
  refresh()
  window.addEventListener('fanflow:signals', refresh)
  return () => window.removeEventListener('fanflow:signals', refresh)
}, [])
```

Trust weighting (staff 3× fan) is enforced *inside the rule engine*, not at the signal layer. Both kinds of signals enter the same `LiveSignal[]` — the score difference happens during gate scoring.

---

## Need Help — context-aware support handoff

`components/shared/HelpSheet.tsx` is a reusable modal mounted on both Hub and Guide. It:

1. Shows the current plan summary (gate, leave-by, arrive-at) so the fan never has to re-explain their situation.
2. Offers six issue categories: wrong gate, running late, accessibility, medical/family, ticket issue, calmer route.
3. Generates a context-aware suggested action — pulls the relevant support point from the plan's prioritized list when available, falls back to all venue support points otherwise.
4. Surfaces nearby support as direct links to the Venue Map.
5. Renders an explicit safety panel: *"For urgent medical or safety issues, contact venue staff or local emergency services (911). FanFlow provides guidance, not emergency response."*
6. Footer actions: View nearest support (→ Venue Map) · Contact StubHub Support (→ stubhub.com/help) · Back to guide.

No LLM is involved. The suggested actions are deterministic, sourced directly from the plan and seed data.

---

## What AI can and cannot do in this system

### AI **can**:

- Rewrite a deterministic template explanation in a warmer, more human tone.
- Adjust phrasing and rhythm.
- Use the variables provided (transport, group, gate name, times, sentiment).

### AI **cannot**, by architecture:

- Choose the gate (the rule engine has already chosen).
- Change leave-by time, arrival time, route summary, support points, or confidence (these aren't even mutable in the response shape; we discard everything but the prose).
- Invent venue facts, gate names, support point names, or wait times (the sanitizer doesn't enforce this directly, but the prompt is tight and the rendered card only displays the LLM's text in the *explanation* slot — every other UI element pulls from the rule-engine plan, not the LLM response).
- Say "guaranteed," "definitely," "100%," "no wait," "zero wait," "will not" — all regex-replaced.
- Give medical or emergency advice — "emergency" → "urgent issue," "medical advice" → "medical assistance on site," and the safety note is enforced on every response.

### AI is also not allowed to:

- Run on a vector database. There is no RAG.
- Be chained, agent-ified, or graphed. There is no LangChain, LangGraph, or tool-use loop.
- Stream. The endpoint is request/response only.
- Retry on its own. One call, one timeout, fall back to template.

This is a deliberately small, deliberately legible surface area. The whole AI integration is one file (`route.ts`) and one helper module (`arrivalExplanation.ts`).

---

## Future-proofing notes

Things to revisit in Phase 2 that the current architecture already supports cleanly:

- **Swap `localStorage` for Supabase Realtime** — `lib/store.ts` is the only file that needs changes. The Hub and Staff Console consume through the same load/publish helpers either way.
- **Multi-event** — `deriveArrivalPlan` is already parameterized; today the page reads `useParams<{ id: string }>()` but uses the single seed event. Pointing at a database row indexed by `params.id` is mechanical.
- **More LLM providers** — the cascade in `route.ts` is a flat switch on env vars. Adding Anthropic, OpenAI, or Bedrock is another `if (process.env.ANTHROPIC_API_KEY)` block in the same shape as Groq/Gemini, plus a corresponding `callX()` function. The sanitizer handles whatever comes back.
- **Streaming explanation** — feasible but unnecessary at < 450 chars. The 2500ms timeout is comfortable for both Groq and Gemini Flash for this prompt size in practice.
