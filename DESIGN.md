# Design System

> The single source of truth for all visual design is **[EMBER-DESIGN-SYSTEM.md](./EMBER-DESIGN-SYSTEM.md)**.

Ember is a warm, credible FIRE companion. Money is shown as **growth, not P&L** — flat
surfaces, hairline structure, watercolor illustration, and the voice of a gentle mentor
who never keeps score.

All prior design guidance ("The Sunrise Trail", coral-on-cream, pastel accents,
stoplight gain/loss) is **superseded** and must not be used.

## How design is implemented here

- **Tokens** live in `app/globals.css`. The Ember `--ds-*` tokens (§1–§3 of the spec)
  are the source of truth; the app's semantic utility tokens (`--primary`, `--ink`,
  `--gain`, `--surface`, …) are remapped onto them so every Tailwind utility
  (`bg-primary`, `text-ink`, `text-gain`, …) renders Ember automatically.
- **No component may hard-code** a hex color, font family, or radius. Always consume a
  token (CSS var or the Tailwind utility that points at it).
- **Type:** Newsreader (display/reflection) and Hanken Grotesk (data/UI, tabular-nums),
  loaded from Google Fonts in `app/layout.tsx`.
- **Charts** resolve their colors from the same CSS vars via `lib/chart-colors.ts`.
- **Growth motif:** `components/illustrations/SproutVessel.tsx` and `GrowthRing.tsx`.

When something is not covered by the spec, ask — do not invent colors, fonts, spacing,
or components.

See [EMBER-DESIGN-SYSTEM.md](./EMBER-DESIGN-SYSTEM.md) for the full specification.
