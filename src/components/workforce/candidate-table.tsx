"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TriggerCallDialog } from "./trigger-call-dialog";
import { draggableCandidateProps } from "./hiring-pipeline-panel";
import type { CandidateDTO } from "./types";
import { MapPin, Star, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

function matchTone(score: number) {
  if (score >= 75) return "border-transparent bg-success text-success-foreground";
  if (score >= 50) return "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "border-border bg-muted text-muted-foreground";
}

export function CandidateTable({
  candidates,
  campaignId,
  purpose,
  onCallCreated,
  emptyLabel,
  draggableToHiring = false,
}: {
  candidates: CandidateDTO[];
  campaignId: string;
  purpose: "HIRING_SCREEN" | "TALENT_REACHOUT";
  onCallCreated: () => void;
  emptyLabel: string;
  /** When true, rows can be dragged onto the floating Hiring Pipeline panel. */
  draggableToHiring?: boolean;
}) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const hasMatchScores = candidates.some((c) => c.matchScore != null);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Candidate</TableHead>
            <TableHead>Experience</TableHead>
            {hasMatchScores && <TableHead>Match</TableHead>}
            <TableHead>Location</TableHead>
            <TableHead className="min-w-[200px]">Skills</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((c) => (
            <TableRow
              key={c.id}
              {...(draggableToHiring ? draggableCandidateProps(c) : {})}
              className={draggableToHiring ? "cursor-grab active:cursor-grabbing" : undefined}
            >
              <TableCell>
                <div className="flex items-start gap-1.5">
                  {draggableToHiring && (
                    <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.roleTitle}
                      {c.company ? ` · ${c.company}` : ""}
                    </span>
                    {c.source === "SEEDED_SEARCH" && (
                      <Badge variant="outline" className="mt-1 w-fit text-[10px] text-muted-foreground">
                        demo profile
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {c.yearsExperience != null ? `${c.yearsExperience} yrs` : "—"}
              </TableCell>
              {hasMatchScores && (
                <TableCell>
                  {c.matchScore != null ? (
                    <Badge className={cn("gap-1 font-mono text-[11px]", matchTone(c.matchScore))}>
                      <Star className="h-3 w-3" />
                      {c.matchScore.toFixed(1)}%
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {c.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {c.location}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  {c.skills.slice(0, 3).map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] font-normal">
                      {s}
                    </Badge>
                  ))}
                  {c.skills.length > 3 && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Badge variant="secondary" className="cursor-default text-[10px] font-normal">
                          +{c.skills.length - 3} more
                        </Badge>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64">
                        <div className="flex flex-wrap gap-1">
                          {c.skills.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] font-normal">
                              {s}
                            </Badge>
                          ))}
                        </div>
                        {c.profile?.summary && (
                          <p className="mt-2 text-xs text-muted-foreground">{c.profile.summary}</p>
                        )}
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <TriggerCallDialog
                  candidate={c}
                  campaignId={campaignId}
                  purpose={purpose}
                  onCallCreated={onCallCreated}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
