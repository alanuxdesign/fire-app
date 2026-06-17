# Ember — PRD: M2 "What's Taken Care Of"

*The coverage map. Where progress stops being a percentage and becomes a list of real things that are permanently handled. Builds directly on M1's priced life + essential tags.*

---

## The moment

You open Ember and instead of "37% to your number," you see what's actually *taken care of*: **Food — secured. Housing — secured.** And the next one in view. When a new one unlocks, it doesn't ping — a weight lifts. *"Housing — secured. Whatever happens, you'll always have a roof."* The FIRE jargon you never learned — lean, coast, barista — turns out to just be names for moments on this ladder, explained in your own numbers the moment you get near them.

**Spine:** turn money into security you can feel. M2 is the most literal expression of it — money rendered as a list of life-costs that are now permanently funded.

---

## Goal

Replace the abstract progress number with a **bottom-up ladder of secured life-costs**, anchored by four de-jargoned freedom tiers (Lean → Coast → Barista → Full), each taught just-in-time and each unlock felt as relief, not a dopamine hit.

## Non-goals (deferred)

- **Adaptive scenarios / "what if I got fired"** → **M3** (runway already seeded in M1).
- **Down-market view & honest projection bands** → **M4**. M2 *defines the rule* for how coverage behaves when assets fall (see Edge Cases) but doesn't build the full weather view.
- **Phase-aware target math** → later.

---

## Target user & entry

A returning M1 user who has named and priced a life and connected (or hand-entered) assets. They come back to *see how it's growing* — so the home surface is now the coverage map, not a setup flow.

---

## The experience (the flow)

**The coverage map (home).** A bottom-up stack of the life's costs. Secured items read as rooted and solid; the next one is "in progress" with how-close-you-are; the rest wait quietly above. Essentials fill first (cheapest → priciest), so early users get an early, real win. Ember's growth motif maps onto it — the SproutVessel advances stage as tiers are reached (ember → sprout → seedling → in-leaf).

**Tier banners** sit at the meaningful points on the same ladder:
- **Lean** — the moment all your *essentials* are covered for good.
- **Coast** — you could stop adding and still arrive at your full life by your target year.
- **Barista** — light part-time work would bridge the gap to your full life.
- **Full** — the whole life is covered; work is optional.

**Just-in-time literacy.** As the user nears a tier, Ember introduces the concept gently, in their numbers, *before* using the term: *"You're close to a real milestone — the point where your essentials are covered for good. People call that lean financial independence. For you it's about $X, and you're 80% there."* The jargon is taught at the moment it becomes personally true.

**The unlock moment.** When a category or tier is secured, a calm, dignified marker — never confetti. It names what's now permanent, ties it to the life, and invites a beat of reflection:
- *"Housing — secured. From here on, whatever happens, you'll always have a roof."*
- A "what this buys you" prompt: *"What does covering your housing change about how next year feels?"*

---

## Core logic — the coverage engine

Same engine as M1's teaser, fully built. `A` = invested/liquid assets, `SWR` = safe withdrawal rate (default 0.04), `L` = full annual life cost, `E_annual` = essential annual cost, `T = L / SWR`.

**Category coverage (the granular ladder).** Sort categories cheapest → priciest. Category *k* is **secured** when:

```
A × SWR  ≥  Σ (annual cost of categories 1..k)
```

This funds your spending bottom-up. Note the elegant consistency: the fraction of your life covered, `A × SWR / L`, equals `A / T` — *the coverage map is just a granular decomposition of M1's "Freedom %."* Same number, made of real things.

**The four tiers:**

| Tier | Met when | In plain words |
|---|---|---|
| **Lean** | `A × SWR ≥ E_annual` | your needs are covered for good |
| **Coast** | `A × (1+r)^n ≥ T` | stop adding, still arrive by your target year |
| **Barista** | `A × SWR + P ≥ L` | light part-time income (`P`) bridges the gap |
| **Full** | `A × SWR ≥ L`  (i.e. `A ≥ T`) | the whole life is covered |

- `r` = assumed real return, `n` = years to target date. **Coast is a projection, not a coverage fact** — it gets an honesty label ("assuming markets behave roughly as they have"). This is the seed of #6; its full uncertainty treatment is M4.
- `P` = assumed annual part-time income — asked once with a sensible default.

---

## Data model notes (additions to M1)

- `tier_assumption` — life_plan_id, swr, expected_return `r`, target_year/age `n`, part_time_income `P` (all user-adjustable, honest-labeled)
- `milestone_event` — id, life_plan_id, type (`category` | `tier`), ref (category id or tier name), secured_at, **buffer_clear_at** (see hysteresis below). Lets us show "secured on [date]" and never re-celebrate.
- Coverage + tier states computed on read from `account` balances; `milestone_event` only records *first* crossing (with buffer).

---

## Voice & copy (Ember gentle-mentor register)

- **Approaching a tier:** "You're getting close to something real. When your savings can cover your essentials for good, that's lean financial independence. For you that's about $640k — and you're most of the way."
- **Category unlock:** "Food — secured. The most basic thing is handled, permanently. That's a floor no market can take back."
- **Tier unlock (Lean):** "Your essentials are covered for good. Whatever else happens, the core of your life is safe now. Sit with that before we look at what's next."
- **Coast (honest):** "A quieter milestone: even if you never added another dollar, this could grow into your full life by 2041 — assuming markets behave roughly as they have. Coasting is on the table."
- **What-this-buys prompt:** "What does this change about how your week feels?"

---

## Principle traceability

| Requirement | Principle |
|---|---|
| Coverage list instead of a % | Life first (#1), celebrate-alignment |
| Essentials secured first (early wins) | Safe to be a beginner (#5) |
| Tiers taught just-in-time, in the user's numbers | Confidence before comprehension (#3), Safe (#5) |
| Unlock framed as "what this buys you" | Life first (#1), Present is the strategy (#2) |
| Calm, dignified marker — never confetti | Tend not audit (#4), Safe (#5) |
| Coast carries an honesty label | A map, not a promise (#6) |
| Once-secured stays secured (hysteresis) | Always show the way (#8), Safe (#5) |

---

## Success criteria

- A user can read their coverage map and say, in plain language, what is permanently taken care of and what's next.
- A user who never learned "lean / coast / barista" can explain what each means **for them** — because they learned it here, in their own numbers.
- A milestone unlock lands as relief / weight lifting, measured by reflection engagement, not as a dismissed notification.

---

## Edge cases & open questions

- **Coverage can fall when markets do — the make-or-break decision.** If `A` drops below a secured threshold, do we *un-secure* "Housing"? Doing so would shatter the entire promise. **Rule (set here, honored in M4):** secured milestones use **hysteresis + a buffer** — a category clears only when `A × SWR` exceeds its cost by a margin, and it does *not* flip back on ordinary volatility. Coverage is framed with headroom ("markets would need to fall ~28% for this to wobble"), never as a flickering light. This rule is M2's most important output.
- **Barista needs a part-time income input.** Ask once, default sensibly; let users revise.
- **Coast needs a target year/age.** M1 may not have captured one — add a light "by when?" input here, or default to a reasonable horizon and surface it.
- **Category ordering.** Cheapest-first gives the best beginner ramp, but some users feel housing-security more than food-granularity. Open: fixed order vs. let users pin a priority.
- **Forward link:** the stability of this coverage map *is* the payoff of M4's down-market view — when the number dips, "your housing is still secured" is what holds. M2's hysteresis rule is what makes that true.
