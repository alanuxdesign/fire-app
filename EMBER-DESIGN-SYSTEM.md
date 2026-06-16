# Ember Design System

> A warm, credible FIRE (financial-independence) companion. Money is shown as **growth, not P&L** — flat surfaces, hairline structure, watercolor illustration, and the voice of a gentle mentor who never keeps score. This document is the single source of truth: refactor all UI to conform to it.

---

## 0. Principles

1. **Flat, not carded.** Structure comes from hairline rules, full-bleed bands, and whitespace — not boxes and drop shadows. The rare lifted surface (inputs, the one hero stat card) is allowed; everything else sits directly on the paper.
2. **Warm earth, no finance binary.** Never use stoplight red/green for up/down. Growth is sage; the single accent is terracotta/clay.
3. **Editorial, not dashboard.** A soulful serif carries life and reflection; a humanist sans with tabular figures carries data.
4. **Texture is alive.** Soft watercolor washes (low-frequency blooms, pigment pooling) — never gradient slop, never tiled noise stripes.
5. **One accent at a time.** Emphasis comes from type, rule, and a single terracotta accent — not from many competing colors.
6. **Never pure black.** Text is soft espresso (`#2D2A22`).

---

## 1. Color tokens

Drop these into your stylesheet root (or theme config). Names match semantic roles.

```css
:root {
  /* Surfaces */
  --ds-paper:      #F7F1E5; /* app canvas — warm paper everything sits on */
  --ds-paper-2:    #FBF7EC; /* the rare lifted surface / input fields */
  --ds-card:       #FFFFFF; /* hero stat card only — use sparingly */

  /* Brand / semantic */
  --ds-terra:      #BB6038; /* PRIMARY accent — the one thing that matters now */
  --ds-terra-soft: #D88C5A;
  --ds-clay:       #D9B98C; /* warm tan — FI target dots, vessel pot */
  --ds-sand:       #EAD9BC;

  /* Growth (replaces "positive green") */
  --ds-sage:       #6E7E55; /* progress, contributions, things taking root */
  --ds-sage-deep:  #3F4A33; /* reflection blocks, full-bleed quote bands */
  --ds-sage-soft:  #A7B187;
  --ds-sage-wash:  #E7E9DA; /* tints behind icons / chips / vessels */

  /* Caution — gentle, never alarm */
  --ds-amber:      #C8913E;

  /* Text */
  --ds-ink:        #2D2A22; /* reading text — soft espresso, never #000 */
  --ds-ink-soft:   #7E7765; /* labels, captions, supporting detail */

  /* Structure */
  --ds-line:       rgba(45,42,34,0.10); /* hairline rule */
  --ds-line-soft:  rgba(45,42,34,0.06); /* inner dividers */

  /* Sky (illustration only) */
  --ds-sky-0:      #F3ECDD;
  --ds-sky-1:      #E7E0CC;
}
```

### Data-viz palette
Charts use an **extended earthy range**, not the brand colors alone. Order matters (sage → terra → gold → teal → plum → olive):

```css
:root {
  --ds-data-sage:  #6E7E55;
  --ds-data-terra: #BB6038;
  --ds-data-gold:  #C99A4E;
  --ds-data-teal:  #5E8B86;
  --ds-data-plum:  #9E6B73;
  --ds-data-olive: #9A9A5E;
}
```

**Rules:** progress bars/rings use `--ds-sage` (fill) on `rgba(45,42,34,.08)` (track). Net-worth line = sage. Spend bars = olive with the current/highlighted bar in terra. Donut/pie cycles the data palette in order.

---

## 2. Typography

