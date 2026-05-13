import { DollarSign, LineChart, TrendingUp, Users } from "lucide-react";
import type { Metrics } from "@/lib/types";
import { fmtMoney, fmtNumber } from "@/lib/render/format";
import { KpiCard } from "./KpiCard";

interface KpiRowProps {
  metrics: Metrics;
}

export function KpiRow({ metrics }: KpiRowProps) {
  const c = metrics.current;
  const p = metrics.prior;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Inbound leads"
        value={fmtNumber(c.inboundLeadCount)}
        current={c.inboundLeadCount}
        prior={p?.inboundLeadCount ?? null}
        formatPrior={fmtNumber}
        icon={<Users className="h-4 w-4" />}
      />
      <KpiCard
        label="Google Ads spend"
        value={fmtMoney(c.adSpend)}
        current={c.adSpend}
        prior={p?.adSpend ?? null}
        formatPrior={fmtMoney}
        positiveIsGood={false}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <KpiCard
        label="Pipeline value"
        value={fmtMoney(c.totalDealValue)}
        current={c.totalDealValue}
        prior={p?.totalDealValue ?? null}
        formatPrior={fmtMoney}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <KpiCard
        label="Cost per lead"
        value={c.costPerLead != null ? fmtMoney(c.costPerLead) : "—"}
        current={c.costPerLead ?? 0}
        prior={p?.costPerLead ?? null}
        formatPrior={fmtMoney}
        positiveIsGood={false}
        hint={c.costPerLead == null ? "no leads in period" : undefined}
        icon={<LineChart className="h-4 w-4" />}
      />
    </div>
  );
}
