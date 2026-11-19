import type { Assumptions, RiskAppetite } from "../types.ts";
import { round } from "./format.ts";
import { projectSip } from "./sip.ts";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflation: 6,
  equityReturn: 12,
  indexReturn: 11,
  debtReturn: 7,
  ppfReturn: 7.1,
  epfReturn: 8.25,
  npsReturn: 10,
  fdReturn: 6.75,
  goldReturn: 8,
  postRetirementReturn: 7,
};

export type RiskLevel = "Very low" | "Low" | "Moderate" | "High" | "Very high";

export interface Instrument {
  id: string;
  name: string;
  bucket: "retirement" | "wealth";
  assetClass: "Equity" | "Debt" | "Hybrid" | "Gold";
  returnKey: keyof Assumptions;
  risk: RiskLevel;
  horizon: string;
  horizonYears: number;
  liquidity: string;
  tax: string;
  why: string;
}

/**
 * India instrument catalogue. Tax notes reflect general rules as of FY 2025-26 and
 * are simplified — users should verify current rules before investing.
 */
export const INDIA_INSTRUMENTS: Record<string, Instrument> = {
  vpf: {
    id: "vpf", name: "EPF / VPF top-up", bucket: "retirement", assetClass: "Debt", returnKey: "epfReturn", risk: "Very low",
    horizon: "Until retirement", horizonYears: 20,
    liquidity: "Locked until retirement; partial withdrawals allowed for house, medical, education after conditions.",
    tax: "Contributions eligible under 80C (old regime). Interest on employee contributions above ₹2.5L/yr is taxable.",
    why: "Government-backed, among the highest fixed-income rates, and automatic via payroll — ideal stable core for retirement.",
  },
  ppf: {
    id: "ppf", name: "Public Provident Fund (PPF)", bucket: "retirement", assetClass: "Debt", returnKey: "ppfReturn", risk: "Very low",
    horizon: "15 years (extendable in 5-yr blocks)", horizonYears: 15,
    liquidity: "15-year lock-in; partial withdrawal from year 7, loan facility from year 3. Max ₹1.5L per year.",
    tax: "EEE — contributions (80C, old regime), interest and maturity are tax-free.",
    why: "Sovereign guarantee with tax-free returns. Great for the safe portion of long-term money.",
  },
  nps: {
    id: "nps", name: "National Pension System (NPS)", bucket: "retirement", assetClass: "Hybrid", returnKey: "npsReturn", risk: "Moderate",
    horizon: "Until age 60", horizonYears: 25,
    liquidity: "Locked until 60. At exit, a portion must buy an annuity per PFRDA rules; limited partial withdrawals allowed.",
    tax: "Extra ₹50K deduction under 80CCD(1B) in old regime; employer contribution deductible under 80CCD(2) in both regimes.",
    why: "Low-cost, market-linked retirement product with equity exposure up to 75% and extra tax benefits.",
  },
  index: {
    id: "index", name: "Nifty 50 / Sensex Index Fund (SIP)", bucket: "wealth", assetClass: "Equity", returnKey: "indexReturn", risk: "High",
    horizon: "7+ years", horizonYears: 10,
    liquidity: "Redeem any working day (T+2/T+3). Exit load may apply if sold within a short period.",
    tax: "Equity: gains after 12 months taxed at 12.5% above ₹1.25L/yr (LTCG); within 12 months at 20% (STCG).",
    why: "Very low cost, diversified across India's largest companies — the simplest way to capture long-term equity growth.",
  },
  flexi: {
    id: "flexi", name: "Flexi-cap / Large & Mid-cap Fund (SIP)", bucket: "wealth", assetClass: "Equity", returnKey: "equityReturn", risk: "High",
    horizon: "7+ years", horizonYears: 10,
    liquidity: "Redeem any working day. Exit load (often 1%) if redeemed within 1 year.",
    tax: "Same as equity funds: 12.5% LTCG above ₹1.25L/yr, 20% STCG.",
    why: "Actively managed diversification across company sizes, aiming to beat the index over long periods.",
  },
  midsmall: {
    id: "midsmall", name: "Mid & Small-cap Fund (SIP)", bucket: "wealth", assetClass: "Equity", returnKey: "equityReturn", risk: "Very high",
    horizon: "10+ years", horizonYears: 12,
    liquidity: "Redeem any working day; can fall 30–50% in bad years, so avoid money needed soon.",
    tax: "Same as equity funds: 12.5% LTCG above ₹1.25L/yr, 20% STCG.",
    why: "Higher growth potential for high-risk investors with long horizons; kept to a small slice due to volatility.",
  },
  debt: {
    id: "debt", name: "Debt / Short-duration Fund", bucket: "wealth", assetClass: "Debt", returnKey: "debtReturn", risk: "Low",
    horizon: "1–3 years", horizonYears: 3,
    liquidity: "Redeem in 1–2 working days. Good for goals within 3 years.",
    tax: "Gains taxed at your income-tax slab rate (for units bought after April 2023).",
    why: "Stabilises the portfolio and parks money for near-term goals with better liquidity than FDs.",
  },
  rd: {
    id: "rd", name: "Recurring Deposit / Fixed Deposit", bucket: "wealth", assetClass: "Debt", returnKey: "fdReturn", risk: "Very low",
    horizon: "1–5 years", horizonYears: 3,
    liquidity: "Premature withdrawal allowed with a small interest penalty.",
    tax: "Interest taxed at slab rate; TDS if interest exceeds threshold. 5-yr tax-saver FD qualifies for 80C (old regime).",
    why: "Guaranteed returns with DICGC insurance up to ₹5L per bank — useful for conservative savers and short goals.",
  },
  gold: {
    id: "gold", name: "Gold ETF / Gold Fund", bucket: "wealth", assetClass: "Gold", returnKey: "goldReturn", risk: "Moderate",
    horizon: "5+ years", horizonYears: 7,
    liquidity: "Gold ETFs trade on exchanges daily; gold funds redeem like mutual funds.",
    tax: "Long-term (over 12 months for ETFs, 24 for funds) taxed at 12.5%; short-term at slab rate.",
    why: "Hedge against inflation and currency fall; tends to do well when equities struggle.",
  },
};

