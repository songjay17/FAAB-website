import type { Wager, WagerStatus } from "@/lib/types";
import { mockWagers } from "@/lib/mock-data";

export async function getWagersForMember(
  memberId: string,
  status?: WagerStatus
): Promise<Wager[]> {
  return mockWagers
    .filter((w) => w.memberId === memberId)
    .filter((w) => (status ? w.status === status : true))
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

export async function getOpenWagerForMatchup(
  memberId: string,
  matchupId: string
): Promise<Wager | undefined> {
  return mockWagers.find(
    (w) => w.memberId === memberId && w.matchupId === matchupId && w.status === "open"
  );
}
