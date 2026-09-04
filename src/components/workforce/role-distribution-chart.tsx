"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { CandidateDTO } from "./types";

const chartConfig = {
  count: { label: "Matched candidates", color: "var(--color-primary)" },
} satisfies ChartConfig;

export function RoleDistributionChart({ candidates }: { candidates: CandidateDTO[] }) {
  const counts = new Map<string, number>();
  for (const c of candidates) {
    const role = (c.roleTitle ?? "Unknown").replace(/^(Staff|Senior|Junior)\s+/, "");
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  const data = Array.from(counts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Roles represented in this shortlist</CardTitle>
        <CardDescription>Top role archetypes among the matched candidates</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="role"
              tickLine={false}
              axisLine={false}
              width={150}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