const RETIREMENT_MIX: Record<RiskAppetite, Record<string, number>> = {
  low: { ppf: 0.5, vpf: 0.3, nps: 0.2 },
  moderate: { nps: 0.4, ppf: 0.35, vpf: 0.25 },
  high: { nps: 0.55, ppf: 0.3, vpf: 0.15 },
};

const WEALTH_MIX: Record<RiskAppetite, Record<string, number>> = {
  low: { index: 0.25, flexi: 0.1, debt: 0.25, rd: 0.3, gold: 0.1 },
  moderate: { index: 0.35, flexi: 0.25, debt: 0.2, rd: 0.1, gold: 0.1 },
  high: { index: 0.35, flexi: 0.25, midsmall: 0.2, debt: 0.1, gold: 0.1 },
};

const PPF_MONTHLY_CAP = 150000 / 12;

export interface Recommendation extends Instrument {
  monthly: number;
  share: number;
  expectedReturn: number;
  projected: { invested: number; value: number; years: number };
}

export function recommendPortfolio(opts: {
  retirementMonthly: number;
  wealthMonthly: number;
  age: number;
  risk: RiskAppetite;
  assumptions: Assumptions;
}): Recommendation[] {
  const retMix = { ...RETIREMENT_MIX[opts.risk] };
  const wealthMix = { ...WEALTH_MIX[opts.risk] };

  // Age-based glide path: past 50, move part of equity into debt.
  if (opts.age >= 50) {
    const shift = Math.min(0.15, wealthMix.index ?? 0);
    wealthMix.index = (wealthMix.index ?? 0) - shift;
    if (wealthMix.midsmall) {
      wealthMix.debt += wealthMix.midsmall;
      wealthMix.midsmall = 0;
    }
    wealthMix.debt = (wealthMix.debt ?? 0) + shift;
  }

  const amounts: Record<string, number> = {};
  for (const [k, w] of Object.entries(retMix)) amounts[k] = opts.retirementMonthly * w;
  if (amounts.ppf > PPF_MONTHLY_CAP) {
    amounts.nps = (amounts.nps ?? 0) + (amounts.ppf - PPF_MONTHLY_CAP);
    amounts.ppf = PPF_MONTHLY_CAP;
  }
  for (const [k, w] of Object.entries(wealthMix)) amounts[k] = (amounts[k] ?? 0) + opts.wealthMonthly * w;

  const total = Object.values(amounts).reduce((s, v) => s + v, 0);
  const yearsToSixty = Math.max(5, 60 - opts.age);

  return Object.entries(amounts)
    .filter(([, v]) => v >= 100)
    .map(([k, v]) => {
      const inst = INDIA_INSTRUMENTS[k];
      const monthly = round(v, 100);
      const expectedReturn = opts.assumptions[inst.returnKey];
      const years = inst.bucket === "retirement" ? (k === "ppf" ? 15 : yearsToSixty) : inst.horizonYears;
      const p = projectSip({ monthly, annualReturn: expectedReturn, years });
      return { ...inst, monthly, share: total > 0 ? (v / total) * 100 : 0, expectedReturn, projected: { invested: p.invested, value: p.value, years } };
    })
    .sort((a, b) => b.monthly - a.monthly);
}

export function assetClassSplit(recs: Recommendation[]) {
  const map = new Map<string, number>();
  for (const r of recs) map.set(r.assetClass, (map.get(r.assetClass) ?? 0) + r.monthly);
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

export function blendedReturn(recs: Recommendation[]) {
  const total = recs.reduce((s, r) => s + r.monthly, 0);
  return total > 0 ? recs.reduce((s, r) => s + r.expectedReturn * r.monthly, 0) / total : 0;
}
