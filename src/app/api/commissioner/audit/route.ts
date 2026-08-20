import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";

const LIMIT = 50;

/** The real server-side audit trail — replaces the commissioner page's per-session list. */
export async function GET() {
  try {
    const guarded = await guard({ commissioner: true });
    if (isResponse(guarded)) return guarded;
    const { data } = guarded;

    const rows = await getDb()
      .select()
      .from(auditLog)
      .where(eq(auditLog.leagueId, data.league.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(LIMIT);

    const nameById = new Map(data.members.map((m) => [m.id, m.displayName]));
    return NextResponse.json({
      entries: rows.map((row) => ({
        id: row.id,
        actor: nameById.get(row.actorMemberId) ?? row.actorMemberId,
        action: row.action,
        subject: row.subjectId
          ? (nameById.get(row.subjectId) ?? row.subjectId)
          : null,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}
