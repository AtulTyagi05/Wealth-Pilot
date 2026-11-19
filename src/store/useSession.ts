"use client";
import { create } from "zustand";
import type { AccountUser } from "@/lib/api/account";

export type SessionStatus = "loading" | "disabled" | "guest" | "user";
export type SyncStatus = "idle" | "loading" | "saving" | "saved" | "offline" | "error";

interface SessionState {
  status: SessionStatus;
  user: AccountUser | null;
  sync: SyncStatus;
  syncMessage: string | null;
  /** Server version of the user's data that this device last saw. */
  version: number;
  set: (s: Partial<Omit<SessionState, "set">>) => void;
}

/** In-memory only: login state is derived from the httpOnly cookie via /api/auth/me. */
export const useSession = create<SessionState>()((set) => ({
  status: "loading",
  user: null,
  sync: "idle",
  syncMessage: null,
  version: 0,
  set: (s) => set(s),
}));
