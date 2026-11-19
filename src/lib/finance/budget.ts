import type { ExpenseCategory, Profile } from "../types.ts";
import { clamp, round } from "./format.ts";

export const totalIncome = (p: Pick<Profile, "monthlySalary" | "additionalIncome">) =>
  (p.monthlySalary || 0) + p.additionalIncome.reduce((s, i) => s + (i.amount || 0), 0);

export function expenseSummary(expenses: ExpenseCategory[], income: number) {
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const essential = expenses.filter((e) => e.essential).reduce((s, e) => s + (e.amount || 0), 0);
  const discretionary = total - essential;
  const remaining = income - total;
  return {
    total,
    essential,
    discretionary,
    remaining,
    savingsRate: income > 0 ? (remaining / income) * 100 : 0,
    breakdown: expenses
      .filter((e) => e.amount > 0)
      .map((e) => ({ ...e, share: total > 0 ? (e.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export interface PlanBucket {
  key: "expenses" | "emergency" | "investments" | "disposable";
  label: string;
  amount: number;
  percent: number;
  description: string;
}

export interface SalaryPlan {
  income: number;
  buckets: PlanBucket[];
  retirement: number;
  wealth: number;
  emergencyTarget: number;
  emergencyMonthsToGoal: number;
  savingsRateTarget: number;
  deficit: number;
  usedAssumedExpenses: boolean;
  notes: string[];
}

export function targetSavingsRate(income: number) {
  if (income < 30000) return 15;
  if (income < 75000) return 25;
  if (income < 200000) return 30;
  return 40;
}

export function retirementShare(age: number) {
  if (age < 30) return 0.3;
  if (age < 40) return 0.4;
  if (age < 50) return 0.5;
  return 0.6;
}

/**
 * The core "how should I divide my salary?" engine.
 * Uses the user's essential expenses when available, otherwise assumes 50% of income.
 */
export function buildSalaryPlan(input: {
  income: number;
  essentialExpenses: number;
  age: number;
  emergencyFund: number;
  emergencyMonths?: number;
  /** Monthly amount needed for retirement; raises the retirement share up to 60% of investments. */
  retirementNeed?: number;
}): SalaryPlan {
  const income = Math.max(0, input.income);
  const notes: string[] = [];
  const usedAssumedExpenses = input.essentialExpenses <= 0;
  const needs = usedAssumedExpenses ? income * 0.5 : input.essentialExpenses;
  const months = input.emergencyMonths ?? 6;

  if (usedAssumedExpenses)
    notes.push("No essential expenses entered yet, so we assumed 50% of income. Add expenses for a precise plan.");

  const rateTarget = targetSavingsRate(income);
  const minDisposable = income * 0.1;
  const maxSavings = Math.max(0, income - needs - minDisposable);
  let savings = Math.min((rateTarget / 100) * income, maxSavings);
  let disposable = income - needs - savings;
  const deficit = Math.max(0, needs - income);

  if (disposable > income * 0.2) {
    const extra = disposable - income * 0.2;
    savings += extra;
    disposable -= extra;
    notes.push("Your essentials are low relative to income, so the surplus beyond 20% fun money is moved to investments.");
  }
  if (deficit > 0) {
    savings = 0;
    disposable = 0;
    notes.push("Essential expenses exceed income. Focus first on cutting costs or restructuring loans.");
  } else if (savings < (rateTarget / 100) * income) {
    notes.push(`High essential costs limit savings below the recommended ${rateTarget}%. Reducing fixed costs will help.`);
  }

  const emergencyTarget = needs * months;
  const gap = Math.max(0, emergencyTarget - input.emergencyFund);
  let emergency = gap > 0 ? Math.min(gap, Math.max(gap / 12, savings * 0.2), savings * 0.4) : 0;
  emergency = round(emergency);
  if (gap === 0) notes.push("Emergency fund is fully built — all savings go to investments.");

  const investments = Math.max(0, round(savings - emergency));
  const baseRet = investments * retirementShare(input.age);
  const retirement = round(Math.max(baseRet, Math.min(input.retirementNeed ?? 0, investments * 0.6)));
  if (retirement > baseRet + 100) notes.push("Retirement share raised above the age-based default because your retirement goal needs more monthly investment.");
  const expenses = round(Math.min(needs, income));
  const disposableR = Math.max(0, income - expenses - emergency - investments);

  const p = (v: number) => (income > 0 ? (v / income) * 100 : 0);
  return {
    income,
    buckets: [
      { key: "expenses", label: "Essential expenses", amount: expenses, percent: p(expenses), description: "Rent/EMI, groceries, bills, transport, insurance, education" },
      { key: "emergency", label: "Emergency fund", amount: emergency, percent: p(emergency), description: `Build ${months} months of essentials (${months}× expenses) in a liquid account` },
      { key: "investments", label: "Investments", amount: investments, percent: p(investments), description: "SIPs, PPF, NPS, EPF top-up, debt & gold" },
      { key: "disposable", label: "Guilt-free spending", amount: disposableR, percent: p(disposableR), description: "Shopping, dining, travel, entertainment" },
    ],
    retirement,
    wealth: investments - retirement,
    emergencyTarget,
    emergencyMonthsToGoal: emergency > 0 ? Math.ceil(gap / emergency) : 0,
    savingsRateTarget: rateTarget,
    deficit,
    usedAssumedExpenses,
    notes,
  };
}

/** Benchmarks: max suggested share of income per category id. */
export const BENCHMARKS: Record<string, { max: number; tip: string }> = {
  rent: { max: 30, tip: "Housing above 30% of income strains savings. Consider sharing, relocating, or refinancing your home loan." },
  groceries: { max: 12, tip: "Plan weekly menus, buy staples in bulk, and limit quick-commerce orders." },
  utilities: { max: 6, tip: "Switch to energy-efficient appliances and review mobile/OTT/internet plans you don't fully use." },
  transport: { max: 10, tip: "Use public transport or carpool a few days a week; service vehicles regularly to save fuel." },
  shopping: { max: 8, tip: "Use a 48-hour rule for non-essential purchases and unsubscribe from sale notifications." },
  travel: { max: 6, tip: "Book early, travel off-season, and save for trips in a dedicated sinking fund." },
  misc: { max: 5, tip: "Track small daily spends (coffee, food delivery) — they add up quickly." },
  emi: { max: 30, tip: "EMIs above 30% are risky. Prepay high-interest loans (credit cards, personal loans) first." },
};

export interface Insight {
  id: string;
  category: string;
  current: number;
  suggested: number;
  saving: number;
  tip: string;
}

export function spendingInsights(expenses: ExpenseCategory[], income: number): Insight[] {
  if (income <= 0) return [];
  return expenses
    .map((e) => {
      const b = BENCHMARKS[e.id];
      if (!b) return null;
      const suggested = (b.max / 100) * income;
      if (e.amount <= suggested) return null;
      return { id: e.id, category: e.name, current: e.amount, suggested: round(suggested), saving: round(e.amount - suggested), tip: b.tip };
    })
    .filter((x): x is Insight => x !== null)
    .sort((a, b) => b.saving - a.saving);
}

export const emergencyCoverageMonths = (fund: number, essential: number) => (essential > 0 ? fund / essential : 0);

export const debtToIncome = (emi: number, income: number) => (income > 0 ? clamp((emi / income) * 100, 0, 999) : 0);
