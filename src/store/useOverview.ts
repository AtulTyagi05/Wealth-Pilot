"use client";
import { useMemo } from "react";
import { computeOverview } from "@/lib/finance/overview";
import { formatMoney } from "@/lib/finance/format";
import { useFinanceStore } from "./useFinanceStore";

export function useOverview() {
  const profile = useFinanceStore((s) => s.profile);
  const expenses = useFinanceStore((s) => s.expenses);
  const assumptions = useFinanceStore((s) => s.assumptions);
  return useMemo(() => computeOverview(profile, expenses, assumptions), [profile, expenses, assumptions]);
}

export function useMoney() {
  const country = useFinanceStore((s) => s.profile.country);
  return useMemo(() => ({
    money: (v: number) => formatMoney(v, country),
    compact: (v: number) => formatMoney(v, country, { compact: true }),
  }), [country]);
}
