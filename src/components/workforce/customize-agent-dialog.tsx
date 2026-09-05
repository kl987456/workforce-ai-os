"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Settings2, Trash2 } from "lucide-react";

const VOICE_PERSONAS = ["NEHA", "ROY", "ZOE", "SAM", "MIRA", "EESHA"] as const;
type VoicePersona = (typeof VOICE_PERSONAS)[number];

type Purpose = "HIRING_SCREEN" | "TALENT_REACHOUT";

const DEFAULT_PERSONA: Record<Purpose, { name: string; voice: VoicePersona }> = {
  HIRING_SCREEN: { name: "Neha", voice: "NEHA" },
  TALENT_REACHOUT: { name: "Roy", voice: "ROY" },
};

const STARTING_ROWS = 3;

/**
 * Lets a recruiter customize, per campaign, the exact screening questions and
 * voice persona the Hunar AI agent uses on calls. Purely additive — a campaign
 * that never opens this dialog keeps using the one shared default agent for
 * its purpose (see getOrCreateDefaultAgent).
 */
export function CustomizeAgentDialog({
  campaignId,
  purpose,
}: {
  campaignId: string;
  purpose: Purpose;
}) {
  const [open, setOpen] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<string[]>(() => Array(STARTING_ROWS).fill(""));
  const [voicePersona, setVoicePersona] = useState<VoicePersona>(DEFAULT_PERSONA[purpose].voice);
  const [personaName, setPersonaName] = useState(DEFAULT_PERSONA[purpose].name);

  // Prefill the voice + persona name from the campaign's current custom agent (if
  // it has one) each time the dialog opens — screening questions always start
  // blank since the original list isn't stored separately from the prompt text.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingCurrent(true);
    fetch(`/api/campaigns/${campaignId}/agent`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { agent?: { personaName?: string | null; voicePersona?: string } } | null) => {
        if (cancelled || !data?.agent) return;
        if (data.agent.personaName) setPersonaName(data.agent.personaName);
        if (
          data.agent.voicePersona &&
          (VOICE_PERSONAS as readonly string[]).includes(data.agent.voicePersona)
        ) {
          setVoicePersona(data.agent.voicePersona as VoicePersona);
        }
      })
      .catch(() => {
        // Best-effort prefill only — fall back to purpose defaults already set.
      })
      .finally(() => {
        if (!cancelled) setLoadingCurrent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId]);

  function resetAndClose() {
    setOpen(false);
    setQuestions(Array(STARTING_ROWS).fill(""));
    setVoicePersona(DEFAULT_PERSONA[purpose].voice);
    setPersonaName(DEFAULT_PERSONA[purpose].name);
  }

  function updateQuestion(index: number, value: string) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? value : q)));
  }

  function addQuestion() {
    setQuestions((qs) => (qs.length >= 8 ? qs : [...qs, ""]));
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((_, i) => i !== index)));
  }

  async function handleSave() {
    const cleanQuestions = questions.map((q) => q.trim()).filter(Boolean);
    if (cleanQuestions.length === 0) {
      toast.error("Add at least one screening question");
      return;
    }
    if (!personaName.trim()) {
      toast.error("Persona display name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: cleanQuestions,
          voicePersona,
          personaName: personaName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not save custom agent", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success("Custom AI agent saved", {
        description:
          "Future calls from this campaign will use the new agent. Past calls and results are unaffected.",
      });
      setOpen(false);
    } catch {
      toast.error("Network error saving custom agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Customize AI agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize AI agent</DialogTitle>
          <DialogDescription>
            Set the exact screening questions and voice persona this campaign&apos;s calls should
            use. Future calls from this campaign will use the new agent — past calls and results
            are unaffected.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Screening questions</Label>
            <div className="flex flex-col gap-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={q}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    placeholder={`Question ${i + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => removeQuestion(i)}
                    disabled={questions.length <= 1}
                    aria-label={`Remove question ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1.5"
              onClick={addQuestion}
              disabled={questions.length >= 8}
            >
              <Plus className="h-3.5 w-3.5" /> Add question
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-voice-persona">Voice persona</Label>
              <Select
                value={voicePersona}
                onValueChange={(v) => setVoicePersona(v as VoicePersona)}
              >
                <SelectTrigger id="agent-voice-persona" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_PERSONAS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-persona-name">Persona display name</Label>
              <Input
                id="agent-persona-name"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder={DEFAULT_PERSONA[purpose].name}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingCurrent}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
