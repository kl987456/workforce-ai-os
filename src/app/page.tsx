import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Users, ArrowRight, Phone, Database, Webhook, Search } from "lucide-react";

const FEATURES = [
  {
    href: "/hiring-assistant",
    icon: Mic,
    title: "1. AI Hiring Assistant",
    tag: "Live product",
    description:
      "Create a requisition, add candidates, and let a Hunar Voice AI agent conduct the first-round phone screen — then read the extracted answers (interest, comp, notice period, recommendation) back on a dashboard.",
  },
  {
    href: "/talent-search",
    icon: Users,
    title: "2. Talent Search & Reachout",
    tag: "Live product",
    description:
      "Paste a job description, get a ranked candidate shortlist, and trigger a Hunar voice outreach call per candidate. Conversation responses flow back via webhook onto the same dashboard.",
  },
];

const ARCHITECTURE_NOTES = [
  {
    icon: Phone,
    title: "Hunar Voice AI",
    text: "Every outbound call — hiring screen or sourcing reachout — is placed through Hunar's /calls API with a per-purpose agent (custom prompt, objective, and result schema).",
  },
  {
    icon: Webhook,
    title: "Signed webhooks",
    text: "call_status_updated, call_recording_done, call_result_done and call_summary land on /api/webhooks/hunar, verified with HMAC-SHA256 over the raw body before anything is written.",
  },
  {
    icon: Database,
    title: "Neon Postgres",
    text: "Agents, campaigns, candidates, calls and a full webhook audit trail are persisted via Drizzle ORM, so results are still there after the call ends and the page is closed.",
  },
  {
    icon: Search,
    title: "Provider-agnostic search",
    text: "People-search runs through a single adapter interface. It ships with a realistic seeded dataset (no PDL/Apollo/Proxycurl/Coresignal key was supplied) — swap in a real provider with zero UI changes.",
  },
];

export default function OverviewPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Badge variant="outline" className="w-fit text-xs font-mono text-muted-foreground">
          Powered by Hunar Voice AI
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Workforce AI Operating System
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A voice-AI hiring assistant and a JD-to-reachout talent sourcing tool, both wired to
          real Hunar Voice AI agents in one app.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <f.icon className="h-4.5 w-4.5" />
                  </div>
                  <Badge
                    variant={f.tag === "Live product" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {f.tag}
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-base">{f.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {f.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the Hunar integration is wired</CardTitle>
          <CardDescription>
            Same call pipeline powers both live features — only the agent prompt and where
            candidates come from differ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ARCHITECTURE_NOTES.map((n) => (
              <div key={n.title} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4">
                <n.icon className="h-4 w-4 text-primary" />
                <div className="text-sm font-medium text-foreground">{n.title}</div>
                <p className="text-xs leading-relaxed text-muted-foreground">{n.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
