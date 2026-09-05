"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Phone, Loader2 } from "lucide-react";
import type { CandidateDTO } from "./types";
import { isE164, phoneHint } from "@/lib/phone";
import { cn } from "@/lib/utils";

export function TriggerCallDialog({
  candidate,
  campaignId,
  purpose,
  onCallCreated,
}: {
  candidate: CandidateDTO;
  campaignId: string;
  purpose: "HIRING_SCREEN" | "TALENT_REACHOUT";
  onCallCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(candidate.phone);
  const [loading, setLoading] = useState(false);
  const isSeeded = candidate.source === "SEEDED_SEARCH";
  const hint = phoneHint(phone);
  const valid = isE164(phone);

  async function handleCall() {
    setLoading(true);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          campaignId,
          purpose,
          phoneOverride: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not place call", { description: data.error ?? "Unknown error" });
      } else {
        toast.success(`Hunar call placed to ${candidate.name}`, {
          description: "Track status live below — results arrive via webhook when the call ends.",
        });
        setOpen(false);
        onCallCreated();
      }
    } catch {
      toast.error("Network error placing call");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setPhone(candidate.phone);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          {purpose === "HIRING_SCREEN" ? "Call — Hunar Screen" : "Trigger Voice Reachout"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place Hunar voice call to {candidate.name}?</DialogTitle>
          <DialogDescription>
            This places a real outbound call via the Hunar Voice AI API to the number below.
            {isSeeded &&
              " This is a seeded demo profile with a fictional number (NANP 555-01xx test block) — replace it with a real, consented number to actually test the call."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone number (E.164 format — works for any country)</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+917411771293 or +15551234567"
            aria-invalid={!!hint}
            aria-describedby={hint ? "phone-error" : undefined}
            className={cn(hint && "border-destructive focus-visible:ring-destructive/40")}
          />
          {hint ? (
            <p id="phone-error" className="text-xs text-destructive">
              {hint}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Always starts with + and the country code — +91 for India, +1 for US/Canada, +44
              for UK, etc. No spaces or dashes.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCall} disabled={loading || !valid}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Place call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
