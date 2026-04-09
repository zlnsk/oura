"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/layout/ThemeProvider";
import {
  LayoutDashboard,
  Moon,
  Sun,
  BedDouble,
  Activity,
  Heart,
  Zap,
  Brain,
  Dumbbell,
  Scale,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/sleep", icon: BedDouble, label: "Sleep" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/readiness", icon: Zap, label: "Readiness" },
  { href: "/heart-rate", icon: Heart, label: "Heart Rate" },
  { href: "/stress", icon: Brain, label: "Stress" },
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/weight", icon: Scale, label: "Weight" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const collapsed = false;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border)]">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4285f4, #1a73e8)" }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in flex-1 min-w-0">
            <h1 className="font-bold text-base tracking-tight leading-tight" style={{ color: "#4285f4" }}>Oura</h1>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Analytics
            </p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0 max-lg:hidden"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors lg:hidden"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav
        className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "nav-link",
              pathname === href && "active",
              collapsed && "justify-center px-0 lg:justify-center lg:px-0"
            )}
            title={collapsed ? label : undefined}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        <div className="pt-2 mt-2 border-t border-[var(--border)]">
          <Link
            href="/settings"
            className={cn(
              "nav-link",
              pathname === "/settings" && "active",
              collapsed && "justify-center px-0 lg:justify-center lg:px-0"
            )}
            title={collapsed ? "Settings" : undefined}
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <Settings className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </nav>

      <div className="px-2 py-2 space-y-1 border-t border-[var(--border)]">
        {collapsed && (
          <button
            onClick={toggleTheme}
            className="nav-link w-full justify-center px-0"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-[18px] h-[18px] text-amber-400" />
            ) : (
              <Moon className="w-[18px] h-[18px] text-gray-400" />
            )}
          </button>
        )}
      </div>

    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen z-50 flex-col",
          "bg-white dark:bg-[#1a1c1e]",
          "border-r border-[var(--border)]",
          "transition-all duration-200 ease-out",
          "hidden lg:flex",
          collapsed ? "lg:w-[72px]" : "lg:w-60"
        )}
        style={{
          boxShadow: "1px 0 8px rgba(66, 133, 244, 0.04)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={cn(
              "fixed left-0 top-0 h-screen z-50 flex flex-col w-72",
              "bg-white dark:bg-[#1a1c1e]",
              "border-r border-[var(--border)]",
              "lg:hidden animate-slide-in-right"
            )}
            style={{
              boxShadow: "4px 0 16px rgba(66, 133, 244, 0.08)",
            }}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
