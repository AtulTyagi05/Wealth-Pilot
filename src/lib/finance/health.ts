import { clamp } from "./format.ts";

export interface HealthInput {
  savingsRate: number; // %
  emergencyMonths: number;
  debtToIncome: number; // %
  retirementOnTrack: number; // %
  hasHealthInsurance: boolean;
  hasTermInsurance: boolean;
  investingRate: number; // % of income invested
}

export interface HealthFactor {
  label: string;
  score: number;
  max: number;
  hint: string;
}

export function financialHealth(i: HealthInput) {
  const factors: HealthFactor[] = [
    { label: "Savings rate", max: 25, score: clamp((i.savingsRate / 30) * 25, 0, 25), hint: "Aim to save at least 20–30% of income." },
    { label: "Emergency fund", max: 20, score: clamp((i.emergencyMonths / 6) * 20, 0, 20), hint: "Keep 3–6 months of essential expenses aside." },
    { label: "Debt load", max: 20, score: i.debtToIncome <= 10 ? 20 : clamp(20 - ((i.debtToIncome - 10) / 30) * 20, 0, 20), hint: "Keep total EMIs under 30% of income." },
    { label: "Retirement readiness", max: 15, score: clamp((i.retirementOnTrack / 100) * 15, 0, 15), hint: "Invest enough monthly to reach your retirement corpus." },
    { label: "Insurance cover", max: 10, score: (i.hasHealthInsurance ? 5 : 0) + (i.hasTermInsurance ? 5 : 0), hint: "Get health insurance and, if you have dependents, term life cover." },
    { label: "Investing habit", max: 10, score: clamp((i.investingRate / 20) * 10, 0, 10), hint: "Invest 15–20% of income consistently via SIPs." },
  ];
  const score = Math.round(factors.reduce((s, f) => s + f.score, 0));
  const grade = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 45 ? "Fair" : "Needs attention";
  return { score, grade, factors };
}
