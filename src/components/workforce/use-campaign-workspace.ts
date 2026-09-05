"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CampaignDTO, CandidateDTO, CallDTO } from "./types";
import { TERMINAL_STATUSES } from "./types";

// How long to wait, after an EventSource reports an error, for it to
// self-recover (browsers auto-reconnect an SSE connection) before we treat
// it as stuck and fall back to polling.
const SSE_RECOVERY_GRACE_MS = 6000;
const FALLBACK_POLL_INTERVAL_MS = 5000;

export function useCampaignWorkspace(campaignId: string | null) {
  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);
  const [candidates, setCandidates] = useState<CandidateDTO[]>([]);
  const [calls, setCalls] = useState<CallDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCampaignIdRef = useRef<string | null>(null);
  const lastErrorToastAtRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!campaignId) return;
    const requestedId = campaignId;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" });
      // A slower response for a campaign we've since navigated away from — drop it
      // rather than overwriting the screen with stale data.
      if (activeCampaignIdRef.current !== requestedId) return;
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      if (activeCampaignIdRef.current !== requestedId) return;
      setCampaign(data.campaign);
      setCandidates(data.candidates ?? []);
      setCalls(data.calls ?? []);
    } catch {
      // Rate-limit the toast so a run of failed 5s polls doesn't spam the user.
      const now = Date.now();
      if (now - lastErrorToastAtRef.current > 15000) {
        lastErrorToastAtRef.current = now;
        toast.error("Couldn't refresh — retrying", {
          description: "Showing the last data we successfully loaded.",
        });
      }
    }
  }, [campaignId]);

  useEffect(() => {
    activeCampaignIdRef.current = campaignId;
    if (!campaignId) {
      setCampaign(null);
      setCandidates([]);
      setCalls([]);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [campaignId, refresh]);

  // Derive the boolean rather than depending on the `calls` array directly so the
  // stream/poll effect below only tears down and reconnects when in-flight-ness
  // actually flips, not on every field update the stream itself delivers.
  const hasActiveCall = useMemo(
    () => calls.some((c) => !TERMINAL_STATUSES.has(c.status)),
    [calls]
  );

  const applyPayload = useCallback(
    (requestedId: string, data: { campaign: CampaignDTO; candidates?: CandidateDTO[]; calls?: CallDTO[] }) => {
      // Same staleness guard as refresh(): drop data for a campaign we've since
      // navigated away from.
      if (activeCampaignIdRef.current !== requestedId) return;
      setCampaign(data.campaign);
      setCandidates(data.candidates ?? []);
      setCalls(data.calls ?? []);
    },
    []
  );

  // Stream live updates via SSE while a call is in-flight, so status/results update
  // without a manual refresh. Falls back to the old 5s poll if the stream can't be
  // kept alive, so the feature degrades gracefully instead of silently going stale.
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!hasActiveCall || !campaignId) {
      return;
    }

    const requestedId = campaignId;
    let closed = false;
    let recoveryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRecoveryTimer = () => {
      if (recoveryTimer) {
        clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
    };

    const stopFallbackPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startFallbackPolling = () => {
      if (closed || intervalRef.current) return;
      intervalRef.current = setInterval(refresh, FALLBACK_POLL_INTERVAL_MS);
    };

    const es = new EventSource(`/api/campaigns/${requestedId}/stream`);

    es.onopen = () => {
      // Connection is live (initial open, or the browser's own auto-reconnect
      // succeeded) — no need for the fallback poll.
      clearRecoveryTimer();
      stopFallbackPolling();
    };

    es.onmessage = (event) => {
      clearRecoveryTimer();
      stopFallbackPolling();
      try {
        const data = JSON.parse(event.data);
        applyPayload(requestedId, data);
      } catch {
        // Malformed payload — ignore, the next tick will self-correct.
      }
    };

    es.onerror = () => {
      // The browser will try to auto-reconnect on its own. Give it a few
      // seconds; if `onopen`/`onmessage` haven't fired by then, treat the
      // stream as stuck and fall back to polling.
      if (closed || recoveryTimer) return;
      recoveryTimer = setTimeout(() => {
        recoveryTimer = null;
        startFallbackPolling();
      }, SSE_RECOVERY_GRACE_MS);
    };

    return () => {
      closed = true;
      clearRecoveryTimer();
      es.close();
      stopFallbackPolling();
    };
  }, [hasActiveCall, campaignId, refresh, applyPayload]);

  return { campaign, candidates, calls, loading, refresh };
}
