"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Assumptions, ExpenseCategory, MonthlySnapshot, Profile } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/finance/investments";
import { DEFAULT_EXPENSES, DEMO_EXPENSES, DEMO_PROFILE, EMPTY_PROFILE } from "./defaults";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Which engine produced an assistant reply. */
  source?: "ai" | "local";
}

interface FinanceState {
  onboarded: boolean;
  profile: Profile;
  expenses: ExpenseCategory[];
  assumptions: Assumptions;
  history: MonthlySnapshot[];
  chat: ChatMessage[];
  setProfile: (p: Partial<Profile>) => void;
  completeOnboarding: () => void;
  upsertExpense: (e: ExpenseCategory) => void;
  removeExpense: (id: string) => void;
  setAssumptions: (a: Partial<Assumptions>) => void;
  resetAssumptions: () => void;
  saveSnapshot: (s: MonthlySnapshot) => void;
  addChat: (m: ChatMessage) => void;
  clearChat: () => void;
  loadDemo: () => void;
  replaceSynced: (d: { onboarded: boolean; profile: Profile; expenses: ExpenseCategory[]; assumptions: Assumptions; history: MonthlySnapshot[] }) => void;
  resetAll: () => void;
}

function demoHistory(): MonthlySnapshot[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    const income = 105000;
    const expenses = 74000 + Math.round(Math.sin(i * 1.7) * 5000) - i * 600;
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      income,
      expenses,
      savings: income - expenses,
      invested: 18000 + i * 800,
      netWorth: 600000 + i * 26000,
    };
  });
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      onboarded: false,
      profile: EMPTY_PROFILE,
      expenses: DEFAULT_EXPENSES,
      assumptions: DEFAULT_ASSUMPTIONS,
      history: [],
      chat: [],
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      completeOnboarding: () => set({ onboarded: true }),
      upsertExpense: (e) =>
        set((s) => {
          const exists = s.expenses.some((x) => x.id === e.id);
          return { expenses: exists ? s.expenses.map((x) => (x.id === e.id ? e : x)) : [...s.expenses, e] };
        }),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
      setAssumptions: (a) => set((s) => ({ assumptions: { ...s.assumptions, ...a } })),
      resetAssumptions: () => set({ assumptions: DEFAULT_ASSUMPTIONS }),
      saveSnapshot: (snap) =>
        set((s) => ({ history: [...s.history.filter((h) => h.month !== snap.month), snap].sort((a, b) => a.month.localeCompare(b.month)) })),
      addChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-100) })),
      clearChat: () => set({ chat: [] }),
      loadDemo: () => set({ onboarded: true, profile: DEMO_PROFILE, expenses: DEMO_EXPENSES, history: demoHistory(), chat: [] }),
      replaceSynced: (d) => set({ onboarded: d.onboarded, profile: { ...EMPTY_PROFILE, ...d.profile }, expenses: d.expenses, assumptions: { ...DEFAULT_ASSUMPTIONS, ...d.assumptions }, history: d.history }),
      resetAll: () => set({ onboarded: false, profile: EMPTY_PROFILE, expenses: DEFAULT_EXPENSES, assumptions: DEFAULT_ASSUMPTIONS, history: [], chat: [] }),
    }),
    { name: "wealth-pilot-v1", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
