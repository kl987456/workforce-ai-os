import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallStatusBadge } from "./call-status-badge";
import { CallDetailSheet } from "./call-detail-sheet";
import type { CallDTO } from "./types";
import { PhoneOff } from "lucide-react";

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function keySignal(result: Record<string, unknown> | null) {
  if (!result) return null;
  const key = Object.keys(result).find((k) =>
    ["recommendation", "open_to_opportunity", "interest_level", "next_step"].includes(k)
  );
  if (!key) return null;
  return { label: key.replace(/_/g, " "), value: String(result[key]) };
}

export function CallTable({ calls }: { calls: CallDTO[] }) {
  if (calls.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No calls placed yet. Trigger a Hunar voice call from a candidate above to see live status
        and extracted results here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px]">Candidate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="min-w-[180px]">Key signal</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => {
            const signal = keySignal(call.result);
            const noConnect = call.status === "NOT_CONNECTED" || call.status === "FAILED";
            return (
              <TableRow key={call.id}>
                <TableCell className="font-medium text-foreground">
                  {call.candidate?.name ?? "Candidate"}
                </TableCell>
                <TableCell>
                  <CallStatusBadge status={call.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDuration(call.durationSeconds)}
                </TableCell>
                <TableCell className="text-sm">
                  {signal ? (
                    <span>
                      <span className="capitalize text-muted-foreground">{signal.label}: </span>
                      <span className="font-medium text-foreground">{signal.value}</span>
                    </span>
                  ) : noConnect ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <PhoneOff className="h-3 w-3" />
                      {call.status === "NOT_CONNECTED" ? "Did not answer" : "Failed to place"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending…</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <CallDetailSheet call={call} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
