# Ember — PRD: M4 "Weather, Not Verdict"

*The honest-uncertainty milestone. Where the numbers are finally allowed to move — and Ember stays calm. Builds on M2's stable coverage floor and M3's adaptive levers, closing the loop: the floor holds, the cushion flexes, and both are framed as weather you can read rather than a verdict handed down.*

---

## The moment

The market drops 12% in a week. The old feeling: open any finance app and watch a red number confirm the dread. The Ember feeling: *"This is weather, not a verdict. Your runway dipped to 11 months — and your housing, food, and healthcare are still secured. Markets would need to fall another 24% before any of that wobbles. Here's what you control."* Nothing flickers, nothing shames. The number that *should* move (runway) moves honestly; the floor that shouldn't (coverage) holds — and Ember shows you exactly how much weather it would take to shake it.

**Spine:** turn money into security you can feel — *especially* when it falls. M4 is the milestone that earns trust by being honest about movement instead of hiding it. M2 built the floor, M3 built the levers, M4 frames the weather.

---

## Goal

Make downward movement **legible and survivable** instead of alarming: show coverage's stability with a concrete headroom figure, replace single-point projections with honest ranges, and compose the down-market view that pairs every dip with what's still secured and what the user controls.

## Non-goals (deferred)

- **Tax-aware liquidation, Roth ladders, 72(t)** → still advanced/later (carried from M3).
- **Monte Carlo / percentile projection engines** → explicitly out. M4 uses *deterministic* low/expected bands for explainability (see Core logic). A probabilistic engine can come later if users ask for rigor over warmth.
- **Phase-aware projection math** → still later.
- **Real-time market data feeds / push alerts on dips** → M4 frames movement when the user opens Ember; it does not chase them with notifications (would violate "tend, not audit").

---

## Target user & entry

A returning user with a priced life (M1), a coverage map (M2), and saved runway levers + at least one contingency plan (M3). They've felt security on the way up. M4 is what holds when the line turns down — entry is organic (they open Ember on a red week) and proactive only in-surface (the home/planner reassurance composes itself when accessible assets have fallen since the last secured milestone).

---

## The experience (the flow)

**1 · Coverage headroom — making stability visible.** Each secured category and tier carries a quiet headroom line: *"Markets would need to fall ~28% for Housing to wobble."* This renders M2's hysteresis rule as something the user can see, not just trust. Secured items never read as fragile; the headroom is framed as a moat, not a cliff edge.

