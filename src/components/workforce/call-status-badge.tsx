import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CallDTO } from "./types";

const STYLES: Record<CallDTO["status"], string> = {
  NOT_STARTED: "bg-muted text-muted-foreground border-border",
  SCHEDULED: "bg-info text-info-foreground border-transparent",
  INITIATED: "bg-info text-info-foreground border-transparent",
  RINGING: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300",
  COMPLETED: "bg-success text-success-foreground border-transparent",
  NOT_CONNECTED: "bg-muted text-muted-foreground border-border",
  FAILED: "bg-destructive/10 text-destructive border-transparent",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

// Statuses where a call is actively happening — the badge gets a soft pulsing
// ring instead of an instant color snap, so "live" state reads at a glance.
const LIVE_STATUSES = new Set<CallDTO["status"]>(["RINGING", "IN_PROGRESS"]);

const LABELS: Record<CallDTO["status"], string> = {
  NOT_STARTED: "Not started",
  SCHEDULED: "Scheduled",
  INITIATED: "Dialing…",
  RINGING: "Ringing…",
  IN_PROGRESS: "In progress…",
  COMPLETED: "Completed",
  NOT_CONNECTED: "Not connected",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function CallStatusBadge({ status }: { status: CallDTO["status"] }) {
  return (
    <Badge
      className={cn(
        "font-medium transition-colors duration-300",
        STYLES[status],
        LIVE_STATUSES.has(status) && "animate-status-pulse-ring"
      )}
      variant="outline"
    >
      {LABELS[status]}
    </Badge>
  );
}
