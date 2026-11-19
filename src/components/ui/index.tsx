"use client";
import clsx from "clsx";
import { Info, AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

export const cn = clsx;

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon: Icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
            <Icon className="size-4" />
          </span>
        )}
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-2">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneCls = { default: "text-ink-2", good: "text-good", warn: "text-warn", bad: "text-bad" }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {Icon && <Icon className="size-4 text-muted" />}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", toneCls)}>{hint}</div>}
    </Card>
  );
}

export function Progress({ value, tone = "brand", className, label }: { value: number; tone?: "brand" | "good" | "warn" | "bad"; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const color = { brand: "bg-brand", good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ variant = "primary", size = "md", className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-strong dark:text-[#04120c]",
    secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
    ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
    danger: "border border-line bg-surface text-bad hover:bg-bad/10",
  }[variant];
  const s = size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm";
  return (
    <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50", v, s, className)} {...rest}>
      {children}
    </button>
  );
}

const inputCls = "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-bad";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">{label}</label>
      {children}
      {error ? <p className="text-xs text-bad">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, value, onChange, placeholder, error }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string | null }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input id={id} className={inputCls} value={value} placeholder={placeholder} aria-invalid={!!error} maxLength={60} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/**
 * Number input with validation. Keeps a local draft so users can clear the field while typing;
 * only commits valid numbers within [min, max].
 */
export function NumberInput({ label, hint, value, onChange, min = 0, max = 1e10, step = 1, prefix, suffix }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; prefix?: string; suffix?: string }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(value) : "");
  const commit = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "") { setError("Required"); return; }
    const n = Number(raw);
    if (!Number.isFinite(n)) { setError("Enter a valid number"); return; }
    if (n < min) { setError(`Must be at least ${min.toLocaleString("en-IN")}`); return; }
    if (n > max) { setError(`Must be at most ${max.toLocaleString("en-IN")}`); return; }
    setError(null);
    onChange(n);
  };
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={cn(inputCls, prefix && "pl-7", suffix && "pr-12")}
          value={shown}
          min={min}
          max={max}
          step={step}
          aria-invalid={!!error}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => { if (!error) setDraft(null); }}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

export function Select<T extends string>({ label, value, onChange, options, hint }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; disabled?: boolean }[]; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-lg font-medium transition-colors", size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm", value === o.value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">{label}</label>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[13px] font-semibold text-ink tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line p-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-line")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "bad" | "brand" }) {
  const t = {
    default: "bg-surface-2 text-ink-2",
    good: "bg-good/12 text-good",
    warn: "bg-warn/12 text-warn",
    bad: "bg-bad/12 text-bad",
    brand: "bg-brand-soft text-brand-strong",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

export function Callout({ tone = "info", title, children }: { tone?: "info" | "warn" | "good"; title?: string; children: ReactNode }) {
  const Icon = tone === "warn" ? AlertTriangle : tone === "good" ? CheckCircle2 : Info;
  const cls = { info: "border-line bg-surface-2 text-ink-2", warn: "border-warn/30 bg-warn/8 text-ink-2", good: "border-good/30 bg-good/8 text-ink-2" }[tone];
  const ic = { info: "text-ink-2", warn: "text-warn", good: "text-good" }[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", cls)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", ic)} />
      <div>
        {title && <div className="mb-0.5 font-semibold text-ink">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function Disclaimer({ compact }: { compact?: boolean }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted", compact ? "" : "mt-8 border-t border-line pt-4")}>
      <strong className="font-semibold">Disclaimer:</strong> Wealth Pilot provides educational estimates, not regulated investment, tax or legal advice.
      Projections use assumed rates of return and inflation; actual returns will differ and may be negative. Market-linked investments are subject to
      market risk — read all scheme documents carefully. Tax rules change; verify current rules or consult a SEBI-registered investment adviser.
    </p>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <Icon className="size-8 text-muted" />
      <div className="mt-3 font-semibold text-ink">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * A button that asks for a second click instead of a browser confirm() dialog
 * (which is blocked in embedded pages). Resets after a few seconds.
 */
export function ConfirmButton({ onConfirm, confirmLabel = "Click again to confirm", children, ...rest }: Omit<React.ComponentProps<typeof Button>, "onClick"> & { onConfirm: () => void; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button {...rest} variant={armed ? "danger" : rest.variant} aria-live="polite" onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>
      {armed ? confirmLabel : children}
    </Button>
  );
}
