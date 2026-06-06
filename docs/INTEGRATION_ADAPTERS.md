# Integration adapters

FanFlow is the fan-facing **orchestration layer** for the post-purchase event
day. It does not replace mapping, parking, or crowd-intelligence platforms —
it composes them into one companion. This doc describes the provider seam that
makes FanFlow integration-ready while running entirely on simulated demo data
today.

## The layering

```
FanFlow UI (pages/components)
  ↓
Orchestration services (lib/services/*, rule engine, intelligence)
  ↓
Provider interfaces (lib/providers/types.ts)
  ↓
Simulated providers today (lib/providers/simulated/*)
  ↓
Real adapters later (Mappedin / MapsIndoors / SpotHero / WaitTime / venue ops)
```

The registry at `lib/providers/index.ts` is the **single swap point**. To
integrate a real platform, implement the matching interface and repoint one
field — no UI or service rewrite.

## Providers: today vs. tomorrow

| Provider | Today (simulated) | Could connect to later |
|---|---|---|
| `VenueMapProvider` | `simulatedVenueMapProvider` — demo venue from `lib/seed.ts` | **Mappedin**, **MapsIndoors** indoor maps + wayfinding, or a custom venue map service |
| `ParkingProvider` | `simulatedParkingProvider` — demo lots + traffic-light status | **SpotHero** developer platform or a venue parking API |
| `CrowdIntelligenceProvider` | `simulatedCrowdProvider` — pressure derived from staff/fan signals | **WaitTime**-style crowd intelligence or venue analytics |
| `StaffSignalProvider` | `localStaffSignalProvider` — localStorage + cross-tab store | A venue operations console / realtime backend (WebSocket, Supabase Realtime) |
| `FanPulseProvider` | `localFanPulseProvider` — store + `computeFanPulse` threshold | A realtime fan-signal backend |

## Why FanFlow is the orchestration layer, not a replacement

Mapping, parking, and crowd intelligence are deep, specialized products. The
value FanFlow adds is **composition + personalization + honest communication**:
it takes a venue map, a parking feed, a crowd signal, and a ticket context,
runs them through a deterministic rule engine, and produces one personalized,
plain-language event-day plan — with an AI layer that only *words* the result,
never invents facts.

That means FanFlow is complementary to (not competitive with) Mappedin,
SpotHero, WaitTime, etc. A venue or marketplace already paying for those
systems plugs them into the provider seam and gets a fan-facing companion on
top.

## How source/confidence labels protect honesty

Every provider result carries a `source` (`simulated_demo` / `estimated` /
`fan_reported` / `staff_verified` / `official`) and a `confidence` (`low` /
`moderate` / `high` / `verified`). The UI renders these via `<SourceChip>` and
`<ConfidenceChip>` everywhere a "live" datum appears. Until a real adapter is
wired, everything reads **simulated demo** or **estimated** — so the prototype
never implies a real Mappedin / SpotHero / WaitTime / StubHub / FIFA / venue
integration.

Important rule encoded in the crowd provider: **ticket sales and seat capacity
estimate demand, not live gate pressure.** Live pressure comes only from
staff/fan/simulated signals via the `computeFanPulse` threshold (≥3 fans =
majority, staff weighted 3×).

## Status

- All five interfaces are defined and implemented by simulated providers.
- A contract test suite (`tests/providers.test.ts`) exercises every provider
  method against its interface, so the seam is proven and stays honest as it
  evolves.
- No real API keys, no third-party SDKs, no scraping — by design.
