import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface DeltaBadgeProps {
  current: number;
  prior: number | null | undefined;
  /** When true (default), a higher current is "good" (green). For cost metrics, set to false. */
  positiveIsGood?: boolean;
  className?: string;
  showPriorValue?: boolean;
  formatPrior?: (n: number) => string;
  /** Compact mode hides the parenthetical prior value */
  compact?: boolean;
}

export function DeltaBadge({
  current,
  prior,
  positiveIsGood = true,
  className,
  showPriorValue = false,
  formatPrior,
  compact = false,
}: DeltaBadgeProps) {
  if (prior == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[0.7rem] font-medium text-text-subtle tabular",
          className,
        )}
      >
        no prior
      </span>
    );
  }
  if (prior === 0) {
    const direction = current > 0 ? "up" : "flat";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium tabular",
          direction === "up"
            ? positiveIsGood
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
            : "bg-surface-2 text-text-subtle",
          className,
        )}
      >
        {direction === "up" ? "new" : "→ 0"}
      </span>
    );
  }
  const change = ((current - prior) / prior) * 100;
  const direction = change > 0.1 ? "up" : change < -0.1 ? "down" : "flat";
  const good =
    direction === "flat" ? null : (direction === "up") === positiveIsGood;
  const Icon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight;
  const sign = change > 0 ? "+" : "";
  const priorPart =
    showPriorValue && !compact && formatPrior ? ` vs ${formatPrior(prior)}` : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium tabular",
        good == null
          ? "bg-surface-2 text-text-muted"
          : good
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {sign}
      {change.toFixed(1)}%{priorPart}
    </span>
  );
}
