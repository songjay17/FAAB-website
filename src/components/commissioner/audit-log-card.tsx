"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

// The real server-side trail (audit_log), replacing the old per-session
// in-memory list plus hand-written seed entries. Refetches whenever the
// book changes (`refreshKey`) so an action taken on this page shows up
// immediately.

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  subject: string | null;
  reason: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  "void-wager": "voided wager",
  "settle-week": "settled",
  "market-open": "opened market",
  "market-locked": "locked market",
  "adjust-faab": "adjusted FAAB for",
  "reset-book": "reset the book",
  "claim-member": "claimed their team",
  "reset-pin": "reset the PIN for",
};

function describe(entry: AuditEntry): string {
  const action = ACTION_LABELS[entry.action] ?? entry.action;
  const subject = entry.subject ? ` ${entry.subject}` : "";
  const reason = entry.reason ? ` — reason: ${entry.reason}` : "";
  return `${entry.actor} ${action}${subject}${reason}.`;
}

export function AuditLogCard({ refreshKey }: { refreshKey: unknown }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/commissioner/audit")
      .then((res) => (res.ok ? res.json() : { entries: [] }))
      .then((data: { entries?: AuditEntry[] }) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <Card>
      <CardContent>
        <h2 className="mb-3 font-semibold">Audit Activity</h2>
        {entries === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No commissioner activity yet"
            description="Voids, settlements, market locks, and resets are recorded here."
          />
        ) : (
          <ul className="space-y-3 text-sm">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-0.5 border-b border-border/60 pb-3 last:border-0"
              >
                <span className="text-foreground">{describe(entry)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
