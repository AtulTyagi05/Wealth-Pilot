"use client";
import { useEffect, useRef } from "react";
import { accountApi, ApiError } from "@/lib/api/account";
import type { SyncedState } from "@/lib/stateSchema";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useSession } from "@/store/useSession";
import { STANDALONE } from "@/lib/runtime";

const pick = (s: ReturnType<typeof useFinanceStore.getState>): SyncedState => ({
  onboarded: s.onboarded,
  profile: s.profile as SyncedState["profile"], // validated server-side
  expenses: s.expenses,
  assumptions: s.assumptions,
  history: s.history,
});

/** Stops the active sync loop without saving (used before wiping local data on sign-out). */
let stopSync: (() => void) | null = null;

/** Loads the signed-in user's data from the server, then saves local changes back (debounced). */
export function useAccountSync() {
  const status = useSession((s) => s.status);
  const userId = useSession((s) => s.user?.id);
  const applyingRemote = useRef(false);

  // 1. Resolve who is logged in.
  useEffect(() => {
    if (STANDALONE) { useSession.getState().set({ status: "disabled", user: null }); return; }
    accountApi.me()
      .then((r) => useSession.getState().set({ status: !r.accounts ? "disabled" : r.user ? "user" : "guest", user: r.user }))
      .catch(() => useSession.getState().set({ status: "disabled", user: null, sync: "offline" }));
  }, []);

  // 2. When a user is present, pull their data and keep it in sync.
  useEffect(() => {
    if (status !== "user" || !userId) return;
    const session = useSession.getState();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let pending = false;
    let cancelled = false;

    const adopt = (version: number, data: SyncedState) => {
      applyingRemote.current = true;
      useFinanceStore.getState().replaceSynced(data);
      applyingRemote.current = false;
      session.set({ version });
    };

    const save = async (keepalive = false) => {
      if (inFlight) { pending = true; return; }
      inFlight = true;
      session.set({ sync: "saving", syncMessage: null });
      try {
        const { version } = await accountApi.putData(useSession.getState().version, pick(useFinanceStore.getState()), keepalive);
        session.set({ version, sync: "saved" });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const latest = (e.body as { latest?: { version: number; data: SyncedState } })?.latest;
          if (latest) adopt(latest.version, latest.data);
          session.set({ sync: "saved", syncMessage: "Your data was updated on another device, so we loaded the latest version." });
        } else if (e instanceof ApiError && e.status === 401) {
          session.set({ status: "guest", user: null, sync: "error", syncMessage: "Your session expired. Log in again to keep saving." });
        } else {
          session.set({ sync: e instanceof ApiError && e.status === 0 ? "offline" : "error", syncMessage: (e as Error).message });
          pending = true; // retry on the next change or when back online
        }
      } finally {
        inFlight = false;
        if (pending && !cancelled) { pending = false; schedule(); }
      }
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void save(); }, 1200);
    };

    session.set({ sync: "loading" });
    accountApi.getData().then(async (remote) => {
      if (cancelled) return;
      if (remote.data) adopt(remote.version, remote.data);
      else {
        // First login for this account: upload whatever this device has (e.g. guest data).
        session.set({ version: 0 });
        if (useFinanceStore.getState().onboarded) await save();
      }
      if (!cancelled) session.set({ sync: "saved" });
    }).catch((e) => session.set({ sync: "error", syncMessage: (e as Error).message }));

    const unsub = useFinanceStore.subscribe((state, prev) => {
      if (applyingRemote.current) return;
      if (state.profile !== prev.profile || state.expenses !== prev.expenses || state.assumptions !== prev.assumptions || state.history !== prev.history || state.onboarded !== prev.onboarded) schedule();
    });
    const flush = () => { if (timer && !cancelled) { clearTimeout(timer); timer = null; void save(true); } };
    stopSync = () => { cancelled = true; if (timer) clearTimeout(timer); timer = null; unsub(); };
    const online = () => { if (useSession.getState().sync === "offline") schedule(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", online);
    return () => {
      flush();
      cancelled = true;
      unsub();
      stopSync = null;
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", online);
    };
  }, [status, userId]);
}

/** Signs out, then wipes this device's copy of the data (it remains safely in the account). */
export async function signOut() {
  stopSync?.();
  try { await accountApi.logout(); } catch { /* still clear locally */ }
  useFinanceStore.getState().resetAll();
  useSession.getState().set({ status: "guest", user: null, version: 0, sync: "idle", syncMessage: null });
}
