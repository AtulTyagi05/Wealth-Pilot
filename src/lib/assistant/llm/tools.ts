import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Overview } from "../../finance/overview.ts";
import type { AssistantRequest } from "../schema.ts";
import { projectSip } from "../../finance/sip.ts";
import { planRetirement } from "../../finance/retirement.ts";
import { buildSalaryPlan, retirementShare } from "../../finance/budget.ts";
import { blendedReturn, recommendPortfolio } from "../../finance/investments.ts";

const r = (v: number) => Math.round(v);
const amount = z.number().min(0).max(1e10);
const rate = z.number().min(0).max(30);

/**
 * Calculation tools the model calls instead of doing arithmetic. Each closes over the
 * validated request, so defaults come from the user's own profile.
 */
export function buildTools(req: AssistantRequest, o: Overview) {
  const p = req.profile;
  const a = req.assumptions;
  const defaultReturn = Number((blendedReturn(o.portfolio) || a.indexReturn).toFixed(2));

  const projectSipTool = betaZodTool({
    name: "project_sip",
    description:
      "Estimate the future value of a monthly SIP (investment made at the start of each month), with optional yearly step-up and a lump sum invested today. Use for 'how much can I build in N years' and 'what if I increase my SIP by X' questions. Compare scenarios by calling it once per scenario.",
    inputSchema: z.object({
      monthly: amount.describe("Monthly investment in INR"),
      years: z.number().int().min(1).max(60).describe("Investment duration in years"),
      annual_return_pct: rate.optional().describe(`Assumed yearly return; defaults to the user's blended portfolio return (${defaultReturn}%)`),
      step_up_pct: z.number().min(0).max(50).optional().describe("Yearly increase in the SIP amount, e.g. 10"),
      lump_sum: amount.optional().describe("Amount invested once today"),
    }),
    eager_input_streaming: true,
    run: (i) => {
      const ret = i.annual_return_pct ?? defaultReturn;
      const res = projectSip({ monthly: i.monthly, annualReturn: ret, years: i.years, stepUp: i.step_up_pct, lumpSum: i.lump_sum });
      const real = res.value / Math.pow(1 + a.inflation / 100, i.years);
      return JSON.stringify({
        assumed_return_pct: ret, years: i.years, total_invested: res.invested, estimated_value: res.value, estimated_gains: res.gains,
        value_in_todays_money: r(real), inflation_pct: a.inflation,
        yearly: res.points.filter((pt) => pt.year > 0 && (pt.year % 5 === 0 || pt.year === i.years)),
      });
    },
  });

  const retirementTool = betaZodTool({
    name: "retirement_plan",
    description:
      "Calculate the retirement corpus needed, the monthly investment required to reach it, and the projected wealth for a given monthly contribution. All inputs are optional and default to the user's profile. Use for any retirement question, including what-ifs such as retiring earlier or investing more.",
    inputSchema: z.object({
      retirement_age: z.number().int().min(31).max(80).optional(),
      monthly_expense_today: amount.optional().describe("Expected monthly expenses in retirement, in today's money"),
      monthly_contribution: amount.optional().describe("Monthly amount invested for retirement"),
      inflation_pct: rate.optional(),
      pre_retirement_return_pct: rate.optional(),
      post_retirement_return_pct: rate.optional(),
      step_up_pct: z.number().min(0).max(30).optional(),
    }),
    eager_input_streaming: true,
    run: (i) => {
      const retirementAge = i.retirement_age ?? p.retirementAge;
      if (retirementAge <= p.age) return JSON.stringify({ error: `Retirement age must be above the user's current age (${p.age}).` });
      const res = planRetirement({
        age: p.age,
        retirementAge,
        lifeExpectancy: Math.max(p.lifeExpectancy, retirementAge + 1),
        currentSavings: p.retirementSavings,
        monthlyExpenseToday: i.monthly_expense_today ?? o.retirementExpense,
        monthlyContribution: i.monthly_contribution ?? o.plan.retirement,
        inflation: i.inflation_pct ?? a.inflation,
        preReturn: i.pre_retirement_return_pct ?? 10,
        postReturn: i.post_retirement_return_pct ?? a.postRetirementReturn,
        stepUp: i.step_up_pct,
      });
      return JSON.stringify({
        current_age: p.age, retirement_age: retirementAge, years_to_retire: res.yearsToRetire, years_in_retirement: res.yearsInRetirement,
        monthly_expense_at_retirement: r(res.monthlyExpenseAtRetirement), corpus_needed: r(res.corpusRequired),
        current_savings_grown: r(res.fvCurrentSavings), projected_wealth: r(res.projectedWealth),
        monthly_sip_needed_flat: r(res.requiredMonthly), shortfall: r(res.shortfall), on_track_pct: r(res.onTrackPct),
      });
    },
  });

  const salaryPlanTool = betaZodTool({
    name: "salary_plan",
    description:
      "Split a monthly income into essential expenses, emergency-fund savings, investments (with the retirement portion) and guilt-free spending, using the app's planning rules. Defaults to the user's income and essential expenses. Use for 'how should I divide my salary' or 'how much should I save' questions, including hypothetical incomes.",
    inputSchema: z.object({
      monthly_income: amount.optional(),
      essential_expenses: amount.optional().describe("Monthly essential expenses; 0 means assume 50% of income"),
      emergency_months: z.union([z.literal(3), z.literal(6)]).optional(),
    }),
    eager_input_streaming: true,
    run: (i) => {
      const plan = buildSalaryPlan({
        income: i.monthly_income ?? o.income,
        essentialExpenses: i.essential_expenses ?? o.expenses.essential,
        age: p.age,
        emergencyFund: p.emergencyFund,
        emergencyMonths: i.emergency_months ?? 6,
        retirementNeed: o.retirement.requiredMonthly,
      });
      return JSON.stringify({
        income: plan.income,
        split: plan.buckets.map((b) => ({ bucket: b.label, amount: b.amount, pct_of_income: Number(b.percent.toFixed(1)) })),
        retirement_part_of_investments: plan.retirement, other_investments: plan.wealth,
        emergency_target: r(plan.emergencyTarget), months_to_build_emergency_fund: plan.emergencyMonthsToGoal,
        savings_rate_target_pct: plan.savingsRateTarget, deficit: plan.deficit, notes: plan.notes,
      });
    },
  });

  const allocationTool = betaZodTool({
    name: "investment_allocation",
    description:
      "Recommend how to split a monthly investment amount across Indian instruments (index funds, flexi-cap and mid/small-cap SIPs, PPF, EPF/VPF, NPS, debt funds, FD/RD, gold) for a risk appetite. Returns each instrument's amount, risk, horizon, liquidity, tax notes and an estimated projection. Use for 'how should I invest ₹X' questions.",
    inputSchema: z.object({
      monthly_amount: amount.describe("Total monthly amount to invest in INR"),
      risk: z.enum(["low", "moderate", "high"]).optional().describe(`Defaults to the user's risk appetite (${p.risk})`),
    }),
    eager_input_streaming: true,
    run: (i) => {
      const retirement = i.monthly_amount * retirementShare(p.age);
      const recs = recommendPortfolio({ retirementMonthly: retirement, wealthMonthly: i.monthly_amount - retirement, age: p.age, risk: i.risk ?? p.risk, assumptions: a });
      return JSON.stringify({
        risk: i.risk ?? p.risk,
        blended_assumed_return_pct: Number(blendedReturn(recs).toFixed(2)),
        instruments: recs.map((x) => ({
          name: x.name, monthly: x.monthly, share_pct: Number(x.share.toFixed(1)), purpose: x.bucket, asset_class: x.assetClass,
          risk: x.risk, horizon: x.horizon, assumed_return_pct: x.expectedReturn, liquidity: x.liquidity, tax: x.tax, why: x.why,
          estimate: x.projected,
        })),
      });
    },
  });

  return [projectSipTool, retirementTool, salaryPlanTool, allocationTool];
}
