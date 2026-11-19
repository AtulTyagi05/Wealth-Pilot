import type { Assumptions, Profile } from "../types.ts";
import type { Overview } from "../finance/overview.ts";
import { formatMoney } from "../finance/format.ts";
import { projectSip } from "../finance/sip.ts";
import { recommendPortfolio, blendedReturn } from "../finance/investments.ts";
import { retirementShare } from "../finance/budget.ts";

export interface AssistantContext {
  profile: Profile;
  overview: Overview;
  assumptions: Assumptions;
}

/**
 * Provider interface. Phase 4 adds an LLM-backed provider (server route) that receives the same
 * context; the local provider below answers common questions deterministically with real numbers.
 */
export interface AssistantProvider {
  answer(question: string, ctx: AssistantContext): Promise<string>;
}

/** Parses "₹10,000", "10k", "1.5 lakh", "2L", "1 crore" → number. */
export function parseAmount(text: string): number | null {
  const m = text.toLowerCase().replace(/,/g, "").match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|l|lakh|lakhs|lac|cr|crore|crores)?\b/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2] ?? "";
  const mult = unit.startsWith("k") || unit === "thousand" ? 1e3 : unit.startsWith("l") ? 1e5 : unit.startsWith("c") ? 1e7 : 1;
  return n * mult;
}

const years = (t: string) => { const m = t.match(/(\d+)\s*(years?|yrs?)/i); return m ? parseInt(m[1], 10) : null; };

export const localProvider: AssistantProvider = {
  async answer(q, ctx) {
    return localAnswer(q, ctx);
  },
};

