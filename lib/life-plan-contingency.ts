import type { RunwayLevers } from "@/lib/life-plan";
import { formatRunwayHeadline } from "@/lib/life-plan-display";

export type ContingencyScenario = "job_loss" | "big_expense";

export type ContingencyLevers = RunwayLevers & {
  notes?: string;
};

export const CONTINGENCY_SCENARIOS: Array<{
  id: ContingencyScenario;
  title: string;
  prompt: string;
}> = [
  {
    id: "job_loss",
    title: "If I lose my job",
    prompt:
      "Primary income stops. What would you actually do — and for how long could you float?",
  },
  {
    id: "big_expense",
    title: "If a big expense hits",
    prompt:
      "A sudden cost lands — health, home, family. How would you trim and bridge?",
  },
];

export function parseContingencyLevers(
  raw: Record<string, unknown> | undefined,
): ContingencyLevers {
  return {
    cutToEssentials: Boolean(raw?.cutToEssentials ?? raw?.cut_to_essentials),
    partTime: Boolean(raw?.partTime ?? raw?.part_time),
    notes: typeof raw?.notes === "string" ? raw.notes : "",
  };
}

export function serializeContingencyLevers(levers: ContingencyLevers): Record<string, unknown> {
  return {
    cutToEssentials: levers.cutToEssentials,
    partTime: levers.partTime,
    notes: levers.notes ?? "",
  };
}

/** Plain-language plan summary from levers + runway (M3 "on paper"). */
export function buildContingencyPlanSummary(input: {
  scenario: ContingencyScenario;
  levers: ContingencyLevers;
  runwayMonths: number | null;
  runwayIndefinite: boolean;
}): string {
  const { levers, runwayMonths, runwayIndefinite } = input;
  const runwayLabel = formatRunwayHeadline(runwayMonths, runwayIndefinite);
  const scenarioLabel =
    input.scenario === "job_loss" ? "I lose my job" : "a big expense hits";

  const steps: string[] = [];
  if (levers.cutToEssentials) {
    steps.push(`cut to essentials (${runwayLabel.toLowerCase()})`);
  } else {
    steps.push(`float on current spending (${runwayLabel.toLowerCase()})`);
  }
  if (levers.partTime) {
    steps.push("pick up part-time if it runs longer than planned");
  }

  const core = `If ${scenarioLabel}: ${steps.join(", and ")}.`;
  if (levers.notes?.trim()) {
    return `${core} ${levers.notes.trim()}`;
  }
  return core;
}