Two families, loaded from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
:root {
  --ds-font-display: "Newsreader", Georgia, serif;      /* life, reflection, headlines, quotes */
  --ds-font-ui:      "Hanken Grotesk", system-ui, sans-serif; /* data + interface */
}
```

| Role | Family | Size / line-height | Notes |
|---|---|---|---|
| Display XL | Newsreader 400 | `clamp(40px, 5vw, 56px)` / 1.02 | letter-spacing −.02em; italicize the emotional clause (`<em>your future</em>`) |
| Title | Newsreader 400 | 28–34px / 1.05 | letter-spacing −.015em |
| Big number | Hanken 600 | 40–54px / 1 | **tabular-nums**, letter-spacing −.02em |
| Body | Hanken 400 | 16px / 1.6 | max ~56ch line length |
| Eyebrow | Hanken 700 | 11.5px | `text-transform:uppercase; letter-spacing:.16em` |
| Quote band | Newsreader **italic** | 18–20px / 1.42 | on sage-deep watercolor band |

**Always** set `font-variant-numeric: tabular-nums` on money/figures. Use italic Newsreader for reflective phrases, never for emphasis in UI.

---

## 3. Shape, spacing & elevation

```css
:root {
  --ds-radius-pill: 999px;  /* actions & toggles ONLY */
  --ds-radius:      18px;   /* the rare lifted surface (cards, inputs, chips) — range 16–22px */
  --ds-radius-tile: 14px;   /* small icon tiles behind vessels */

  /* hero card shadow — the ONLY shadow in the system, kept very soft */
  --ds-shadow: 0 8px 24px -16px rgba(45,42,34,.4);
}
```

- **Hairline rule** (`1px` / `--ds-line`) separates regions instead of boxing them. Inner list dividers use `--ds-line-soft`.
- **Pills** (`999px`) are for buttons and toggles only — never for content cards.
- **Soft radius** (16–22px) for the few genuinely lifted surfaces.
- **Generous whitespace.** Section padding ≈ 56px vertical; content max-width ≈ 1060px on desktop, `0 40px` gutters. Mobile screen gutters ≈ 18–24px.
- Use shadow **sparingly** — at most the single hero stat card. Default elevation is *flat on paper*.

---

## 4. Texture & illustration

Two reusable SVG-filter backgrounds (data-URI, no asset files):

- **Grain overlay** — apply as `::after` at `opacity:.36; mix-blend-mode:multiply` over a screen. Fractal noise, baseFrequency `0.8`, desaturated, alpha `.05`.
- **Watercolor wash** — fractal noise baseFrequency `0.011`, 3 octaves, used inside the green band at `opacity:.55; mix-blend-mode:multiply`.

**The deep-green watercolor band** (`.ff-green`) — the signature surface for quotes & reflection:

```css
.ff-green {
  position: relative; overflow: hidden; border-radius: 22px;
  background:
    radial-gradient(72% 80% at 16% 10%, #57664c 0%, rgba(87,102,76,0) 56%),
    radial-gradient(76% 72% at 90% 26%, #36432a 0%, rgba(54,67,42,0) 52%),
    radial-gradient(96% 95% at 56% 108%, #2e3925 0%, rgba(46,57,37,0) 60%),
    linear-gradient(158deg, #46543c 0%, #3a4830 68%, #333f29 100%);
}
/* + ::before watercolor wash, + ::after soft vignette (see component source) */
```
Text on the green band is `#F2EEE0`; eyebrows on it are `rgba(242,238,224,.7)`.

**Illustration kit** (keep as SVG components — do not replace with raster):
- `HeroBand` — layered watercolor hills + sun + grass tufts + leaf sprigs. The home/landing hero backdrop.
- `Sprig` — faint botanical sprig (`rgba(255,255,255,.13)`) decorating green cards, bottom-right, bleeding off-edge.

---

## 5. The growth motif (signature)

Progress is **alive**: a vessel that grows from ember to plant. This is the system's identity — use it for goal progress, onboarding, and milestones.

`SproutVessel stage={0..3}`:
- **0 · Ember** — "just begun" (a terracotta flame in the pot)
- **1 · Sprout** — "taking root"
- **2 · Seedling** — "growing"
- **3 · In leaf** — "thriving" (adds a terracotta bloom)

Sits in a `--ds-sage-wash` rounded tile. Pair stage with goal completion (0% → ember, 100% → in leaf).

`GrowthRing pct={n}` — circular progress, sage stroke (6px) on `--ds-line` track, a leaf glyph centered. Use for the single headline metric ("Freedom progress").

---

## 6. Components

All built from the tokens above. Everything sits on the paper; emphasis = type + rule + one accent.

### Buttons (all pill, `999px`)
| Variant | Background | Text | Use |
|---|---|---|---|
| Primary | `#9C4F30` (deep terra) | `#FCF6EC` | the one action that matters |
| Ghost | transparent, `1px --ds-line` border | `--ds-terra` | secondary |
| Quiet | `--ds-sage-wash` | `--ds-sage-deep` | dismiss / "later" |

Padding `12px 22px`, Hanken 600, 14.5px.

### Stat row
Hairline-divided list. Each row: 9px color dot · label (`--ds-ink`) · value (600, tabular-nums, right-aligned). Dividers `--ds-line-soft`, no dividers boxing the group.

### Progress bar
8px track `rgba(45,42,34,.08)`, `999px`; fill is `linear-gradient(90deg, --ds-sage, --ds-sage-soft)`, or solid `--ds-sage` at 100%.

### Goal row
Vessel tile (stage = progress) + title (Newsreader) + % (700) + bar + `$x of $y` caption (tabular-nums).

### Charts (see `charts.jsx`)
`AreaLine`, `Bars`, `Donut` (donut/pie, tweakable thickness/gap/caps), `CatBars`. All consume the data palette. Donut center holds a Newsreader figure.

### Bottom nav (mobile)
Tabs: Hearth · Goals · Reflect · Learn. Active = `--ds-sage-deep` with `--ds-sage-wash` icon fill + 700 label; inactive `#B3AD9B`. Bar background `--ds-paper-2`, top `1px --ds-line`, generous bottom padding for the home indicator.

---

## 7. Voice & microcopy

Plain, warm, specific. Points to the life, reframes the weather, always leaves the way forward visible — a gentle mentor who never keeps score.

- **Empty state:** "Nothing to tend just yet — and that's a fine place to begin." → *Plant the first seed*
- **Quiet day:** "Welcome back. Nothing urgent today — just a moment to see how things are growing." → *Take a slow look*
- **Down market:** "The markets dipped this week. That's weather, not a verdict — your garden is still growing." → *See the path from here*
- **Milestone:** "Halfway to freedom. Sit with that before we plant the next one." → *Name what this buys you*

**Rules:** never scold about spending ("no scolding, just noticing"). Frame setbacks as weather, not verdicts. Use growth/garden metaphors. CTAs are gentle verbs, not commands.

---

## 8. Do / Don't

| Do | Don't |
|---|---|
| Flat surfaces on warm paper, separated by hairlines | Box everything in white cards with shadows |
| Sage for growth, terra as the single accent | Red/green stoplight for up/down |
| Tabular figures for all money | Proportional figures that wobble |
| Newsreader italic for reflective lines | Italic for UI emphasis |
| Watercolor washes / SVG illustration | Gradient-slop backgrounds, tiled noise, emoji |
| One primary action per view | Multiple competing accent colors |
| Soft espresso `#2D2A22` text | Pure black `#000` |
