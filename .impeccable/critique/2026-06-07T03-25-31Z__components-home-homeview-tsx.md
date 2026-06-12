---
target: home
total_score: 27
p0_count: 0
p1_count: 2
timestamp: 2026-06-07T03-25-31Z
slug: components-home-homeview-tsx
---
# Critique: Home (`components/home/HomeView.tsx`)

**Target:** Home journey hub — `components/home/HomeView.tsx`, `lib/home-journey.ts`, `app/page.tsx`
**Date:** 2026-06-06

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton + error retry work; budget fetch failure is silent |
| 2 | Match System / Real World | 3 | FIRE voice lands; "savings rate" and milestones lack plain-language framing |
| 3 | User Control and Freedom | 3 | Clear exits via tab bar and links; no refresh or undo on home itself |
| 4 | Consistency and Standards | 3 | Reuses `NetWorthHeader`; card stack matches Budget but hero duplicates Portfolio |
| 5 | Error Prevention | 2 | Partial API failure hides budget context without explaining why |
| 6 | Recognition Rather Than Recall | 2 | Review CTA promises review queue but routes to Budget home |
| 7 | Flexibility and Efficiency | 2 | No shortcuts, customizable milestones, or power-user density |
| 8 | Aesthetic and Minimalist Design | 2 | Encouragement, wins, 4% card, and quick links repeat the same emotional beat |
| 9 | Error Recovery | 3 | Plain-language errors with Try again |
| 10 | Help and Documentation | 2 | 4% explainer is strong; savings rate and milestones lack inline context |
| **Total** | | **27/40** | **Acceptable — significant journey/IA improvements needed** |

**Cognitive load:** 3 checklist failures (single focus, visual hierarchy below fold, redundant emotional blocks). Moderate load.

**Emotional journey:** Peak (net worth + encouragement) is warm. Valley: scroll of same-weight cards dilutes celebration. End (quick links) feels utilitarian, not hopeful.

## Anti-Patterns Verdict

**LLM assessment:** Does not read as generic AI slop. No gradient text, hero-metric template, glassmorphism, or numbered section eyebrows. Tone aligns with PRODUCT.md (warm, not institutional). Mild tells: uppercase tracked section labels on 2–3 cards, and a stack of bordered white cards with icon + title + description in Quick links — familiar product pattern, not egregious.

**Deterministic scan:** Clean. `detect.mjs` returned 0 findings across `components/home/HomeView.tsx`, `app/page.tsx`, `lib/home-journey.ts`.

**Browser visualization:** Not available in this harness (no browser automation). No user-visible overlay. Assessment relied on source review + CLI scan.

## Overall Impression

Home successfully reframes Fire as a journey hub rather than a dashboard clone. The emotional copy and 4% explainer match the product promise. The biggest gap is **information architecture**: Home overlaps Portfolio on net worth, repeats celebration in multiple blocks, and the highest-urgency action (review queue) does not land where the CTA implies.

## What's Working

1. **Portfolio hero reuse** — `NetWorthHeader` with YTD change keeps Home consistent with Portfolio and avoids a one-off financial display.
2. **4% rule card** — Plain-language explanation turns jargon into hope without a spreadsheet. Exactly what PRODUCT.md asks for.
3. **Empty and setup states** — "Ready when you are" and "Set up your budget" reduce anxiety for new users instead of showing blank metrics.

## Priority Issues

### [P1] Review CTA misroutes users
- **What:** "Review N transactions" links to `/budget`, but Budget opens on the home bucket list, not the review queue.
- **Why it matters:** Users with pending reviews (amber badge motivation) tap the most urgent CTA and still have to hunt for Review. Breaks trust on the exact workflow Home highlights.
- **Fix:** Deep-link to review (`/budget?screen=review` or equivalent) and wire `BudgetView` to read it.
- **Suggested command:** `/impeccable harden home`

### [P1] Redundant emotional blocks dilute the peak
- **What:** Encouragement headline in the hero, "Wins along the way" list, and the 4% card often repeat the same message (on track, milestone, savings).
- **Why it matters:** Cognitive load rises; celebration stops feeling special and starts feeling like filler. Violates "weight lifted, not weight added."
- **Fix:** Pick one primary celebration surface per visit (hero OR wins OR 4% insight). Collapse or hide duplicates based on priority rules.
- **Suggested command:** `/impeccable distill home`

### [P2] Silent budget API failure
- **What:** If `/api/budget/summary` fails, Home shows accounts data with no budget sections and no explanation.
- **Why it matters:** Users see an incomplete picture and may think they have no budget activity when the fetch failed.
- **Fix:** Surface a non-blocking banner ("Budget data unavailable — Try again") like the accounts error pattern.
- **Suggested command:** `/impeccable harden home`

### [P2] Home vs Portfolio differentiation is thin
- **What:** Both lead with net worth on a dark zinc hero. Home adds encouragement below; Portfolio adds chart.
- **Why it matters:** Tapping Home vs Portfolio feels like the same screen with different accessories. Home should answer "am I on track toward freedom?" not "what is my net worth again?"
- **Fix:** Shift Home hero emphasis toward journey status (next milestone, month pulse, FIRE runway teaser) and demote raw net worth or link prominently to Portfolio for detail.
- **Suggested command:** `/impeccable shape home`

### [P2] Milestones are generic thresholds, not FIRE goals
- **What:** Fixed $1k–$1M ladder does not connect to lean/coast/barista FIRE or user-defined targets from Planner (stub).
- **Why it matters:** PRODUCT.md promises predictable paths to independence; arbitrary net worth steps feel like a gamification layer, not personal progress.
- **Fix:** Anchor milestones to user expenses (4% coverage of rent, first $X/month covered) or future Planner targets.
- **Suggested command:** `/impeccable shape home`

## Persona Red Flags

**Jordan (First-Timer):** "Savings rate" appears with no inline definition. "Review N transactions" assumes budget vocabulary. Review link does not open Review — will feel lost after tapping the amber CTA.

**Casey (Mobile, distracted):** Primary celebration is in the hero (good), but urgent review CTA may sit below fold after wins + 4% card. Must scroll to reach highest-priority action.

**Sam (Accessibility):** Month budget card is a `<Link>` without explicit "go to budget" text for screen readers beyond implicit link behavior. Savings rate uses color-only positive/negative semantics (partially mitigated by % value).

**Morgan (FIRE hopeful, PRODUCT.md):** Emotional copy helps, but no lean/coast/barista framing or "when could I coast?" teaser. Journey feels net-worth-centric, not freedom-centric.

## Minor Observations

- No pull-to-refresh or last-updated timestamp on Home (Portfolio shows last updated).
- `Sparkles` icon on empty state is slightly "delight decoration" vs semantic icon.
- Encouragement subline at `max-w-xs` may wrap awkwardly on narrow devices with long currency strings.
- Quick links always show Budget + Portfolio even when review card already links to Budget (duplicate path).

## Questions to Consider

- What if Home led with **one** freedom metric (months of expenses covered at 4%) instead of net worth?
- Does Review deserve to be the only above-the-fold card when `unreviewedCount > 0`?
- What would Home look like if wins were **time-bound** (new this month) rather than static achievements?
