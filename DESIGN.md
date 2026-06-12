---
name: Fire
description: A warm, encouraging, illustration-forward companion for the FIRE marathon
colors:
  primary: "#ef7b5a"
  primary-hover: "#e26542"
  primary-soft: "#fce6dd"
  on-primary: "#ffffff"
  canvas: "#fbf6ef"
  canvas-sunken: "#f4ebdf"
  surface: "#fffdf9"
  surface-raised: "#ffffff"
  ink: "#2a2420"
  ink-secondary: "#6b5f55"
  ink-muted: "#9a8c7e"
  hairline: "#ebe0d2"
  hairline-strong: "#dccdb9"
  accent-blue: "#5b8def"
  accent-green: "#4fb286"
  accent-gold: "#e0a23b"
  accent-purple: "#9b7be0"
  accent-peach: "#ef9a6a"
  gain: "#3da776"
  loss: "#d8593e"
  warn: "#d89a2e"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.05em"
rounded:
  sm: "0.5rem"
  md: "0.875rem"
  lg: "1.125rem"
  xl: "1.5rem"
  xxl: "2rem"
  full: "9999px"
shadows:
  soft: "0 1px 2px rgba(120,90,60,.04), 0 8px 24px -12px rgba(120,90,60,.12)"
  card: "0 2px 4px rgba(120,90,60,.05), 0 16px 40px -16px rgba(120,90,60,.16)"
  float: "0 4px 8px rgba(120,90,60,.06), 0 24px 56px -20px rgba(120,90,60,.22)"
---

# Design System: Fire

## Overview

**Creative North Star: "The Sunrise Trail"**

Fire is a warm, encouraging, illustration-forward companion for the long FIRE marathon. The interface feels like a sunrise over a winding path: optimistic, calm, and human. It celebrates progress without hustle-culture pressure and grounds trust without cold institutional chrome.

The palette is coral-on-cream: a soft warm canvas, a friendly coral primary, and a small set of pastel accents (blue, green, gold, purple, peach) for stat chips and data. Corners are generously rounded, shadows are soft and warm-tinted, lines are simple, and spot illustrations carry the emotional moments (a sunrise hero, a journey path, a mountain milestone, celebratory empty states).

Both light and dark are first-class: light is warm cream; dark is warm espresso/plum, never cold zinc. **Light is the default.** Numbers are always tabular and precise; the voice stays gentle.

**Key Characteristics:**

- Warm cream (light) / espresso (dark) canvas — never a dark hero band in light mode.
- Coral primary for actions and key accents; pastel accents for category/stat chips and charts.
- Very rounded corners (cards 24px, buttons 18px, inputs 14px) and soft, warm shadows.
- Geist Sans throughout; one family, fixed rem scale, tabular figures for money.
- Custom inline SVG illustrations for hero, milestone, journey, and empty states.
- Semantic gain/loss/warn reserved for meaning; pastel accents are decorative-but-systematic.

## Tokens

All color, radius, and shadow values are CSS custom properties registered in `app/globals.css` via `@theme inline`, with light values on `:root` and warm-dark values on `.dark`. Components use the **token utilities** (`bg-canvas`, `bg-surface`, `text-ink`, `text-ink-secondary`, `border-hairline`, `bg-primary`, `text-on-primary`, `bg-accent-blue`/`-soft`, `text-gain`/`bg-gain-soft`, `shadow-card`, …), never stock Tailwind color classes. Because each token flips by theme automatically, `dark:` variants are needed only for non-color structural tweaks.

### Colors

