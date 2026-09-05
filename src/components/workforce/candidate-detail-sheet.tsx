"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CallStatusBadge } from "./call-status-badge";
import type { CandidateDTO, CandidateTimelineResponse } from "./types";
import {
  UserRound,
  MapPin,
  Star,
  Clock,
  Loader2,
  Search,
  UserPlus,
  PhoneIncoming,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: CandidateTimelineResponse };

function matchTone(score: number) {
  if (score >= 75) return "border-transparent bg-success text-success-foreground";
  if (score >= 50) return "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "border-border bg-muted text-muted-foreground";
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function humanizeKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sourcedIcon(source: CandidateDTO["source"]) {
  if (source === "REACHOUT_SYNC") return PhoneIncoming;
  if (source === "SEEDED_SEARCH") return Search;
  return UserPlus;
}

function callLabel(purpose: "HIRING_SCREEN" | "TALENT_REACHOUT" | null) {
  if (purpose === "HIRING_SCREEN") return "Screening call";
  if (purpose === "TALENT_REACHOUT") return "Reachout call";
  return "Call";
}

export function CandidateDetailSheet({ candidate }: { candidate: CandidateDTO }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [notes, setNotes] = useState(candidate.notes ?? "");
  const [lastSavedNotes, setLastSavedNotes] = useState(candidate.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);

  // Once the freshly-fetched candidate row lands, re-sync the notes draft to it —
  // it may be more current than the table-row snapshot this sheet was opened from.
  const readyNotes = state.status === "ready" ? (state.data.candidate.notes ?? "") : undefined;
  useEffect(() => {
    if (readyNotes === undefined) return;
    setNotes(readyNotes);
    setLastSavedNotes(readyNotes);
  }, [readyNotes]);

  async function handleNotesBlur() {
    if (notes === lastSavedNotes) return;
    const previous = lastSavedNotes;
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null }),
      });
      if (!res.ok) throw new Error("request failed");
      setLastSavedNotes(notes);
    } catch {
      setNotes(previous);
      setLastSavedNotes(previous);
      toast.error("Could not save notes");
    } finally {
      setNotesSaving(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/candidates/${candidate.id}/timeline`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", error: data.error ?? "Failed to load timeline" });
          return;
        }
        setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", error: "Network error loading timeline" });
      });

    return () => {
      cancelled = true;
    };
  }, [open, candidate.id]);

  // Prefer the freshly-fetched candidate row once it lands (it may be more current
  // than the table snapshot this sheet was opened from), but show something
  // immediately from the row we already have.
  const header = state.status === "ready" ? state.data.candidate : candidate;
  const timeline = state.status === "ready" ? state.data.timeline : [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="View profile"
        onClick={() => setOpen(true)}
      >
        <UserRound className="h-3.5 w-3.5" />
      </Button>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{header.name}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {[header.roleTitle, header.company].filter(Boolean).join(" · ") ||
                  "No role on file"}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {header.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {header.location}
                  </span>
                )}
                {header.yearsExperience != null && <span>{header.yearsExperience} yrs experience</span>}
                {header.matchScore != null && (
                  <Badge className={cn("gap-1 font-mono text-[11px]", matchTone(header.matchScore))}>
                    <Star className="h-3 w-3" />
                    {header.matchScore.toFixed(1)}%
                  </Badge>
                )}
              </div>
              {header.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {header.skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1.5 px-4 pb-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="candidate-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </Label>
            {notesSaving && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
          </div>
          <Textarea
            id="candidate-notes"
            rows={3}
            placeholder="Add private notes about this candidate…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
          />
        </div>

        <div className="flex flex-col gap-3 px-4 pb-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Timeline
          </span>

          {state.status === "loading" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading timeline…
            </div>
          )}

          {state.status === "error" && <p className="text-xs text-destructive">{state.error}</p>}

          {state.status === "ready" && timeline.length === 0 && (
            <p className="text-xs text-muted-foreground">No history recorded yet.</p>
          )}

          {timeline.length > 0 && (
            <div className="flex flex-col">
              {timeline.map((event, idx) => {
                const isLast = idx === timeline.length - 1;
                const Icon = event.type === "sourced" ? sourcedIcon(event.candidate.source) : Phone;

                return (
                  <div
                    key={event.type === "sourced" ? `sourced-${event.candidate.id}` : `call-${event.call.id}`}
                    className="relative flex gap-3 pb-6 last:pb-0"
                  >
                    <div className="flex flex-col items-center">
                      <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </span>
                      {!isLast && <span className="w-px flex-1 bg-border" />}
                    </div>

                    <div className="flex flex-1 flex-col gap-1 pt-0.5">
                      {event.type === "sourced" ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{event.label}</span>
                          </div>
                          {(event.candidate.roleTitle || event.candidate.matchScore != null) && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {event.candidate.roleTitle && <span>{event.candidate.roleTitle}</span>}
                              {event.candidate.matchScore != null && (
                                <Badge
                                  className={cn(
                                    "gap-1 font-mono text-[10px]",
                                    matchTone(event.candidate.matchScore)
                                  )}
                                >
                                  <Star className="h-2.5 w-2.5" />
                                  {event.candidate.matchScore.toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {callLabel(event.purpose)}
                            </span>
                            <CallStatusBadge status={event.call.status} />
                            {event.call.durationSeconds != null && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" /> {formatDuration(event.call.durationSeconds)}
                              </span>
                            )}
                          </div>

                          {event.call.errorMessage && (
                            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                              {event.call.errorMessage}
                            </p>
                          )}

                          {event.call.result && Object.keys(event.call.result).length > 0 && (
                            <div className="flex flex-col gap-1.5 rounded-md bg-muted/50 p-2">
                              {Object.entries(event.call.result).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {humanizeKey(key)}
                                  </span>
                                  <span className="text-xs text-foreground">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {event.call.recordingUrl && (
                            <audio controls className="h-8 w-full" src={event.call.recordingUrl}>
                              Your browser does not support audio playback.
                            </audio>
                          )}
                        </>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(event.at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
