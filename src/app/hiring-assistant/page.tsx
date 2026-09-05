"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, Mic, Users2, PhoneOutgoing, PhoneCall, ThumbsUp, Download } from "lucide-react";
import { CampaignPicker } from "@/components/workforce/campaign-picker";
import { CandidateTable } from "@/components/workforce/candidate-table";
import { CustomizeAgentDialog } from "@/components/workforce/customize-agent-dialog";
import { CallTable } from "@/components/workforce/call-table";
import { TableSkeleton } from "@/components/workforce/table-skeleton";
import { useCampaignWorkspace } from "@/components/workforce/use-campaign-workspace";
import { StatTiles } from "@/components/workforce/stat-tiles";
import { isE164, phoneHint } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { CallDTO, CampaignDTO, CandidateDTO } from "@/components/workforce/types";

// Turns a campaign title into a filesystem-safe slug for export filenames:
// lowercase, whitespace runs to single hyphens, then strip anything left
// that isn't a lowercase letter, digit, or hyphen.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Summarizes a call's status plus any extracted result fields into one
// human-readable string for a CSV cell, e.g. "COMPLETED — recommendation: advance".
function formatCallSummary(call: CallDTO | undefined): string {
  if (!call) return "";
  const parts: string[] = [call.status];
  if (call.result) {
    const resultText = Object.entries(call.result)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`)
      .join(", ");
    if (resultText) parts.push(resultText);
  }
  return parts.join(" — ");
}

function exportCandidatesCsv(campaign: CampaignDTO, candidates: CandidateDTO[], calls: CallDTO[]) {
  if (candidates.length === 0) {
    toast.error("No candidates to export");
    return;
  }
  const rows = candidates.map((c) => {
    const latestCall = calls
      .filter((call) => call.candidateId === c.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return {
      name: c.name,
      email: c.email ?? "",
      phone: c.phone,
      role: c.roleTitle ?? "",
      location: c.location ?? "",
      "years experience": c.yearsExperience ?? "",
      skills: c.skills.join("; "),
      isFavorite: c.isFavorite,
      notes: c.notes ?? "",
      "latest call summary": formatCallSummary(latestCall),
    };
  });
  downloadCsv(`${slugify(campaign.title)}-candidates-${formatDateYMD(new Date())}.csv`, toCsv(rows));
}

function NewRequisitionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title || !description) {
      toast.error("Title and job description are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "HIRING",
          title,
          department: department || undefined,
          location: location || undefined,
          jobDescription: description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not create requisition", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success("Requisition created");
      onOpenChange(false);
      onCreated(data.campaign.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setTitle("");
          setDepartment("");
          setLocation("");
          setDescription("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          New requisition
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New hiring requisition</DialogTitle>
          <DialogDescription>
            Candidates you add here will be screened by the Hunar Voice AI hiring agent.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-title">Role title</Label>
            <Input id="req-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Staff AI Infrastructure Engineer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="req-dept">Department</Label>
              <Input id="req-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="req-loc">Location</Label>
              <Input id="req-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote / SF" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-desc">Job description</Label>
            <Textarea
              id="req-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the job description here. It's given to candidates as context and shapes the screening agent's questions."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create requisition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCandidateDialog({
  campaignId,
  defaultRole,
  onAdded,
}: {
  campaignId: string;
  defaultRole: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const hint = phoneHint(phone);

  async function handleAdd() {
    if (!name || !phone) {
      toast.error("Name and phone number are required");
      return;
    }
    if (!isE164(phone)) {
      toast.error("Phone number isn't valid yet", { description: hint ?? undefined });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || undefined, roleTitle: role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not add candidate", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success(`${name} added to pipeline`);
      resetAndClose();
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setOpen(false);
    setName("");
    setPhone("");
    setEmail("");
    setRole(defaultRole);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setOpen(true);
        else resetAndClose();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a candidate</DialogTitle>
          <DialogDescription>
            Use a real phone number in E.164 format if you want to actually place a Hunar call
            (you can test with your own number).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-name">Full name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-phone">Phone (E.164 — any country)</Label>
            <Input
              id="c-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+917411771293 or +15551234567"
              aria-invalid={!!hint}
              aria-describedby={hint ? "c-phone-error" : undefined}
              className={cn(hint && "border-destructive focus-visible:ring-destructive/40")}
            />
            {hint ? (
              <p id="c-phone-error" className="text-xs text-destructive">
                {hint}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                + and country code, no spaces — +91 India, +1 US/Canada, +44 UK, etc.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-email">Email (optional)</Label>
            <Input id="c-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-role">Role applying for</Label>
            <Input id="c-role" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HiringAssistantPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignParam = searchParams.get("campaign");
  const [activeId, setActiveIdState] = useState<string | null>(campaignParam);
  const [refreshToken, setRefreshToken] = useState(0);
  const [newReqOpen, setNewReqOpen] = useState(false);
  // Lifted to this always-mounted parent (rather than left uncontrolled on <Tabs>)
  // so the selected tab survives the Tabs subtree unmounting/remounting whenever
  // the workspace re-enters its loading state, e.g. switching requisitions.
  const [tab, setTab] = useState("candidates");
  const { campaign, candidates, calls, loading, refresh } = useCampaignWorkspace(activeId);

  // Keep in sync when the ?campaign= query param changes without a remount —
  // e.g. selecting a different campaign from the command palette while already here.
  useEffect(() => {
    setActiveIdState((current) => (campaignParam !== current ? campaignParam : current));
  }, [campaignParam]);

  function setActiveId(id: string | null) {
    setActiveIdState(id);
    router.replace(id ? `/hiring-assistant?campaign=${id}` : "/hiring-assistant", { scroll: false });
  }

  function bump() {
    setRefreshToken((t) => t + 1);
    refresh();
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">AI Hiring Assistant</h1>
        </div>
        <NewRequisitionDialog
          open={newReqOpen}
          onOpenChange={setNewReqOpen}
          onCreated={(id) => {
            bump();
            setActiveId(id);
          }}
        />
        <Separator />
        <CampaignPicker
          kind="HIRING"
          activeId={activeId}
          onSelect={setActiveId}
          onNew={() => setNewReqOpen(true)}
          onDeleted={(id) => {
            if (id === activeId) setActiveId(null);
          }}
          refreshToken={refreshToken}
        />
      </div>

      <div className="flex flex-col gap-6">
        {!activeId && (
          <Card>
            <CardHeader>
              <CardTitle>Get started</CardTitle>
              <CardDescription>
                Create a requisition, add candidates with real phone numbers, then trigger a Hunar
                Voice AI phone screen for each. Extracted answers land on this page automatically
                once the call ends.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {activeId && loading && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <TableSkeleton columns={5} />
          </div>
        )}

        {activeId && campaign && !loading && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{campaign.title}</CardTitle>
                    <CardDescription>
                      {[campaign.department, campaign.location].filter(Boolean).join(" · ") ||
                        "No department/location set"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <CustomizeAgentDialog campaignId={campaign.id} purpose="HIRING_SCREEN" />
                    <AddCandidateDialog campaignId={campaign.id} defaultRole={campaign.title} onAdded={bump} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-4">
                  {campaign.jobDescription}
                </p>
              </CardContent>
            </Card>

            <StatTiles
              stats={[
                { label: "Pipeline size", value: String(candidates.length), icon: Users2 },
                { label: "Screens placed", value: String(calls.length), icon: PhoneOutgoing },
                {
                  label: "Screens completed",
                  value: String(calls.filter((c) => c.status === "COMPLETED").length),
                  icon: PhoneCall,
                  tone: "warning",
                },
                {
                  label: "Advance rate",
                  value: (() => {
                    const completed = calls.filter(
                      (c) => c.status === "COMPLETED" && c.result?.recommendation
                    );
                    if (completed.length === 0) return "—";
                    const advancing = completed.filter((c) => c.result?.recommendation === "advance");
                    return `${Math.round((advancing.length / completed.length) * 100)}%`;
                  })(),
                  hint: "of screens with a recommendation",
                  icon: ThumbsUp,
                  tone: "success",
                },
              ]}
            />

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportCandidatesCsv(campaign, candidates, calls)}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="candidates">
                  Candidate pipeline ({candidates.length})
                </TabsTrigger>
                <TabsTrigger value="calls">
                  Calls & extracted results ({calls.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="candidates" className="mt-4">
                <CandidateTable
                  candidates={candidates}
                  campaignId={campaign.id}
                  purpose="HIRING_SCREEN"
                  onCallCreated={bump}
                  emptyLabel="No candidates yet — add one to trigger a Hunar phone screen."
                />
              </TabsContent>
              <TabsContent value="calls" className="mt-4">
                <CallTable calls={calls} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

export default function HiringAssistantPage() {
  return (
    <Suspense fallback={null}>
      <HiringAssistantPageInner />
    </Suspense>
  );
}
