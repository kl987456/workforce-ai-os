"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Mic, ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";
import type { CampaignDTO, CandidateDTO } from "./types";

const DRAG_MIME = "application/x-workforce-candidate";

export function draggableCandidateProps(candidate: CandidateDTO) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(candidate));
      e.dataTransfer.effectAllowed = "copy";
    },
  };
}

function readDraggedCandidate(e: React.DragEvent): CandidateDTO | null {
  const raw = e.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CandidateDTO;
  } catch {
    return null;
  }
}

export function HiringPipelinePanel() {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns?kind=HIRING");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const list: CampaignDTO[] = data.campaigns ?? [];
      setCampaigns(list);
    } catch {
      toast.error("Could not load requisitions for the pipeline panel");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function transferCandidate(candidate: CandidateDTO, campaignId: string) {
    setTransferringId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidate.name,
          phone: candidate.phone,
          email: candidate.email || undefined,
          roleTitle: candidate.roleTitle ?? undefined,
          location: candidate.location ?? undefined,
          skills: candidate.skills,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not add to pipeline", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success(`${candidate.name} added to Hiring Assistant`, {
        description: "Open AI Hiring Assistant to trigger their phone screen.",
      });
      setCounts((c) => ({ ...c, [campaignId]: (c[campaignId] ?? 0) + 1 }));
    } finally {
      setTransferringId(null);
      setDragOverId(null);
    }
  }

  async function transferToNewRole(candidate: CandidateDTO) {
    setTransferringId("__new__");
    try {
      const title = candidate.roleTitle ?? "New role";
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "HIRING",
          title,
          location: candidate.location ?? undefined,
          jobDescription: `Auto-created from a Talent Search match: ${candidate.name} (${title}${
            candidate.company ? ` at ${candidate.company}` : ""
          }). Key skills: ${candidate.skills.join(", ") || "n/a"}.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not create role", { description: JSON.stringify(data.error) });
        return;
      }
      await transferCandidate(candidate, data.campaign.id);
      await refresh();
    } finally {
      setTransferringId(null);
      setDragOverId(null);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 w-72 rounded-xl border border-border bg-card shadow-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="hiring-pipeline-panel-content"
        className="flex w-full items-center justify-between gap-2 rounded-t-xl px-3 py-2.5"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Mic className="h-3.5 w-3.5 text-primary" /> Hiring Pipeline
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div id="hiring-pipeline-panel-content" className="flex flex-col gap-1.5 border-t border-border p-2.5">
          <p className="px-0.5 pb-1 text-[11px] text-muted-foreground">
            Drag a candidate row here to add them to a requisition.
          </p>

          {loading && (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[38px] w-full rounded-lg" />
              ))}
            </div>
          )}

          {!loading &&
            campaigns.map((c) => (
              <div
                key={c.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(c.id);
                }}
                onDragLeave={() => setDragOverId((id) => (id === c.id ? null : id))}
                onDrop={(e) => {
                  e.preventDefault();
                  const candidate = readDraggedCandidate(e);
                  if (candidate) transferCandidate(candidate, c.id);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-sm transition-all duration-150",
                  dragOverId === c.id
                    ? "border-primary bg-accent"
                    : "border-border bg-background"
                )}
              >
                <span className="min-w-0 truncate font-medium text-foreground">{c.title}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {transferringId === c.id && <Loader2 className="h-3 w-3 animate-spin" />}
                  {counts[c.id] ? (
                    <Badge variant="secondary" className="text-[10px]">
                      +{counts[c.id]}
                    </Badge>
                  ) : null}
                </span>
              </div>
            ))}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId("__new__");
            }}
            onDragLeave={() => setDragOverId((id) => (id === "__new__" ? null : id))}
            onDrop={(e) => {
              e.preventDefault();
              const candidate = readDraggedCandidate(e);
              if (candidate) transferToNewRole(candidate);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2.5 py-2 text-xs transition-all duration-150",
              dragOverId === "__new__"
                ? "border-primary bg-accent text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {transferringId === "__new__" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            New role (drop here)
          </div>
        </div>
      )}
    </div>
  );
}
