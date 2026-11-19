"use client";
import type { SyncedState } from "../stateSchema";

export interface AccountUser {
  id: string;
  email: string;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public body?: unknown) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "network", "You appear to be offline.");
  }
  const body = res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? "Something went wrong.", body);
  }
  return body as T;
}

const post = <T>(path: string, data?: unknown, method = "POST") => call<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });

export const accountApi = {
  me: () => call<{ accounts: boolean; user: AccountUser | null }>("/api/auth/me", { cache: "no-store" }),
  register: (email: string, password: string) => post<{ user: AccountUser }>("/api/auth/register", { email, password }),
  login: (email: string, password: string) => post<{ user: AccountUser }>("/api/auth/login", { email, password }),
  logout: () => post<{ ok: true }>("/api/auth/logout"),
  changePassword: (current: string, next: string) => post<{ ok: true }>("/api/auth/password", { current, next }),
  deleteAccount: (password: string) => post<{ ok: true }>("/api/account", { password }, "DELETE"),
  getData: () => call<{ version: number; updatedAt: string | null; data: SyncedState | null }>("/api/data", { cache: "no-store" }),
  putData: (baseVersion: number, data: SyncedState, keepalive = false) =>
    call<{ version: number }>("/api/data", { method: "PUT", body: JSON.stringify({ baseVersion, data }), keepalive }),
};
