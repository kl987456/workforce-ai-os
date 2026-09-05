"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TriggerCallDialog } from "./trigger-call-dialog";
import { CandidateDetailSheet } from "./candidate-detail-sheet";
import { SendToPipelineMenu } from "./send-to-pipeline-menu";
import { draggableCandidateProps } from "./hiring-pipeline-panel";
import type { CandidateDTO } from "./types";
import { MapPin, Star, GripVertical, PhoneIncoming, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MATCH_SCORE_THRESHOLDS = [0, 25, 50, 75] as const;

const ALL_LOCATIONS = "__all__";

function reachoutSignal(result: Record<string, unknown> | undefined) {
  if (!result) return null;
  const key = ["open_to_opportunity", "next_step", "interest_level"].find((k) => k in result);
  if (!key) return null;
  return { label: key.replace(/_/g, " "), value: String(result[key]) };
}

function matchTone(score: number) {
  if (score >= 75) return "border-transparent bg-success text-success-foreground";
  if (score >= 50) return "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "border-border bg-muted text-muted-foreground";
}

// Fixed palette a candidate's avatar color is deterministically hashed from, so
// the same candidate always renders with the same color across renders/sessions.
const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
];

function hashToIndex(value: string, bucketCount: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // keep as 32-bit int
  }
  return Math.abs(hash) % bucketCount;
}

function avatarPalette(candidate: CandidateDTO) {
  return AVATAR_PALETTE[hashToIndex(candidate.id || candidate.name, AVATAR_PALETTE.length)];
}

