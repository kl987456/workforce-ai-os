import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  MessageSquareText,
  Users2,
  ShieldCheck,
  LineChart,
  Wallet,
  AlertTriangle,
  RadioTower,
} from "lucide-react";

const CHANNELS = [
  {
    icon: Phone,
    title: "Primary: an LLM voice check-in call",
    priority: "Covers ~90% of check-ins",
    body: "Each worker calls one memorable toll-free/local-rate number (or is auto-dialed at shift start by the same Hunar-style voice agent used elsewhere in this app). A short natural conversation — not a rigid press-1 IVR tree — confirms identity, site, and shift, and logs a timestamp in under 30 seconds.",
    why: "An LLM voice agent understands accents, dialects, and code-switching, and can handle real conversation ('running 10 minutes late, shuttle broke down') instead of forcing every worker through a rigid menu tree in a language they may not read fluently.",
  },
  {
    icon: MessageSquareText,
    title: "Fallback: SMS / USSD short-code",
    priority: "For poor voice coverage or hearing-impaired workers",
    body: "Text CHECKIN <PIN> <SITE_CODE> to a short code. Works over the weakest 2G data links, costs a fraction of a voice call, and needs nothing beyond a basic feature phone.",
    why: "Some remote sites have usable SMS/USSD signal long before they have clear voice coverage — this is the resilience layer, not the primary UX.",
  },
  {
    icon: Users2,
    title: "Batch: supervisor verbal roll-call",
    priority: "For sites sharing one phone line",
    body: "The site foreman makes one call and reads the roster aloud. Speaker-diarized transcription cross-references each name against that site's expected roster and stamps simultaneous attendance for up to 20-30 workers in under 30 seconds.",
    why: "Not every worker needs their own phone — one shared line per site is enough when the LLM can separate and attribute multiple voices in a single call.",
  },
];

const INTEGRITY_CONTROLS = [
  {
    title: "Voice biometric enrollment",
    body: "Each worker enrolls a voiceprint once (in person, during onboarding). Every check-in call is matched against it before being accepted.",
  },
  {
    title: "Caller-ID / ANI whitelisting",
    body: "Each of the 100 sites has a registered landline, VoIP kiosk, or the worker's own registered number. Calls from unrecognized numbers are flagged, not silently accepted.",
  },
  {
    title: "Liveness challenge",
    body: "A short, randomized repeat-after-me phrase defeats simple pre-recorded playback and raises the bar against basic voice-clone replay.",
  },
  {
    title: "Impossible-travel detection",
    body: "If badge #5104 checks in at Site A and Site B 8 minutes apart and they're 200 miles apart, that's a physics violation, not a scheduling one — auto-flagged for HR review, never auto-approved or auto-punished.",
  },
];

export default function AttendanceOsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Badge variant="outline" className="w-fit font-mono text-xs text-muted-foreground">
          Question 3 — design proposal, not a live product
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          No smartphones, but LLMs exist. How do you track daily attendance for 1,000 people
          across 100 locations?
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          <strong className="text-foreground">The phone call is the app.</strong> Take away
          smartphones and you take away app stores, push notifications, and GPS-in-app
          geofencing — but landlines, feature phones, PSTN, SMS, and LLMs are all still on the
          table. The one interface every worker at every one of those 100 sites already knows how
          to use, with zero install and zero training, is picking up a phone and talking. So the
          attendance system <em>is</em> a voice AI agent — structurally the same Hunar
          agent/call/webhook pipeline built for the Hiring Assistant and Talent Reachout features
          elsewhere in this app, just pointed at a different job: capture a timestamp and a site
          ID instead of a screening answer.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Three channels, ranked by how much of the population they carry
        </h2>
        <div className="flex flex-col gap-3">
          {CHANNELS.map((c) => (
            <Card key={c.title}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <c.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{c.priority}</Badge>
                    </div>
                    <CardDescription className="mt-1 text-sm leading-relaxed">{c.body}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Why this needs an LLM, not a classic IVR: </span>
                  {c.why}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Making 100 sites trust the same system (anti-fraud)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INTEGRITY_CONTROLS.map((i) => (
            <Card key={i.title}>
              <CardContent className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{i.title}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{i.body}</span>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          None of these controls are individually unbeatable — voice cloning is a real and improving
          threat. The design intentionally layers four weak-ish signals (biometric + ANI + liveness
          + physics) rather than trusting one strong one, and routes anomalies to a human reviewer
          instead of auto-rejecting, because the cost of wrongly flagging a real worker as fraud is
          higher than the cost of a slower review queue.
        </p>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <LineChart className="h-4 w-4" /> What HR actually sees
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Every check-in call ends the same way the calls in the Hiring Assistant and Talent
              Reachout features do: a structured <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">result_schema</code>{" "}
              (site_id, checked_in, check-in time, self-reported reason if late, anomaly flags) is
              delivered by webhook and written straight into the same kind of dashboard already
              built in this app — a 100-tile site grid, a live anomaly queue, and a per-site
              attendance percentage, instead of an HR analyst reconciling 100 spreadsheets by hand
              every evening.
            </p>
            <p>
              An LLM also drafts the daily summary itself — absentee list per site, flagged
              anomalies, and week-over-week punctuality trend — as a short natural-language brief
              rather than a raw export, because the person reading it is trying to decide what to
              act on, not re-derive the numbers.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-primary" /> Why this beats a hardware rollout
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground">
            Biometric kiosks at 100 sites mean 100 devices to procure, ship, power, network, and
            maintain. A voice line needs none of that — PSTN minutes are cheap at scale, there's no
            hardware to fail, and a new site goes live the moment its number is registered.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <RadioTower className="h-4 w-4 text-primary" /> Why it works where connectivity doesn't
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground">
            Voice runs over 2G and satellite links long before a data-hungry app would load. No
            app store, no OS-version fragmentation, no forced update breaking check-in on the one
            day it matters most.
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Honest limitations, stated plainly:</strong> this
          still requires access to <em>some</em> phone (personal, shared, or site landline) — cheap
          compared to a smartphone, but not free; voice-clone spoofing is a real and moving target,
          mitigated but not eliminated by the layered controls above; and non-trivial telephony
          spend at 1,000 people × 2 calls/day × 100 sites needs a real budget line, even though it's
          an order of magnitude below hardware biometrics at every site.
        </p>
      </div>
    </div>
  );
}
