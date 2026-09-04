"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Status = "checking" | "connected" | "unreachable";

export function HunarStatusBadge() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStatus(data.hunar === "connected" ? "connected" : "unreachable");
      })
      .catch(() => {
        if (!cancelled) setStatus("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "connected" && "border-success-foreground/20 bg-success text-success-foreground",
        status === "unreachable" && "border-destructive/20 bg-destructive/10 text-destructive",
        status === "checking" && "border-border bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "connected" && "bg-emerald-500 animate-pulse",
          status === "unreachable" && "bg-destructive",
          status === "checking" && "bg-muted-foreground"
        )}
      />
      {status === "connected" && "Hunar Voice API connected"}
      {status === "unreachable" && "Hunar Voice API unreachable"}
      {status === "checking" && "Checking Hunar API…"}
    </span>
  );
}
