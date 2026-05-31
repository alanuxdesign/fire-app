import { formatCurrency, formatRelativeTime } from "@/lib/format";

type AccountRowProps = {
  name: string;
  subtitle: string | null;
  balance: number;
  currency: string;
  institutionName: string | null;
  updatedAt: string;
};

const INSTITUTION_COLORS = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function getInstitutionColor(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) ?? 0);
  return INSTITUTION_COLORS[code % INSTITUTION_COLORS.length];
}

export function AccountRow({
  name,
  subtitle,
  balance,
  currency,
  institutionName,
  updatedAt,
}: AccountRowProps) {
  const label = institutionName ?? name;
  const initial = label.charAt(0).toUpperCase();
  const updatedDate = new Date(updatedAt);

  return (
    <div className="flex items-start gap-3 py-3.5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getInstitutionColor(label)}`}
        aria-hidden
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-slate-900">{name}</p>
        {subtitle ? (
          <p className="truncate text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[15px] font-semibold tabular-nums text-slate-900">
          {formatCurrency(balance, currency)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatRelativeTime(updatedDate)}
        </p>
      </div>
    </div>
  );
}
