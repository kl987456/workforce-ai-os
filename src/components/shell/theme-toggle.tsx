"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Before mount (theme unknown) we render as "system" — matches the fallback
  // the icon used to show outright, but now it morphs into place instead of
  // popping in once mounted.
  function isActiveIcon(value: (typeof OPTIONS)[number]["value"]) {
    return mounted ? theme === value : value === "system";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className={cn("relative", className)}
        >
          <span className="relative inline-flex size-4 items-center justify-center">
            {OPTIONS.map(({ value, icon: Icon }) => (
              <Icon
                key={value}
                className={cn(
                  "absolute size-4 transition-all duration-300 ease-out",
                  isActiveIcon(value)
                    ? "rotate-0 scale-100 opacity-100"
                    : "rotate-90 scale-0 opacity-0"
                )}
              />
            ))}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            data-active={mounted && theme === value}
            className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
