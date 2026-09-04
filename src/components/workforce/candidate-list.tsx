import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TriggerCallDialog } from "./trigger-call-dialog";
import type { CandidateDTO } from "./types";
import { MapPin, Building2, Star, BriefcaseBusiness } from "lucide-react";
import { cn } from "@/lib/utils";

function matchTone(score: number) {
  if (score >= 75) return "border-transparent bg-success text-success-foreground";
  if (score >= 50) return "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "border-border bg-muted text-muted-foreground";
}

export function CandidateList({
  candidates,
  campaignId,
  purpose,
  onCallCreated,
  emptyLabel,
}: {
  candidates: CandidateDTO[];
  campaignId: string;
  purpose: "HIRING_SCREEN" | "TALENT_REACHOUT";
  onCallCreated: () => void;
  emptyLabel: string;
}) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {candidates.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{c.name}</span>
                {c.matchScore != null && (
                  <Badge className={cn("gap-1 font-mono text-[11px]", matchTone(c.matchScore))}>
                    <Star className="h-3 w-3" />
                    {c.matchScore.toFixed(1)}% match
                  </Badge>
                )}
                {c.source === "SEEDED_SEARCH" && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    demo profile
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                <span>{c.roleTitle}</span>
                {c.yearsExperience != null && (
                  <span className="inline-flex items-center gap-1">
                    <BriefcaseBusiness className="h-3 w-3" />
                    {c.yearsExperience} yrs experience
                  </span>
                )}
                {c.company && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {c.company}
                  </span>
                )}
                {c.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {c.location}
                  </span>
                )}
              </div>
              {c.profile?.summary && (
                <p className="text-xs text-muted-foreground">{c.profile.summary}</p>
              )}
              {c.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {c.skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <TriggerCallDialog
                candidate={c}
                campaignId={campaignId}
                purpose={purpose}
                onCallCreated={onCallCreated}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
