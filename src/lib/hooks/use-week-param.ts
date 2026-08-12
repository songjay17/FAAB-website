import { useRouter, useSearchParams } from "next/navigation";

/**
 * Reads/writes a `week` URL search param, falling back to `currentWeek`
 * when absent or invalid (e.g. `?week=abc`). Mirrors the pattern originally
 * established on the Matchups page so every page that lets you browse a
 * past week's data behaves the same way. Takes `currentWeek` as an explicit
 * parameter (rather than reading it itself) since this hook isn't a
 * component and can't call useSleeperData() — callers get it from there.
 */
export function useWeekParam(basePath: string, currentWeek: number) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const parsedWeek = weekParam === null ? NaN : Number(weekParam);
  const week = Number.isInteger(parsedWeek) ? parsedWeek : currentWeek;

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
