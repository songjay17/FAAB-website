"use client";

import { formatFaab } from "@/lib/odds";
import { useBetting } from "@/lib/state/betting-provider";
import { useSession } from "@/lib/state/session-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";

export function DesktopTopbar() {
  const { wallet } = useBetting();
  const { session, signOut } = useSession();
  const { members } = useSleeperData();
  const displayName =
    members.find((m) => m.id === session.memberId)?.displayName ?? "Signed in";

  return (
    <header className="hidden h-16 items-center justify-end gap-6 border-b border-border px-8 lg:flex">
      <div className="flex flex-col items-end leading-none">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatFaab(wallet.availableFaab)}
        </span>
        <span className="text-xs text-muted-foreground">Available FAAB</span>
      </div>
      <div className="flex items-center gap-2 border-l border-border pl-6">
        <div className="flex flex-col items-end leading-none">
          <span className="text-sm font-medium">{displayName}</span>
          {session.isCommissioner ? (
            <span className="text-xs text-muted-foreground">Commissioner</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
