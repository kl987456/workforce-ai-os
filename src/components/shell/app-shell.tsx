import { SidebarNav } from "./sidebar-nav";
import { HunarStatusBadge } from "./hunar-status-badge";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md lg:px-6">
          <MobileNav />
          <CommandPalette className="ml-auto" />
          <HunarStatusBadge />
          <ThemeToggle />
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
