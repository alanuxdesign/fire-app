---
name: Fire
description: A warm, mobile-first personal finance companion for the FIRE marathon
colors:
  primary: "#18181b"
  primary-inverted: "#fafafa"
  canvas-light: "#f5f5f4"
  canvas-dark: "#09090b"
  surface-light: "#ffffff"
  surface-dark: "#18181b"
  ink-light: "#0f172a"
  ink-dark: "#fafafa"
  muted-ink: "#71717a"
  border-light: "#e4e4e7"
  border-dark: "#27272a"
  success: "#34d399"
  success-deep: "#059669"
  danger: "#f87171"
  danger-deep: "#dc2626"
  warning: "#f59e0b"
  warning-deep: "#b45309"
  celebrate: "#f59e0b"
  chart-teal: "#0d9488"
  chart-indigo: "#6366f1"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.05em"
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-inverted}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "#27272a"
    textColor: "{colors.primary-inverted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-inverted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-default:
    backgroundColor: "{colors.surface-light}"
    textColor: "#475569"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  card-surface:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-field:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "40px"
  nav-tab-active:
    textColor: "{colors.ink-dark}"
    typography: "{typography.label}"
  nav-tab-default:
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
---

# Design System: Fire

## Overview

**Creative North Star: "The Clearing Path"**

Fire's visual system is a mobile-first product UI that makes financial progress feel lighter, not heavier. The interface sits between Headspace's calming encouragement and Monarch's grounded trust: warm enough to celebrate milestones, restrained enough to never feel like hustle-culture fintech or corporate banking. Dark mode is the default because portfolio and net-worth moments read best on a deep canvas; light surfaces carry the working content below.

Density is comfortable, not spreadsheet-tight. Numbers are always tabular and precise; voice stays gentle. Celebration shows up in semantic color (green months, amber warnings, milestone badges), not confetti or hero metrics. The tool should disappear into the task of checking progress and feeling hope.

**Key Characteristics:**

- Mobile shell capped at `max-w-lg` with a fixed bottom tab bar
- Dark hero band for portfolio/net-worth; light stone canvas for scrollable work areas
- Geist Sans throughout; one family, fixed rem scale, no display/body pairing
- Tonal layering over decorative shadows; borders and surface shifts carry depth
- Semantic green/red/amber for progress, never decorative gradient accents
- Rounded-xl buttons and rounded-2xl cards; familiar product affordances

## Colors

A restrained neutral system with warm stone undertones and semantic color reserved for meaning.

### Primary

