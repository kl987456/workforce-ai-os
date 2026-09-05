"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Users, Search, Target, PhoneCall, PhoneOutgoing, Download } from "lucide-react";
import { CampaignPicker } from "@/components/workforce/campaign-picker";
import { CandidateTable } from "@/components/workforce/candidate-table";
import { CustomizeAgentDialog } from "@/components/workforce/customize-agent-dialog";
import { BulkReachoutDialog } from "@/components/workforce/bulk-reachout-dialog";
import { CallTable } from "@/components/workforce/call-table";
import { RoleDistributionChart } from "@/components/workforce/role-distribution-chart";
import { HiringPipelinePanel } from "@/components/workforce/hiring-pipeline-panel";
import { TableSkeleton } from "@/components/workforce/table-skeleton";
import { useCampaignWorkspace } from "@/components/workforce/use-campaign-workspace";
import { StatTiles } from "@/components/workforce/stat-tiles";
import { TERMINAL_STATUSES } from "@/components/workforce/types";
import type { CallDTO, CampaignDTO, CandidateDTO } from "@/components/workforce/types";
import { toCsv, downloadCsv } from "@/lib/csv";

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
// human-readable string for a CSV cell, e.g. "COMPLETED — interest level: high".
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
      role: c.roleTitle ?? "",
      company: c.company ?? "",
      location: c.location ?? "",
      "years experience": c.yearsExperience ?? "",
      skills: c.skills.join("; "),
      "match score": c.matchScore ?? "",
      isFavorite: c.isFavorite,
      notes: c.notes ?? "",
      "latest reachout summary": formatCallSummary(latestCall),
    };
  });
  downloadCsv(`${slugify(campaign.title)}-candidates-${formatDateYMD(new Date())}.csv`, toCsv(rows));
}

function NewSearchDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
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
        body: JSON.stringify({ kind: "TALENT_SEARCH", title, jobDescription: description }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not run search", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success(`Found ${data.candidates.length} matching candidates`);
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
          setDescription("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="w-full gap-1.5">
          <Search className="h-3.5 w-3.5" /> New search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search for candidates from a job description</DialogTitle>
          <DialogDescription>
            Paste a JD. We rank the talent pool against it and return the best matches — trigger a
            Hunar voice reachout call directly from the results.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-title">Search title</Label>
            <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior ML Infra Engineer sourcing sweep" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-desc">Job description</Label>
            <Textarea
              id="s-desc"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description — skills, seniority, and location mentioned here drive the match ranking."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TalentSearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignParam = searchParams.get("campaign");
  const [activeId, setActiveIdState] = useState<string | null>(campaignParam);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newSearchOpen, setNewSearchOpen] = useState(false);
  // Lifted to this always-mounted parent so it survives the Tabs subtree
  // unmounting/remounting whenever the workspace re-enters its loading state.
  const [tab, setTab] = useState("candidates");
  const { campaign, candidates, calls, loading, refresh } = useCampaignWorkspace(activeId);

  // Keep in sync when the ?campaign= query param changes without a remount —
  // e.g. selecting a different campaign from the command palette while already here.
  useEffect(() => {
    setActiveIdState((current) => (campaignParam !== current ? campaignParam : current));
  }, [campaignParam]);

  // Selection is scoped to the active campaign's candidate list — clear it whenever
  // that list changes so stale ids from a previous campaign never linger.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeId]);

  function setActiveId(id: string | null) {
    setActiveIdState(id);
    router.replace(id ? `/talent-search?campaign=${id}` : "/talent-search", { scroll: false });
  }

  function bump() {
    setRefreshToken((t) => t + 1);
    refresh();
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <HiringPipelinePanel />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">Talent Search & Reachout</h1>
        </div>
        <NewSearchDialog
          open={newSearchOpen}
          onOpenChange={setNewSearchOpen}
          onCreated={(id) => {
            bump();
            setActiveId(id);
          }}
        />
        <Separator />
        <CampaignPicker
          kind="TALENT_SEARCH"
          activeId={activeId}
          onSelect={setActiveId}
          onNew={() => setNewSearchOpen(true)}
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
                Paste a job description to source a ranked candidate shortlist, then trigger a
                Hunar Voice AI outreach call per candidate. Search currently runs against a{" "}
                <Badge variant="outline" className="align-middle text-[10px]">
                  seeded demo talent pool
                </Badge>{" "}
                behind a provider-agnostic adapter — swap in a real people-search API (PDL,
                Apollo.io, Proxycurl, Coresignal) with no UI changes.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {activeId && loading && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <TableSkeleton columns={7} />
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
                      {candidates.length} candidates matched · seeded demo data source
                    </CardDescription>
                  </div>
                  <CustomizeAgentDialog campaignId={campaign.id} purpose="TALENT_REACHOUT" />
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
                {
                  label: "Candidates matched",
                  value: String(candidates.length),
                  icon: Users,
                },
                {
                  label: "Avg match score",
                  value:
                    candidates.length > 0
                      ? `${(
                          candidates.reduce((sum, c) => sum + (c.matchScore ?? 0), 0) /
                          candidates.length
                        ).toFixed(0)}%`
                      : "—",
                  icon: Target,
                  tone: "success",
                },
                {
                  label: "Reachout calls placed",
                  value: String(calls.length),
                  icon: PhoneOutgoing,
                },
                {
                  label: "Calls completed",
                  value: String(calls.filter((c) => c.status === "COMPLETED").length),
                  hint:
                    calls.length > 0
                      ? `${calls.filter((c) => TERMINAL_STATUSES.has(c.status)).length}/${calls.length} finished`
                      : undefined,
                  icon: PhoneCall,
                  tone: "warning",
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

            <RoleDistributionChart candidates={candidates} />

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="candidates">
                  Matched candidates ({candidates.length})
                </TabsTrigger>
                <TabsTrigger value="calls">
                  Reachout calls & responses ({calls.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="candidates" className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-end">
                  <BulkReachoutDialog
                    campaignId={campaign.id}
                    candidateIds={Array.from(selectedIds)}
                    onPlaced={() => {
                      setSelectedIds(new Set());
                      bump();
                    }}
                  />
                </div>
                <CandidateTable
                  candidates={candidates}
                  campaignId={campaign.id}
                  purpose="TALENT_REACHOUT"
                  onCallCreated={bump}
                  emptyLabel="No matches found for this description — try broadening it."
                  draggableToHiring
                  enableBulkSelect
                  selectedIds={selectedIds}
                  onSelectedIdsChange={setSelectedIds}
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

export default function TalentSearchPage() {
  return (
    <Suspense fallback={null}>
      <TalentSearchPageInner />
    </Suspense>
  );
}
