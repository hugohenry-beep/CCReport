import { DeltaBadge } from "./DeltaBadge";
import { cn } from "@/lib/cn";

interface KpiCardProps {
  label: string;
  value: string;
  current?: number;
  prior?: number | null;
  positiveIsGood?: boolean;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
  formatPrior?: (n: number) => string;
}

export function KpiCard({
  label,
  value,
  current,
  prior,
  positiveIsGood = true,
  hint,
  icon,
  className,
  formatPrior,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface px-4 py-3.5 shadow-soft transition-shadow hover:shadow-elevated",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-wider text-text-subtle">
          {label}
        </span>
        {icon && <span className="text-text-subtle">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold leading-tight tracking-tight tabular">
          {value}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
        {current != null && prior !== undefined && (
          <DeltaBadge
            current={current}
            prior={prior}
            positiveIsGood={positiveIsGood}
            showPriorValue={!!formatPrior}
            formatPrior={formatPrior}
          />
        )}
        {hint && <span className="text-text-subtle">{hint}</span>}
      </div>
    </div>
  );
}
