import { Card, CardContent } from "@/components/ui/card";
import { CallStatusBadge } from "./call-status-badge";
import type { CallDTO } from "./types";
import { Clock, PhoneOff } from "lucide-react";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CallList({ calls }: { calls: CallDTO[] }) {
  if (calls.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No calls placed yet. Trigger a Hunar voice call from a candidate above to see live status
        and extracted results here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {calls.map((call) => (
        <Card key={call.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {call.candidate?.name ?? "Candidate"}
                </span>
                <CallStatusBadge status={call.status} />
                {call.answeredBy && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    answered by {call.answeredBy.toLowerCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {call.durationSeconds != null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDuration(call.durationSeconds)}
                  </span>
                )}
                {call.hunarCallId && (
                  <span className="font-mono text-[10px]">#{call.hunarCallId.slice(0, 8)}</span>
                )}
              </div>
            </div>

            {call.status === "NOT_CONNECTED" || call.status === "FAILED" ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PhoneOff className="h-3 w-3" />
                {call.status === "NOT_CONNECTED"
                  ? "Candidate did not answer."
                  : "Call failed to place — check the Hunar dashboard for details."}
              </div>
            ) : null}

            {call.recordingUrl && (
              <audio controls className="h-9 w-full" src={call.recordingUrl}>
                Your browser does not support audio playback.
              </audio>
            )}

            {call.result && Object.keys(call.result).length > 0 && (
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 p-3 sm:grid-cols-2">
                {Object.entries(call.result).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {humanizeKey(key)}
                    </span>
                    <span className="text-sm text-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
