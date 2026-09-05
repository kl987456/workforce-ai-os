"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Mic, Users, SearchIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { CampaignDTO } from "@/components/workforce/types";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/hiring-assistant", label: "AI Hiring Assistant", icon: Mic },
  { href: "/talent-search", label: "Talent Search & Reachout", icon: Users },
] as const;

function campaignHref(campaign: CampaignDTO) {
  const base = campaign.kind === "HIRING" ? "/hiring-assistant" : "/talent-search";
  return `${base}?campaign=${campaign.id}`;
}

export function CommandPalette({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState<CampaignDTO[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCampaigns(data.campaigns ?? []);
      })
      .catch(() => {
        if (!cancelled) setCampaigns([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function runCommand(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <SearchIcon className="h-3 w-3" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="ml-0.5 rounded border border-border/70 bg-background px-1 py-px font-mono text-[10px] leading-none">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Navigate, search campaigns…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Campaigns">
            {loading && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Loading campaigns…
              </div>
            )}
            {!loading && campaigns.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No campaigns yet.
              </div>
            )}
            {!loading &&
              campaigns.map((campaign) => (
                <CommandItem
                  key={campaign.id}
                  value={`${campaign.title} ${campaign.kind}`}
                  onSelect={() => runCommand(() => router.push(campaignHref(campaign)))}
                >
                  {campaign.kind === "HIRING" ? <Mic /> : <Users />}
                  <span className="truncate">{campaign.title}</span>
                  <CommandShortcut>
                    {campaign.kind === "HIRING" ? "Hiring" : "Talent Search"}
                  </CommandShortcut>
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
