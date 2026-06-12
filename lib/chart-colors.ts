"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export type ChartColors = {
  primary: string;
  primaryStroke: string;
  gain: string;
  loss: string;
  accentBlue: string;
  inkMuted: string;
  hairline: string;
  segments: string[];
};

// Light-theme fallbacks (mirror the tokens in app/globals.css) for SSR, where
// getComputedStyle is unavailable.
const FALLBACK: ChartColors = {
  primary: "#ef7b5a",
  primaryStroke: "#e26542",
  gain: "#3da776",
  loss: "#d8593e",
  accentBlue: "#5b8def",
  inkMuted: "#9a8c7e",
  hairline: "#ebe0d2",
  segments: [
    "#5b8def",
    "#4fb286",
    "#e0a23b",
    "#9b7be0",
    "#ef9a6a",
    "#ef7b5a",
    "#3da776",
    "#d8593e",
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
    primary: read("--primary", FALLBACK.primary),
    primaryStroke: read("--primary-hover", FALLBACK.primaryStroke),
    gain: read("--gain", FALLBACK.gain),
    loss: read("--loss", FALLBACK.loss),
    accentBlue: read("--accent-blue", FALLBACK.accentBlue),
    inkMuted: read("--ink-muted", FALLBACK.inkMuted),
    hairline: read("--hairline", FALLBACK.hairline),
    segments: [
      read("--accent-blue", FALLBACK.segments[0]),
      read("--accent-green", FALLBACK.segments[1]),
      read("--accent-gold", FALLBACK.segments[2]),
      read("--accent-purple", FALLBACK.segments[3]),
      read("--accent-peach", FALLBACK.segments[4]),
      read("--primary", FALLBACK.segments[5]),
      read("--gain", FALLBACK.segments[6]),
      read("--loss", FALLBACK.segments[7]),
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
