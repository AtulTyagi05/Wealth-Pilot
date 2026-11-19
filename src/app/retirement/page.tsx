"use client";
import { useMemo, useState } from "react";
import { Palmtree, Target, TrendingUp, AlertTriangle, CheckCircle2, BookOpen, Save } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney, useOverview } from "@/store/useOverview";
import { planRetirement, SCENARIOS } from "@/lib/finance/retirement";
import { Button, Callout, Card, CardHeader, Disclaimer, NumberInput, PageHeader, Progress, Slider, Stat, cn } from "@/components/ui";
import { ProjectionChart } from "@/components/charts";

export default function RetirementPage() {
  const o = useOverview();
  const { money, compact } = useMoney();
  const profile = useFinanceStore((s) => s.profile);
  const setProfile = useFinanceStore((s) => s.setProfile);
  const assumptions = useFinanceStore((s) => s.assumptions);

  const [age, setAge] = useState(profile.age);
  const [retAge, setRetAge] = useState(profile.retirementAge);
  const [life, setLife] = useState(profile.lifeExpectancy);
  const [savings, setSavings] = useState(profile.retirementSavings);
  const [expense, setExpense] = useState(o.retirementExpense);
  const [contrib, setContrib] = useState(o.plan.retirement);
  const [inflation, setInflation] = useState(assumptions.inflation);
  const [pre, setPre] = useState(10);
  const [post, setPost] = useState(assumptions.postRetirementReturn);
  const [stepUp, setStepUp] = useState(0);

  const errors = [
    retAge <= age && "Retirement age must be greater than current age.",
    life <= retAge && "Plan-until age must be greater than retirement age.",
  ].filter(Boolean) as string[];

  const r = useMemo(() => planRetirement({ age, retirementAge: retAge, lifeExpectancy: life, currentSavings: savings, monthlyExpenseToday: expense, monthlyContribution: contrib, inflation, preReturn: pre, postReturn: post, stepUp }), [age, retAge, life, savings, expense, contrib, inflation, pre, post, stepUp]);
  const scenarios = useMemo(() => SCENARIOS.map((s) => ({ ...s, result: planRetirement({ age, retirementAge: retAge, lifeExpectancy: life, currentSavings: savings, monthlyExpenseToday: expense, monthlyContribution: contrib, inflation: s.inflation, preReturn: s.preReturn, postReturn: s.postReturn, stepUp }) })), [age, retAge, life, savings, expense, contrib, stepUp]);

  const onTrack = r.shortfall <= 0;

  return (
    <>
      <PageHeader title="Retirement Planner" subtitle="How much you need to retire comfortably — and how much to invest each month to get there." action={<Button variant="secondary" onClick={() => setProfile({ age, retirementAge: retAge, lifeExpectancy: life, retirementSavings: savings, postRetirementMonthlyExpense: expense })} disabled={errors.length > 0}><Save className="size-4" /> Save to profile</Button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon={Target} title="Your inputs" />
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <NumberInput label="Age now" min={18} max={80} value={age} onChange={setAge} />
              <NumberInput label="Retire at" min={30} max={80} value={retAge} onChange={setRetAge} />
              <NumberInput label="Plan until" min={50} max={100} value={life} onChange={setLife} />
            </div>
            <NumberInput label="Current retirement savings" prefix="₹" value={savings} onChange={setSavings} hint="EPF + PPF + NPS + retirement funds" />
            <NumberInput label="Monthly expenses in retirement (today's ₹)" prefix="₹" value={expense} onChange={setExpense} hint="Typically 70–80% of current expenses" />
            <NumberInput label="Monthly retirement investment" prefix="₹" value={contrib} onChange={setContrib} hint={`Planner suggests ${money(o.plan.retirement)}`} />
            <Slider label="Inflation" value={inflation} min={3} max={10} step={0.5} onChange={setInflation} format={(v) => `${v}%`} />
            <Slider label="Return before retirement" value={pre} min={5} max={15} step={0.5} onChange={setPre} format={(v) => `${v}%`} />
            <Slider label="Return after retirement" value={post} min={4} max={10} step={0.5} onChange={setPost} format={(v) => `${v}%`} />
            <Slider label="Yearly increase in investment" value={stepUp} min={0} max={15} onChange={setStepUp} format={(v) => `${v}%`} />
          </div>
        </Card>

        <div className="min-w-0 space-y-4 lg:col-span-2">
          {errors.length > 0 && <Callout tone="warn">{errors.join(" ")}</Callout>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Corpus needed" value={compact(r.corpusRequired)} icon={Target} hint={`at age ${retAge}`} />
            <Stat label="Projected wealth" value={compact(r.projectedWealth)} icon={TrendingUp} hint="Estimate" tone={onTrack ? "good" : "warn"} />
            <Stat label="Invest monthly" value={money(r.requiredMonthly)} icon={Palmtree} hint="flat SIP to reach goal" />
            <Stat label={onTrack ? "Surplus" : "Shortfall"} value={compact(Math.abs(r.projectedWealth - r.corpusRequired))} icon={onTrack ? CheckCircle2 : AlertTriangle} tone={onTrack ? "good" : "bad"} hint={onTrack ? "You're on track" : "Increase investments"} />
          </div>

          <Card>
            <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-ink">Progress to goal</span><span className="font-semibold text-ink">{r.onTrackPct.toFixed(0)}%</span></div>
            <Progress value={r.onTrackPct} tone={r.onTrackPct >= 90 ? "good" : r.onTrackPct >= 60 ? "warn" : "bad"} label="Retirement progress" />
            <p className="mt-3 text-sm text-ink-2">
              In {r.yearsToRetire} years, today&apos;s {money(expense)} of monthly expenses will cost about <strong className="text-ink">{money(r.monthlyExpenseAtRetirement)}</strong> due to {inflation}% inflation.
              To fund {r.yearsInRetirement} years of retirement, you&apos;ll need about <strong className="text-ink">{compact(r.corpusRequired)}</strong>.
              {onTrack ? " Your current plan is estimated to get you there." : <> Investing <strong className="text-ink">{money(r.requiredMonthly)}</strong>/month (vs {money(contrib)} now) would close the gap.</>}
            </p>
          </Card>

          <Card>
            <CardHeader title="Wealth projection" subtitle="Projected savings vs. the path needed to reach your corpus" />
            <ProjectionChart data={r.points} xKey="age" xFormatter={(v) => `Age ${v}`} series={[
              { key: "required", name: "Needed path", color: "var(--muted)", dashed: true, fill: false },
              { key: "projected", name: "Your projection", color: "var(--s3)" },
            ]} />
          </Card>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Scenarios</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {scenarios.map((s) => {
          const ok = s.result.shortfall <= 0;
          return (
            <Card key={s.key} className={cn(s.key === "moderate" && "ring-2 ring-brand/30")}>
              <div className="flex items-center justify-between"><h3 className="font-semibold text-ink">{s.label}</h3>{s.key === "moderate" && <span className="text-xs font-medium text-brand-strong">Most balanced</span>}</div>
              <p className="mt-1 text-xs text-ink-2">{s.description}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <Row k="Return before / after" v={`${s.preReturn}% / ${s.postReturn}%`} />
                <Row k="Inflation" v={`${s.inflation}%`} />
                <Row k="Corpus needed" v={compact(s.result.corpusRequired)} />
                <Row k="Projected wealth" v={compact(s.result.projectedWealth)} />
                <Row k="Monthly SIP needed" v={money(s.result.requiredMonthly)} strong />
              </dl>
              <div className={cn("mt-4 flex items-center gap-1.5 text-sm font-medium", ok ? "text-good" : "text-bad")}>{ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}{ok ? "On track" : `Short by ${compact(s.result.shortfall)}`}</div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader icon={BookOpen} title="Assumptions behind these numbers" />
        <ul className="grid gap-3 text-sm text-ink-2 md:grid-cols-2">
          <li><strong className="text-ink">Future expenses</strong> = today&apos;s monthly expense × (1 + inflation)<sup>years to retire</sup>.</li>
          <li><strong className="text-ink">Corpus needed</strong> = amount that, earning the post-retirement return, can pay inflation-rising expenses every year until age {life} (withdrawn at the start of each year).</li>
          <li><strong className="text-ink">Projected wealth</strong> = current savings growing at the pre-retirement return + monthly investments (increased by the step-up each year).</li>
          <li><strong className="text-ink">Monthly SIP needed</strong> = flat monthly amount that, with current savings, grows to the required corpus.</li>
          <li><strong className="text-ink">Returns are assumptions</strong>, compounded annually and converted to monthly. Real markets fluctuate; returns can be lower or negative in some years.</li>
          <li><strong className="text-ink">Not included:</strong> taxes on withdrawals, pension/annuity income, large one-off expenses, or healthcare inflation (often higher than general inflation).</li>
        </ul>
      </Card>
      <Disclaimer />
    </>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-2"><dt className="text-ink-2">{k}</dt><dd className={cn("tabular-nums text-ink", strong && "font-bold")}>{v}</dd></div>;
}
