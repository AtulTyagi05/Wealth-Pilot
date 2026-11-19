import { z } from "zod";

/**
 * Wire format between the browser and /api/assistant.
 * The browser sends the raw planning inputs (never the user's name); the server recomputes
 * every number with the same finance engine, so the model never has to do arithmetic itself.
 */
const money = z.number().finite().min(0).max(1e11);
const pctN = z.number().finite().min(0).max(100);
const label = z.string().trim().max(60);

export const profileSchema = z.object({
  age: z.number().int().min(18).max(100),
  country: z.literal("IN"),
  currency: z.literal("INR"),
  monthlySalary: money,
  annualSalary: money,
  additionalIncome: z.array(z.object({ id: label, label, amount: money })).max(20),
  bankSavings: money,
  investments: money,
  retirementSavings: money,
  emergencyFund: money,
  liabilities: z.array(z.object({ id: label, name: label, outstanding: money, emi: money, rate: pctN })).max(20),
  retirementAge: z.number().int().min(30).max(100),
  lifeExpectancy: z.number().int().min(50).max(110),
  postRetirementMonthlyExpense: money,
  goals: z.array(z.object({
    id: label, name: label,
    type: z.enum(["house", "education", "travel", "retirement", "vehicle", "wedding", "other"]),
    targetAmount: money, years: z.number().min(0).max(80), saved: money,
  })).max(30),
  risk: z.enum(["low", "moderate", "high"]),
  hasHealthInsurance: z.boolean(),
  hasTermInsurance: z.boolean(),
});

export const expensesSchema = z.array(z.object({ id: label, name: label, amount: money, essential: z.boolean(), icon: label })).max(50);

export const assumptionsSchema = z.object({
  inflation: pctN, equityReturn: pctN, indexReturn: pctN, debtReturn: pctN, ppfReturn: pctN,
  epfReturn: pctN, npsReturn: pctN, fdReturn: pctN, goldReturn: pctN, postRetirementReturn: pctN,
});

export const assistantRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(4000) })).min(1).max(30),
  profile: profileSchema,
  expenses: expensesSchema,
  assumptions: assumptionsSchema,
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

/** Newline-delimited JSON events streamed back to the browser. */
export type AssistantEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "error"; code: "not_configured" | "unauthenticated" | "rate_limited" | "invalid_request" | "refused" | "upstream"; message: string };