- **Midnight Ink** (#18181b): Primary actions, selected chips, and the portfolio hero band. The anchor that says "this is the real UI," not a marketing page.
- **Inverted Paper** (#fafafa): Primary button text on dark surfaces; inverted primary buttons in dark mode sheets.

### Neutral

- **Stone Canvas** (#f5f5f4): Light-mode scrollable background behind cards and lists.
- **Zinc Night** (#09090b): Dark-mode page background and portfolio header canvas.
- **White Surface** (#ffffff) / **Zinc Panel** (#18181b): Card and sheet backgrounds in light and dark modes.
- **Slate Ink** (#0f172a) / **Zinc Mist** (#fafafa): Primary text in light and dark modes.
- **Quiet Zinc** (#71717a): Secondary labels, inactive tab icons, helper copy.
- **Hairline Border** (#e4e4e7 light / #27272a dark): Card edges, dividers, input strokes.

### Tertiary

- **Trail Green** (#34d399 dark / #059669 light): Positive change, on-track budget progress, gains.
- **Honest Red** (#f87171 dark / #dc2626 light): Losses, over-budget alerts, errors.
- **Nudge Amber** (#f59e0b): Review badges, 80% budget warnings, celebratory attention without alarm.
- **Chart Spectrum** (teal #0d9488, indigo #6366f1, and extended palette): Data visualization only; never used as decorative UI chrome.

### Named Rules

**The Meaning-Only Color Rule.** Green, red, and amber appear only when they communicate state: gain/loss, on-track/over-budget, needs-attention. They are never background decoration or brand gradients.

**The No-SaaS-Cream Rule.** Avoid warm near-white body backgrounds (#faf7f2, sand, parchment). Fire's light canvas is cool stone; warmth lives in copy and milestone moments, not default page tint.

## Typography

**Display Font:** Geist Sans (with system-ui fallback)
**Body Font:** Geist Sans (with system-ui fallback)
**Label/Mono Font:** Geist Mono for code-like values when needed; labels use Geist Sans

**Character:** Clean, modern, and quietly confident. Fixed rem sizes keep the mobile shell predictable. Financial figures always use `tabular-nums`.

### Hierarchy

- **Display** (600, 2.25rem / 36px, 1.1): Net worth and other hero numbers. Centered in the dark portfolio band only.
- **Headline** (600, 1.125rem / 18px, 1.3): Sheet titles, section headers ("Add account", bucket names in detail).
- **Title** (500, 0.9375rem / 15px, 1.4): Button labels, row titles, emphasized list primary text.
- **Body** (400, 0.875rem / 14px, 1.5): Descriptions, helper text, form copy. Keep prose blocks under 65–75ch when they appear.
- **Label** (500, 0.75rem / 12px, uppercase + wide tracking): Control section labels ("View", "Group by"), tab bar labels (10px), metadata.

### Named Rules

**The One Family Rule.** Geist Sans carries headings, buttons, labels, body, and data. No display serif pairing; familiarity beats flourish in product UI.

**The Tabular Money Rule.** All currency, percentages, and deltas use tabular figures. Alignment and scanability matter more than personality.

## Elevation

Fire is flat-by-default with tonal layering. Depth comes from surface color shifts (zinc-950 hero → stone-100 content), hairline borders, and occasional sheet shadows, not persistent card elevation.

### Shadow Vocabulary

- **Sheet lift** (`box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`): Bottom sheets and chooser modals only.
- **Tab bar edge** (`box-shadow: 0 -1px 3px rgba(0,0,0,0.06)`): Separates fixed navigation from scrollable content.
- **Scrim** (`background: rgba(0,0,0,0.4–0.5)`): Modal overlays; never glassmorphism blur.

### Named Rules

**The Flat Card Rule.** List rows and budget buckets use bordered surfaces at rest. Shadows appear only when a surface detaches (sheet, modal), not on every card in a grid.

## Components

Product components should feel tactile and familiar: the same button height, the same border language, the same chip shape everywhere.

### Buttons

- **Shape:** Generously rounded (12px / `rounded-xl`) on primary flows; compact pills (full radius) for filter toggles.
- **Primary:** Midnight Ink fill, white text, 48px height, 15px medium weight. Used for irreversible or forward actions ("Save", "Connect").
- **Secondary:** White/stone surface with slate border; hover shifts to stone-50. Used for "+ Add account" and non-destructive alternatives.
- **Ghost:** Text-only cancel actions in sheets (slate-500, no border).
- **Hover / Focus:** Color shift only (slate-900 → zinc-800); 150–200ms transitions. Focus ring: 1px slate/zinc ring on inputs and selects.

### Chips

- **Style:** `rounded-full`, 12px horizontal padding, xs medium weight.
- **Selected:** Midnight Ink fill, inverted text (portfolio view toggles).
- **Default:** White/zinc-900 surface with 1px stone/zinc ring; hover stone-50/zinc-800.

### Cards / Containers

- **Corner Style:** 16px (`rounded-2xl`) for budget buckets and account groups.
- **Background:** White (light) / zinc-900 (dark).
- **Border:** zinc-200 / zinc-800 default; semantic tint (amber/red) only for alert states.
- **Internal Padding:** 16px standard; list rows use 16px vertical padding with flex alignment.
- **Progress bars:** 8px height, full-radius track in zinc-100/zinc-800; fill uses semantic green/amber/red.

### Inputs / Fields

- **Style:** 8px radius, 1px stone-300 / zinc-700 border, white/zinc-900 fill, 14px body text.
- **Focus:** Border darkens to slate-500 with 1px matching ring.
- **Error:** red-50 / red-950 background with red-700 / red-300 text in rounded-lg banners.
- **Disabled:** 60% opacity; never hide the field.

### Navigation

- **Tab bar:** Fixed bottom, 5 equal columns, max-w-lg centered. Active tab: semibold zinc-100/900; inactive: zinc-400/500. Center Home icon slightly larger (28px vs 20px). Review badge: amber-500 dot with white 9px bold count.
- **In-page controls:** Uppercase tracked labels (12px) beside pill toggles or compact selects; border-b separator under control rows.

### Sheets / Modals

- **Bottom sheet pattern:** `rounded-t-2xl` on mobile, `rounded-2xl` centered on sm+. Scrim + shadow-xl. Header with 18px semibold title and optional 14px slate subtitle.
- **Full-screen detail:** Account detail uses full viewport height with safe-area padding; close control is rounded-full icon button.

## Do's and Don'ts

### Do:

- **Do** use semantic green/red/amber only for gains, losses, budget state, and review attention.
- **Do** default to dark mode for portfolio hero moments; use stone-100 / zinc-950 split between hero and working content.
- **Do** keep primary actions at 48px height with verb + object labels ("Save changes", "Connect Bank/Brokerage").
- **Do** celebrate milestones with copy and color state, not motion-dependent effects; always provide reduced-motion alternatives.
- **Do** maintain one component vocabulary: rounded-xl buttons, rounded-2xl cards, rounded-lg inputs, everywhere.

### Don't:

- **Don't** use generic SaaS dashboards: navy gradients, hero metrics, identical icon + heading + text card grids.
- **Don't** feel like a corporate banking app: sterile institutional chrome, compliance-heavy density, cold trust signals.
- **Don't** lean into high-tech fintech gamification: streaks, confetti overload, hustle culture, competitive leaderboards.
- **Don't** ship spreadsheet-first UI: dense jargon tables as the default path, or power-user density before the journey is clear.
- **Don't** add anxiety: red for decoration, alarming copy on neutral states, or screens that punish the user for down markets.
- **Don't** use gradient text, glassmorphism, side-stripe borders, or numbered section eyebrows as decorative scaffolding.
- **Don't** use display fonts in buttons, labels, or data tables.
