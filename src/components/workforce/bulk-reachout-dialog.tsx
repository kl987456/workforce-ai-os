"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhoneOutgoing, Loader2 } from "lucide-react";

interface BulkCallResponse {
  placed: number;
  skipped: Array<{ candidateId: string; reason: string }>;
}

export function BulkReachoutDialog({
  campaignId,
  candidateIds,
  onPlaced,
}: {
  campaignId: string;
  /** Ids of the currently selected candidates — the dialog dials each one's on-file number. */
  candidateIds: string[];
  onPlaced: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const count = candidateIds.length;
  const plural = count === 1 ? "" : "s";

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/calls/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds, campaignId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not place bulk reachout", {
          description:
            typeof data.error === "string" ? data.error : "Unknown error — see console for details.",
        });
        if (typeof data.error !== "string") console.error(data.error);
        return;
      }

      const { placed, skipped } = data as BulkCallResponse;
      const skippedSummary =
        skipped.length > 0
          ? `Skipped ${skipped.length}: ${skipped
              .slice(0, 2)
              .map((s) => s.reason)
              .join("; ")}${skipped.length > 2 ? "…" : ""}`
          : "Track status live in the Reachout calls tab.";

      if (placed > 0) {
        toast.success(`Placed ${placed} Hunar reachout call${placed === 1 ? "" : "s"}`, {
          description: skippedSummary,
        });
      } else {
        toast.error("No calls placed", {
          description: skipped[0]?.reason ?? "Nothing to call.",
        });
      }

      setOpen(false);
      onPlaced();
    } catch {
      toast.error("Network error placing bulk reachout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={count === 0}>
          <PhoneOutgoing className="h-3.5 w-3.5" />
          Reachout selected ({count})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Place {count} Hunar voice reachout call{plural}?
          </DialogTitle>
          <DialogDescription>
            This places real outbound calls via the Hunar Voice AI API to each selected
            candidate&apos;s on-file phone number, as-is — there&apos;s no per-number editing step
            for a bulk batch. Each number should already be in E.164 format (+ followed by country
            code, e.g. +917411771293 or +15551234567); anything else is skipped and reported rather
            than dialed. Seeded/demo profiles use fictional numbers (NANP 555-01xx test block) and
            will not connect — swap in real, consented numbers before relying on the results.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || count === 0}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Place {count} call{plural}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
