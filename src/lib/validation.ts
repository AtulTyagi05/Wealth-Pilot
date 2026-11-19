import type { Profile } from "./types";

/** Returns human-readable validation errors for an onboarding step (empty = valid). */
export function validateStep(step: number, p: Profile): string[] {
  const e: string[] = [];
  if (step === 0) {
    if (!p.name.trim()) e.push("Enter your name.");
    if (!(p.age >= 18 && p.age <= 80)) e.push("Age must be between 18 and 80.");
  }
  if (step === 1) {
    if (!(p.monthlySalary > 0)) e.push("Enter your monthly in-hand salary.");
    if (p.annualSalary > 0 && p.annualSalary < p.monthlySalary) e.push("Annual salary looks lower than one month's salary.");
    p.additionalIncome.forEach((i, idx) => { if (!i.label.trim()) e.push(`Name income source #${idx + 1}.`); });
  }
  if (step === 2) {
    p.liabilities.forEach((l, idx) => {
      if (!l.name.trim()) e.push(`Name loan #${idx + 1}.`);
      if (l.emi > l.outstanding && l.outstanding > 0) e.push(`Loan "${l.name || idx + 1}": EMI is larger than the outstanding amount.`);
    });
  }
  if (step === 3) {
    if (p.retirementAge <= p.age) e.push("Retirement age must be greater than your current age.");
    if (p.lifeExpectancy <= p.retirementAge) e.push("Planning age must be greater than retirement age.");
    p.goals.forEach((g, idx) => { if (!g.name.trim()) e.push(`Name goal #${idx + 1}.`); });
  }
  return e;
}

export function validateProfile(p: Profile) {
  return [0, 1, 2, 3].flatMap((s) => validateStep(s, p));
}
