"use client";
import { UserRound, Banknote, Landmark, Target, ShieldCheck, Database, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney, useOverview } from "@/store/useOverview";
import { COUNTRIES } from "@/lib/locale/countries";
import { validateProfile } from "@/lib/validation";
import { Button, Callout, Card, CardHeader, NumberInput, PageHeader, Select, TextInput, Toggle } from "@/components/ui";
import { GoalEditor, IncomeEditor, LiabilityEditor, RiskPicker } from "@/components/profile/editors";
import { AccountCard } from "@/components/profile/AccountCard";
import { useSession } from "@/store/useSession";

export default function ProfilePage() {
  const p = useFinanceStore((s) => s.profile);
  const set = useFinanceStore((s) => s.setProfile);
  const loadDemo = useFinanceStore((s) => s.loadDemo);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const o = useOverview();
  const { money } = useMoney();
  const router = useRouter();
  const errors = validateProfile(p);
  const signedIn = useSession((s) => s.status === "user");

  return (
    <>
      <PageHeader title="Profile & Income" subtitle="Keep these details up to date — every plan and projection updates instantly." />
      {errors.length > 0 && <div className="mb-4"><Callout tone="warn" title="Some details need attention">{errors.map((e) => <div key={e}>• {e}</div>)}</Callout></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={UserRound} title="Personal details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Name" value={p.name} onChange={(v) => set({ name: v })} error={!p.name.trim() ? "Name is required" : null} />
            <NumberInput label="Age" min={18} max={80} value={p.age} onChange={(v) => set({ age: v })} />
            <Select label="Country & currency" value={p.country} onChange={(v) => { const c = COUNTRIES.find((x) => x.code === v)!; set({ country: c.code, currency: c.currency }); }} options={COUNTRIES.map((c) => ({ value: c.code, label: c.supported ? `${c.name} (${c.currency})` : `${c.name} — coming soon`, disabled: !c.supported }))} />
            <NumberInput label="Retirement age goal" min={30} max={80} value={p.retirementAge} onChange={(v) => set({ retirementAge: v })} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Banknote} title="Income" subtitle={`Total monthly income: ${money(o.income)}`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberInput label="Monthly in-hand salary" prefix="₹" value={p.monthlySalary} onChange={(v) => set({ monthlySalary: v })} />
            <NumberInput label="Annual salary (CTC)" prefix="₹" value={p.annualSalary} onChange={(v) => set({ annualSalary: v })} />
          </div>
          <div className="mt-4"><div className="mb-2 text-[13px] font-medium text-ink">Additional income</div><IncomeEditor items={p.additionalIncome} onChange={(v) => set({ additionalIncome: v })} /></div>
        </Card>

        <Card>
          <CardHeader icon={Landmark} title="Savings & investments" subtitle={`Net worth: ${money(o.netWorth)}`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberInput label="Bank savings" prefix="₹" value={p.bankSavings} onChange={(v) => set({ bankSavings: v })} />
            <NumberInput label="Emergency fund" prefix="₹" value={p.emergencyFund} onChange={(v) => set({ emergencyFund: v })} />
            <NumberInput label="Investments" prefix="₹" value={p.investments} onChange={(v) => set({ investments: v })} />
            <NumberInput label="Retirement savings (EPF/PPF/NPS)" prefix="₹" value={p.retirementSavings} onChange={(v) => set({ retirementSavings: v })} />
          </div>
          <div className="mt-4"><div className="mb-2 text-[13px] font-medium text-ink">Loans & liabilities</div><LiabilityEditor items={p.liabilities} onChange={(v) => set({ liabilities: v })} /></div>
        </Card>

        <Card>
          <CardHeader icon={ShieldCheck} title="Risk & protection" />
          <RiskPicker value={p.risk} onChange={(v) => set({ risk: v })} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Toggle label="Health insurance" hint="Covers hospital bills" checked={p.hasHealthInsurance} onChange={(v) => set({ hasHealthInsurance: v })} />
            <Toggle label="Term life insurance" hint="Protects dependents" checked={p.hasTermInsurance} onChange={(v) => set({ hasTermInsurance: v })} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader icon={Target} title="Financial goals" subtitle="Add milestones like a house, education or travel" />
        <GoalEditor items={p.goals} onChange={(v) => set({ goals: v })} />
      </Card>

      <AccountCard />

      <Card className="mt-4">
        <CardHeader icon={Database} title="Your data" subtitle={signedIn ? "Changes save automatically to your account. Resetting also clears the plan saved in your account." : "Data is stored only in this browser on this device."} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { if (confirm("Replace your data with the ₹1 lakh sample profile?")) loadDemo(); }}><Sparkles className="size-4" /> Load sample data</Button>
          <Button variant="danger" onClick={() => { if (confirm(signedIn ? "This clears your plan on this device and in your account. Continue?" : "This permanently deletes all your data from this device. Continue?")) { resetAll(); router.push("/"); } }}><RotateCcw className="size-4" /> Reset all data</Button>
        </div>
      </Card>
    </>
  );
}
