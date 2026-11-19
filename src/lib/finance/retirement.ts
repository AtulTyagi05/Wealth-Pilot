import { futureValue, projectSip, requiredSip } from "./sip.ts";

export interface RetirementInput {
  age: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentSavings: number;
  monthlyExpenseToday: number;
  monthlyContribution: number;
  inflation: number;
  preReturn: number;
  postReturn: number;
  stepUp?: number;
}

export interface RetirementResult {
  yearsToRetire: number;
  yearsInRetirement: number;
  monthlyExpenseAtRetirement: number;
  corpusRequired: number;
  fvCurrentSavings: number;
  projectedWealth: number;
  requiredMonthly: number;
  shortfall: number;
  onTrackPct: number;
  points: { age: number; projected: number; required: number }[];
}

/**
 * Corpus needed at retirement = present value (at retirement) of inflation-growing
 * withdrawals for the retirement years, discounted at the post-retirement return.
 * Withdrawals are taken at the start of each year (annuity due).
 */
export function corpusNeeded(annualExpenseAtRetirement: number, years: number, postReturn: number, inflation: number) {
  if (years <= 0) return 0;
  const r = postReturn / 100;
  const g = inflation / 100;
  if (Math.abs(r - g) < 1e-9) return annualExpenseAtRetirement * years;
  return annualExpenseAtRetirement * ((1 - Math.pow((1 + g) / (1 + r), years)) / (r - g)) * (1 + r);
}

export function planRetirement(i: RetirementInput): RetirementResult {
  const yearsToRetire = Math.max(0, i.retirementAge - i.age);
  const yearsInRetirement = Math.max(0, i.lifeExpectancy - i.retirementAge);
  const monthlyExpenseAtRetirement = futureValue(i.monthlyExpenseToday, i.inflation, yearsToRetire);
  const corpusRequired = corpusNeeded(monthlyExpenseAtRetirement * 12, yearsInRetirement, i.postReturn, i.inflation);
  const fvCurrentSavings = futureValue(i.currentSavings, i.preReturn, yearsToRetire);
  const proj = projectSip({ monthly: i.monthlyContribution, annualReturn: i.preReturn, years: yearsToRetire, stepUp: i.stepUp, lumpSum: i.currentSavings });
  const requiredMonthly = requiredSip(corpusRequired, i.preReturn, yearsToRetire, i.currentSavings);
  const points = proj.points.map((p) => ({
    age: i.age + p.year,
    projected: p.value,
    // required path: what you'd need to hold at that age on a straight required-SIP track
    required: Math.round(projectSip({ monthly: requiredMonthly, annualReturn: i.preReturn, years: p.year, lumpSum: i.currentSavings }).value),
  }));
  return {
    yearsToRetire,
    yearsInRetirement,
    monthlyExpenseAtRetirement,
    corpusRequired,
    fvCurrentSavings,
    projectedWealth: proj.value,
    requiredMonthly,
    shortfall: Math.max(0, corpusRequired - proj.value),
    onTrackPct: corpusRequired > 0 ? Math.min(100, (proj.value / corpusRequired) * 100) : 100,
    points,
  };
}

export const SCENARIOS = [
  { key: "conservative", label: "Conservative", preReturn: 8, postReturn: 6, inflation: 7, description: "Mostly debt & PPF/EPF, higher inflation assumed" },
  { key: "moderate", label: "Moderate", preReturn: 10, postReturn: 7, inflation: 6, description: "Balanced mix of equity and debt" },
  { key: "aggressive", label: "Aggressive", preReturn: 12, postReturn: 7.5, inflation: 6, description: "Equity-heavy portfolio; higher volatility" },
] as const;
