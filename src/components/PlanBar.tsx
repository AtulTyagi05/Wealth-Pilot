"use client";
import type { PlanBucket } from "@/lib/finance/budget";
import { useMoney } from "@/store/useOverview";

export const BUCKET_COLORS: Record<PlanBucket["key"], string> = {
  expenses: "var(--s1)",
  emergency: "var(--s2)",
  investments: "var(--s3)",
  disposable: "var(--s7)",
};

/** Stacked 100% bar for the salary split with a 2px surface gap between segments. */
export function PlanBar({ buckets, showLegend = true }: { buckets: PlanBucket[]; showLegend?: boolean }) {
  const { money } = useMoney();
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full">
        {buckets.filter((b) => b.amount > 0).map((b) => (
          <div key={b.key} title={`${b.label}: ${money(b.amount)} (${b.percent.toFixed(0)}%)`} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${b.percent}%`, background: BUCKET_COLORS[b.key] }} />
        ))}
      </div>
      {showLegend && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {buckets.map((b) => (
            <div key={b.key}>
              <div className="flex items-center gap-1.5 text-xs text-ink-2"><span className="size-2.5 rounded-sm" style={{ background: BUCKET_COLORS[b.key] }} />{b.label}</div>
              <div className="mt-0.5 text-lg font-bold text-ink tabular-nums">{money(b.amount)}</div>
              <div className="text-xs text-muted">{b.percent.toFixed(0)}% of income</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
