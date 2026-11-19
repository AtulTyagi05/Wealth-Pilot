"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useMoney } from "@/store/useOverview";

export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];

const axisProps = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false } as const;

function TooltipBox({ active, payload, label, labelFormatter }: { active?: boolean; payload?: readonly { name?: string; value?: number; color?: string; payload?: { color?: string } }[]; label?: string | number; labelFormatter?: (l: string | number) => string }) {
  const { money } = useMoney();
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <div className="mb-1 font-semibold text-ink">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-2"><span className="size-2 rounded-full" style={{ background: p.payload?.color ?? p.color }} />{p.name}</span>
          <span className="font-semibold text-ink tabular-nums">{money(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

export interface Slice { name: string; value: number; color?: string }

export function DonutChart({ data, centerLabel, centerValue, height = 220, stacked = false }: { data: Slice[]; centerLabel?: string; centerValue?: string; height?: number; stacked?: boolean }) {
  const { money } = useMoney();
  const total = data.reduce((s, d) => s + d.value, 0);
  const items = data.map((d, i) => ({ ...d, color: d.color ?? SERIES[i % SERIES.length] }));
  return (
    <div className={`flex flex-col items-center gap-5 ${stacked ? "" : "sm:flex-row"}`}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={1.5} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
              {items.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={<TooltipBox />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted">{centerLabel}</span>
            <span className="text-lg font-bold text-ink">{centerValue}</span>
          </div>
        )}
      </div>
      <ul className="w-full space-y-2">
        {items.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink-2"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.color }} /><span className="truncate">{d.name}</span></span>
            <span className="shrink-0 tabular-nums"><span className="font-semibold text-ink">{money(d.value)}</span> <span className="text-xs text-muted">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars in plain HTML – crisp labels, works well for category breakdowns. */
export function BarList({ data, color = "var(--s1)" }: { data: { name: string; value: number; tag?: React.ReactNode }[]; color?: string }) {
  const { money } = useMoney();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.name} title={`${d.name}: ${money(d.value)}`}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-2">{d.name}{d.tag}</span>
            <span className="font-semibold text-ink tabular-nums">{money(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProjectionChart({ data, xKey, series, height = 280, xFormatter }: { data: Record<string, number>[]; xKey: string; series: { key: string; name: string; color: string; dashed?: boolean; fill?: boolean }[]; height?: number; xFormatter?: (v: number) => string }) {
  const { compact } = useMoney();
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormatter} minTickGap={24} />
          <YAxis {...axisProps} tickFormatter={(v) => compact(Number(v))} width={64} />
          <Tooltip content={<TooltipBox labelFormatter={(l) => (xFormatter ? xFormatter(Number(l)) : String(l))} />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} fill={s.fill === false ? "transparent" : `url(#g-${s.key})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({ data, xKey, series, height = 280 }: { data: Record<string, string | number>[]; xKey: string; series: { key: string; name: string; color: string }[]; height?: number }) {
  const { compact } = useMoney();
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => compact(Number(v))} width={64} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--surface-2)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />
          {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLines({ data, xKey, series, height = 260 }: { data: Record<string, string | number>[]; xKey: string; series: { key: string; name: string; color: string }[]; height?: number }) {
  const { compact } = useMoney();
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => compact(Number(v))} width={64} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />
          {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Semi-circular gauge for the financial health score. */
export function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const r = 70, c = Math.PI * r;
  const color = score >= 65 ? "var(--good)" : score >= 45 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="relative mx-auto w-[180px]">
      <svg viewBox="0 0 180 100" className="w-full" role="img" aria-label={`Financial health score ${score} out of 100, ${grade}`}>
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="var(--surface-2)" strokeWidth="14" strokeLinecap="round" />
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-3xl font-bold text-ink">{score}</div>
        <div className="text-xs font-medium" style={{ color }}>{grade}</div>
      </div>
    </div>
  );
}
