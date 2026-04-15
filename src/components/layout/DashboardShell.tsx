"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { StatusChip } from "@/components/ui/StatusChip";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sleep", label: "Sleep" },
  { href: "/activity", label: "Activity" },
  { href: "/readiness", label: "Readiness" },
  { href: "/heart-rate", label: "Heart Rate" },
  { href: "/stress", label: "Stress" },
  { href: "/workouts", label: "Workouts" },
  { href: "/weight", label: "Weight" },
  { href: "/settings", label: "Settings" },
];

const LoadingBar = memo(function LoadingBar() {
  const { loading } = useOuraData();
  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px]">
      <div className="h-full bg-[#4285f4] animate-loading-bar" />
    </div>
  );
});

const ConnectionStatus = memo(function ConnectionStatus() {
  const { loading, isOffline, isStale, error, lastUpdated } = useOuraData();

  let variant: "synced" | "syncing" | "stale" | "offline" | "error" = "synced";
  let label: string | undefined;

  if (isOffline) {
    variant = "offline";
  } else if (error) {
    variant = "error";
    label = "Sync failed";
  } else if (loading) {
    variant = "syncing";
  } else if (isStale) {
    variant = "stale";
    if (lastUpdated) {
      const mins = Math.round((Date.now() - lastUpdated) / 60000);
      label = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
    }
  } else if (lastUpdated) {
    const mins = Math.round((Date.now() - lastUpdated) / 60000);
    if (mins < 2) label = "Just now";
    else if (mins < 60) label = `${mins}m ago`;
    else label = `${Math.round(mins / 60)}h ago`;
  }

  return (
    <div className="fixed top-4 right-4 sm:right-8 z-40" role="status" aria-live="polite">
      <StatusChip variant={variant} label={label} />
    </div>
  );
});

function BrandHeader() {
  const pathname = usePathname();
  return (
    <header className="hero">
      <Link href="/dashboard" className="inline-block">
        <h1 className="m3-brand-title">Oura</h1>
      </Link>
      <nav
        className="mt-6 mx-auto max-w-[960px] overflow-x-auto scrollbar-thin"
        role="navigation"
        aria-label="Main navigation"
      >
        <ul className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--m3-surface-container,rgba(0,0,0,0.04))] border border-[var(--border)]">
          {tabs.map((tab) => {
            const active = pathname === tab.href || (tab.href === "/dashboard" && pathname === "/");
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center px-3.5 py-1.5 rounded-full text-[12px] font-medium tracking-wide whitespace-nowrap transition-all",
                    active
                      ? "bg-[var(--m3-primary,#4285f4)] text-[var(--m3-on-primary,#fff)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-container-high,rgba(0,0,0,0.06))] hover:text-[var(--text-primary)]"
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <LoadingBar />
      <ConnectionStatus />
      <BrandHeader />
      <main
        id="main-content"
        className="px-4 sm:px-6 lg:px-8 pb-24"
      >
        <div className="max-w-[1200px] mx-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