**2 · Honest projection bands.** Coast and the freedom timeline stop being single dates. They become a calm range: *"On a steady path, you'd arrive around 2041; through rougher weather, closer to 2045. Either way, you're moving toward it."* The band is the honesty label (#6) made structural — the projection literally shows its own uncertainty.

**3 · The down-market view.** When accessible assets have fallen, the runway meter and home surface compose a paired message — never the dip alone:
- The honest movement: *"Your runway is 11 months right now — down from 14 a month ago."*
- The floor that held: *"Your essentials are still secured. That doesn't move with the market."*
- The agency: the M3 levers, right there.

**4 · The downturn playbook.** The third shock scenario M3 stubbed: *"If the market drops 30%."* Same pattern as job-loss / big-expense — explore levers (cut to essentials, pause contributions, part-time), commit a plain-language plan, Ember saves it. Closes the playbook trio.

---

## Core logic

Builds entirely on existing engines (`computeCategoryCoverage`, `computeTierStatuses`, `computeRunwayWithLevers`). Three additions, all compute-on-read.

### Coverage headroom

For a secured row with cumulative cost `C`, current assets `A`, and withdrawal rate `SWR`, passive income is `A × SWR`. The row stays secured while `A × SWR ≥ C`. The drop the market would need before it wobbles:

```
dropPctToWobble = 1 − C / (A × SWR)          (clamped to [0, 1])
```

The *binding* headroom for the whole map is the smallest positive `dropPctToWobble` among secured rows (the most recently secured one). Framed with the hysteresis promise: a row does not un-secure on ordinary volatility — only a sustained breach past the buffer would.

### Honest projection bands (deterministic)

Coast/timeline currently use a single `expectedReturn` (`r`). M4 adds a conservative return `r_low` (default: `expectedReturn − a spread`, floored sensibly) and derives two arrival points:

```
expectedYear    = first year where  A × (1 + r)^n     ≥ T
pessimisticYear = first year where  A × (1 + r_low)^n ≥ T
```

Output a `{ expectedYear, pessimisticYear }` band. When already met, the band collapses to "now." When `r_low` never reaches `T` within a horizon cap, frame honestly ("on a rougher path, this needs more time or a little more added — not a closed door").

### Down-market detection

Compare current accessible assets to the value at the last recorded milestone crossing (or a recent `balanceSnapshots` baseline). When current < baseline by a meaningful margin, the surface switches to the paired down-market composition. Coverage itself does **not** flip (hysteresis); only the framing and the runway figure respond.

---

## Data model notes (additions to M1/M2/M3)

- **No new tables.** Reuses `balanceSnapshots` (daily net-worth/asset history already populated) for the down-market baseline, and `milestone_event.secured_at` for "secured on / headroom since."
- **Reuses `contingency_scenario = 'downturn'`** — the enum already exists; M4 only adds the UI + copy.
- `tier_assumption` gains an optional **conservative return** (`r_low`) — user-adjustable, honest-labeled, defaulted from `expectedReturn`. If we prefer zero new columns initially, derive `r_low` from `expectedReturn` with a fixed spread and revisit.
- All band/headroom figures computed on read.

---

## Voice & copy (Ember gentle-mentor register)

- **Headroom:** "Housing is secured — and it has room. Markets would need to fall about 28% before it would even wobble, and it won't un-secure on an ordinary dip."
- **Projection band:** "On a steady path you'd arrive around 2041; through rougher weather, closer to 2045. Either way, you're moving toward it."
- **Down-market reassurance:** "This is weather, not a verdict. Your runway is 11 months today — and your essentials are still secured. That floor doesn't move with the market."
- **Downturn playbook:** "If markets drop hard: hold the floor, pause new investing, and lean on essentials. You've already decided — that's one less thing to fear."
- **Honest but kind on a real dip:** "It moved, and that's normal. The part that matters — your secured floor — held."

---

## Principle traceability

| Requirement | Principle |
|---|---|
| Projection shown as a range, not a date | A map, not a promise (#6) |
| Coverage headroom makes hysteresis visible | Safe (#5), Always show the way (#8) |
| Dip always paired with what's secured + levers | Plan to adapt (#7), Safe (#5) |
| Weather framing, never red/alarm | No finance binary (design #2), Tend not audit (#4) |
| Coverage holds through ordinary volatility | M2 hysteresis payoff |
| Downturn plan written in advance | Plan to adapt (#7), Confidence (#3) |
| No push alerts chasing the user on dips | Tend not audit (#4) |

---

## Success criteria

- On a down week, a user can open Ember and leave reassured rather than rattled — they can state what still held and what they'd do.
- A user reads the freedom timeline as a range and understands it as honest, not vague.
- Every user can see, in a number, how much market drop their secured floor could absorb.
- The playbook trio (job loss, big expense, downturn) is complete; most users have at least one saved plan.

---

## Edge cases & open questions

- **Deterministic bands aren't probabilities.** The low/expected range is a framing device, not a confidence interval — copy must not imply statistical likelihood ("rougher weather," not "90% chance"). Honest-label it.
- **Headroom near a freshly secured threshold** can be tiny (e.g. 2%). Frame the buffer ("it won't flip back on ordinary dips") rather than the scary small number, and lead with the hysteresis promise.
- **Down-market baseline choice.** Last-milestone value vs. trailing snapshot vs. all-time high — each tells a different story. Default to a recent trailing baseline so the framing is "since last month," not "since your peak" (peak-anchoring breeds dread). Open: expose the comparison window?
- **Assets up, not down.** The down-market composition must gracefully no-op on flat/up weeks — M4 should never manufacture a dip to talk about.
- **`r_low` default.** Pick a spread that's honest without being doom (e.g. a couple points below expected, floored at/above inflation so the band stays meaningful). Open: fixed spread vs. user-set conservative return.
- **Forward link:** M4 completes the security spine (floor + cushion + weather). Later milestones (phase-aware math, tax-aware withdrawal, probabilistic projections) layer rigor on top of a foundation that already feels safe.

---

## Build sequencing

1. **Coverage headroom** — `computeCoverageHeadroom` + surface on the coverage map. Smallest, highest-trust win; no new schema.
2. **Honest projection bands** — `computeProjectionBand` (deterministic low/expected) + replace single-point Coast/timeline copy.
3. **Downturn playbook** — third scenario in the existing M3 `ShockPlaybook` (enum already supports it).
4. **Down-market composition** — baseline detection + paired reassurance on Home/Planner, tying headroom + runway + levers together.
