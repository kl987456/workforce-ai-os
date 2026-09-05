"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CallStatusBadge } from "./call-status-badge";
import type { CallDTO } from "./types";
import { Clock, Eye } from "lucide-react";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function humanizeKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CallDetailSheet({ call }: { call: CallDTO }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5" /> View
      </Button>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{call.candidate?.name ?? "Candidate"}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <CallStatusBadge status={call.status} />
              {call.answeredBy && (
                <span className="text-xs font-mono text-muted-foreground">
                  answered by {call.answeredBy.toLowerCase()}
                </span>
              )}
              {call.durationSeconds != null && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatDuration(call.durationSeconds)}
                </span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          {call.hunarCallId && (
            <div className="text-xs text-muted-foreground">
              Hunar call ID: <span className="font-mono">{call.hunarCallId}</span>
            </div>
          )}

          {call.errorMessage && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Error
              </span>
              <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                {call.errorMessage}
              </p>
            </div>
          )}

          {call.recordingUrl && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recording
              </span>
              <audio controls className="h-9 w-full" src={call.recordingUrl}>
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {call.result && Object.keys(call.result).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Extracted results
              </span>
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/50 p-3">
                {Object.entries(call.result).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {humanizeKey(key)}
                    </span>
                    <span className="text-sm text-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : !call.errorMessage ? (
            <p className="text-xs text-muted-foreground">
              No structured results yet — they land here once the call ends and Hunar delivers the
              result webhook.
            </p>
          ) : null}

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <div>Placed: {new Date(call.createdAt).toLocaleString()}</div>
            {call.startedAt && <div>Started: {new Date(call.startedAt).toLocaleString()}</div>}
            {call.endedAt && <div>Ended: {new Date(call.endedAt).toLocaleString()}</div>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
