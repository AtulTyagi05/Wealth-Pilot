"use client";
import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, CalendarPlus, BarChart3, LineChart as LineIcon, PieChart as PieIcon, Target, Palmtree } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney, useOverview } from "@/store/useOverview";
import { exportExcel, exportPdf } from "@/lib/reports/export";
import type { MonthlySnapshot } from "@/lib/types";
import { Button, Callout, Card, CardHeader, Disclaimer, Empty, PageHeader, Progress, Segmented, Stat } from "@/components/ui";
import { DonutChart, GroupedBars, TrendLines } from "@/components/charts";

const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const label = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

export default function ReportsPage() {
  const o = useOverview();
  const { money, compact } = useMoney();
  const profile = useFinanceStore((s) => s.profile);
  const history = useFinanceStore((s) => s.history);
  const save = useFinanceStore((s) => s.saveSnapshot);
  const [period, setPeriod] = useState<"month" | "year" | "custom">("year");
  const [from, setFrom] = useState(history[0]?.month ?? ym());
  const [to, setTo] = useState(ym());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const current: MonthlySnapshot = {
    month: ym(),
    income: o.income,
    expenses: o.expenses.total,
    savings: o.income - o.expenses.total,
    invested: o.investBucket,
    netWorth: o.netWorth,
  };

  const rows = useMemo(() => {
    const all = [...history.filter((h) => h.month !== current.month), history.find((h) => h.month === current.month) ?? current].sort((a, b) => a.month.localeCompare(b.month));
    if (period === "month") return all.filter((r) => r.month === current.month);
    if (period === "year") { const d = new Date(); d.setMonth(d.getMonth() - 11); const start = ym(d); return all.filter((r) => r.month >= start); }
    return all.filter((r) => r.month >= from && r.month <= to);
  }, [history, period, from, to, current]);

  const periodLabel = period === "month" ? label(current.month) : period === "year" ? "Last 12 months" : `${label(from)} to ${label(to)}`;
  const chartRows = rows.map((r) => ({ ...r, label: label(r.month) }));
  const t = rows.reduce((a, r) => ({ income: a.income + r.income, expenses: a.expenses + r.expenses, savings: a.savings + r.savings, invested: a.invested + r.invested }), { income: 0, expenses: 0, savings: 0, invested: 0 });
  const customInvalid = period === "custom" && from > to;

  const run = async (kind: "pdf" | "xlsx") => {
    setBusy(kind); setMsg(null);
    try {
      const data = { title: period === "month" ? "Monthly report" : period === "year" ? "Yearly report" : "Custom report", periodLabel, profile, overview: o, rows };
      if (kind === "pdf") await exportPdf(data); else await exportExcel(data);
    } catch (e) {
      setMsg(`Export failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="Financial Reports" subtitle="Track trends over time and export reports for your records." action={<>
        <Button variant="secondary" onClick={() => { save(current); setMsg(`Saved snapshot for ${label(current.month)}.`); }}><CalendarPlus className="size-4" /> Record this month</Button>
        <Button variant="secondary" disabled={!!busy || customInvalid || !rows.length} onClick={() => run("xlsx")}><FileSpreadsheet className="size-4" /> {busy === "xlsx" ? "Exporting…" : "Excel"}</Button>
        <Button disabled={!!busy || customInvalid || !rows.length} onClick={() => run("pdf")}><FileDown className="size-4" /> {busy === "pdf" ? "Exporting…" : "PDF"}</Button>
      </>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={period} onChange={setPeriod} options={[{ value: "month", label: "This month" }, { value: "year", label: "Yearly" }, { value: "custom", label: "Custom" }]} />
        {period === "custom" && (
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <input type="month" aria-label="From month" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-ink" />
            to
            <input type="month" aria-label="To month" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-ink" />
          </div>
        )}
      </div>
      {customInvalid && <div className="mb-4"><Callout tone="warn">“From” month must be before “To” month.</Callout></div>}
      {msg && <div className="mb-4"><Callout tone={msg.startsWith("Export failed") ? "warn" : "good"}>{msg}</Callout></div>}
      {history.length === 0 && <div className="mb-4"><Callout title="Build your history">Click <strong>Record this month</strong> each month to save a snapshot. Reports will show trends as your history grows.</Callout></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Income" value={compact(t.income)} hint={periodLabel} />
        <Stat label="Expenses" value={compact(t.expenses)} hint={t.income ? `${((t.expenses / t.income) * 100).toFixed(0)}% of income` : ""} />
        <Stat label="Savings" value={compact(t.savings)} tone={t.savings >= 0 ? "good" : "bad"} hint={t.income ? `${((t.savings / t.income) * 100).toFixed(0)}% savings rate` : ""} />
        <Stat label="Invested" value={compact(t.invested)} hint="Contributions" />
      </div>

      {rows.length === 0 ? <div className="mt-4"><Empty icon={BarChart3} title="No data for this period" text="Choose a different range or record a monthly snapshot." /></div> : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card><CardHeader icon={BarChart3} title="Income vs expenses" /><GroupedBars data={chartRows} xKey="label" series={[{ key: "income", name: "Income", color: "var(--s1)" }, { key: "expenses", name: "Expenses", color: "var(--s2)" }]} /></Card>
          <Card><CardHeader icon={LineIcon} title="Savings & investment trend" /><TrendLines data={chartRows} xKey="label" series={[{ key: "savings", name: "Savings", color: "var(--s3)" }, { key: "invested", name: "Invested", color: "var(--s7)" }]} /></Card>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon={PieIcon} title="Current assets" />
          <DonutChart height={160} data={[{ name: "Bank savings", value: profile.bankSavings }, { name: "Emergency fund", value: profile.emergencyFund }, { name: "Investments", value: profile.investments }, { name: "Retirement", value: profile.retirementSavings }].filter((x) => x.value > 0)} />
        </Card>
        <Card>
          <CardHeader icon={Target} title="Goal progress" />
          <ul className="space-y-3">
            {profile.goals.map((g) => <li key={g.id}><div className="flex justify-between text-sm"><span className="text-ink">{g.name}</span><span className="text-ink-2">{g.targetAmount ? ((g.saved / g.targetAmount) * 100).toFixed(0) : 0}%</span></div><Progress value={g.targetAmount ? (g.saved / g.targetAmount) * 100 : 0} className="mt-1" label={g.name} /></li>)}
            {profile.goals.length === 0 && <p className="text-sm text-ink-2">No goals added yet.</p>}
          </ul>
        </Card>
        <Card>
          <CardHeader icon={Palmtree} title="Retirement progress" />
          <div className="text-2xl font-bold text-ink">{o.retirement.onTrackPct.toFixed(0)}%</div>
          <Progress value={o.retirement.onTrackPct} className="mt-2" label="Retirement progress" />
          <p className="mt-3 text-sm text-ink-2">Projected {compact(o.retirement.projectedWealth)} vs needed {compact(o.retirement.corpusRequired)} at age {profile.retirementAge} (estimates).</p>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card className="mt-4 overflow-x-auto">
          <CardHeader title="Monthly data" />
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted">{["Month", "Income", "Expenses", "Savings", "Invested", "Net worth"].map((h, i) => <th key={h} className={`py-2 font-medium ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r.month} className="border-b border-line last:border-0"><td className="py-2 text-ink">{label(r.month)}</td>{[r.income, r.expenses, r.savings, r.invested, r.netWorth].map((v, i) => <td key={i} className="py-2 text-right tabular-nums text-ink">{money(v)}</td>)}</tr>)}</tbody>
          </table>
        </Card>
      )}
      <Disclaimer />
    </>
  );
}
