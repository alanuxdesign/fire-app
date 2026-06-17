import type { LifeExpenseCategoryInput } from "@/lib/life-plan";
import { DEFAULT_LIFE_EXPENSE_CATEGORIES } from "@/lib/life-plan-defaults";

/** US-average baseline (indexed to 100). Sources: MERIC/BLS-style regional composites, rounded. */
const STATE_COL_INDEX: Record<string, number> = {
  AL: 88, AK: 127, AZ: 102, AR: 86, CA: 142, CO: 105, CT: 118, DE: 103,
  DC: 152, FL: 99, GA: 91, HI: 165, ID: 94, IL: 95, IN: 89, IA: 89,
  KS: 87, KY: 88, LA: 91, ME: 101, MD: 118, MA: 127, MI: 90, MN: 97,
  MS: 84, MO: 88, MT: 95, NE: 89, NV: 101, NH: 108, NJ: 120, NM: 93,
  NY: 125, NC: 92, ND: 95, OH: 90, OK: 87, OR: 112, PA: 96, RI: 110,
  SC: 91, SD: 91, TN: 90, TX: 94, UT: 98, VT: 108, VA: 102, WA: 112,
  WV: 86, WI: 93, WY: 92,
};

/** Relative ACA silver-benchmark healthcare costs by state (100 = national). KFF-inspired approximations. */
const STATE_HEALTHCARE_INDEX: Record<string, number> = {
  AL: 92, AK: 145, AZ: 98, AR: 90, CA: 128, CO: 96, CT: 108, DE: 102,
  DC: 115, FL: 112, GA: 94, HI: 118, ID: 95, IL: 98, IN: 93, IA: 92,
  KS: 94, KY: 96, LA: 105, ME: 102, MD: 104, MA: 112, MI: 94, MN: 96,
  MS: 98, MO: 95, MT: 98, NV: 100, NH: 98, NJ: 106, NM: 96, NY: 118,
  NC: 118, ND: 96, OH: 96, OK: 98, OR: 100, PA: 98, RI: 104, SC: 104,
  SD: 94, TN: 96, TX: 102, UT: 92, VT: 108, VA: 100, WA: 98, WV: 94,
  WI: 98, WY: 98,
};

/** National silver-benchmark ~ age 40, single, before subsidies (2025 ballpark). */
const NATIONAL_ACA_ANNUAL_SINGLE = 6_480;

export type ColEstimateResult = {
  zip: string;
  state: string;
  place: string | null;
  colIndex: number;
  healthcareIndex: number;
  householdSize: number;
  categories: LifeExpenseCategoryInput[];
  totalAnnual: number;
  notes: {
    healthcare: string;
    col: string;
    inflation: string;
  };
};

export async function resolveZipLocation(
  zip: string,
): Promise<{ state: string; place: string | null } | null> {
  const normalized = zip.replace(/\D/g, "").slice(0, 5);
  if (normalized.length < 5) return null;

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${normalized}`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{
        "state abbreviation"?: string;
        "place name"?: string;
      }>;
    };
    const place = data.places?.[0];
    if (!place?.["state abbreviation"]) return null;
    return {
      state: place["state abbreviation"],
      place: place["place name"] ?? null,
    };
  } catch {
    return null;
  }
}

function healthcareAnnualForHousehold(
  state: string,
  householdSize: number,
): number {
  const index = (STATE_HEALTHCARE_INDEX[state] ?? 100) / 100;
  const base = NATIONAL_ACA_ANNUAL_SINGLE * index;
  const adults = Math.min(householdSize, 2);
  const children = Math.max(0, householdSize - 2);
  const adultCost = base * (adults === 1 ? 1 : 1 + 0.85);
  const childCost = base * 0.4 * children;
  return Math.round(adultCost + childCost);
}

export function estimateCategoriesForLocation(input: {
  state: string;
  place?: string | null;
  householdSize?: number;
}): ColEstimateResult {
  const householdSize = Math.max(1, Math.min(6, input.householdSize ?? 1));
  const colIndex = STATE_COL_INDEX[input.state] ?? 100;
  const healthcareIndex = STATE_HEALTHCARE_INDEX[input.state] ?? 100;
  const colMultiplier = colIndex / 100;

  const healthcareAnnual = healthcareAnnualForHousehold(input.state, householdSize);

  const categories: LifeExpenseCategoryInput[] = DEFAULT_LIFE_EXPENSE_CATEGORIES.map(
    (c) => {
      if (c.label === "Healthcare") {
        return { ...c, annualAmount: healthcareAnnual };
      }
      return {
        ...c,
        annualAmount: Math.round(c.annualAmount * colMultiplier),
      };
    },
  );

  const totalAnnual = categories.reduce((s, c) => s + c.annualAmount, 0);
  const placeLabel = input.place ? `${input.place}, ${input.state}` : input.state;

  return {
    zip: "",
    state: input.state,
    place: input.place ?? null,
    colIndex,
    healthcareIndex,
    householdSize,
    categories,
    totalAnnual,
    notes: {
      col: `Housing, food, transport, and more scaled to ${placeLabel} (cost index ${colIndex}, US avg = 100).`,
      healthcare: `Healthcare uses a typical ACA silver-plan benchmark for ${input.state} (~$${Math.round(healthcareAnnual / 12).toLocaleString()}/mo for your household, before subsidies). Actual premiums vary by age and plan.`,
      inflation:
        "These are today's dollars. Long-range milestones (like Coast) use a real return after inflation — not a second hidden bump on these numbers.",
    },
  };
}

export async function estimateFromZip(
  zip: string,
  householdSize = 1,
): Promise<ColEstimateResult | { error: string }> {
  const location = await resolveZipLocation(zip);
  if (!location) {
    return { error: "We couldn't find that ZIP — try a 5-digit US code." };
  }

  const result = estimateCategoriesForLocation({
    state: location.state,
    place: location.place,
    householdSize,
  });
  return { ...result, zip: zip.replace(/\D/g, "").slice(0, 5) };
}
