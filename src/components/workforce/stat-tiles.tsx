"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatTileData {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning";
}

const TONE_CLASSES: Record<NonNullable<StatTileData["tone"]>, string> = {
  default: "text-primary bg-accent",
  success: "text-success-foreground bg-success",
  warning: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950",
};

// Animates a numeric target from its previously-displayed value up to the new
// one over `duration`ms using requestAnimationFrame (eased, not linear).
// Non-numeric stat values (percentages, "—") never reach this — see StatValue.
function useCountUp(target: number, duration = 500) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (displayRef.current === target) return;
    const from = displayRef.current;
    const start = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

function StatValue({ value }: { value: string }) {
  const isPlainInteger = /^\d+$/.test(value);
  const target = isPlainInteger ? Number(value) : 0;
  const display = useCountUp(target);

  return (
    <span className="text-2xl font-semibold text-foreground tabular-nums">
      {isPlainInteger ? display : value}
    </span>
  );
}

export function StatTiles({ stats }: { stats: StatTileData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </span>
              <StatValue value={s.value} />
              {s.hint && <span className="text-[11px] text-muted-foreground">{s.hint}</span>}
            </div>
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[s.tone ?? "default"])}>
              <s.icon className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
