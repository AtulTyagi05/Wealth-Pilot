"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Sparkles, Trash2, Bot, Calculator, WifiOff, Square } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useOverview } from "@/store/useOverview";
import { localProvider } from "@/lib/assistant/engine";
import { AssistantUnavailable, askRemote, toolLabel } from "@/lib/assistant/remote";
import { Badge, Button, Card, PageHeader, cn } from "@/components/ui";
import { STANDALONE } from "@/lib/runtime";

const SUGGESTIONS = [
  "How much should I save every month?",
  "Am I spending too much on unnecessary expenses?",
  "How can I invest ₹10,000 every month?",
  "How much wealth can I build in 15 years?",
  "How much do I need to retire comfortably?",
  "What happens if I increase my SIP by ₹2,000?",
];

/** Minimal safe renderer for **bold**, _italic_ and "- " bullets (no HTML injection). */
function Rich({ text }: { text: string }) {
  const inline = (s: string, k: number) =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p, i) =>
      p.startsWith("**") ? <strong key={`${k}-${i}`} className="font-semibold text-ink">{p.slice(2, -2)}</strong> : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? <em key={`${k}-${i}`} className="text-muted">{p.slice(1, -1)}</em> : p,
    );
  return (
    <div className="space-y-2">
      {text.split("\n\n").map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={bi} className="list-disc space-y-1 pl-5">{lines.map((l, i) => <li key={i}>{inline(l.slice(2), i)}</li>)}</ul>;
        const [head, ...rest] = lines;
        if (rest.length && rest.every((l) => l.startsWith("- "))) return <div key={bi}><p>{inline(head, 0)}</p><ul className="mt-1 list-disc space-y-1 pl-5">{rest.map((l, i) => <li key={i}>{inline(l.slice(2), i + 1)}</li>)}</ul></div>;
        return <p key={bi}>{inline(block, bi)}</p>;
      })}
    </div>
  );
}

export default function AssistantPage() {
  const chat = useFinanceStore((s) => s.chat);
  const addChat = useFinanceStore((s) => s.addChat);
  const clearChat = useFinanceStore((s) => s.clearChat);
  const profile = useFinanceStore((s) => s.profile);
  const assumptions = useFinanceStore((s) => s.assumptions);
  const overview = useOverview();
  const expenses = useFinanceStore((s) => s.expenses);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const [tool, setTool] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(!STANDALONE);
  const [offlineReason, setOfflineReason] = useState<"not_configured" | "unauthenticated">("not_configured");
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, busy, live.length > 0]);

  const answerLocally = async (question: string) => {
    const answer = await localProvider.answer(question, { profile, overview, assumptions });
    addChat({ id: crypto.randomUUID(), role: "assistant", text: answer, source: "local" });
  };

  const ask = async (q: string) => {
    const question = q.trim().slice(0, 500);
    if (!question || busy) return;
    setInput("");
    const history = [...chat, { role: "user" as const, text: question }].map((m) => ({ role: m.role, text: m.text }));
    addChat({ id: crypto.randomUUID(), role: "user", text: question });
    setBusy(true); setLive(""); setTool(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let text = "";
    try {
      if (!aiAvailable) { await answerLocally(question); return; }
      await askRemote({
        history, profile, expenses, assumptions, signal: ctrl.signal,
        onText: (d) => { text += d; setLive(text); setTool(null); },
        onTool: (n) => setTool(n),
      });
      addChat({ id: crypto.randomUUID(), role: "assistant", text: text.trim() || "Sorry, I couldn't come up with an answer. Please try rephrasing.", source: "ai" });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (text.trim()) addChat({ id: crypto.randomUUID(), role: "assistant", text: text.trim() + "\n\n_(stopped)_", source: "ai" });
      } else if (e instanceof AssistantUnavailable) {
        setAiAvailable(false);
        setOfflineReason(e.message === "unauthenticated" ? "unauthenticated" : "not_configured");
        await answerLocally(question);
      } else {
        addChat({ id: crypto.randomUUID(), role: "assistant", text: `_${(e as Error).message}_`, source: "ai" });
      }
    } finally {
      setBusy(false); setLive(""); setTool(null); abortRef.current = null;
    }
  };

  return (
    <>
      <PageHeader title="AI Financial Assistant" subtitle="Ask anything about your money in plain language. Answers use your own numbers." action={<>
        {aiAvailable ? <Badge tone="brand"><Sparkles className="size-3" /> AI mode</Badge> : <Badge tone="warn"><WifiOff className="size-3" /> Offline mode</Badge>}
        {chat.length > 0 && <Button variant="ghost" size="sm" onClick={clearChat} disabled={busy}><Trash2 className="size-4" /> Clear chat</Button>}
      </>} />
      {!aiAvailable && (
        <p className="-mt-3 mb-4 text-xs text-ink-2">
          {offlineReason === "unauthenticated"
            ? <><Link href="/login" className="font-medium text-brand-strong hover:underline">Log in</Link> to chat with the AI assistant. Until then, answers come from the built-in calculator, using your real numbers.</>
            : STANDALONE
              ? "This shared version answers with the built-in calculator, using the numbers you've entered."
              : "The AI model isn't configured on this server, so answers come from the built-in calculator. They still use your real numbers."}
        </p>
      )}
      <Card className="flex h-[calc(100vh-15rem)] min-h-[480px] flex-col p-0 lg:h-[calc(100vh-13rem)]">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {chat.length === 0 && (
            <div className="mx-auto max-w-xl py-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><Sparkles className="size-7" /></span>
              <h2 className="mt-4 text-lg font-semibold text-ink">Hi{profile.name ? ` ${profile.name}` : ""}! How can I help with your money today?</h2>
              <p className="mt-1 text-sm text-ink-2">Try one of these:</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-xl border border-line bg-surface p-3 text-left text-sm text-ink-2 hover:border-brand hover:text-ink">{s}</button>)}
              </div>
            </div>
          )}
          {chat.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
              {m.role === "assistant" && <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong"><Bot className="size-4" /></span>}
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "bg-brand text-white dark:text-[#04120c]" : "bg-surface-2 text-ink-2")}>
                {m.role === "user" ? m.text : <Rich text={m.text} />}
                {m.role === "assistant" && m.source === "local" && <div className="mt-2 text-[11px] text-muted">Built-in calculator</div>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3" aria-live="polite">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong"><Bot className="size-4" /></span>
              <div className="max-w-[85%] space-y-2">
                {live && <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-2"><Rich text={live} /></div>}
                {tool ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-strong"><Calculator className="size-3.5 animate-pulse" /> {toolLabel(tool)}…</div>
                ) : !live && (
                  <div className="flex items-center gap-1 rounded-2xl bg-surface-2 px-4 py-3">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}</div>
                )}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-line p-3 sm:p-4">
          {chat.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.slice(0, 4).map((s) => <button key={s} onClick={() => ask(s)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:text-ink">{s}</button>)}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder="Ask about saving, investing, retirement…" aria-label="Your question" className="h-11 flex-1 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            {busy && aiAvailable ? (
              <Button type="button" variant="secondary" className="h-11" onClick={() => abortRef.current?.abort()} aria-label="Stop"><Square className="size-4" /></Button>
            ) : (
              <Button type="submit" className="h-11" disabled={!input.trim() || busy} aria-label="Send"><Send className="size-4" /></Button>
            )}
          </form>
          <p className="mt-2 text-[11px] text-muted">Educational guidance only — not regulated investment advice. Projections are estimates. {aiAvailable && "In AI mode your financial details (not your name) are sent to Anthropic's Claude to answer."}</p>
        </div>
      </Card>
    </>
  );
}