export function localAnswer(q: string, { profile, overview: o, assumptions }: AssistantContext): string {
  const t = q.toLowerCase();
  const M = (v: number) => formatMoney(v, profile.country);
  const C = (v: number) => formatMoney(v, profile.country, { compact: true });
  const b = Object.fromEntries(o.plan.buckets.map((x) => [x.key, x.amount]));

  // Increase SIP
  if (/(increase|raise|add|top.?up|boost).*(sip|investment)|sip.*(increase|by)/.test(t)) {
    const extra = parseAmount(t.replace(/\d+\s*(years?|yrs?)/g, "")) ?? 2000;
    const y = years(t) ?? 15;
    const base = o.investBucket || 10000;
    const r = blendedReturn(o.portfolio) || 11;
    const a = projectSip({ monthly: base, annualReturn: r, years: y });
    const c = projectSip({ monthly: base + extra, annualReturn: r, years: y });
    return `If you increase your monthly investment from **${M(base)}** to **${M(base + extra)}** (+${M(extra)}):\n\n- In ${y} years you'd invest ${C(c.invested - a.invested)} more\n- Your estimated wealth could grow from **${C(a.value)}** to **${C(c.value)}** — about **${C(c.value - a.value)} extra**\n\nThat's the power of compounding: small increases now make a big difference later. (Assumes ${r.toFixed(1)}% yearly return — actual returns will vary.)`;
  }

  // Invest X per month
  if (/how.*(invest|allocate|put)|where.*invest|invest\s*(₹|rs|\d)/.test(t)) {
    const amt = parseAmount(t) ?? o.investBucket;
    if (!amt) return "You don't have an investable surplus yet. Let's first reduce expenses — ask me \"How can I reduce my expenses?\"";
    const ret = amt * retirementShare(profile.age);
    const recs = recommendPortfolio({ retirementMonthly: ret, wealthMonthly: amt - ret, age: profile.age, risk: profile.risk, assumptions });
    return `Here's a simple way to invest **${M(amt)} every month** for your ${profile.risk} risk profile:\n\n${recs.map((r) => `- **${M(r.monthly)}** → ${r.name} _(${r.risk} risk)_`).join("\n")}\n\n**Why:** about ${Math.round(retirementShare(profile.age) * 100)}% goes to retirement products (tax-efficient, long-term), and the rest to diversified funds for goals. Index funds are low-cost and spread your money across top companies; PPF and EPF add guaranteed stability; gold protects when markets fall.\n\nStart SIPs on the day after your salary arrives so investing happens automatically.`;
  }

  // Wealth in N years
  if (/(wealth|build|grow|accumulate|corpus|how much).*\d+\s*(years?|yrs?)/.test(t)) {
    const y = years(t) ?? 15;
    const amt = /invest(ing)?\s*(₹|rs|\d)/.test(t) ? parseAmount(t.replace(/\d+\s*(years?|yrs?)/g, "")) ?? o.investBucket : o.investBucket;
    const r = blendedReturn(o.portfolio) || 11;
    const flat = projectSip({ monthly: amt, annualReturn: r, years: y });
    const step = projectSip({ monthly: amt, annualReturn: r, years: y, stepUp: 10 });
    return `Investing **${M(amt)}/month** for **${y} years** at an assumed ${r.toFixed(1)}% yearly return:\n\n- You invest: ${C(flat.invested)}\n- Estimated value: **${C(flat.value)}**\n- If you increase your SIP by 10% every year: **${C(step.value)}**\n\nIn today's money (after ${assumptions.inflation}% inflation), ${C(flat.value)} is worth about ${C(flat.value / Math.pow(1 + assumptions.inflation / 100, y))}. These are estimates, not guarantees.`;
  }

  // Retirement
  if (/retire|retirement|pension/.test(t)) {
    const r = o.retirement;
    return `To retire at **${profile.retirementAge}** with expenses of ${M(o.retirementExpense)}/month in today's money:\n\n- Those expenses will be about **${M(r.monthlyExpenseAtRetirement)}/month** by then (inflation ${assumptions.inflation}%)\n- You'll need a corpus of about **${C(r.corpusRequired)}** to last until ${profile.lifeExpectancy}\n- You need to invest about **${M(r.requiredMonthly)}/month** (assuming 10% returns) — you're currently set to invest ${M(o.plan.retirement)}\n- You're **${r.onTrackPct.toFixed(0)}% on track**\n\n${r.shortfall > 0 ? `Tip: increasing your retirement SIP by 10% each year with salary hikes can close much of the gap.` : "Great — keep investing consistently!"} Open the Retirement page to try different scenarios.`;
  }

  // Reduce / overspending
  if (/reduce|cut|overspend|spending too much|unnecessary|save more|wast/.test(t)) {
    if (o.expenses.total === 0) return "Add your monthly expenses on the Expenses page first, and I'll show you exactly where you can cut back.";
    if (!o.insights.length) return `Good news — your spending looks healthy compared to typical benchmarks. You spend ${M(o.expenses.total)} (${((o.expenses.total / Math.max(o.income, 1)) * 100).toFixed(0)}% of income). To save even more:\n\n- Review subscriptions every 3 months\n- Use a 48-hour rule before non-essential purchases\n- Automate investments on salary day so you "pay yourself first"`;
    const total = o.insights.reduce((s, i) => s + i.saving, 0);
    return `Yes, a few categories are higher than recommended for your income:\n\n${o.insights.map((i) => `- **${i.category}:** ${M(i.current)} → aim for ${M(i.suggested)} (save ${M(i.saving)}). ${i.tip}`).join("\n")}\n\nTogether that's about **${M(total)}/month** or **${C(total * 12)}/year** you could redirect to investments.`;
  }

  // Emergency fund
  if (/emergency/.test(t)) {
    return `Your emergency fund target is **${C(o.plan.emergencyTarget)}** (6 months of essential expenses). You have ${C(profile.emergencyFund)} — that covers **${o.emergencyMonths.toFixed(1)} months**.\n\n${b.emergency > 0 ? `Put **${M(b.emergency)}/month** into a separate savings account, sweep FD or liquid fund until it's full (~${o.plan.emergencyMonthsToGoal} months).` : "It's fully funded — well done! Keep it in a liquid, safe place."}`;
  }

  // Health score
  if (/health|score|how am i doing|doing financially/.test(t)) {
    const weak = o.health.factors.filter((f) => f.score / f.max < 0.6);
    return `Your financial health score is **${o.health.score}/100 (${o.health.grade})**.\n\n${weak.length ? `Areas to improve:\n${weak.map((f) => `- **${f.label}:** ${f.hint}`).join("\n")}` : "All areas look strong. Keep it up!"}`;
  }

  // Save how much / divide salary
  if (/save|divide|split|salary|budget|allocate/.test(t)) {
    const amt = parseAmount(t);
    const note = amt && Math.abs(amt - o.income) > 1 ? `\n\n_(Tip: try any amount on the Salary Planner page — this answer uses your profile income of ${M(o.income)}.)_` : "";
    return `With **${M(o.income)}** monthly income, here's your plan:\n\n- **${M(b.expenses)}** for essential expenses\n- **${M(b.emergency)}** to your emergency fund\n- **${M(b.investments)}** to investments (incl. **${M(o.plan.retirement)}** for retirement)\n- **${M(b.disposable)}** for guilt-free spending\n\nSo you should **save and invest about ${M(b.emergency + b.investments)} (${(((b.emergency + b.investments) / Math.max(o.income, 1)) * 100).toFixed(0)}%) every month**. A good rule: save first, then spend what's left.${note}`;
  }

  if (/sip|mutual fund|index fund/.test(t)) {
    return "A **SIP (Systematic Investment Plan)** invests a fixed amount in a mutual fund every month. It builds discipline and averages your purchase cost over market ups and downs. **Index funds** simply copy an index like the Nifty 50 — low cost and well diversified, great for beginners. Equity funds are best for goals 7+ years away.";
  }
  if (/ppf/.test(t)) return "**PPF** is a government-backed savings scheme with a 15-year lock-in, currently ~7.1% interest, and fully tax-free returns (EEE). You can invest up to ₹1.5 lakh per year. It's ideal for the safe portion of long-term savings.";
  if (/nps/.test(t)) return "**NPS** is a low-cost pension scheme investing in equity and debt until age 60. It offers an extra ₹50,000 deduction (old regime) and employer contributions are deductible in both regimes. At exit, part of the corpus must buy an annuity under PFRDA rules.";

  return `I can help with questions like:\n\n- How much should I save every month?\n- Am I spending too much on unnecessary expenses?\n- How can I invest ₹10,000 every month?\n- How much wealth can I build in 15 years?\n- How much do I need to retire comfortably?\n- What happens if I increase my SIP by ₹2,000?\n- How is my financial health?`;
}
