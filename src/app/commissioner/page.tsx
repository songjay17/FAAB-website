"use client";

import { useState } from "react";
import { KeyRound, Lock, ShieldAlert, Trophy, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AuditLogCard } from "@/components/commissioner/audit-log-card";
import { ResetPinCard } from "@/components/commissioner/reset-pin-card";
import { SettleWeekCard } from "@/components/commissioner/settle-week-card";
import { VoidWagerCard } from "@/components/commissioner/void-wager-card";
import { ManageMarketsCard } from "@/components/commissioner/manage-markets-card";
import { useBetting } from "@/lib/state/betting-provider";
import { useSession } from "@/lib/state/session-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";

export default function CommissionerPage() {
  const { resetDemoData, allWagers } = useBetting();
  const { league } = useSleeperData();
  const { session } = useSession();
  // Bumped after any commissioner action so the audit trail refetches.
  const [auditKey, setAuditKey] = useState(0);

  // The server enforces this on every commissioner route (403 without the
  // flag); hiding the tools is just so non-commissioners aren't shown
  // controls that would fail.
  if (!session.isCommissioner) {
    return (
      <div className="space-y-6">
        <PageHeader title="Commissioner Tools" description={league.name} />
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ShieldAlert className="size-8 text-muted-foreground" />
              <p className="font-medium">These tools are commissioner-only</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Voiding wagers, settling weeks, and locking markets are restricted to the
                league commissioner.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissioner Tools"
        description={`League-wide actions for ${league.name} — every action below is recorded in the audit trail.`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <VoidWagerCard icon={Undo2} onVoided={() => setAuditKey((k) => k + 1)} />
        <ManageMarketsCard icon={Lock} onChanged={() => setAuditKey((k) => k + 1)} />
        <SettleWeekCard icon={Trophy} onSettled={() => setAuditKey((k) => k + 1)} />
        <ResetPinCard icon={KeyRound} />
      </div>

      <AuditLogCard refreshKey={`${auditKey}-${allWagers.length}`} />

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
          Reset the league book
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the league book?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears every member&apos;s wallet and wager history league-wide and
              reseeds from the current Sleeper data. Audit history is kept. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDemoData()
                  .then(() => setAuditKey((k) => k + 1))
                  .catch(() => {
                    // Book state refetches on focus; a failed reset leaves the book unchanged.
                  });
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
