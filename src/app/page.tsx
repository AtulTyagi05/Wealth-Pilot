"use client";
import Link from "next/link";
import { ArrowRight, Banknote, Receipt, PiggyBank, TrendingUp, Shield, Palmtree, Target, Lightbulb, Landmark } from "lucide-react";
import { useOverview, useMoney } from "@/store/useOverview";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Badge, Button, Card, CardHeader, Disclaimer, Empty, PageHeader, Progress, Stat } from "@/components/ui";
import { DonutChart, ScoreGauge } from "@/components/charts";
import { PlanBar } from "@/components/PlanBar";

export default function Dashboard() {
  const o = useOverview();
  const { money, compact } = useMoney();
  const profile = useFinanceStore((s) => s.profile);
  const hasExpenses = o.expenses.total > 0;
  const savings = hasExpenses ? o.expenses.remaining : o.income - o.plan.buckets[0].amount;
  const efPct = o.plan.emergencyTarget > 0 ? (profile.emergencyFund / o.plan.emergencyTarget) * 100 : 0;

  const assetClass = Object.entries(o.portfolio.reduce<Record<string, number>>((m, r) => ({ ...m, [r.assetClass]: (m[r.assetClass] ?? 0) + r.monthly }), {})).map(([name, value]) => ({ name, value }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your complete financial picture at a glance." action={<Link href="/planner"><Button>Open salary planner <ArrowRight className="size-4" /></Button></Link>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Monthly income" value={money(o.income)} icon={Banknote} hint={`${compact(o.income * 12)} per year`} />
        <Stat label="Total expenses" value={money(o.expenses.total)} icon={Receipt} hint={hasExpenses ? `${((o.expenses.total / Math.max(o.income, 1)) * 100).toFixed(0)}% of income` : "Add expenses to track"} tone={o.expenses.total / Math.max(o.income, 1) > 0.7 ? "warn" : "default"} />
        <Stat label="Monthly savings" value={money(savings)} icon={PiggyBank} hint={`${((savings / Math.max(o.income, 1)) * 100).toFixed(0)}% savings rate`} tone={savings < 0 ? "bad" : savings / Math.max(o.income, 1) >= 0.2 ? "good" : "warn"} />
        <Stat label="Suggested investing" value={money(o.investBucket)} icon={TrendingUp} hint={`Incl. ${money(o.plan.retirement)} for retirement`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={Banknote} title="How to divide your salary this month" subtitle={`Based on ${money(o.income)} monthly income`} action={<Link href="/planner" className="text-sm font-medium text-brand-strong hover:underline">Details</Link>} />
          <PlanBar buckets={o.plan.buckets} />
          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-3 text-sm font-semibold text-ink">Your salary-day checklist</div>
            <ol className="grid gap-2 sm:grid-cols-2">
              {[
                o.plan.buckets[1].amount > 0 ? `Move ${money(o.plan.buckets[1].amount)} to your emergency fund account` : "Emergency fund complete — no transfer needed",
                `Auto-invest ${money(o.investBucket)} via SIPs (${money(o.plan.retirement)} for retirement)`,
                `Keep essentials within ${money(o.plan.buckets[0].amount)}`,
                `Spend freely up to ${money(o.plan.buckets[3].amount)} — guilt-free`,
              ].map((t, i) => (
                <li key={t} className="flex items-start gap-2.5 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white dark:text-[#04120c]">{i + 1}</span>{t}
                </li>
              ))}
            </ol>
          </div>
        </Card>
        <Card>
          <CardHeader icon={Shield} title="Financial health" subtitle="Out of 100" />
          <ScoreGauge score={o.health.score} grade={o.health.grade} />
          <ul className="mt-4 space-y-2">
            {o.health.factors.map((f) => (
              <li key={f.label}>
                <div className="flex justify-between text-xs"><span className="text-ink-2">{f.label}</span><span className="font-medium text-ink tabular-nums">{Math.round(f.score)}/{f.max}</span></div>
                <Progress value={(f.score / f.max) * 100} className="mt-1 h-1.5" tone={f.score / f.max >= 0.7 ? "good" : f.score / f.max >= 0.4 ? "warn" : "bad"} label={f.label} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader icon={Landmark} title="Net worth" subtitle="Assets minus loans" />
          <div className="text-3xl font-bold tracking-tight text-ink">{money(o.netWorth)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-muted">Assets</div><div className="font-semibold text-ink">{compact(o.assets)}</div></div>
            <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-muted">Loans</div><div className="font-semibold text-ink">{compact(o.loanOutstanding)}</div></div>
          </div>
        </Card>
        <Card>
          <CardHeader icon={Shield} title="Emergency fund" subtitle={`${o.emergencyMonths.toFixed(1)} months covered · target 6`} />
          <div className="flex items-baseline justify-between"><span className="text-2xl font-bold text-ink">{compact(profile.emergencyFund)}</span><span className="text-sm text-muted">of {compact(o.plan.emergencyTarget)}</span></div>
          <Progress value={efPct} className="mt-3" tone={efPct >= 100 ? "good" : efPct >= 50 ? "warn" : "bad"} label="Emergency fund progress" />
          <p className="mt-3 text-xs text-ink-2">{efPct >= 100 ? "Fully funded — great job!" : `Add ${money(o.plan.buckets[1].amount)}/month to reach your goal in ~${o.plan.emergencyMonthsToGoal} months.`}</p>
        </Card>
        <Card>
          <CardHeader icon={Palmtree} title="Retirement corpus" subtitle={`Retire at ${profile.retirementAge} · ${o.retirement.yearsToRetire} years to go`} />
          <div className="flex items-baseline justify-between"><span className="text-2xl font-bold text-ink">{o.retirement.onTrackPct.toFixed(0)}%</span><span className="text-sm text-muted">on track</span></div>
          <Progress value={o.retirement.onTrackPct} className="mt-3" tone={o.retirement.onTrackPct >= 90 ? "good" : o.retirement.onTrackPct >= 60 ? "warn" : "bad"} label="Retirement progress" />
          <p className="mt-3 text-xs text-ink-2">Need ~{compact(o.retirement.corpusRequired)}; projected {compact(o.retirement.projectedWealth)} (estimate).</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Receipt} title="Where your money goes" subtitle="Monthly expenses by category" />
          {hasExpenses ? (
            <DonutChart data={(() => { const top = o.expenses.breakdown.slice(0, 6); const rest = o.expenses.breakdown.slice(6).reduce((s, e) => s + e.amount, 0); return [...top.map((e) => ({ name: e.name, value: e.amount })), ...(rest > 0 ? [{ name: "Other", value: rest }] : [])]; })()} centerLabel="Total" centerValue={compact(o.expenses.total)} />
          ) : (
            <Empty icon={Receipt} title="No expenses yet" text="Add your monthly expenses to see your spending breakdown." action={<Link href="/expenses"><Button size="sm">Add expenses</Button></Link>} />
          )}
        </Card>
        <Card>
          <CardHeader icon={TrendingUp} title="Recommended investment mix" subtitle={`${money(o.investBucket)} / month · ${profile.risk} risk`} action={<Link href="/investments" className="text-sm font-medium text-brand-strong hover:underline">View plan</Link>} />
          {o.investBucket > 0 ? <DonutChart data={assetClass} centerLabel="Monthly" centerValue={compact(o.investBucket)} /> : <Empty icon={TrendingUp} title="Nothing to invest yet" text="Reduce expenses to free up money for investing." />}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Target} title="Goals" subtitle="Progress towards your milestones" action={<Link href="/profile" className="text-sm font-medium text-brand-strong hover:underline">Edit</Link>} />
          {profile.goals.length ? (
            <ul className="space-y-4">
              {profile.goals.map((g) => {
                const p = g.targetAmount > 0 ? (g.saved / g.targetAmount) * 100 : 0;
                return (
                  <li key={g.id}>
                    <div className="flex justify-between text-sm"><span className="font-medium text-ink">{g.name}</span><span className="text-ink-2 tabular-nums">{compact(g.saved)} / {compact(g.targetAmount)}</span></div>
                    <Progress value={p} className="mt-1.5" label={g.name} />
                    <div className="mt-1 text-xs text-muted">{p.toFixed(0)}% · in {g.years} yrs</div>
                  </li>
                );
              })}
            </ul>
          ) : <Empty icon={Target} title="No goals yet" text="Add goals like a house, education or travel to track progress." action={<Link href="/profile"><Button size="sm" variant="secondary">Add a goal</Button></Link>} />}
        </Card>
        <Card>
          <CardHeader icon={Lightbulb} title="Smart suggestions" subtitle="Personalised ways to improve" />
          <ul className="space-y-3">
            {o.insights.slice(0, 3).map((i) => (
              <li key={i.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-ink">{i.category}</span><Badge tone="good">Save {money(i.saving)}/mo</Badge></div>
                <p className="mt-1 text-xs text-ink-2">{i.tip}</p>
              </li>
            ))}
            {o.health.factors.filter((f) => f.score / f.max < 0.5).slice(0, 3 - Math.min(3, o.insights.length)).map((f) => (
              <li key={f.label} className="rounded-xl border border-line p-3">
                <div className="text-sm font-semibold text-ink">{f.label}</div>
                <p className="mt-1 text-xs text-ink-2">{f.hint}</p>
              </li>
            ))}
            {o.insights.length === 0 && o.health.factors.every((f) => f.score / f.max >= 0.5) && <p className="text-sm text-ink-2">You&apos;re doing great. Keep investing consistently and review your plan every few months.</p>}
          </ul>
        </Card>
      </div>
      <Disclaimer />
    </>
  );
}
