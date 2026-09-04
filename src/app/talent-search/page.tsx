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
import { Loader2, Users, Search } from "lucide-react";
import { CampaignPicker } from "@/components/workforce/campaign-picker";
import { CandidateList } from "@/components/workforce/candidate-list";
import { CallList } from "@/components/workforce/call-list";
import { useCampaignWorkspace } from "@/components/workforce/use-campaign-workspace";

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

            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Matched candidates ({candidates.length})
              </h2>
              <CandidateList
                candidates={candidates}
                campaignId={campaign.id}
                purpose="TALENT_REACHOUT"
                onCallCreated={bump}
                emptyLabel="No matches found for this description — try broadening it."
              />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Reachout calls & conversation responses ({calls.length})
              </h2>
              <CallList calls={calls} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
