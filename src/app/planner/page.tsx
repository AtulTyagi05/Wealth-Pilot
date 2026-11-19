"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, Shield, TrendingUp, Smile, Home, Info, Scale, ArrowRight } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney, useOverview } from "@/store/useOverview";
import { buildSalaryPlan, retirementShare } from "@/lib/finance/budget";
import { recommendPortfolio } from "@/lib/finance/investments";
import { Badge, Button, Callout, Card, CardHeader, Disclaimer, PageHeader, Segmented, cn } from "@/components/ui";
import { DonutChart } from "@/components/charts";
import { BUCKET_COLORS, PlanBar } from "@/components/PlanBar";

const ICONS = { expenses: Home, emergency: Shield, investments: TrendingUp, disposable: Smile } as const;

export default function PlannerPage() {
  const o = useOverview();
  const { money } = useMoney();
  const profile = useFinanceStore((s) => s.profile);
  const assumptions = useFinanceStore((s) => s.assumptions);
  const [incomeDraft, setIncomeDraft] = useState<string>(String(o.income || 100000));
  const [basis, setBasis] = useState<"mine" | "typical">(o.expenses.essential > 0 ? "mine" : "typical");
  const [months, setMonths] = useState<"3" | "6">("6");

  const income = Math.max(0, Number(incomeDraft) || 0);
  const invalid = incomeDraft !== "" && (!Number.isFinite(Number(incomeDraft)) || Number(incomeDraft) < 0);
  // When using own expenses, scale them if the what-if income differs from actual income.
  const essentials = basis === "mine" ? o.expenses.essential : 0;

  const plan = useMemo(() => buildSalaryPlan({ income, essentialExpenses: essentials, age: profile.age, emergencyFund: profile.emergencyFund, emergencyMonths: Number(months), retirementNeed: o.retirement.requiredMonthly }), [income, essentials, profile.age, profile.emergencyFund, months, o.retirement.requiredMonthly]);
  const portfolio = useMemo(() => recommendPortfolio({ retirementMonthly: plan.retirement, wealthMonthly: plan.wealth, age: profile.age, risk: profile.risk, assumptions }), [plan, profile.age, profile.risk, assumptions]);
  const by = Object.fromEntries(plan.buckets.map((b) => [b.key, b]));

  return (
    <>
      <PageHeader title="Salary Planner" subtitle="The simple answer to: “Exactly how should I divide my salary every month?”" />

      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 flex-wrap items-center gap-3 text-xl font-semibold text-ink sm:text-2xl">
              I earn
              <span className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-2">₹</span>
                <input type="number" inputMode="numeric" min={0} aria-label="Monthly income" aria-invalid={invalid} value={incomeDraft} onChange={(e) => setIncomeDraft(e.target.value)} className="h-14 w-44 rounded-2xl sm:w-52 border border-line bg-surface pl-9 pr-4 text-2xl font-bold text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-bad" />
              </span>
              per month
            </label>
            <div className="flex flex-wrap gap-2">
              {[50000, 100000, 200000].map((v) => (
                <button key={v} onClick={() => setIncomeDraft(String(v))} className={cn("rounded-full border px-3 py-1.5 text-sm", income === v ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-surface text-ink-2 hover:text-ink")}>{money(v)}</button>
              ))}
              {o.income > 0 && <button onClick={() => setIncomeDraft(String(o.income))} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 hover:text-ink">My income</button>}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-2">
            <div className="flex items-center gap-2">Essentials based on <Segmented size="sm" value={basis} onChange={setBasis} options={[{ value: "mine", label: "My expenses" }, { value: "typical", label: "Typical (50%)" }]} /></div>
            <div className="flex items-center gap-2">Emergency target <Segmented size="sm" value={months} onChange={setMonths} options={[{ value: "3", label: "3 months" }, { value: "6", label: "6 months" }]} /></div>
          </div>
          {invalid && <p className="mt-3 text-sm text-bad">Please enter a valid, positive amount.</p>}
        </div>

        {income > 0 && (
          <div className="border-t border-line p-5 sm:p-8">
            <p className="text-lg leading-relaxed text-ink sm:text-xl">
              Of your <strong>{money(income)}</strong>, spend <strong style={{ color: "var(--s1)" }}>{money(by.expenses.amount)}</strong> on essentials,
              {by.emergency.amount > 0 && <> set aside <strong style={{ color: "var(--s2)" }}>{money(by.emergency.amount)}</strong> for emergencies,</>} invest{" "}
              <strong style={{ color: "var(--s3)" }}>{money(by.investments.amount)}</strong> (of which <strong>{money(plan.retirement)}</strong> for retirement),
              and enjoy <strong style={{ color: "var(--s7)" }}>{money(by.disposable.amount)}</strong> guilt-free.
            </p>
            <div className="mt-6"><PlanBar buckets={plan.buckets} /></div>
          </div>
        )}
      </Card>

      {plan.deficit > 0 && <div className="mt-4"><Callout tone="warn" title="Your essentials exceed your income">You are short by {money(plan.deficit)} every month. Review your expenses or loans before investing.</Callout></div>}
      {plan.notes.filter((n) => !n.startsWith("Essential expenses exceed")).map((n) => <div key={n} className="mt-3"><Callout>{n}</Callout></div>)}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plan.buckets.map((b) => {
          const Icon = ICONS[b.key];
          return (
            <Card key={b.key} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: BUCKET_COLORS[b.key] }} />
              <div className="flex items-center justify-between"><Icon className="size-5 text-ink-2" /><Badge>{b.percent.toFixed(0)}%</Badge></div>
              <div className="mt-3 text-sm font-medium text-ink-2">{b.label}</div>
              <div className="text-2xl font-bold text-ink tabular-nums">{money(b.amount)}</div>
              <p className="mt-2 text-xs text-ink-2">{b.description}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader icon={TrendingUp} title={`Where exactly to invest ${money(by.investments.amount)}`} subtitle={`Matched to your ${profile.risk} risk appetite and age ${profile.age}`} action={<Link href="/investments" className="text-sm font-medium text-brand-strong hover:underline">Full details</Link>} />
          {portfolio.length ? (
            <div className="divide-y divide-line">
              {portfolio.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{r.name}</div>
                    <div className="text-xs text-muted">{r.bucket === "retirement" ? "Retirement" : "Wealth building"} · {r.risk} risk</div>
                  </div>
                  <div className="text-right"><div className="font-semibold text-ink tabular-nums">{money(r.monthly)}</div><div className="text-xs text-muted">{r.share.toFixed(0)}%</div></div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-2">No investable surplus at this income and expense level.</p>}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader icon={Wallet} title="Monthly allocation" />
          <DonutChart data={plan.buckets.filter((b) => b.amount > 0).map((b) => ({ name: b.label, value: b.amount, color: BUCKET_COLORS[b.key] }))} height={180} stacked />
        </Card>
      </div>

      {o.expenses.total > 0 && basis === "mine" && income === o.income && (
        <Card className="mt-4">
          <CardHeader icon={Scale} title="Your current spending vs the plan" subtitle="What you spend today compared with the recommended split" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2 font-medium">Bucket</th><th className="py-2 text-right font-medium">You today</th><th className="py-2 text-right font-medium">Recommended</th><th className="py-2 text-right font-medium">Difference</th></tr></thead>
              <tbody>
                {[
                  { l: "Essential expenses", a: o.expenses.essential, r: by.expenses.amount, lowerIsBetter: true },
                  { l: "Discretionary spending", a: o.expenses.discretionary, r: by.disposable.amount, lowerIsBetter: true },
                  { l: "Left to save & invest", a: Math.max(0, o.expenses.remaining), r: by.emergency.amount + by.investments.amount, lowerIsBetter: false },
                ].map((row) => {
                  const d = row.a - row.r;
                  const good = row.lowerIsBetter ? d <= 0 : d >= 0;
                  return (
                    <tr key={row.l} className="border-b border-line last:border-0">
                      <td className="py-2.5 text-ink">{row.l}</td>
                      <td className="py-2.5 text-right tabular-nums text-ink">{money(row.a)}</td>
                      <td className="py-2.5 text-right tabular-nums text-ink">{money(row.r)}</td>
                      <td className={cn("py-2.5 text-right font-medium tabular-nums", good ? "text-good" : "text-bad")}>{d > 0 ? "+" : ""}{money(d)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {o.expenses.discretionary > by.disposable.amount && <p className="mt-3 text-sm text-ink-2">Cutting discretionary spending by {money(o.expenses.discretionary - by.disposable.amount)} would let you follow the plan fully. <Link href="/expenses" className="font-medium text-brand-strong hover:underline">See where →</Link></p>}
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader icon={Info} title="How this plan is calculated" />
        <ul className="grid gap-3 text-sm text-ink-2 md:grid-cols-2">
          <li><strong className="text-ink">1. Essentials first.</strong> We use your essential expenses (rent/EMI, groceries, bills, transport, health, education). Without data we assume 50% of income.</li>
          <li><strong className="text-ink">2. Savings target.</strong> {plan.savingsRateTarget}% of income for your income level (15% below ₹30K, 25% up to ₹75K, 30% up to ₹2L, 40% above), while keeping at least 10% for personal spending.</li>
          <li><strong className="text-ink">3. Emergency fund.</strong> Target = {months} × essential expenses ({money(plan.emergencyTarget)}). Up to 40% of savings goes here until it&apos;s built{plan.emergencyMonthsToGoal > 0 ? ` (~${plan.emergencyMonthsToGoal} months)` : ""}.</li>
          <li><strong className="text-ink">4. Invest the rest.</strong> At least {Math.round(retirementShare(profile.age) * 100)}% of investments go to retirement at age {profile.age} (rising with age), raised up to 60% if your retirement goal needs it; the rest builds wealth for goals.</li>
          <li><strong className="text-ink">5. Fun money is capped at 20%.</strong> Anything above moves to investments, so lifestyle doesn&apos;t silently eat your surplus.</li>
          <li><strong className="text-ink">6. Review yearly.</strong> Increase SIPs by 10% every year when your salary grows.</li>
        </ul>
        <div className="mt-4"><Link href="/assistant"><Button variant="secondary" size="sm">Ask the assistant about this plan <ArrowRight className="size-4" /></Button></Link></div>
      </Card>
      <Disclaimer />
    </>
  );
}
