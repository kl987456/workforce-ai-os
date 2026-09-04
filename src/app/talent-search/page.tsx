"use client";

import { useState } from "react";
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
import { Loader2, Users, Search, Target, PhoneCall, PhoneOutgoing } from "lucide-react";
import { CampaignPicker } from "@/components/workforce/campaign-picker";
import { CandidateTable } from "@/components/workforce/candidate-table";
import { CallTable } from "@/components/workforce/call-table";
import { RoleDistributionChart } from "@/components/workforce/role-distribution-chart";
import { HiringPipelinePanel } from "@/components/workforce/hiring-pipeline-panel";
import { useCampaignWorkspace } from "@/components/workforce/use-campaign-workspace";
import { StatTiles } from "@/components/workforce/stat-tiles";
import { TERMINAL_STATUSES } from "@/components/workforce/types";

function NewSearchDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      setTitle("");
      setDescription("");
      onCreated(data.campaign.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
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

export default function TalentSearchPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const { campaign, candidates, calls, loading, refresh } = useCampaignWorkspace(activeId);

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
          onNew={() => {}}
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
          </div>
        )}

        {activeId && campaign && !loading && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{campaign.title}</CardTitle>
                <CardDescription>
                  {candidates.length} candidates matched · seeded demo data source
                </CardDescription>
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

            <RoleDistributionChart candidates={candidates} />

            <Tabs defaultValue="candidates">
              <TabsList>
                <TabsTrigger value="candidates">
                  Matched candidates ({candidates.length})
                </TabsTrigger>
                <TabsTrigger value="calls">
                  Reachout calls & responses ({calls.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="candidates" className="mt-4">
                <CandidateTable
                  candidates={candidates}
                  campaignId={campaign.id}
                  purpose="TALENT_REACHOUT"
                  onCallCreated={bump}
                  emptyLabel="No matches found for this description — try broadening it."
                  draggableToHiring
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
