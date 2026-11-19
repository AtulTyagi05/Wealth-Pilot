"use client";
import { Plus, Trash2 } from "lucide-react";
import type { Goal, GoalType, IncomeSource, Liability, RiskAppetite } from "@/lib/types";
import { Button, NumberInput, Select, TextInput, cn } from "@/components/ui";
import { ShieldCheck, Scale, Rocket } from "lucide-react";

export const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function IncomeEditor({ items, onChange }: { items: IncomeSource[]; onChange: (v: IncomeSource[]) => void }) {
  const update = (id: string, patch: Partial<IncomeSource>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <TextInput label="Source" value={i.label} onChange={(v) => update(i.id, { label: v })} placeholder="Rental, freelance…" />
          <NumberInput label="Monthly" prefix="₹" value={i.amount} onChange={(v) => update(i.id, { amount: v })} />
          <Button variant="ghost" aria-label="Remove income" onClick={() => onChange(items.filter((x) => x.id !== i.id))}><Trash2 className="size-4" /></Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, { id: uid("inc"), label: "", amount: 0 }])}><Plus className="size-4" /> Add income source</Button>
    </div>
  );
}

export function LiabilityEditor({ items, onChange }: { items: Liability[]; onChange: (v: Liability[]) => void }) {
  const update = (id: string, patch: Partial<Liability>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  return (
    <div className="space-y-3">
      {items.map((l) => (
        <div key={l.id} className="rounded-xl border border-line p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TextInput label="Loan" value={l.name} onChange={(v) => update(l.id, { name: v })} placeholder="Home loan" />
            <NumberInput label="Outstanding" prefix="₹" value={l.outstanding} onChange={(v) => update(l.id, { outstanding: v })} />
            <NumberInput label="Monthly EMI" prefix="₹" value={l.emi} onChange={(v) => update(l.id, { emi: v })} />
            <NumberInput label="Interest" suffix="%" step={0.1} max={60} value={l.rate} onChange={(v) => update(l.id, { rate: v })} />
          </div>
          <div className="mt-2 text-right">
            <Button variant="ghost" size="sm" onClick={() => onChange(items.filter((x) => x.id !== l.id))}><Trash2 className="size-4" /> Remove</Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, { id: uid("loan"), name: "", outstanding: 0, emi: 0, rate: 9 }])}><Plus className="size-4" /> Add loan</Button>
    </div>
  );
}

export const GOAL_TYPES: { value: GoalType; label: string; emoji: string }[] = [
  { value: "house", label: "Buy a house", emoji: "🏠" },
  { value: "education", label: "Education", emoji: "🎓" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "vehicle", label: "Vehicle", emoji: "🚗" },
  { value: "wedding", label: "Wedding", emoji: "💍" },
  { value: "retirement", label: "Early retirement", emoji: "🌴" },
  { value: "other", label: "Other", emoji: "🎯" },
];

export function GoalEditor({ items, onChange }: { items: Goal[]; onChange: (v: Goal[]) => void }) {
  const update = (id: string, patch: Partial<Goal>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  return (
    <div className="space-y-3">
      {items.map((g) => (
        <div key={g.id} className="rounded-xl border border-line p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <TextInput label="Goal" value={g.name} onChange={(v) => update(g.id, { name: v })} />
            <Select label="Type" value={g.type} onChange={(v) => update(g.id, { type: v })} options={GOAL_TYPES.map((t) => ({ value: t.value, label: `${t.emoji} ${t.label}` }))} />
            <NumberInput label="Target (today's ₹)" prefix="₹" value={g.targetAmount} onChange={(v) => update(g.id, { targetAmount: v })} />
            <NumberInput label="In years" min={1} max={50} value={g.years} onChange={(v) => update(g.id, { years: v })} />
            <NumberInput label="Saved so far" prefix="₹" value={g.saved} onChange={(v) => update(g.id, { saved: v })} />
          </div>
          <div className="mt-2 text-right">
            <Button variant="ghost" size="sm" onClick={() => onChange(items.filter((x) => x.id !== g.id))}><Trash2 className="size-4" /> Remove</Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {GOAL_TYPES.map((t) => (
          <button key={t.value} type="button" onClick={() => onChange([...items, { id: uid("goal"), name: t.label, type: t.value, targetAmount: 500000, years: 5, saved: 0 }])} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 hover:border-brand hover:text-ink">
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const RISKS: { value: RiskAppetite; title: string; text: string; icon: typeof ShieldCheck }[] = [
  { value: "low", title: "Low", text: "I want stability. Small, steady growth is fine.", icon: ShieldCheck },
  { value: "moderate", title: "Moderate", text: "Some ups and downs are OK for better growth.", icon: Scale },
  { value: "high", title: "High", text: "I can handle big swings for maximum long-term growth.", icon: Rocket },
];

export function RiskPicker({ value, onChange }: { value: RiskAppetite; onChange: (v: RiskAppetite) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Risk appetite">
      {RISKS.map(({ value: v, title, text, icon: Icon }) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cn("rounded-xl border p-3 text-left transition-colors", value === v ? "border-brand bg-brand-soft" : "border-line hover:border-ink-2/40")}>
          <Icon className={cn("size-5", value === v ? "text-brand-strong" : "text-muted")} />
          <div className="mt-2 text-sm font-semibold text-ink">{title}</div>
          <div className="mt-0.5 text-xs text-ink-2">{text}</div>
        </button>
      ))}
    </div>
  );
}
