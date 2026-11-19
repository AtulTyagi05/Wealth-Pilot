"use client";
import { useMemo, useState } from "react";
import { ChevronDown, TrendingUp, Calculator, Settings2, RotateCcw, Clock, Droplets, Receipt, Lightbulb, PieChart as PieIcon } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney, useOverview } from "@/store/useOverview";
import { assetClassSplit, blendedReturn, type Recommendation } from "@/lib/finance/investments";
import { projectSip } from "@/lib/finance/sip";
import type { Assumptions } from "@/lib/types";
import { Badge, Button, Callout, Card, CardHeader, Disclaimer, NumberInput, PageHeader, Slider, Stat, cn } from "@/components/ui";
import { DonutChart, ProjectionChart } from "@/components/charts";

const riskTone = (r: string) => (r.includes("Very low") || r === "Low" ? "good" : r === "Moderate" ? "warn" : "bad") as "good" | "warn" | "bad";

export default function InvestmentsPage() {
  const o = useOverview();
  const { money, compact } = useMoney();
  const profile = useFinanceStore((s) => s.profile);
  const blended = blendedReturn(o.portfolio);
  const total = o.portfolio.reduce((s, r) => s + r.monthly, 0);
  const proj = (y: number) => projectSip({ monthly: total, annualReturn: blended, years: y, stepUp: 0 }).value;

  return (
    <>
      <PageHeader title="Smart Investments" subtitle={`A personalised plan for ${money(total)} a month, based on your ${profile.risk} risk appetite, age ${profile.age} and goals.`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invest monthly" value={money(total)} icon={TrendingUp} hint={`${((total / Math.max(o.income, 1)) * 100).toFixed(0)}% of income`} />
        <Stat label="Blended return (assumed)" value={`${blended.toFixed(1)}%`} hint="Weighted by allocation; not guaranteed" />
        <Stat label="Est. value in 10 yrs" value={compact(proj(10))} hint={`Invested ${compact(total * 120)}`} />
        <Stat label="Est. value in 20 yrs" value={compact(proj(20))} hint={`Invested ${compact(total * 240)}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader icon={PieIcon} title="Asset allocation" subtitle="By asset class" />
          <DonutChart data={assetClassSplit(o.portfolio)} height={180} centerLabel="Monthly" centerValue={compact(total)} />
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-muted">Retirement</div><div className="font-semibold text-ink">{money(o.plan.retirement)}</div></div>
            <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-muted">Wealth & goals</div><div className="font-semibold text-ink">{money(o.plan.wealth)}</div></div>
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader icon={Lightbulb} title="Why this mix?" />
          <ul className="space-y-2.5 text-sm text-ink-2">
            <li>• <strong className="text-ink">Risk appetite ({profile.risk}):</strong> {profile.risk === "low" ? "more weight to guaranteed and debt options (PPF, EPF, FD/RD), with a small equity slice for inflation-beating growth." : profile.risk === "moderate" ? "a balance of equity index/flexi-cap funds for growth and PPF/debt for stability." : "equity-heavy with a mid/small-cap slice for higher long-term growth, balanced by PPF and gold."}</li>
            <li>• <strong className="text-ink">Age {profile.age}:</strong> {profile.age < 35 ? "a long horizon lets you ride out market swings, so equity can play a big role." : profile.age < 50 ? "a steady mix — growth still matters but stability is increasing." : "we shift part of equity into debt to protect what you've built (glide path)."}</li>
            <li>• <strong className="text-ink">Retirement first:</strong> {money(o.plan.retirement)} goes to tax-efficient retirement products (EPF/VPF, PPF, NPS).</li>
            <li>• <strong className="text-ink">Diversification:</strong> gold (≈10%) cushions the portfolio when stocks fall.</li>
            <li>• <strong className="text-ink">Liquidity:</strong> your emergency fund stays separate, in a savings account or liquid fund — not in these investments.</li>
          </ul>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Recommended investments</h2>
      {o.portfolio.length === 0 ? <Callout tone="warn">There&apos;s no investable surplus right now. Reduce expenses or increase income to start investing.</Callout> : (
        <div className="space-y-3">{o.portfolio.map((r) => <RecCard key={r.id} r={r} />)}</div>
      )}

      <SipCalculator defaultMonthly={Math.max(1000, total || 10000)} defaultReturn={Math.round(blended || 11)} />
      <AssumptionsEditor />
      <Disclaimer />
    </>
  );
}

function RecCard({ r }: { r: Recommendation }) {
  const [open, setOpen] = useState(false);
  const { money, compact } = useMoney();
  return (
    <Card className="p-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-4 text-left sm:p-5" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{r.name}</span>
            <Badge tone={riskTone(r.risk)}>{r.risk} risk</Badge>
            <Badge>{r.assetClass}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted">{r.bucket === "retirement" ? "Retirement" : "Wealth & goals"} · {r.horizon} · assumed {r.expectedReturn}% p.a.</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-ink tabular-nums">{money(r.monthly)}<span className="text-xs font-normal text-muted">/mo</span></div>
          <div className="text-xs text-muted">{r.share.toFixed(0)}% of plan</div>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-line p-4 text-sm sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2 rounded-xl bg-brand-soft/60 p-3 text-ink-2"><strong className="text-ink">Why: </strong>{r.why}</div>
          <Detail icon={Clock} title="Duration">{r.horizon}</Detail>
          <Detail icon={TrendingUp} title={`Potential value in ${r.projected.years} yrs (estimate)`}>{compact(r.projected.value)} <span className="text-muted">on {compact(r.projected.invested)} invested at an assumed {r.expectedReturn}% — not guaranteed</span></Detail>
          <Detail icon={Receipt} title="Tax">{r.tax}</Detail>
          <Detail icon={Droplets} title="Liquidity & withdrawal">{r.liquidity}</Detail>
        </div>
      )}
    </Card>
  );
}

function Detail({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <div><div className="text-xs font-medium text-muted">{title}</div><div className="mt-0.5 text-ink-2">{children}</div></div>
    </div>
  );
}

function SipCalculator({ defaultMonthly, defaultReturn }: { defaultMonthly: number; defaultReturn: number }) {
  const { money, compact } = useMoney();
  const [monthly, setMonthly] = useState(Math.round(defaultMonthly / 500) * 500);
  const [years, setYears] = useState(15);
  const [ret, setRet] = useState(defaultReturn);
  const [stepUp, setStepUp] = useState(0);
  const [extra, setExtra] = useState(2000);

  const base = useMemo(() => projectSip({ monthly, annualReturn: ret, years, stepUp }), [monthly, ret, years, stepUp]);
  const boosted = useMemo(() => projectSip({ monthly: monthly + extra, annualReturn: ret, years, stepUp }), [monthly, extra, ret, years, stepUp]);
  const data = base.points.map((p, i) => ({ year: p.year, invested: p.invested, value: p.value, boosted: boosted.points[i].value }));

  return (
    <Card className="mt-8">
      <CardHeader icon={Calculator} title="SIP calculator" subtitle="See how monthly investing can grow over time" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5">
          <Slider label="Monthly SIP" value={monthly} min={500} max={300000} step={500} onChange={setMonthly} format={money} />
          <Slider label="Duration" value={years} min={1} max={40} onChange={setYears} format={(v) => `${v} yrs`} />
          <Slider label="Expected return (assumed)" value={ret} min={4} max={16} step={0.5} onChange={setRet} format={(v) => `${v}%`} />
          <Slider label="Annual step-up" value={stepUp} min={0} max={20} onChange={setStepUp} format={(v) => `${v}%`} />
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
            <div><div className="text-xs text-muted">Invested</div><div className="font-semibold text-ink">{compact(base.invested)}</div></div>
            <div><div className="text-xs text-muted">Est. gains</div><div className="font-semibold text-good">{compact(base.gains)}</div></div>
            <div><div className="text-xs text-muted">Est. value</div><div className="font-semibold text-ink">{compact(base.value)}</div></div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <ProjectionChart data={data} xKey="year" xFormatter={(v) => `Yr ${v}`} series={[
            { key: "invested", name: "Amount invested", color: "var(--muted)", dashed: true, fill: false },
            { key: "value", name: "Estimated value", color: "var(--s1)" },
            { key: "boosted", name: `With +${money(extra)}/mo`, color: "var(--s3)", fill: false },
          ]} />
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
            <div className="w-full sm:w-44"><NumberInput label="What if I add" prefix="₹" value={extra} min={0} max={1000000} step={500} onChange={setExtra} /></div>
            <p className="text-sm text-ink-2">Increasing your SIP by <strong className="text-ink">{money(extra)}</strong> a month could add about <strong className="text-good">{compact(boosted.value - base.value)}</strong> over {years} years (you invest {compact(boosted.invested - base.invested)} more). Estimate only.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

const ASSUMPTION_FIELDS: { key: keyof Assumptions; label: string }[] = [
  { key: "inflation", label: "Inflation" },
  { key: "indexReturn", label: "Index funds" },
  { key: "equityReturn", label: "Active equity funds" },
  { key: "debtReturn", label: "Debt funds" },
  { key: "ppfReturn", label: "PPF" },
  { key: "epfReturn", label: "EPF / VPF" },
  { key: "npsReturn", label: "NPS" },
  { key: "fdReturn", label: "FD / RD" },
  { key: "goldReturn", label: "Gold" },
  { key: "postRetirementReturn", label: "Post-retirement" },
];

function AssumptionsEditor() {
  const a = useFinanceStore((s) => s.assumptions);
  const set = useFinanceStore((s) => s.setAssumptions);
  const reset = useFinanceStore((s) => s.resetAssumptions);
  return (
    <Card className="mt-4">
      <CardHeader icon={Settings2} title="Return assumptions" subtitle="Annual rates used for all projections. Adjust to be more conservative or optimistic." action={<Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="size-4" /> Reset</Button>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ASSUMPTION_FIELDS.map((f) => <NumberInput key={f.key} label={f.label} suffix="%" step={0.1} min={0} max={30} value={a[f.key]} onChange={(v) => set({ [f.key]: v })} />)}
      </div>
      <p className="mt-3 text-xs text-muted">Defaults reflect long-run historical averages and current small-savings rates (PPF 7.1%, EPF 8.25%). Past performance does not indicate future returns.</p>
    </Card>
  );
}
