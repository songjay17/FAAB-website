import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectedLineup } from "@/lib/types";

export function OptimalLineupTable({ lineup }: { lineup: ProjectedLineup }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Slot</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="hidden sm:table-cell">NFL</TableHead>
          <TableHead className="text-right">Proj</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineup.slots.map((slot, i) => (
          <TableRow key={`${slot.slot}-${slot.player.id}-${i}`}>
            <TableCell className="text-xs font-medium text-muted-foreground">
              {slot.slot}
            </TableCell>
            <TableCell className="font-medium">{slot.player.name}</TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">
              {slot.player.nflTeam}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {slot.player.projectedPoints.toFixed(1)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
