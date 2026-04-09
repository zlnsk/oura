"use client";

import { memo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { StatusChip } from "@/components/ui/StatusChip";
import { MobileBottomNav } from "@/components/ui/MobileBottomNav";
import { useOuraData } from "@/components/layout/OuraDataProvider";

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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <LoadingBar />
      <ConnectionStatus />
      <Sidebar />
      <MobileBottomNav />
      <main
        id="main-content"
        className="lg:ml-60 p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8 xl:p-10 pb-24 lg:pb-12 transition-all duration-200"
      >
        <div className="max-w-[1400px] mx-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