function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function CandidateTable({
  candidates,
  campaignId,
  purpose,
  onCallCreated,
  emptyLabel,
  draggableToHiring = false,
  enableBulkSelect = false,
  selectedIds,
  onSelectedIdsChange,
}: {
  candidates: CandidateDTO[];
  campaignId: string;
  purpose: "HIRING_SCREEN" | "TALENT_REACHOUT";
  onCallCreated: () => void;
  emptyLabel: string;
  /** When true, rows can be dragged onto the floating Hiring Pipeline panel. */
  draggableToHiring?: boolean;
  /** Row-selection checkboxes for bulk reachout — Talent Search only, never Hiring. */
  enableBulkSelect?: boolean;
  selectedIds?: Set<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;
}) {
  // Optimistic favorite-state overrides, keyed by candidate id — applied on top of
  // the `candidates` prop so a toggle reflects instantly without waiting on the
  // parent's next refetch, and rolled back in place if the PATCH request fails.
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  // Which row (if any) is currently being dragged toward the Hiring Pipeline
  // panel — drives a subtle lift/glow while dragstart is active.
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Client-side filter state — all filtering happens in memory against the
  // already-fetched `candidates` array, so it applies instantly with no API calls.
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState(ALL_LOCATIONS);
  const [minScore, setMinScore] = useState(0);

  const hasMatchScores = candidates.some((c) => c.matchScore != null);
  const showMatchScoreFilter = purpose === "TALENT_REACHOUT" && hasMatchScores;

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of candidates) {
      if (c.location) set.add(c.location);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return candidates.filter((c) => {
      if (q) {
        const haystack = [c.name, c.roleTitle, c.company, ...c.skills]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (locationFilter !== ALL_LOCATIONS && c.location !== locationFilter) return false;
      if (showMatchScoreFilter && minScore > 0) {
        if (c.matchScore == null || c.matchScore < minScore) return false;
      }
      return true;
    });
  }, [candidates, searchQuery, locationFilter, minScore, showMatchScoreFilter]);

  const isFilterActive = searchQuery.trim() !== "" || locationFilter !== ALL_LOCATIONS || minScore > 0;

  function clearFilters() {
    setSearchQuery("");
    setLocationFilter(ALL_LOCATIONS);
    setMinScore(0);
  }

  async function toggleFavorite(candidate: CandidateDTO) {
    const next = !(favoriteOverrides[candidate.id] ?? candidate.isFavorite);
    setFavoriteOverrides((prev) => ({ ...prev, [candidate.id]: next }));
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      setFavoriteOverrides((prev) => ({ ...prev, [candidate.id]: !next }));
      toast.error("Could not update favorite", {
        description: `Failed to ${next ? "star" : "unstar"} ${candidate.name}`,
      });
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const showBulkSelect =
    enableBulkSelect && purpose === "TALENT_REACHOUT" && !!selectedIds && !!onSelectedIdsChange;

  // Selection counts/toggling are scoped to the currently filtered rows, so a
  // filter never silently drops selections made on rows it hides.
  const allSelected =
    showBulkSelect && filteredCandidates.length > 0 && filteredCandidates.every((c) => selectedIds!.has(c.id));
  const someSelected = showBulkSelect && filteredCandidates.some((c) => selectedIds!.has(c.id));
  const headerCheckedState: boolean | "indeterminate" = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false;

  function toggleAll(checked: boolean | "indeterminate") {
    if (!selectedIds || !onSelectedIdsChange) return;
    const next = new Set(selectedIds);
    for (const c of filteredCandidates) {
      if (checked === true) next.add(c.id);
      else next.delete(c.id);
    }
    onSelectedIdsChange(next);
  }

  function toggleOne(id: string, checked: boolean | "indeterminate") {
    if (!selectedIds || !onSelectedIdsChange) return;
    const next = new Set(selectedIds);
    if (checked === true) next.add(id);
    else next.delete(id);
    onSelectedIdsChange(next);
  }

  // Wraps the shared drag-source props with local dragging state so the row
  // can lift/glow on dragstart and settle back down on dragend.
  function rowDragProps(candidate: CandidateDTO) {
    const base = draggableCandidateProps(candidate);
    return {
      ...base,
      onDragStart: (e: React.DragEvent) => {
        base.onDragStart(e);
        setDraggingId(candidate.id);
      },
      onDragEnd: () => setDraggingId(null),
    };
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, role, company, skill…"
              className="pl-8"
              aria-label="Search candidates"
            />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by location">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_LOCATIONS}>All locations</SelectItem>
              {locationOptions.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showMatchScoreFilter && (
            <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by minimum match score">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATCH_SCORE_THRESHOLDS.map((threshold) => (
                  <SelectItem key={threshold} value={String(threshold)}>
                    {threshold === 0 ? "Any match score" : `${threshold}%+ match`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {filteredCandidates.length} of {candidates.length} candidates
          </span>
          {isFilterActive && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No candidates match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {showBulkSelect && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={headerCheckedState}
                      onCheckedChange={toggleAll}
                      aria-label="Select all candidates"
                    />
                  </TableHead>
                )}
                <TableHead className="min-w-[180px]">Candidate</TableHead>
                <TableHead>Experience</TableHead>
                {hasMatchScores && <TableHead>Match</TableHead>}
                <TableHead>Location</TableHead>
                <TableHead className="min-w-[200px]">Skills</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((c, index) => (
            <TableRow
              key={c.id}
              {...(draggableToHiring ? rowDragProps(c) : {})}
              className={cn(
                "animate-row-in transition-all duration-150",
                draggableToHiring && "cursor-grab active:cursor-grabbing",
                draggingId === c.id && "relative z-10 scale-[1.01] shadow-lg ring-1 ring-primary/40"
              )}
              style={{ animationDelay: `${(index % 8) * 40}ms` }}
            >
              {showBulkSelect && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds!.has(c.id)}
                    onCheckedChange={(checked) => toggleOne(c.id, checked)}
                    aria-label={`Select ${c.name}`}
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-start gap-1.5">
                  {draggableToHiring && (
                    <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  <Avatar className={cn("h-8 w-8 shrink-0", avatarPalette(c))}>
                    <AvatarFallback className={cn("text-xs font-medium", avatarPalette(c))}>
                      {avatarInitials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                      (favoriteOverrides[c.id] ?? c.isFavorite) ? "Unstar candidate" : "Star candidate"
                    }
                    aria-pressed={favoriteOverrides[c.id] ?? c.isFavorite}
                    className="-mt-1 -ml-1.5 shrink-0"
                    onClick={() => toggleFavorite(c)}
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        (favoriteOverrides[c.id] ?? c.isFavorite)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </Button>
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
                    {c.source === "REACHOUT_SYNC" && (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Badge
                            variant="outline"
                            tabIndex={0}
                            role="button"
                            aria-label="Show reachout call details"
                            className="mt-1 w-fit max-w-[220px] gap-1 truncate border-primary/30 text-[10px] text-primary"
                          >
                            <PhoneIncoming className="h-2.5 w-2.5 shrink-0" />
                            from Talent Search reachout
                            {(() => {
                              const signal = reachoutSignal(c.profile?.reachoutResult);
                              return signal ? ` · ${signal.label}: ${signal.value}` : "";
                            })()}
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64">
                          <p className="text-xs font-medium text-foreground">
                            Auto-added after a completed reachout call
                          </p>
                          {c.profile?.reachoutResult ? (
                            <div className="mt-2 flex flex-col gap-1.5">
                              {Object.entries(c.profile.reachoutResult).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-xs text-foreground">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">No result details captured.</p>
                          )}
                        </HoverCardContent>
                      </HoverCard>
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
                        <Badge
                          variant="secondary"
                          tabIndex={0}
                          role="button"
                          aria-label={`Show ${c.skills.length - 3} more skills`}
                          className="cursor-default text-[10px] font-normal"
                        >
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
                <div className="flex items-center justify-end gap-1.5">
                  {draggableToHiring && <SendToPipelineMenu candidate={c} />}
                  <CandidateDetailSheet candidate={c} />
                  <TriggerCallDialog
                    candidate={c}
                    campaignId={campaignId}
                    purpose={purpose}
                    onCallCreated={onCallCreated}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
