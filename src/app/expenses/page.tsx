"use client";
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Receipt, Lightbulb, Wallet, PiggyBank, TrendingUp, Home, ShoppingCart, Zap, Car, HeartPulse, BookOpen, CreditCard, ShoppingBag, Plane, MoreHorizontal, Tag } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useMoney, useOverview } from "@/store/useOverview";
import { Badge, Button, Callout, Card, CardHeader, ConfirmButton, Disclaimer, Empty, PageHeader, Stat, cn } from "@/components/ui";
import { BarList, DonutChart } from "@/components/charts";
import { uid } from "@/components/profile/editors";
import type { ExpenseCategory } from "@/lib/types";

const ICONS: Record<string, typeof Home> = { home: Home, cart: ShoppingCart, zap: Zap, car: Car, heart: HeartPulse, book: BookOpen, card: CreditCard, bag: ShoppingBag, plane: Plane, dots: MoreHorizontal, tag: Tag };

export default function ExpensesPage() {
  const expenses = useFinanceStore((s) => s.expenses);
  const upsert = useFinanceStore((s) => s.upsertExpense);
  const remove = useFinanceStore((s) => s.removeExpense);
  const o = useOverview();
  const { money, compact } = useMoney();
  const [adding, setAdding] = useState(false);

  const emergency = o.plan.buckets[1].amount;
  const investable = Math.max(0, o.expenses.remaining - emergency);
  const totalSaving = o.insights.reduce((s, i) => s + i.saving, 0);

  return (
    <>
      <PageHeader title="Monthly Expenses" subtitle="Enter what you typically spend each month. Mark essentials so we can plan your emergency fund." action={<Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add category</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total expenses" value={money(o.expenses.total)} icon={Receipt} hint={`Essentials ${compact(o.expenses.essential)} · Lifestyle ${compact(o.expenses.discretionary)}`} />
        <Stat label="Remaining salary" value={money(o.expenses.remaining)} icon={Wallet} tone={o.expenses.remaining < 0 ? "bad" : "default"} hint={o.expenses.remaining < 0 ? "You're overspending" : `of ${compact(o.income)} income`} />
        <Stat label="Monthly savings" value={`${o.expenses.savingsRate.toFixed(0)}%`} icon={PiggyBank} tone={o.expenses.savingsRate >= 20 ? "good" : "warn"} hint={o.expenses.savingsRate >= 20 ? "Healthy savings rate" : "Aim for 20%+"} />
        <Stat label="Investable amount" value={money(investable)} icon={TrendingUp} hint={emergency > 0 ? `After ${compact(emergency)} to emergency fund` : "Emergency fund is complete"} />
      </div>

      {o.expenses.remaining < 0 && <div className="mt-4"><Callout tone="warn" title="Expenses exceed income">You spend {money(-o.expenses.remaining)} more than you earn each month. Start with the suggestions below.</Callout></div>}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Categories" subtitle="Click an amount to edit. Changes save automatically." />
          {adding && <AddRow onCancel={() => setAdding(false)} onAdd={(e) => { upsert(e); setAdding(false); }} existing={expenses} />}
          {expenses.length === 0 && !adding && <Empty icon={Receipt} title="No categories" text="Add your first expense category." />}
          <ul className="divide-y divide-line">
            {expenses.map((e) => <Row key={e.id} e={e} income={o.income} onSave={upsert} onDelete={() => remove(e.id)} />)}
          </ul>
        </Card>
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Breakdown" subtitle="Share of total spending" />
            {o.expenses.total > 0 ? (
              <DonutChart height={170} data={[{ name: "Essentials", value: o.expenses.essential, color: "var(--s1)" }, { name: "Lifestyle", value: o.expenses.discretionary, color: "var(--s2)" }]} centerLabel="Total" centerValue={compact(o.expenses.total)} />
            ) : <p className="text-sm text-ink-2">Enter amounts to see your breakdown.</p>}
            {o.expenses.total > 0 && <div className="mt-5"><BarList data={o.expenses.breakdown.map((b) => ({ name: b.name, value: b.amount }))} /></div>}
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader icon={Lightbulb} title="Where you can cut back" subtitle={totalSaving > 0 ? `You could free up about ${money(totalSaving)} every month (${compact(totalSaving * 12)} a year)` : "Compared with healthy benchmarks for your income"} />
        {o.insights.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {o.insights.map((i) => (
              <div key={i.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-ink">{i.category}</div>
                  <Badge tone="good">Save {money(i.saving)}/mo</Badge>
                </div>
                <div className="mt-1 text-xs text-muted">You spend {money(i.current)} · suggested up to {money(i.suggested)} ({Math.round((i.suggested / Math.max(o.income, 1)) * 100)}% of income)</div>
                <p className="mt-2 text-sm text-ink-2">{i.tip}</p>
              </div>
            ))}
          </div>
        ) : <Callout tone="good">No overspending detected against typical benchmarks. Nice work!</Callout>}
      </Card>
      <Disclaimer />
    </>
  );
}

function Row({ e, income, onSave, onDelete }: { e: ExpenseCategory; income: number; onSave: (e: ExpenseCategory) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(e.name);
  const [amount, setAmount] = useState(String(e.amount));
  const [err, setErr] = useState<string | null>(null);
  const Icon = ICONS[e.icon] ?? Tag;
  const save = () => {
    const n = Number(amount);
    if (!name.trim()) return setErr("Name is required");
    if (amount.trim() === "" || !Number.isFinite(n) || n < 0) return setErr("Enter a valid amount (0 or more)");
    if (n > 1e9) return setErr("Amount seems too large");
    onSave({ ...e, name: name.trim(), amount: n });
    setErr(null);
    setEditing(false);
  };
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2"><Icon className="size-4" /></span>
        {editing ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input aria-label="Category name" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none" value={name} maxLength={40} onChange={(x) => setName(x.target.value)} />
            <input aria-label="Amount" type="number" min={0} className="h-9 w-32 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none" value={amount} onChange={(x) => setAmount(x.target.value)} onKeyDown={(k) => k.key === "Enter" && save()} autoFocus />
            <Button size="sm" onClick={save} aria-label="Save"><Check className="size-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setErr(null); setName(e.name); setAmount(String(e.amount)); }} aria-label="Cancel"><X className="size-4" /></Button>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">{e.name}</div>
              <button onClick={() => onSave({ ...e, essential: !e.essential })} className={cn("mt-0.5 text-xs", e.essential ? "text-brand-strong" : "text-muted")} title="Toggle essential">{e.essential ? "● Essential" : "○ Lifestyle"}</button>
            </div>
            <button onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-right hover:bg-surface-2">
              <div className="font-semibold text-ink tabular-nums">₹{e.amount.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted">{income > 0 ? ((e.amount / income) * 100).toFixed(1) : 0}% of income</div>
            </button>
            <Button size="sm" variant="ghost" className="hidden sm:inline-flex" onClick={() => setEditing(true)} aria-label={`Edit ${e.name}`}><Pencil className="size-4" /></Button>
            <ConfirmButton size="sm" variant="ghost" onConfirm={onDelete} confirmLabel="Delete?" aria-label={`Delete ${e.name}`}><Trash2 className="size-4" /></ConfirmButton>
          </>
        )}
      </div>
      {err && <p className="ml-12 mt-1 text-xs text-bad">{err}</p>}
    </li>
  );
}

function AddRow({ onAdd, onCancel, existing }: { onAdd: (e: ExpenseCategory) => void; onCancel: () => void; existing: ExpenseCategory[] }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [essential, setEssential] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const n = Number(amount || 0);
    if (!name.trim()) return setErr("Enter a category name");
    if (existing.some((x) => x.name.toLowerCase() === name.trim().toLowerCase())) return setErr("A category with this name already exists");
    if (!Number.isFinite(n) || n < 0) return setErr("Enter a valid amount");
    onAdd({ id: uid("exp"), name: name.trim(), amount: n, essential, icon: "tag" });
  };
  return (
    <div className="mb-3 rounded-xl border border-brand/40 bg-brand-soft/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="New category name" placeholder="e.g. Gym, Pet care, Subscriptions" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none" value={name} maxLength={40} onChange={(x) => setName(x.target.value)} autoFocus />
        <input aria-label="New category amount" type="number" min={0} placeholder="₹ / month" className="h-9 w-32 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none" value={amount} onChange={(x) => setAmount(x.target.value)} onKeyDown={(k) => k.key === "Enter" && submit()} />
        <label className="flex items-center gap-1.5 text-sm text-ink-2"><input type="checkbox" checked={essential} onChange={(x) => setEssential(x.target.checked)} /> Essential</label>
        <Button size="sm" onClick={submit}>Add</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      {err && <p className="mt-1 text-xs text-bad">{err}</p>}
    </div>
  );
}
