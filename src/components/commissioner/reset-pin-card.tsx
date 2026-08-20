"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type MemberClaim = { memberId: string; displayName: string; claimed: boolean };

/**
 * The "I forgot my PIN" path: clearing a member's claim lets them re-claim
 * and choose a new PIN themselves — the commissioner never sets someone
 * else's PIN.
 */
export function ResetPinCard({ icon: Icon }: { icon: LucideIcon }) {
  const [members, setMembers] = useState<MemberClaim[]>([]);
  const [memberId, setMemberId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { members?: MemberClaim[] }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, []);

  const claimed = members.filter((m) => m.claimed);

  async function handleReset() {
    if (!memberId) return;
    setError(null);
    setStatus(null);
    const res = await fetch("/api/commissioner/reset-pin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      members?: MemberClaim[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Couldn't reset that PIN.");
      return;
    }
    const name = members.find((m) => m.memberId === memberId)?.displayName ?? "That member";
    setMembers(data.members ?? []);
    setMemberId("");
    setStatus(`${name} can now claim their team again with a new PIN.`);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">Reset a member&apos;s PIN</p>
            <p className="text-sm text-muted-foreground">
              Clears their claim so they can sign in again and pick a new PIN.
            </p>
          </div>
        </div>

        <select
          value={memberId}
          onChange={(e) => {
            setMemberId(e.target.value);
            setStatus(null);
            setError(null);
          }}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select a member…</option>
          {claimed.map((member) => (
            <option key={member.memberId} value={member.memberId}>
              {member.displayName}
            </option>
          ))}
        </select>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

        <Button size="sm" variant="outline" disabled={!memberId} onClick={handleReset}>
          Reset PIN
        </Button>
      </CardContent>
    </Card>
  );
}
