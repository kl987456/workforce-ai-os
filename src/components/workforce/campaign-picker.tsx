"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CampaignDTO } from "./types";

export function CampaignPicker({
  kind,
  activeId,
  onSelect,
  onNew,
  onDeleted,
  refreshToken,
}: {
  kind: "HIRING" | "TALENT_SEARCH";
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted?: (id: string) => void;
  refreshToken: number;
}) {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    fetch(`/api/campaigns?kind=${kind}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => {
        setLoadError(true);
        toast.error(kind === "HIRING" ? "Could not load requisitions" : "Could not load searches");
      })
      .finally(() => setLoading(false));
  }, [kind, refreshToken, localRefresh]);

  async function handleDelete(id: string, title: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Could not delete", { description: data.error ?? "Unknown error" });
        return;
      }
      toast.success(`"${title}" deleted`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      onDeleted?.(id);
    } finally {
      setDeletingId(null);
      setLocalRefresh((t) => t + 1);
    }
  }

  const label = kind === "HIRING" ? "requisition" : "search";

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
        {loading && campaigns.length === 0 && (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-lg px-2.5 py-2">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ))}
          </div>
        )}
        {!loading && campaigns.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {loadError ? "Couldn't load — try again." : "None yet — create one."}
          </div>
        )}
        {campaigns.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1 rounded-lg pr-1 transition-colors duration-200",
              c.id === activeId ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            <button
              onClick={() => onSelect(c.id)}
              aria-current={c.id === activeId ? "true" : undefined}
              className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left text-sm"
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  aria-label={`Delete ${c.title}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "shrink-0 rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
                    c.id === activeId
                      ? "text-primary-foreground/80 hover:bg-primary-foreground/20"
                      : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  )}
                >
                  {deletingId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this {label}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes &ldquo;{c.title}&rdquo; along with all of its
                    candidates and call history. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => handleDelete(c.id, c.title)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
