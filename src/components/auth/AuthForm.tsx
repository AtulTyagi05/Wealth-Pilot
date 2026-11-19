"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { accountApi, ApiError } from "@/lib/api/account";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useSession } from "@/store/useSession";
import { Button, Callout, Card, cn } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const inputCls = "h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-bad";

export function passwordStrength(p: string) {
  let score = 0;
  if (p.length >= 10) score++;
  if (p.length >= 14) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return { score, label: ["Too short", "Weak", "Fair", "Good", "Strong", "Very strong"][score], ok: p.length >= 10 && new Set(p).size >= 4 };
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const setSession = useSession((s) => s.set);
  const status = useSession((s) => s.status);
  const hasLocalData = useFinanceStore((s) => s.onboarded);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";
  const strength = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (isRegister) {
      if (!strength.ok) return setError("Use a password of at least 10 characters.");
      if (password !== confirm) return setError("The passwords don't match.");
    } else if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      const { user } = isRegister ? await accountApi.register(email, password) : await accountApi.login(email, password);
      setSession({ status: "user", user, sync: "loading", syncMessage: null });
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Wealth Pilot home"><Logo /></Link>
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-ink-2">{isRegister ? "Save your plan securely and use it on any device." : "Log in to see your plan."}</p>

          {status === "disabled" && <div className="mt-4"><Callout tone="warn">Accounts aren&apos;t enabled on this server. You can keep using Wealth Pilot on this device.</Callout></div>}
          {isRegister && hasLocalData && <div className="mt-4"><Callout tone="good">The plan already on this device will be saved to your new account.</Callout></div>}
          {!isRegister && hasLocalData && <div className="mt-4"><Callout>If your account already has a saved plan, it will replace the one on this device.</Callout></div>}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-ink">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input id="email" type="email" autoComplete="email" inputMode="email" className={inputCls} value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-ink">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input id="password" type={show ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} className={cn(inputCls, "pr-11")} value={password} maxLength={128} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {isRegister && password && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i < strength.score ? (strength.score >= 4 ? "bg-good" : strength.score >= 2 ? "bg-warn" : "bg-bad") : "bg-line")} />)}</div>
                  <span className="text-xs text-muted">{strength.label}</span>
                </div>
              )}
              {isRegister && <p className="text-xs text-muted">At least 10 characters. A short phrase is easy to remember and hard to guess.</p>}
            </div>
            {isRegister && (
              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block text-[13px] font-medium text-ink">Confirm password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input id="confirm" type={show ? "text" : "password"} autoComplete="new-password" className={inputCls} value={confirm} maxLength={128} aria-invalid={!!confirm && confirm !== password} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={busy || status === "disabled"}>{busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}</Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-2">
            {isRegister ? <>Already have an account? <Link href="/login" className="font-medium text-brand-strong hover:underline">Log in</Link></> : <>New to Wealth Pilot? <Link href="/register" className="font-medium text-brand-strong hover:underline">Create an account</Link></>}
          </p>
        </Card>
        <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs text-muted"><ShieldCheck className="size-4 shrink-0" /> Your financial data is encrypted before it&apos;s stored. We never sell or share it.</p>
        <p className="mt-2 text-center text-xs"><Link href="/" className="text-ink-2 hover:underline">Continue without an account</Link></p>
      </div>
    </div>
  );
}
