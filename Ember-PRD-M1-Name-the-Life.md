# Ember — PRD: M1 "Name the Life"

*The foundation milestone. Everything downstream (coverage, runway, the down-market view) derives from a priced life, so this ships first.*

---

## The moment

The first feeling: you describe the life you actually want, watch it get priced, and see the target number appear **as a byproduct of your life** rather than as the starting whistle. You end the session able to answer three things you couldn't answer before — *what life am I building, what does it cost, and how safe am I right now?* — without having met a single piece of jargon you didn't understand.

**Spine:** turn money into security you can feel. M1 is where the life gets named and the translation engine (money → coverage, runway, progress-to-life) is born.

---

## Goal

Take a new user from zero to a **named, priced life with a derived target and a first honest read on where they stand today** — in one sitting, beginner-first, no spreadsheet energy.

## Non-goals (explicitly deferred)

- **Full coverage map** (food → housing → … → full freedom unlocks) → **M2**. M1 ships only a *teaser* so the payoff is felt.
- **Adaptive scenarios / shock playbook** → **M3**.
- **Down-market view & honest projection bands** → **M4**. M1 seeds the "this is a guess" label but doesn't build the full uncertainty treatment.
- **Phase-aware projection math** → later. M1 *captures* phases but derives the target from the steady-state "work-optional" life.

---

## Target user & entry

The early-journey person — little to no financial literacy, some anxiety, no clear picture of the goal. They arrive cold. The first screen must not ask for income or savings; it asks about the life. Blank-canvas paralysis is the main risk, so we always offer a starting point to edit rather than a void to fill.

---

## The experience (the flow)

**0 · Welcome.** Warm, plain, sets the inversion. *"Before any numbers — let's start with the life."* No charts yet.

**1 · Name the life.** A single open prompt — *"What does a life that's yours look like?"* — with optional starter chips (more time with family, travel, creative work, less commuting, a calmer week). Output: a short named vision the user owns.

**2 · Shape it (optional).** Light phasing: *now → and someday* (a sabbatical, part-time, fully optional work). Captured for later; **not** used in M1's target math. Skippable in one tap.

**3 · Price it.** The life becomes expense categories with rough annual/monthly amounts: housing, food, healthcare, transport, fun & travel, giving, other. Two beginner-first rules:
- **Smart defaults.** Every category pre-fills a typical range the user nudges, so they're never stuck on a blank number. *"Rough is fine — we'll sharpen it together."*
- **Essential vs. discretionary tag** on each category. This one decision powers three later features (runway, lean coverage, full target). Do it here.

Output: **annual cost of the life (L)** and **essential monthly burn (E)**.

**4 · The target reveal.** *"A life like this runs about $L a year. To hold it for good, you're growing toward roughly $T."* The number arrives derived, gentle, and labeled as an estimate, not a promise. The SproutVessel is planted (ember stage).

**5 · Ground it in today.** Connect accounts via Plaid **or** enter manually. Manual entry is a **first-class path, not a fallback** (works around the Plaid trial-plan account ceiling).

**6 · First look — the payoff.** Today's position, translated into *security*, not a balance:
- **Progress to the life** — "Freedom · X%" (growth-green, never red).
- **Runway** — "Right now, you could float for N months." The anxiety-reducer, shown in time.
- **Coverage teaser** — the first unlock if reached ("Food — secured"), or "you're closer than you think" with the next one in view.
- A forward CTA: *"You've named it and you've started. Come back tomorrow and tend it."*

---

## Core logic — the translation engine

All compute-on-read in M1 (no stored derivations).

| Quantity | Formula | Notes |
|---|---|---|
| Annual life cost `L` | Σ category annual amounts | the input to the target |
| Essential monthly burn `E` | Σ essential categories ÷ 12 | powers runway + lean coverage |
| FI target `T` | `L × 25` (4% SWR default) | SWR adjustable later; **labeled a guess** (seeds #6) |
| Invested/liquid assets `A` | from connected + manual accounts | |
| Progress to life | `A ÷ T` | shown as growth %, never P&L red |
| Runway (months) | accessible assets ÷ `E` | the felt floor |
| Coverage (teaser) | category `c` is *secured* if `A × 0.04 ≥ annual(c)`, cheapest-essential first | full ladder is M2 |

The 4% rule is the engine but never the vocabulary — the user sees "to hold it for good," not "multiply by 25 per the 4% safe withdrawal rate." The math is honored and hidden.

---

## Data model notes (Drizzle / Postgres, advisory)

- `life_plan` — id, user_id, label, swr (default 0.04), created_at
- `expense_category` — id, life_plan_id, label, annual_amount, is_essential, phase_id (nullable)
- `life_phase` — id, life_plan_id, label, order (optional in M1)
- `account` — id, user_id, source (`plaid` | `manual`), kind (`invested` | `liquid` | `other`), balance, updated_at

Derived values (L, E, T, runway, coverage) computed on read in M1. Add a daily `net_worth_snapshot` table when the trend chart lands (M4-adjacent), not now.

---

## Voice & copy (Ember gentle-mentor register)

- **Welcome:** "Before any numbers — what's the life you're building toward?"
- **Pricing reassurance:** "Rough is fine. We'll sharpen it together as you go."
- **Target reveal:** "A life like this runs about $48,000 a year. To hold it for good, you're growing toward roughly $1.2M — a starting estimate, not a promise. We'll keep it honest as things change."
- **Runway:** "If everything stopped today, you could float for 9 months. That's a real floor — and it grows from here."
- **First-look CTA:** "You've named it and you've started. Come back tomorrow and tend it."

---

## Principle traceability

| Requirement | Principle |
|---|---|
| Start with the life, not income | Life first (#1) |
| Target derived from the life | Life first (#1) |
| Smart defaults + "rough is fine" | Confidence before comprehension (#3), Safe to be a beginner (#5) |
| Essential vs. discretionary tagging | enables Plan to adapt (#7) + coverage (#1) |
| Target labeled a guess | A map, not a promise (#6, seed) |
| Runway shown in time | Safe (#5), Plan to adapt (#7, seed) |
| Coverage teaser | Life first (#1), Confidence (#3) |
| Growth-green, never red; forward CTA | Always show the way (#8), Tend not audit (#4) |
| Gentle-mentor copy throughout | Safe to be a beginner (#5) |

---

## Success criteria

- **Functional:** a cold user reaches named → priced → target → connected → first-look in one sitting.
- **Felt:** they can state their life, its cost, and their current safety — with zero un-explained jargon.
- **The number is experienced as *theirs*,** derived from a life they described, not imposed by an app.

---

## Edge cases & open questions

- **"I don't know what life I want."** Offer a *borrow-a-starting-life* template to edit. Never block on a blank canvas.
- **~$0 assets.** Runway/coverage near zero — frame as "the floor you're building from," never failure (#5).
- **Phased lives vs. target math.** M1 uses steady-state; flag phase-aware projection as a later milestone.
- **SWR debate.** Default 4%, honest-labeled; expose as adjustable later.
- **Plaid trial-plan ceiling.** Manual entry must be first-class from day one.
- **Open:** how much pricing granularity before it stops feeling warm and starts feeling like a budget app? Lean fewer categories with good defaults.
