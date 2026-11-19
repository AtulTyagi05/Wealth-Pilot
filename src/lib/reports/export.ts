"use client";
import type { MonthlySnapshot, Profile } from "@/lib/types";
import type { Overview } from "@/lib/finance/overview";

export interface ReportData {
  title: string;
  periodLabel: string;
  profile: Profile;
  overview: Overview;
  rows: MonthlySnapshot[];
}

const inr = (v: number) => `Rs ${Math.round(v).toLocaleString("en-IN")}`; // jsPDF core fonts lack the ₹ glyph
const DISCLAIMER = "Educational estimates only - not investment, tax or legal advice. Projections use assumed returns and are not guaranteed. Market-linked investments are subject to market risk.";

function totals(rows: MonthlySnapshot[]) {
  return rows.reduce((t, r) => ({ income: t.income + r.income, expenses: t.expenses + r.expenses, savings: t.savings + r.savings, invested: t.invested + r.invested }), { income: 0, expenses: 0, savings: 0, invested: 0 });
}

export async function exportPdf(d: ReportData) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const green: [number, number, number] = [14, 159, 110];
  doc.setFillColor(...green);
  doc.rect(0, 0, 595, 70, "F");
  doc.setTextColor(255);
  doc.setFontSize(20).setFont("helvetica", "bold").text("Wealth Pilot", 40, 38);
  doc.setFontSize(11).setFont("helvetica", "normal").text(`${d.title} - ${d.periodLabel}`, 40, 56);
  doc.setTextColor(30);
  doc.setFontSize(10).text(`Prepared for ${d.profile.name || "you"} on ${new Date().toLocaleDateString("en-IN")}`, 40, 92);

  const o = d.overview;
  const t = totals(d.rows);
  const tableOpts = { theme: "grid" as const, headStyles: { fillColor: green }, styles: { fontSize: 9 }, margin: { left: 40, right: 40 } };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, { ...tableOpts, startY: 106, head: [["Summary", "Value"]], body: [
    ["Total income (period)", inr(t.income)], ["Total expenses (period)", inr(t.expenses)], ["Total savings (period)", inr(t.savings)],
    ["Investment contributions (period)", inr(t.invested)], ["Savings rate", t.income ? `${((t.savings / t.income) * 100).toFixed(1)}%` : "-"],
    ["Current net worth", inr(o.netWorth)], ["Financial health score", `${o.health.score}/100 (${o.health.grade})`],
  ] });
  autoTable(doc, { ...tableOpts, startY: lastY() + 16, head: [["Month", "Income", "Expenses", "Savings", "Invested", "Net worth"]], body: d.rows.map((r) => [r.month, inr(r.income), inr(r.expenses), inr(r.savings), inr(r.invested), inr(r.netWorth)]) });
  autoTable(doc, { ...tableOpts, startY: lastY() + 16, head: [["Recommended monthly split", "Amount", "% of income"]], body: o.plan.buckets.map((b) => [b.label, inr(b.amount), `${b.percent.toFixed(0)}%`]) });
  autoTable(doc, { ...tableOpts, startY: lastY() + 16, head: [["Asset allocation (monthly plan)", "Asset class", "Amount", "Assumed return"]], body: o.portfolio.map((r) => [r.name, r.assetClass, inr(r.monthly), `${r.expectedReturn}%`]) });
  autoTable(doc, { ...tableOpts, startY: lastY() + 16, head: [["Goal", "Target", "Saved", "Progress"]], body: [
    ...d.profile.goals.map((g) => [g.name, inr(g.targetAmount), inr(g.saved), `${g.targetAmount ? ((g.saved / g.targetAmount) * 100).toFixed(0) : 0}%`]),
    ["Emergency fund", inr(o.plan.emergencyTarget), inr(d.profile.emergencyFund), `${o.plan.emergencyTarget ? Math.min(100, (d.profile.emergencyFund / o.plan.emergencyTarget) * 100).toFixed(0) : 100}%`],
    ["Retirement corpus (estimate)", inr(o.retirement.corpusRequired), inr(o.retirement.projectedWealth) + " projected", `${o.retirement.onTrackPct.toFixed(0)}%`],
  ] });
  doc.setFontSize(8).setTextColor(120);
  doc.text(doc.splitTextToSize(DISCLAIMER, 515), 40, Math.min(lastY() + 24, 800));
  doc.save(`wealth-pilot-${d.periodLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export async function exportExcel(d: ReportData) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const H = (v: string) => ({ value: v, fontWeight: "bold" as const });
  const o = d.overview;
  const t = totals(d.rows);
  const sheets = [
    { sheet: "Summary", data: [
      [H("Wealth Pilot report"), d.periodLabel],
      ["Prepared for", d.profile.name || "-"],
      ["Total income", t.income], ["Total expenses", t.expenses], ["Total savings", t.savings], ["Investment contributions", t.invested],
      ["Net worth", o.netWorth], ["Health score", o.health.score],
      [null, null], ["Disclaimer", DISCLAIMER],
    ] },
    { sheet: "Monthly", data: [[H("Month"), H("Income"), H("Expenses"), H("Savings"), H("Invested"), H("Net worth")], ...d.rows.map((r) => [r.month, r.income, r.expenses, r.savings, r.invested, r.netWorth])] },
    { sheet: "Expenses", data: [[H("Category"), H("Monthly amount"), H("Essential"), H("Share %")], ...o.expenses.breakdown.map((e) => [e.name, e.amount, e.essential ? "Yes" : "No", Math.round(e.share * 10) / 10])] },
    { sheet: "Allocation", data: [[H("Instrument"), H("Asset class"), H("Monthly"), H("Assumed return %"), H("Risk")], ...o.portfolio.map((r) => [r.name, r.assetClass, r.monthly, r.expectedReturn, r.risk])] },
    { sheet: "Goals", data: [[H("Goal"), H("Target"), H("Saved"), H("Years")], ...d.profile.goals.map((g) => [g.name, g.targetAmount, g.saved, g.years]), ["Retirement corpus (est.)", Math.round(o.retirement.corpusRequired), Math.round(o.retirement.projectedWealth), o.retirement.yearsToRetire]] },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (writeXlsxFile as any)(sheets).toFile(`wealth-pilot-${d.periodLabel.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}
