"use client";

import { HERO_CARD } from "@/components/ui/cardStyles";
import {
  computeRunwayWithLevers,
  type RunwayLevers,
} from "@/lib/life-plan";
import {
  formatRunwayUnit,
  runwayAgencyCopy,
  runwayMeterFill,
  runwayReassuranceCopy,
} from "@/lib/life-plan-display";
import { formatCurrency } from "@/lib/format";
import { Scissors, Wallet, Briefcase } from "lucide-react";
import { useMemo, useState } from "react";

type RunwayMeterProps = {
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  fullMonthlySpend: number;
  essentialMonthlySpend: number;
  partTimeIncomeAnnual: number;
  /** Controlled levers (for playbooks). */
  levers?: RunwayLevers;
  onLeversChange?: (levers: RunwayLevers) => void;
  /** Hide outer section chrome when nested. */
  embedded?: boolean;
  compact?: boolean;
  /** Levers only — no hero stat (for playbooks). */
  leversOnly?: boolean;
};

function LeverToggle({
  active,
  onToggle,
  icon: Icon,
  label,
  detail,
  hint,
}: {
  active: boolean;
  onToggle: () => void;
  icon: typeof Scissors;
  label: string;
  detail: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-[18px] px-4 py-3.5 text-left transition-colors ${
        active ? "bg-sage-wash" : "hover:bg-paper-2"
      }`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${
          active ? "bg-sage text-paper" : "bg-paper-2 text-ink-soft"
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium text-ink">{label}</span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              active ? "bg-sage" : "bg-[var(--ds-track)]"
            }`}
            aria-hidden
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper ring-1 ring-hairline motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out ${
                active ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-ink-soft">{detail}</span>
        {hint ? (
          <span className="mt-1 block text-xs text-ink-soft">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}

export function RunwayMeter({
  accessibleAssets,
  totalAssets,
  swr,
  fullMonthlySpend,
  essentialMonthlySpend,
  partTimeIncomeAnnual,
  levers: controlledLevers,
  onLeversChange,
  embedded = false,
  compact = false,
  leversOnly = false,
}: RunwayMeterProps) {
  const [internalLevers, setInternalLevers] = useState<RunwayLevers>({
    cutToEssentials: false,
    partTime: false,
  });

  const levers = controlledLevers ?? internalLevers;
  const setLevers = (next: RunwayLevers) => {
    if (onLeversChange) onLeversChange(next);
    else setInternalLevers(next);
  };

  const baseline = useMemo(
    () =>
      computeRunwayWithLevers({
        accessibleAssets,
        totalAssets,
        swr,
        fullMonthlySpend,
        essentialMonthlySpend,
        partTimeIncomeAnnual,
        levers: { cutToEssentials: false, partTime: false },
      }),
    [accessibleAssets, totalAssets, swr, fullMonthlySpend, essentialMonthlySpend, partTimeIncomeAnnual],
  );

  const current = useMemo(
    () =>
      computeRunwayWithLevers({
        accessibleAssets,
        totalAssets,
        swr,
        fullMonthlySpend,
        essentialMonthlySpend,
        partTimeIncomeAnnual,
        levers,
      }),
    [accessibleAssets, totalAssets, swr, fullMonthlySpend, essentialMonthlySpend, partTimeIncomeAnnual, levers],
  );

  const essentialsOnly = useMemo(
    () =>
      computeRunwayWithLevers({
        accessibleAssets,
        totalAssets,
        swr,
        fullMonthlySpend,
        essentialMonthlySpend,
        partTimeIncomeAnnual,
        levers: { cutToEssentials: true, partTime: false },
      }),
    [accessibleAssets, totalAssets, swr, fullMonthlySpend, essentialMonthlySpend, partTimeIncomeAnnual],
  );

  const { value, unit } = formatRunwayUnit(current.months, current.indefinite);
  const fill = runwayMeterFill(current.months, current.indefinite);
  const reassurance = runwayReassuranceCopy(
    current.months,
    current.indefinite,
    accessibleAssets,
  );
  const agency = runwayAgencyCopy({
    baselineMonths: baseline.months,
    baselineIndefinite: baseline.indefinite,
    currentMonths: current.months,
    currentIndefinite: current.indefinite,
    levers,
  });

  const partTimeMonthly = partTimeIncomeAnnual / 12;
  const essentialsHint = essentialsOnly.indefinite
    ? "Essentials only → open-ended"
    : `Essentials only → ${Math.max(0, Math.floor(essentialsOnly.months ?? 0))} mo`;

  const sectionClass = embedded
    ? leversOnly
      ? "mt-4"
      : "mt-6 border-t border-hairline pt-6"
    : "mt-8 border-t border-hairline pt-8";

  return (
    <section
      id={leversOnly ? undefined : "runway"}
      className={sectionClass}
      aria-label={leversOnly ? undefined : "Runway and breathing room"}
    >
      {!compact && !leversOnly ? (
        <>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            Runway &amp; adapt
          </p>
          <p className="mt-2 font-display text-[1.35rem] leading-tight text-ink">
            How long you could float
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Breathing room if income stopped — flip the levers to see what you
            control.
          </p>
        </>
      ) : null}

      {!leversOnly ? (
        <div className={`${compact ? "" : "mt-6"} ${HERO_CARD} px-6 py-7`}>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            Breathing room
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="ember-value-rise text-[clamp(2.5rem,8vw,3.25rem)] font-semibold tabular-nums tracking-[-0.02em] text-ink"
              key={`${value}-${unit}`}
            >
              {value}
            </span>
            <span className="text-lg font-medium text-ink-soft">{unit}</span>
          </div>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--ds-track)]"
            role="presentation"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-sage motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
              style={{ width: `${Math.max(fill * 100, fill > 0 ? 4 : 0)}%` }}
            />
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            {reassurance}
          </p>
          {agency ? (
            <p className="mt-2 font-display text-[1.05rem] italic leading-[1.42] text-sage-deep">
              {agency}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`${compact || leversOnly ? "mt-0" : "mt-5"} space-y-1`}>
        <div className="flex items-center gap-3 rounded-[18px] px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-paper-2 text-ink-soft">
            <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-medium text-ink">Baseline</span>
            <span className="mt-0.5 block text-sm text-ink-soft">
              Current spending ·{" "}
              {baseline.indefinite
                ? "open-ended"
                : `${Math.max(0, Math.floor(baseline.months ?? 0))} months`}
            </span>
          </span>
        </div>

        <LeverToggle
          active={levers.cutToEssentials}
          onToggle={() =>
            setLevers({ ...levers, cutToEssentials: !levers.cutToEssentials })
          }
          icon={Scissors}
          label="Cut to essentials"
          detail="Drop everything tagged discretionary in your life plan"
          hint={essentialsHint}
        />

        <LeverToggle
          active={levers.partTime}
          onToggle={() => setLevers({ ...levers, partTime: !levers.partTime })}
          icon={Briefcase}
          label="+ Part-time"
          detail={`Modest income reduces net burn · ${formatCurrency(partTimeMonthly)}/mo assumed`}
          hint="Assumption — adjust in Settings"
        />
      </div>
    </section>
  );
}
