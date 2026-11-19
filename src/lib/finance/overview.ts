import type { Assumptions, ExpenseCategory, Profile } from "../types.ts";
import { buildSalaryPlan, debtToIncome, emergencyCoverageMonths, expenseSummary, spendingInsights, totalIncome } from "./budget.ts";
import { financialHealth } from "./health.ts";
import { recommendPortfolio } from "./investments.ts";
import { planRetirement } from "./retirement.ts";

/** Single source of truth for all derived numbers used across the app. */
export function computeOverview(profile: Profile, expenses: ExpenseCategory[], assumptions: Assumptions) {
  const income = totalIncome(profile);
  const exp = expenseSummary(expenses, income);
  const retirementExpense = profile.postRetirementMonthlyExpense > 0 ? profile.postRetirementMonthlyExpense : Math.round((exp.total || income * 0.6) * 0.8);
  const retirementBase = {
    age: profile.age,
    retirementAge: profile.retirementAge,
    lifeExpectancy: profile.lifeExpectancy,
    currentSavings: profile.retirementSavings,
    monthlyExpenseToday: retirementExpense,
    inflation: assumptions.inflation,
    preReturn: 10,
    postReturn: assumptions.postRetirementReturn,
  };
  const need = planRetirement({ ...retirementBase, monthlyContribution: 0 }).requiredMonthly;
  const plan = buildSalaryPlan({ income, essentialExpenses: exp.essential, age: profile.age, emergencyFund: profile.emergencyFund, retirementNeed: need });
  const investBucket = plan.buckets.find((b) => b.key === "investments")!.amount;
  const portfolio = recommendPortfolio({ retirementMonthly: plan.retirement, wealthMonthly: plan.wealth, age: profile.age, risk: profile.risk, assumptions });

  const retirement = planRetirement({ ...retirementBase, monthlyContribution: plan.retirement });

  const loanOutstanding = profile.liabilities.reduce((s, l) => s + l.outstanding, 0);
  const loanEmi = profile.liabilities.reduce((s, l) => s + l.emi, 0);
  const expenseEmi = expenses.find((e) => e.id === "emi")?.amount ?? 0;
  const emi = Math.max(loanEmi, expenseEmi);
  const assets = profile.bankSavings + profile.investments + profile.retirementSavings + profile.emergencyFund;
  const netWorth = assets - loanOutstanding;
  const emergencyMonths = emergencyCoverageMonths(profile.emergencyFund, exp.essential || income * 0.5);
  const dti = debtToIncome(emi, income);

  const health = financialHealth({
    savingsRate: exp.total > 0 ? exp.savingsRate : (plan.buckets[1].amount + investBucket) / Math.max(income, 1) * 100,
    emergencyMonths,
    debtToIncome: dti,
    retirementOnTrack: retirement.onTrackPct,
    hasHealthInsurance: profile.hasHealthInsurance,
    hasTermInsurance: profile.hasTermInsurance,
    investingRate: income > 0 ? (investBucket / income) * 100 : 0,
  });

  return {
    income,
    expenses: exp,
    plan,
    investBucket,
    portfolio,
    retirement,
    retirementExpense,
    netWorth,
    assets,
    loanOutstanding,
    emi,
    dti,
    emergencyMonths,
    insights: spendingInsights(expenses, income),
    health,
  };
}

export type Overview = ReturnType<typeof computeOverview>;
