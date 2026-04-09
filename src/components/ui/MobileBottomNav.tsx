"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BedDouble,
  Activity,
  Heart,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const primaryTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/sleep", icon: BedDouble, label: "Sleep" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/heart-rate", icon: Heart, label: "Heart" },
];

const moreTabs = [
  { href: "/readiness", label: "Readiness" },
  { href: "/stress", label: "Stress" },
  { href: "/workouts", label: "Workouts" },
  { href: "/weight", label: "Weight" },
  { href: "/settings", label: "Settings" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreTabs.some((t) => pathname === t.href);

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 lg:hidden"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-16 left-4 right-4 z-50 lg:hidden animate-slide-up">
            <div className="elevated-card p-2 grid grid-cols-3 gap-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
              {moreTabs.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-medium text-center transition-all",
                    pathname === href
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav className="bottom-nav lg:hidden" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {primaryTabs.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[56px] transition-all",
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={cn("w-5 h-5", isActive && "scale-110")} style={{ transition: "transform 200ms ease" }} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[56px] transition-all",
              isMoreActive || showMore
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500"
            )}
            aria-label="More pages"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
