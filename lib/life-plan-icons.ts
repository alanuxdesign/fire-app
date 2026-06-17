import type { FreedomTierId } from "@/lib/life-plan";

const LABEL_ICON_RULES: Array<[RegExp, string]> = [
  [/hous|rent|mortgage|home/i, "Home"],
  [/food|groc|dining|eat/i, "UtensilsCrossed"],
  [/health|medical|aca|insurance/i, "HeartPulse"],
  [/transport|car|transit|gas/i, "Car"],
  [/travel|trip|vacation/i, "Plane"],
  [/fun|personal|entertain|hobby/i, "Sparkles"],
  [/giv|charit|donat/i, "Gift"],
  [/utilit|bill|electric/i, "Zap"],
  [/child|family|kid/i, "Users"],
  [/educ|school|tuition/i, "GraduationCap"],
];

export function iconForLifeCategory(label: string): string {
  for (const [pattern, icon] of LABEL_ICON_RULES) {
    if (pattern.test(label)) return icon;
  }
  return "CircleDollarSign";
}

export const TIER_ICONS: Record<FreedomTierId, string> = {
  lean: "Shield",
  coast: "TrendingUp",
  barista: "Coffee",
  full: "Sun",
};
