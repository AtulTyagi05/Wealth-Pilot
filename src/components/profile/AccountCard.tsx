"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, KeyRound, LogOut, ShieldCheck, Trash2, UserCircle2 } from "lucide-react";
import { accountApi, ApiError } from "@/lib/api/account";
import { useSession } from "@/store/useSession";
import { signOut } from "@/components/layout/SyncManager";
import { passwordStrength } from "@/components/auth/AuthForm";
import { Badge, Button, Callout, Card, CardHeader } from "@/components/ui";

const pwInput = "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function AccountCard() {
  const session = useSession();
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "password" | "delete">("none");

  if (session.status === "disabled") return null;

  if (session.status !== "user") {
    return (
      <Card className="mt-4">
        <CardHeader icon={UserCircle2} title="Account" subtitle="You're using Wealth Pilot without an account. Your data lives only in this browser." />
        <div className="flex flex-wrap gap-2">
          <Link href="/register"><Button>Create account</Button></Link>
          <Link href="/login"><Button variant="secondary">Log in</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader icon={UserCircle2} title="Account" subtitle={session.user?.email} action={<Badge tone="good"><ShieldCheck className="size-3" /> Encrypted sync on</Badge>} />
      {session.syncMessage && <div className="mb-3"><Callout tone={session.sync === "error" || session.sync === "offline" ? "warn" : "info"}>{session.syncMessage}</Callout></div>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPanel(panel === "password" ? "none" : "password")}><KeyRound className="size-4" /> Change password</Button>
        <a href="/api/account/export" download><Button variant="secondary"><Download className="size-4" /> Export my data</Button></a>
        <Button variant="secondary" onClick={async () => { await signOut(); router.push("/"); }}><LogOut className="size-4" /> Log out</Button>
        <Button variant="danger" onClick={() => setPanel(panel === "delete" ? "none" : "delete")}><Trash2 className="size-4" /> Delete account</Button>
      </div>
      {panel === "password" && <ChangePassword onDone={() => setPanel("none")} />}
      {panel === "delete" && <DeleteAccount onDone={() => router.push("/")} />}
      <p className="mt-4 text-xs text-muted">Logging out removes your plan from this browser; it stays safely in your account. A copy is kept in this browser while you&apos;re logged in, so log out on shared computers.</p>
    </Card>
  );
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ tone: "good" | "warn"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(next);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.ok) return setMsg({ tone: "warn", text: "Use a new password of at least 10 characters." });
    setBusy(true);
    try {
      await accountApi.changePassword(current, next);
      setMsg({ tone: "good", text: "Password changed. Other devices have been signed out." });
      setCurrent(""); setNext("");
      setTimeout(onDone, 2500);
    } catch (err) {
      setMsg({ tone: "warn", text: err instanceof ApiError ? err.message : "Couldn't change your password." });
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="space-y-1.5 text-[13px] font-medium text-ink">Current password<input type="password" autoComplete="current-password" className={pwInput} value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={128} /></label>
      <label className="space-y-1.5 text-[13px] font-medium text-ink">New password <span className="font-normal text-muted">({strength.label})</span><input type="password" autoComplete="new-password" className={pwInput} value={next} onChange={(e) => setNext(e.target.value)} maxLength={128} /></label>
      <Button type="submit" disabled={busy || !current || !next}>{busy ? "Saving…" : "Update"}</Button>
      {msg && <div className="sm:col-span-3"><Callout tone={msg.tone}>{msg.text}</Callout></div>}
    </form>
  );
}

function DeleteAccount({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await accountApi.deleteAccount(password);
      await signOut();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete your account.");
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-bad/40 bg-bad/5 p-4">
      <p className="text-sm text-ink-2"><strong className="text-ink">This permanently deletes your account and all saved financial data.</strong> It can&apos;t be undone. Export your data first if you want a copy.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1 space-y-1.5 text-[13px] font-medium text-ink">Confirm with your password<input type="password" autoComplete="current-password" className={pwInput} value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} /></label>
        <Button type="submit" variant="danger" disabled={busy || !password}>{busy ? "Deleting…" : "Delete forever"}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </form>
  );
}
