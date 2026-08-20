"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav-items";
import { seasonStatusLabel } from "@/lib/services/league-service";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";

export function Navigation() {
  const pathname = usePathname();
  const { league } = useSleeperData();

  return (
    <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="text-xl">🏈</span>
        <div className="flex flex-col leading-none">
          <span className="font-semibold text-sidebar-foreground">{league.name}</span>
          <span className="text-xs text-muted-foreground">{seasonStatusLabel(league)}</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4 text-xs text-muted-foreground">
        Virtual FAAB only &mdash; no real-money value.
      </div>
    </aside>
  );
}
