import { LayoutDashboard, Wallet, Receipt, TrendingUp, Palmtree, Sparkles, FileBarChart, UserRound } from "lucide-react";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/planner", label: "Salary Planner", icon: Wallet, mobile: true },
  { href: "/expenses", label: "Expenses", icon: Receipt, mobile: true },
  { href: "/investments", label: "Investments", icon: TrendingUp, mobile: false },
  { href: "/retirement", label: "Retirement", icon: Palmtree, mobile: false },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, mobile: true },
  { href: "/reports", label: "Reports", icon: FileBarChart, mobile: false },
  { href: "/profile", label: "Profile", icon: UserRound, mobile: false },
];
