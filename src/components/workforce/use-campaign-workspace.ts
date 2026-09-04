"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CampaignDTO, CandidateDTO, CallDTO } from "./types";
import { TERMINAL_STATUSES } from "./types";

export function useCampaignWorkspace(campaignId: string | null) {
  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);
  const [candidates, setCandidates] = useState<CandidateDTO[]>([]);
  const [calls, setCalls] = useState<CallDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!campaignId) return;
    const res = await fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setCampaign(data.campaign);
    setCandidates(data.candidates ?? []);
    setCalls(data.calls ?? []);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) {
      setCampaign(null);
      setCandidates([]);
      setCalls([]);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [campaignId, refresh]);

  // Poll while any call is still in-flight, so status/results update without a manual refresh.
  useEffect(() => {
    const hasActiveCall = calls.some((c) => !TERMINAL_STATUSES.has(c.status));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (hasActiveCall && campaignId) {
      intervalRef.current = setInterval(refresh, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [calls, campaignId, refresh]);

  return { campaign, candidates, calls, loading, refresh };
}
