import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Swords,
  Ticket,
  Trophy,
  Users,
  ShieldCheck,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matchups", label: "Matchups", icon: Swords },
  { href: "/bets", label: "My Bets", icon: Ticket },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/league", label: "League", icon: Users },
  { href: "/commissioner", label: "Commissioner", icon: ShieldCheck },
];
