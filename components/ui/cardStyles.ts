/**
 * Shared surface/control class constants (Ember). Structure comes from hairline
 * rules and whitespace, not boxes and shadows. The only shadow in the system is
 * the single soft hero card per view (HERO_CARD).
 *
 * Swap tokens here once instead of editing every component.
 */

/**
 * Flat panel: sits directly on the paper, separated by a hairline rule — no
 * shadow. The default surface for everything that isn't the one hero card.
 */
export const PANEL =
  "rounded-[18px] border border-hairline bg-paper-2";

/**
 * The single lifted "hero stat card" allowed per view (§0, §3). Soft shadow,
 * white card surface. Use sparingly — at most one per screen.
 */
export const HERO_CARD =
  "rounded-[18px] bg-surface-raised shadow-card ring-1 ring-hairline";

/**
 * @deprecated Prefer PANEL (flat) or HERO_CARD (the one lifted surface).
 * Kept as a flat panel so legacy call-sites flatten automatically.
 */
export const FLOATING_CARD = PANEL;

/* ─── Buttons — all pill (§6) ─────────────────────────────────────── */

/** Primary: deep terra fill — the one action that matters. */
export const PRIMARY_BUTTON =
  "rounded-full bg-terra-deep px-[22px] py-3 text-[14.5px] font-semibold text-on-primary transition-colors hover:bg-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/** Ghost: transparent, hairline border, terra text — secondary. */
export const GHOST_BUTTON =
  "rounded-full border border-hairline px-[22px] py-3 text-[14.5px] font-semibold text-terra transition-colors hover:bg-sage-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra";

/** Quiet: sage-wash fill — dismiss / "later". */
export const QUIET_BUTTON =
  "rounded-full bg-sage-wash px-[22px] py-3 text-[14.5px] font-semibold text-sage-deep transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage";

/** @deprecated Prefer GHOST_BUTTON. */
export const SECONDARY_BUTTON = GHOST_BUTTON;
