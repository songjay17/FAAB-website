import type { ReactNode } from "react";
import { Navigation } from "./navigation";
import { MobileNavigation } from "./mobile-navigation";
import { MobileTopbar } from "./mobile-topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      <Navigation />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
        <MobileNavigation />
      </div>
    </div>
  );
}
