"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { CampaignDTO } from "./types";

export function CampaignPicker({
  kind,
  activeId,
  onSelect,
  onNew,
  refreshToken,
}: {
  kind: "HIRING" | "TALENT_SEARCH";
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshToken: number;
}) {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/campaigns?kind=${kind}`)
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .finally(() => setLoading(false));
  }, [kind, refreshToken]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {kind === "HIRING" ? "Requisitions" : "Search campaigns"}
        </span>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>
      <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto pr-1">
        {loading && <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</div>}
        {!loading && campaigns.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">None yet — create one.</div>
        )}
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
              c.id === activeId
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            )}
          >
            <div className="truncate font-medium">{c.title}</div>
            <div
              className={cn(
                "truncate text-[11px]",
                c.id === activeId ? "text-primary-foreground/80" : "text-muted-foreground"
              )}
            >
              {c.department || c.location || new Date(c.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