- **Coral Primary** (#ef7b5a): Primary buttons, active nav, key accents, the net-worth chart area. `primary-hover` for hover; `primary-soft` for tinted chips behind coral text; `on-primary` for text/icons on coral fills.
- **Warm Neutrals:** `canvas` (page) → `surface` (cards) → `surface-raised` (floating). Text steps `ink` → `ink-secondary` → `ink-muted`. Edges use `hairline` / `hairline-strong`.
- **Pastel Accents** (blue, green, gold, purple, peach): each has a saturated base (icon/avatar/segment) and a `-soft` tint (chip background). Used for stat-card chips, institution avatars, and chart segments.
- **Semantic** (`gain` green, `loss` terracotta, `warn` gold): gains/losses, over-budget, review attention. Each has a `-soft` background tint for banners and chips.

### Named Rules

**The Token-Only Color Rule.** Components reference semantic token utilities, never `zinc-*`/`stone-*`/`emerald-*` etc. A recolor happens in `globals.css`, not across the tree.

**The Warm-Both-Ways Rule.** Light is warm cream; dark is warm espresso/plum. Neither theme uses cold blue-grey neutrals, and light mode never shows a dark hero band.

**The Meaning-Plus-Palette Rule.** `gain`/`loss`/`warn` appear only for state. The pastel accents are decorative but systematic — drawn from the token palette, never ad-hoc gradients.

## Typography

Geist Sans throughout (system-ui fallback); Geist Mono only for code-like values. Hero numbers use Display (700). Currency, percentages, and deltas always use `tabular-nums`.

## Elevation

Soft, warm-tinted shadows as tokens: `shadow-soft` (subtle lift, nav, pills), `shadow-card` (resting cards, sheets), `shadow-float` (hover / detached surfaces). Depth still comes mostly from surface-color steps (canvas → surface → surface-raised) and hairline borders; shadows are gentle, never hard drop-shadows.

## Components

- **Buttons:** Coral primary fill (`bg-primary text-on-primary`, hover `bg-primary-hover`), 48px on primary flows, 18px radius. Secondary: bordered surface (`SECONDARY_BUTTON`). Ghost: text-only.
- **Chips / pills:** `rounded-full`; selected = coral (`bg-primary text-on-primary`) or pastel-soft; default = bordered surface.
- **Cards:** `Card` primitive (bordered `surface`, 24px radius) or `FLOATING_CARD` (elevated `surface-raised`, 32px radius, `shadow-card`). Stat cards pair a pastel-soft icon chip with a saturated accent icon.
- **Inputs:** 14px radius, `border-hairline-strong`, `bg-surface`; focus shifts border/ring to `primary`.
- **Navigation:** Bottom tab bar (below lg) and left rail (lg+) share `components/layout/navConfig.ts`. Active = coral (`text-primary`, rail row `bg-primary-soft`); inactive = `text-ink-muted`/`text-ink-secondary`. Review badge = `bg-warn text-on-primary`.
- **Sheets / Modals:** `components/ui/SheetShell.tsx` — full-screen below lg, centered dialog over a scrim at lg+. Account detail mirrors this.

## Illustrations

Custom inline SVG components in `components/illustrations/`, no dependencies. They consume tokens via `currentColor` and `var(--token)` so they flip with the theme, and gate motion behind `motion-safe:` plus an in-SVG `prefers-reduced-motion` guard.

- **SunriseHero** — full-bleed sunrise + hill bands behind the net-worth number (Home + Portfolio heroes).
- **MountainMilestone** — peak + summit flag for "Next milestone" and the 4%-rule card.
- **JourneyStepper** — winding path with checkmark nodes (done = gain, current = primary, future = hairline) for journey progress.
- **CelebrateSpot** — person celebrating, for milestone-hit and "all caught up" states.
- **EmptyAccounts / EmptyBudget / EmptyTransactions** — labelled line-art spots (coral + one pastel) for empty states.

Decorative illustrations are `aria-hidden`; meaningful ones use `role="img"` + `aria-label`.

## Do's and Don'ts

### Do

- Use token utilities (`bg-surface`, `text-ink`, `bg-primary`, `bg-accent-*`) everywhere.
- Keep light warm-cream and dark warm-espresso; let the hero be a light cream→peach gradient with dark ink text in light mode.
- Reserve `gain`/`loss`/`warn` for state; use pastel accents for category/stat identity.
- Lean on illustrations and gentle copy for celebration; always provide reduced-motion fallbacks.
- Keep one rounded, soft-shadowed component vocabulary.

### Don't

- Don't hardcode stock Tailwind colors (`zinc-*`, `emerald-*`, `teal-*`, …) in components.
- Don't put a dark band in light mode, or cold blue-grey neutrals in either theme.
- Don't use decorative gradient text, glassmorphism, or hard drop-shadows.
- Don't add hustle-culture gamification: streaks, leaderboards, confetti overload.
- Don't ship spreadsheet-first density or alarming red on neutral states.
- Don't use display fonts in buttons, labels, or data tables.
