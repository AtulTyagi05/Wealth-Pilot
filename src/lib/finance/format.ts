import { getCountry } from "../locale/countries.ts";

export function formatMoney(value: number, country = "IN", opts: { compact?: boolean } = {}) {
  const c = getCountry(country);
  const v = Number.isFinite(value) ? value : 0;
  if (opts.compact && c.code === "IN") {
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)} Cr`;
    if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)} L`;
    if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`;
  }
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.currency,
    maximumFractionDigits: 0,
    notation: opts.compact && c.code !== "IN" ? "compact" : "standard",
  }).format(v);
}

function trim(n: number) {
  return n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1).replace(/\.0$/, "") : n.toFixed(2).replace(/\.?0+$/, "");
}

export const pct = (v: number, digits = 0) => `${(Number.isFinite(v) ? v : 0).toFixed(digits)}%`;

export const round = (v: number, to = 100) => Math.round(v / to) * to;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
