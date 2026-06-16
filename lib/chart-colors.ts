"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export type ChartColors = {
  primary: string;
  primaryStroke: string;
  gain: string;
  loss: string;
  accentBlue: string;
  olive: string;
  gold: string;
  inkMuted: string;
  hairline: string;
  segments: string[];
};

// Ember light-theme fallbacks (mirror the tokens in app/globals.css) for SSR,
// where getComputedStyle is unavailable. Data palette order: sage → terra →
// gold → teal → plum → olive (§1).
const FALLBACK: ChartColors = {
  primary: "#bb6038",
  primaryStroke: "#9c4f30",
  gain: "#6e7e55",
  loss: "#7e7765",
  accentBlue: "#5e8b86",
  olive: "#9a9a5e",
  gold: "#c99a4e",
  inkMuted: "#b3ad9b",
  hairline: "rgba(45,42,34,0.10)",
  segments: [
    "#6e7e55",
    "#bb6038",
    "#c99a4e",
    "#5e8b86",
    "#9e6b73",
    "#9a9a5e",
  ],
};

/** Reads resolved token values off the document root (respects current theme). */
export function getChartColors(): ChartColors {
  if (typeof window === "undefined") {
    return FALLBACK;
  }
  const s = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;

  return {
    primary: read("--ds-terra", FALLBACK.primary),
    primaryStroke: read("--ds-terra-deep", FALLBACK.primaryStroke),
    gain: read("--ds-sage", FALLBACK.gain),
    loss: read("--ds-ink-soft", FALLBACK.loss),
    accentBlue: read("--ds-data-teal", FALLBACK.accentBlue),
    olive: read("--ds-data-olive", FALLBACK.olive),
    gold: read("--ds-data-gold", FALLBACK.gold),
    inkMuted: read("--ds-ink-faint", FALLBACK.inkMuted),
    hairline: read("--ds-line", FALLBACK.hairline),
    segments: [
      read("--ds-data-sage", FALLBACK.segments[0]),
      read("--ds-data-terra", FALLBACK.segments[1]),
      read("--ds-data-gold", FALLBACK.segments[2]),
      read("--ds-data-teal", FALLBACK.segments[3]),
      read("--ds-data-plum", FALLBACK.segments[4]),
      read("--ds-data-olive", FALLBACK.segments[5]),
    ],
  };
}

/** Theme-aware chart colors that re-resolve when the user toggles the theme. */
export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    // Re-read resolved token values from the DOM after the theme class flips.
    // This is an external-system (computed-style) sync, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColors(getChartColors());
  }, [theme]);

  return colors;
}
