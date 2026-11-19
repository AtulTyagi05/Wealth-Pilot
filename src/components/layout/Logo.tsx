export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 17l5-5 4 3 8-9" /><path d="M15 6h5v5" />
        </svg>
      </span>
      <span className="text-[17px] font-bold tracking-tight text-ink">Wealth<span className="text-brand">Pilot</span></span>
    </div>
  );
}
