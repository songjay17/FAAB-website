import { useRouter, useSearchParams } from "next/navigation";
import { mockLeague } from "@/lib/mock-data";

/**
 * Reads/writes a `week` URL search param, falling back to the current
 * league week when absent or invalid (e.g. `?week=abc`). Mirrors the
 * pattern originally established on the Matchups page so every page that
 * lets you browse a past week's data behaves the same way.
 */
export function useWeekParam(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const parsedWeek = weekParam === null ? NaN : Number(weekParam);
  const week = Number.isInteger(parsedWeek) ? parsedWeek : mockLeague.currentWeek;

  function goToWeek(next: number, extraParams?: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", String(next));
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  return { week, goToWeek };
}
