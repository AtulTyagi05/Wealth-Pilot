"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, Cloud, CloudOff, Loader2, LogIn } from "lucide-react";
import { useAccountSync } from "./SyncManager";
import { useSession } from "@/store/useSession";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/components/ui";
import { NAV } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Onboarding } from "@/components/onboarding/Onboarding";

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useFinanceStore.persist.onFinishHydration(() => setHydrated(true));
    if (useFinanceStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const onboarded = useFinanceStore((s) => s.onboarded);
  const name = useFinanceStore((s) => s.profile.name);
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useAccountSync();
  const session = useSession();

  if (pathname === "/login" || pathname === "/register") return <>{children}</>;

  if (!hydrated || session.status === "loading" || (session.status === "user" && session.sync === "loading")) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  if (!onboarded) return <Onboarding />;

  const current = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));

  const navList = (
    <nav className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = current?.href === href;
        return (
          <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-brand-soft text-brand-strong" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
            <Icon className="size-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Logo className="mb-8 px-2" />
        {navList}
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
          <div className="text-sm font-semibold text-ink">Your data stays private</div>
          <p className="mt-1 text-xs text-ink-2">{session.status === "user" ? "Encrypted and saved to your account." : "Stored only on this device. Log in to back it up securely."}</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-xl text-ink-2"><X className="size-5" /></button>
            </div>
            {navList}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6 lg:px-8">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-xl border border-line bg-surface text-ink-2 lg:hidden"><Menu className="size-4" /></button>
        <div className="lg:hidden"><Logo /></div>
        <div className="hidden text-sm text-ink-2 lg:block">
          {greeting()}{name ? `, ${name}` : ""} 👋
        </div>
        <div className="ml-auto flex items-center gap-2">
          {session.status === "user" && <SyncBadge />}
          {session.status === "guest" && (
            <Link href="/login" className="hidden h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-2 hover:text-ink sm:inline-flex"><LogIn className="size-4" /> Log in to save</Link>
          )}
          <ThemeToggle />
          <Link href="/profile" className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white" aria-label="Profile">
            {(name || "U").charAt(0).toUpperCase()}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => n.mobile).map(({ href, label, icon: Icon }) => {
          const active = current?.href === href;
          return (
            <Link key={href} href={href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-brand-strong" : "text-muted")}>
              <Icon className="size-5" />
              {label.replace("Salary ", "").replace("AI ", "")}
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted">
          <Menu className="size-5" /> More
        </button>
      </nav>
    </div>
  );
}

function SyncBadge() {
  const sync = useSession((s) => s.sync);
  const msg = useSession((s) => s.syncMessage);
  const map = {
    saving: { icon: Loader2, text: "Saving…", cls: "text-ink-2", spin: true },
    saved: { icon: Cloud, text: "Saved", cls: "text-good", spin: false },
    idle: { icon: Cloud, text: "Synced", cls: "text-good", spin: false },
    loading: { icon: Loader2, text: "Loading…", cls: "text-ink-2", spin: true },
    offline: { icon: CloudOff, text: "Offline", cls: "text-warn", spin: false },
    error: { icon: CloudOff, text: "Not saved", cls: "text-bad", spin: false },
  }[sync];
  const Icon = map.icon;
  return (
    <span title={msg ?? (sync === "saved" ? "All changes saved to your account" : map.text)} role="status" className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-xs font-medium", map.cls)}>
      <Icon className={cn("size-4", map.spin && "animate-spin")} /> <span className="hidden sm:inline">{map.text}</span>
    </span>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
