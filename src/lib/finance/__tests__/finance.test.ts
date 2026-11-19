import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSalaryPlan, spendingInsights } from "../budget.ts";
import { projectSip, requiredSip } from "../sip.ts";
import { corpusNeeded, planRetirement } from "../retirement.ts";
import { recommendPortfolio, DEFAULT_ASSUMPTIONS } from "../investments.ts";
import { formatMoney } from "../format.ts";

test("₹1L salary plan splits fully and sensibly", () => {
  const plan = buildSalaryPlan({ income: 100000, essentialExpenses: 0, age: 28, emergencyFund: 0 });
  const sum = plan.buckets.reduce((s, b) => s + b.amount, 0);
  assert.equal(sum, 100000);
  const by = Object.fromEntries(plan.buckets.map((b) => [b.key, b.amount]));
  assert.equal(by.expenses, 50000);
  assert.ok(by.emergency + by.investments >= 30000 - 100);
  assert.ok(by.disposable <= 20000);
  assert.ok(plan.usedAssumedExpenses);
});

test("deficit when essentials exceed income", () => {
  const plan = buildSalaryPlan({ income: 30000, essentialExpenses: 40000, age: 30, emergencyFund: 0 });
  assert.equal(plan.deficit, 10000);
  assert.equal(plan.buckets.find((b) => b.key === "investments")!.amount, 0);
});

test("full emergency fund routes everything to investments", () => {
  const plan = buildSalaryPlan({ income: 100000, essentialExpenses: 40000, age: 35, emergencyFund: 300000 });
  assert.equal(plan.buckets.find((b) => b.key === "emergency")!.amount, 0);
});

test("SIP future value matches closed form", () => {
  const { value, invested } = projectSip({ monthly: 10000, annualReturn: 12, years: 10 });
  assert.equal(invested, 1200000);
  const r = Math.pow(1.12, 1 / 12) - 1;
  const n = 120;
  const fv = 10000 * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  assert.ok(Math.abs(value - fv) < 2);
});

test("requiredSip inverts projectSip", () => {
  const sip = requiredSip(5_000_000, 10, 15);
  const { value } = projectSip({ monthly: sip, annualReturn: 10, years: 15 });
  assert.ok(Math.abs(value - 5_000_000) < 10);
});

test("corpus equals expense × years when return == inflation", () => {
  assert.equal(corpusNeeded(600000, 25, 6, 6), 15_000_000);
});

test("retirement plan is consistent", () => {
  const r = planRetirement({ age: 30, retirementAge: 60, lifeExpectancy: 85, currentSavings: 500000, monthlyExpenseToday: 50000, monthlyContribution: 15000, inflation: 6, preReturn: 10, postReturn: 7 });
  assert.equal(r.yearsToRetire, 30);
  assert.ok(r.monthlyExpenseAtRetirement > 280000 && r.monthlyExpenseAtRetirement < 290000);
  const check = projectSip({ monthly: r.requiredMonthly, annualReturn: 10, years: 30, lumpSum: 500000 }).value;
  assert.ok(Math.abs(check - r.corpusRequired) / r.corpusRequired < 0.001);
});

test("portfolio respects PPF cap and sums to investable amount", () => {
  const recs = recommendPortfolio({ retirementMonthly: 40000, wealthMonthly: 30000, age: 30, risk: "moderate", assumptions: DEFAULT_ASSUMPTIONS });
  const ppf = recs.find((r) => r.id === "ppf")!;
  assert.ok(ppf.monthly <= 12500);
  const total = recs.reduce((s, r) => s + r.monthly, 0);
  assert.ok(Math.abs(total - 70000) <= 500);
});

test("insights flag overspending", () => {
  const ins = spendingInsights([{ id: "shopping", name: "Shopping", amount: 20000, essential: false, icon: "bag" }], 100000);
  assert.equal(ins[0].saving, 12000);
});

test("Indian compact formatting", () => {
  assert.equal(formatMoney(150000, "IN", { compact: true }), "₹1.5 L");
  assert.equal(formatMoney(25000000, "IN", { compact: true }), "₹2.5 Cr");
});

test("retirement need raises retirement share, capped at 60% of investments", () => {
  const base = buildSalaryPlan({ income: 100000, essentialExpenses: 50000, age: 29, emergencyFund: 300000 });
  const raised = buildSalaryPlan({ income: 100000, essentialExpenses: 50000, age: 29, emergencyFund: 300000, retirementNeed: 1e6 });
  const inv = raised.buckets.find((b) => b.key === "investments")!.amount;
  assert.ok(raised.retirement > base.retirement);
  assert.ok(raised.retirement <= Math.round(inv * 0.6 / 100) * 100);
});
