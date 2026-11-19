import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { usePathname } from "./shims/navigation";
import Dashboard from "@/app/page";
import Planner from "@/app/planner/page";
import Expenses from "@/app/expenses/page";
import Investments from "@/app/investments/page";
import Retirement from "@/app/retirement/page";
import Assistant from "@/app/assistant/page";
import Reports from "@/app/reports/page";
import Profile from "@/app/profile/page";

const ROUTES: Record<string, ComponentType> = {
  "/": Dashboard,
  "/planner": Planner,
  "/expenses": Expenses,
  "/investments": Investments,
  "/retirement": Retirement,
  "/assistant": Assistant,
  "/reports": Reports,
  "/profile": Profile,
};

function App() {
  const path = usePathname();
  const Page = ROUTES[path] ?? Dashboard;
  return <AppShell><Page /></AppShell>;
}

// Follow the viewer's theme: an explicit data-theme on the host wins, then the saved choice, then the OS.
function applyTheme() {
  const root = document.documentElement;
  const forced = root.getAttribute("data-theme");
  let saved: string | null = null;
  try { saved = localStorage.getItem("wp-theme"); } catch { /* storage blocked */ }
  const dark = forced ? forced === "dark" : saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", dark);
}
applyTheme();
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

createRoot(document.getElementById("root")!).render(<App />);
