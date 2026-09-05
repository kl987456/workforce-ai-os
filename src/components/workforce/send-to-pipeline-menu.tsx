"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SendHorizonal, Plus, Loader2 } from "lucide-react";
import type { CampaignDTO, CandidateDTO } from "./types";

/**
 * Non-drag path to the same "add this Talent Search candidate to a Hiring
 * requisition" outcome as dragging them onto the floating Hiring Pipeline
 * panel — keyboard and screen-reader users have no way to perform an HTML5
 * drag gesture, so this menu is the only way they can do it at all.
 */
export function SendToPipelineMenu({ candidate }: { candidate: CandidateDTO }) {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignDTO[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadCampaigns() {
    if (campaigns) return;
    try {
      const res = await fetch("/api/campaigns?kind=HIRING");
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      setCampaigns([]);
      toast.error("Could not load requisitions");
    }
  }

  async function sendTo(campaignId: string) {
    setBusy(true);
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
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function sendToNewRole() {
    setBusy(true);
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
      await sendTo(data.campaign.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) loadCampaigns();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Send ${candidate.name} to a hiring pipeline`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Send to requisition</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {campaigns === null && <DropdownMenuItem disabled>Loading…</DropdownMenuItem>}
        {campaigns?.length === 0 && <DropdownMenuItem disabled>No requisitions yet</DropdownMenuItem>}
        {campaigns?.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => sendTo(c.id)} disabled={busy}>
            {c.title}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={sendToNewRole} disabled={busy}>
          <Plus className="h-3.5 w-3.5" /> New role from this candidate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
