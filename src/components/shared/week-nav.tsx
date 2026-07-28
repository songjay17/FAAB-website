import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Prev/Next week control, bounded against whichever weeks actually have data. */
export function WeekNav({
  week,
  availableWeeks,
  onNavigate,
}: {
  week: number;
  availableWeeks: number[];
  onNavigate: (week: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={!availableWeeks.includes(week - 1)}
        onClick={() => onNavigate(week - 1)}
        aria-label="Previous week"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-20 text-center text-sm font-semibold">Week {week}</span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={!availableWeeks.includes(week + 1)}
        onClick={() => onNavigate(week + 1)}
        aria-label="Next week"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
