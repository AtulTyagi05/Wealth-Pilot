import type { ExpenseCategory, Profile } from "@/lib/types";

export const DEFAULT_EXPENSES: ExpenseCategory[] = [
  { id: "rent", name: "House rent / Home loan", amount: 0, essential: true, icon: "home" },
  { id: "groceries", name: "Groceries", amount: 0, essential: true, icon: "cart" },
  { id: "utilities", name: "Electricity & utilities", amount: 0, essential: true, icon: "zap" },
  { id: "transport", name: "Transport & fuel", amount: 0, essential: true, icon: "car" },
  { id: "health", name: "Healthcare & insurance", amount: 0, essential: true, icon: "heart" },
  { id: "education", name: "Education", amount: 0, essential: true, icon: "book" },
  { id: "emi", name: "EMIs & loan repayments", amount: 0, essential: true, icon: "card" },
  { id: "shopping", name: "Shopping & entertainment", amount: 0, essential: false, icon: "bag" },
  { id: "travel", name: "Travel", amount: 0, essential: false, icon: "plane" },
  { id: "misc", name: "Miscellaneous", amount: 0, essential: false, icon: "dots" },
];

export const EMPTY_PROFILE: Profile = {
  name: "",
  age: 28,
  country: "IN",
  currency: "INR",
  monthlySalary: 0,
  annualSalary: 0,
  additionalIncome: [],
  bankSavings: 0,
  investments: 0,
  retirementSavings: 0,
  emergencyFund: 0,
  liabilities: [],
  retirementAge: 60,
  lifeExpectancy: 85,
  postRetirementMonthlyExpense: 0,
  goals: [],
  risk: "moderate",
  hasHealthInsurance: false,
  hasTermInsurance: false,
};

/** Sample persona: earns ₹1 lakh/month in-hand. */
export const DEMO_PROFILE: Profile = {
  ...EMPTY_PROFILE,
  name: "Aarav",
  age: 29,
  monthlySalary: 100000,
  annualSalary: 1500000,
  additionalIncome: [{ id: "inc-1", label: "Freelance", amount: 5000 }],
  bankSavings: 120000,
  investments: 350000,
  retirementSavings: 420000,
  emergencyFund: 150000,
  liabilities: [{ id: "loan-1", name: "Car loan", outstanding: 320000, emi: 9500, rate: 9.2 }],
  goals: [
    { id: "g-1", name: "Home down payment", type: "house", targetAmount: 2000000, years: 6, saved: 250000 },
    { id: "g-2", name: "Europe trip", type: "travel", targetAmount: 300000, years: 2, saved: 60000 },
  ],
  hasHealthInsurance: true,
};

export const DEMO_EXPENSES: ExpenseCategory[] = DEFAULT_EXPENSES.map((e) => ({
  ...e,
  amount: { rent: 25000, groceries: 9000, utilities: 3500, transport: 5000, health: 2500, education: 0, emi: 9500, shopping: 12000, travel: 4000, misc: 4500 }[e.id] ?? 0,
}));
