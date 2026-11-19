export type RiskAppetite = "low" | "moderate" | "high";

export interface IncomeSource {
  id: string;
  label: string;
  /** Monthly amount */
  amount: number;
}

export interface Liability {
  id: string;
  name: string;
  outstanding: number;
  emi: number;
  /** Annual interest rate, % */
  rate: number;
}

export type GoalType = "house" | "education" | "travel" | "retirement" | "vehicle" | "wedding" | "other";

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  years: number;
  saved: number;
}

export interface Profile {
  name: string;
  age: number;
  country: string; // ISO code, e.g. "IN"
  currency: string; // ISO code, e.g. "INR"
  monthlySalary: number; // in-hand
  annualSalary: number; // CTC / gross annual
  additionalIncome: IncomeSource[];
  bankSavings: number;
  investments: number;
  retirementSavings: number; // EPF + PPF + NPS balances
  emergencyFund: number;
  liabilities: Liability[];
  retirementAge: number;
  lifeExpectancy: number;
  postRetirementMonthlyExpense: number; // in today's money; 0 = derive from current expenses
  goals: Goal[];
  risk: RiskAppetite;
  hasHealthInsurance: boolean;
  hasTermInsurance: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  essential: boolean;
  icon: string;
}

export interface Assumptions {
  inflation: number;
  equityReturn: number;
  indexReturn: number;
  debtReturn: number;
  ppfReturn: number;
  epfReturn: number;
  npsReturn: number;
  fdReturn: number;
  goldReturn: number;
  postRetirementReturn: number;
}

export interface MonthlySnapshot {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  savings: number;
  invested: number;
  netWorth: number;
}
