# Ember — PRD: M3 "Runway & Adapt"

*Where security becomes adaptive. The calm, always-available answer to "if it all stopped tomorrow, am I okay?" — and a written plan so future-you never has to figure it out at 2am. Builds on M1's essential tags + M2's coverage.*

---

## The moment

The fear you named: *if I were fired tomorrow, would I be okay?* Ember answers it plainly — *"Yes. You'd float for 14 months on what you have."* — and then turns helplessness into agency: *"And you're not stuck with that. Trim to essentials and it's 22 months. Add a little part-time and the clock stops entirely."* Then it helps you write the plan down, so the 2am panic already has an answer waiting.

**Spine:** turn money into security you can feel. M3 is the edge-taker-offer — it puts the worst-case on paper and shows it's survivable, with levers you control.

---

## Goal

Make runway a **dial the user controls, not a verdict** — and give them at least one **pre-written contingency plan** for a real shock, so uncertainty becomes a decided, survivable thing instead of a free-floating dread.

## Non-goals (deferred)

- **Down-market view & honest projection bands** → **M4** (runway *flexes* with markets; the calm weather-framing of that movement is M4's job).
- **Tax-aware liquidation order, Roth ladders, 72(t)** → advanced/later. M3 uses a simple accessible-vs-locked split.
- **Full healthcare-cost modeling** → later; "big expense / health" appears as a *scenario*, not a model.

---

## Target user & entry

A returning user with a priced life, coverage map, and connected assets. Runway was *seeded* as a static number in M1; here it becomes a first-class, interactive surface — reachable from the home coverage map and surfaced proactively the first time it crosses a meaningful threshold ("over a year of breathing room").

---

## The experience (the flow)

**The runway meter.** One clear figure — months of float — shown as breathing room, never as a countdown. Below it, the levers, live:
- **Baseline** — current spending → "14 months."
- **Cut to essentials** — drops everything tagged discretionary in M1 → "22 months." *(This is the payoff of the essential/discretionary tag — no new input needed.)*
- **+ Part-time** — a modest income reduces net burn → often "indefinite."

Each lever is a real toggle; the number moves as you flip them, so the user *feels* the control they have.

**The shock playbook.** Two or three named "what would you do if…" scenarios:
- **Job loss** — primary income stops.
- **Big expense / health hit** — a sudden cost lands.
- *(Downturn lives in M4, but the playbook links to it.)*

For each, the user explores levers and **commits a plan in plain language** — "If I lose my job: cut to essentials (22 months), and if it runs past 6, pick up part-time." Ember saves it.

**The saved plan.** The output is a small, personal contingency artifact the user can return to: *"Your plan is ready. You've already decided. That's one less thing to fear."* This is the literal "putting it to paper to reduce anxiety."

---

## Core logic — the runway engine

Runway draws on a *different* slice of the balance sheet than coverage does, and it **nets out the coverage already built** — which keeps M2 and M3 unified.

```
A_acc          = Σ accounts where accessibility ∈ {immediate, reachable}   (not locked retirement)
passive_m      = (A × SWR) / 12          ← income your coverage already throws off
net_burn_m     = scenario_spend_m − passive_m − part_time_m
runway_months  = net_burn_m ≤ 0  ?  ∞ ("indefinite")  :  A_acc / net_burn_m
```

Scenario spend: `baseline` = full monthly spend; `essentials` = essential monthly burn `E_m`.

**The elegant link:** because `net_burn` subtracts the passive income from coverage, runway *grows on its own as coverage grows* — and at **LeanFIRE** (`A × SWR ≥ E_annual`), essential net burn hits zero and essential runway becomes **infinite**. Runway and coverage are two views of one security: *how long am I safe now* vs. *what's safe forever*, and they meet at Lean.

---

## Data model notes (additions to M1/M2)

- `account.accessibility` — `immediate` (cash, HYSA) | `reachable` (taxable brokerage) | `locked` (retirement). Drives `A_acc`.
- `contingency_plan` — id, life_plan_id, scenario (`job_loss` | `big_expense` | `downturn`), levers (json: cut_to_essentials, part_time_amount, notes), saved_at.
- Reuses `tier_assumption.part_time_income` `P` from M2.
- All runway figures computed on read.

---

## Voice & copy (Ember gentle-mentor register)

- **The reassurance:** "If everything stopped today, you'd be okay for 14 months. That's more than a year of breathing room — not nothing."
- **The agency:** "And you're not stuck with that number. Trim to essentials and it's 22 months. A little part-time, and the clock stops entirely."
- **Inviting the plan:** "Let's write down what you'd actually do — so future-you doesn't have to work it out at 2am."
- **Plan saved:** "If the worst happens, your plan is ready. You've already decided. That's one less thing to carry."
- **Low runway, honest but kind:** "Right now that's about 3 months — a real floor, and the one we'll grow first. Even $150 a month of buffer adds noticeably to it."

---

## Principle traceability

| Requirement | Principle |
|---|---|
| Runway as a dial with live levers | Plan to adapt (#7) |
| Pre-written contingency plan ("on paper") | Plan to adapt (#7), Safe to be a beginner (#5) |
| Framed as breathing room, never a countdown | Safe (#5), Always show the way (#8) |
| Reuses essential/discretionary tags (no new burden) | systems consistency (M1 payoff) |
| "What would you do" reflection builds self-trust | Confidence (#3), Present is the strategy (#2) |
| Part-time / accessibility are labeled assumptions | A map, not a promise (#6) |
| Net burn subtracts coverage → runway and coverage unify | (internal coherence) |

---

## Success criteria

- A user can answer "if I lost my income tomorrow, how long am I safe, and what would I do?" in seconds — and the answer feels survivable.
- Every user leaves with at least one shock scenario that has a written, personal plan.
- Runway is experienced as a controllable dial, not a sentence handed down.

---

## Edge cases & open questions

- **Runway flexes with markets — and that's honest.** Unlike secured coverage (hysteresis-protected in M2), runway *does* move when accessible assets fall. Don't hide it; frame the movement calmly and always pair it with the levers. The stable floor is coverage; runway is the flexible cushion — and a flexible cushion is fine *because it always comes with levers*.
- **"Accessible" is genuinely fuzzy.** Would you really sell taxable in a crash? Touch retirement with a penalty? Default conservative (cash + HYSA + taxable), let advanced users adjust, never pretend precision.
- **Optimistic part-time assumptions.** Don't let a hopeful side-income number paper over real risk. Default conservative, label clearly (#6).
- **Near-zero runway.** Frame as "the floor we'll grow first," and make the *fastest lever* visible. Never shame (#5).
- **Health/insurance shock** is one of the research's top psychological barriers — it earns a playbook *scenario* here even though full cost-modeling is out of scope. Open: how much to estimate vs. just prompt a plan.
- **Forward link:** M4's down-market view will lean on M3 — when the number dips, "your coverage holds (M2) and here's your runway plus levers (M3)" is the reassurance. M3 supplies the agency half of that.
