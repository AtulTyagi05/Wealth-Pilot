"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles, Wallet, PiggyBank, TrendingUp, Palmtree } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { COUNTRIES } from "@/lib/locale/countries";
import { Button, Callout, Card, NumberInput, Select, TextInput, Toggle, cn } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { GoalEditor, IncomeEditor, LiabilityEditor, RiskPicker } from "@/components/profile/editors";
import { validateStep } from "@/lib/validation";
import Link from "next/link";
import { useSession } from "@/store/useSession";

const STEPS = ["About you", "Income", "Savings & loans", "Goals & risk"];

export function Onboarding() {
  const [started, setStarted] = useState(false);
  const loadDemo = useFinanceStore((s) => s.loadDemo);
  const router = useRouter();
  const status = useSession((s) => s.status);
  const email = useSession((s) => s.user?.email);

  if (!started) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Logo />
          <div className="flex items-center gap-2">
            {status === "guest" && <Link href="/login" className="text-sm font-medium text-ink-2 hover:text-ink">Log in</Link>}
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-8 lg:grid-cols-2 lg:py-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong"><Sparkles className="size-3.5" /> Your personal finance co-pilot</span>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">Know exactly where every rupee of your salary should go.</h1>
            <p className="mt-4 text-lg text-ink-2">Wealth Pilot turns your income and expenses into a simple monthly plan — for spending, emergencies, investing and retirement.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="h-12 px-6 text-base" onClick={() => setStarted(true)}>Set up my plan <ArrowRight className="size-4" /></Button>
              <Button variant="secondary" className="h-12 px-6 text-base" onClick={() => { loadDemo(); router.push("/planner"); }}>Try with a ₹1 lakh sample</Button>
            </div>
            {status === "guest" && <p className="mt-4 text-sm text-ink-2"><Link href="/register" className="font-medium text-brand-strong hover:underline">Create a free account</Link> to save your plan securely and use it on any device.</p>}
            <p className="mt-2 text-xs text-muted">Takes about 2 minutes. {status === "user" ? `Signed in as ${email} — your plan is encrypted and saved to your account.` : "Without an account, your data is stored only on this device."}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Wallet, t: "Salary splitter", d: "An exact split of your pay into needs, savings and investments." },
              { icon: PiggyBank, t: "Expense insights", d: "See where money leaks and how much you could save." },
              { icon: TrendingUp, t: "Smart investing", d: "SIP, PPF, NPS, EPF and more — matched to your risk." },
              { icon: Palmtree, t: "Retirement ready", d: "How big a corpus you need, and the monthly amount to get there." },
            ].map(({ icon: Icon, t, d }) => (
              <Card key={t} className="p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-strong"><Icon className="size-5" /></span>
                <div className="mt-3 font-semibold text-ink">{t}</div>
                <p className="mt-1 text-sm text-ink-2">{d}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return <Wizard onBack={() => setStarted(false)} />;
}

function Wizard({ onBack }: { onBack: () => void }) {
  const profile = useFinanceStore((s) => s.profile);
  const setProfile = useFinanceStore((s) => s.setProfile);
  const complete = useFinanceStore((s) => s.completeOnboarding);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const next = () => {
    const errs = validateStep(step, profile);
    setErrors(errs);
    if (errs.length) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else { complete(); router.push("/planner"); }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col gap-2">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-line")} />
              <span className={cn("hidden text-xs font-medium sm:block", i === step ? "text-ink" : "text-muted")}>{i + 1}. {s}</span>
            </li>
          ))}
        </ol>
        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-ink">{STEPS[step]}</h2>
          <p className="mb-6 mt-1 text-sm text-ink-2">{["Let's start with the basics.", "Use the amount that actually lands in your bank account every month.", "Rough numbers are fine — you can update these anytime.", "This shapes your investment mix and retirement plan."][step]}</p>

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Your name" value={profile.name} onChange={(v) => setProfile({ name: v })} placeholder="e.g. Priya" />
              <NumberInput label="Age" min={18} max={80} value={profile.age} onChange={(v) => setProfile({ age: v })} />
              <Select label="Country" value={profile.country} onChange={(v) => { const c = COUNTRIES.find((x) => x.code === v)!; setProfile({ country: c.code, currency: c.currency }); }} options={COUNTRIES.map((c) => ({ value: c.code, label: c.supported ? `${c.name} (${c.currency})` : `${c.name} — coming soon`, disabled: !c.supported }))} hint="India-specific planning (₹, EPF, PPF, NPS, SIP)" />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput label="Monthly in-hand salary" prefix="₹" value={profile.monthlySalary} onChange={(v) => setProfile({ monthlySalary: v, annualSalary: profile.annualSalary || v * 12 })} hint="After tax & deductions" />
                <NumberInput label="Annual salary (CTC)" prefix="₹" value={profile.annualSalary} onChange={(v) => setProfile({ annualSalary: v })} hint="Gross yearly package incl. bonus" />
              </div>
              <div>
                <div className="mb-2 text-[13px] font-medium text-ink">Additional monthly income (optional)</div>
                <IncomeEditor items={profile.additionalIncome} onChange={(v) => setProfile({ additionalIncome: v })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput label="Bank savings" prefix="₹" value={profile.bankSavings} onChange={(v) => setProfile({ bankSavings: v })} hint="Savings account balance" />
                <NumberInput label="Emergency fund" prefix="₹" value={profile.emergencyFund} onChange={(v) => setProfile({ emergencyFund: v })} hint="Money set aside only for emergencies" />
                <NumberInput label="Investments" prefix="₹" value={profile.investments} onChange={(v) => setProfile({ investments: v })} hint="Mutual funds, stocks, FDs, gold" />
                <NumberInput label="Retirement savings" prefix="₹" value={profile.retirementSavings} onChange={(v) => setProfile({ retirementSavings: v })} hint="EPF + PPF + NPS balances" />
              </div>
              <div>
                <div className="mb-2 text-[13px] font-medium text-ink">Loans & liabilities</div>
                <LiabilityEditor items={profile.liabilities} onChange={(v) => setProfile({ liabilities: v })} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberInput label="Retire at age" min={30} max={80} value={profile.retirementAge} onChange={(v) => setProfile({ retirementAge: v })} />
                <NumberInput label="Plan until age" min={60} max={100} value={profile.lifeExpectancy} onChange={(v) => setProfile({ lifeExpectancy: v })} hint="Life expectancy for planning" />
              </div>
              <div>
                <div className="mb-2 text-[13px] font-medium text-ink">Risk appetite</div>
                <RiskPicker value={profile.risk} onChange={(v) => setProfile({ risk: v })} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle label="I have health insurance" checked={profile.hasHealthInsurance} onChange={(v) => setProfile({ hasHealthInsurance: v })} />
                <Toggle label="I have term life insurance" checked={profile.hasTermInsurance} onChange={(v) => setProfile({ hasTermInsurance: v })} />
              </div>
              <div>
                <div className="mb-2 text-[13px] font-medium text-ink">Financial goals (optional)</div>
                <GoalEditor items={profile.goals} onChange={(v) => setProfile({ goals: v })} />
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-6"><Callout tone="warn" title="Please fix the following">{errors.map((e) => <div key={e}>• {e}</div>)}</Callout></div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}><ArrowLeft className="size-4" /> Back</Button>
            <Button onClick={next}>{step === STEPS.length - 1 ? <>Build my plan <Check className="size-4" /></> : <>Continue <ArrowRight className="size-4" /></>}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
