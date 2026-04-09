"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings,
  Key,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  Trash2,
  Brain,
  Scale,
  Link,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BASE_PATH } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const { toast } = useToast();


  // Withings state
  const [withingsKey, setWithingsKey] = useState("");
  const [showWithingsKey, setShowWithingsKey] = useState(false);
  const [withingsSaved, setWithingsSaved] = useState(false);
  const [hasWithingsKey, setHasWithingsKey] = useState(false);
  const [withingsStatus, setWithingsStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [withingsMessage, setWithingsMessage] = useState("");
  const [withingsOAuthAvailable, setWithingsOAuthAvailable] = useState(false);
  const [showManualWithings, setShowManualWithings] = useState(false);



  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings/withings-token`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hasToken) setHasWithingsKey(true);
        if (data.oauthAvailable) setWithingsOAuthAvailable(true);
      })
      .catch(() => {});

    // Handle Withings OAuth callback redirect
    const params = new URLSearchParams(window.location.search);
    const withingsResult = params.get("withings");
    if (withingsResult === "success") {
      setHasWithingsKey(true);
      setWithingsStatus("success");
      setWithingsMessage("Withings account connected successfully!");
      toast("Withings account connected", "success");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (withingsResult === "token_error") {
      setWithingsStatus("error");
      setWithingsMessage("Failed to connect Withings account. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (withingsResult === "invalid_state") {
      setWithingsStatus("error");
      setWithingsMessage("Security check failed. Please try connecting again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);


  // Withings key handlers
  const handleSaveWithings = async () => {
    const trimmed = withingsKey.trim();
    if (!trimmed) return;
    if (trimmed.length < 10) {
      setWithingsStatus("error");
      setWithingsMessage("Invalid token. Token must be at least 10 characters.");
      return;
    }
    setWithingsStatus("saving");
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/withings-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });
      if (res.ok) {
        setHasWithingsKey(true);
        setWithingsSaved(true);
        setWithingsStatus("success");
        setWithingsMessage("Withings token saved successfully.");
        toast("Withings token saved securely", "success");
        setTimeout(() => {
          setWithingsSaved(false);
          setWithingsStatus("idle");
        }, 3000);
      } else {
        const data = await res.json();
        setWithingsStatus("error");
        setWithingsMessage(data.error || "Failed to save token");
      }
    } catch {
      setWithingsStatus("error");
      setWithingsMessage("Network error. Please try again.");
    }
  };

  const handleDeleteWithings = async () => {
    if (!confirm("Remove your Withings API key?")) return;
    try {
      await fetch(`${BASE_PATH}/api/settings/withings-token`, { method: "DELETE" });
    } catch {}
    setWithingsKey("");
    setHasWithingsKey(false);
    setWithingsSaved(false);
    setWithingsStatus("idle");
    toast("Withings token removed", "info");
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Settings"
        subtitle="Configure your dashboard and API connections"
        icon={Settings}
        iconColor="#64748b"
      />

      <div className="max-w-2xl space-y-6">
        {/* Oura API Key Configuration */}
        <div className="premium-card overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-[var(--border)] flex items-center justify-center">
                <Key className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold">Oura API Key</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your API key is stored securely in a server-side HTTP-only cookie
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              Connected via server token
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="premium-card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center">
                <Brain className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold">AI Health Insights</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Connected via server API key</p>
              </div>
            </div>
          </div>
        </div>

        {/* Withings Configuration */}
        <div className="premium-card overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-[var(--border)] flex items-center justify-center">
                <Scale className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold">Withings</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Connect your Withings smart scale for weight and body composition data
                </p>
              </div>
              {hasWithingsKey && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-full px-2.5 py-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* OAuth Connect Button */}
            {withingsOAuthAvailable && (
              <div>
                <a
                  href={`${BASE_PATH}/api/withings/auth`}
                  className="btn-primary text-sm inline-flex items-center gap-2"
                >
                  <Link className="w-4 h-4" />
                  {hasWithingsKey ? "Reconnect Withings Account" : "Connect with Withings"}
                </a>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Sign in with your Withings account to authorize access to your data. Tokens refresh automatically.
                </p>
              </div>
            )}

            {/* Manual Token Toggle (fallback or if OAuth not configured) */}
            {withingsOAuthAvailable ? (
              <button
                onClick={() => setShowManualWithings(!showManualWithings)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
              >
                {showManualWithings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showManualWithings ? "Hide manual token entry" : "Or enter an access token manually"}
              </button>
            ) : null}

            {(!withingsOAuthAvailable || showManualWithings) && (
              <>
                <div>
                  <label htmlFor="withings-api-key" className="block text-sm font-medium mb-2">
                    Withings Access Token
                  </label>
                  <div className="relative">
                    <input
                      id="withings-api-key"
                      type={showWithingsKey ? "text" : "password"}
                      value={withingsKey}
                      onChange={(e) => setWithingsKey(e.target.value)}
                      placeholder={hasWithingsKey ? "Token saved (enter new value to update)" : "Paste your Withings access token here..."}
                      className="input-field pr-12"
                    />
                    <button
                      onClick={() => setShowWithingsKey(!showWithingsKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="Toggle Withings key visibility"
                    >
                      {showWithingsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Get your access token from the Withings developer portal
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleSaveWithings} className="btn-primary text-sm" disabled={withingsStatus === "saving" || !withingsKey.trim()}>
                    {withingsStatus === "saving" ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {withingsSaved ? "Saved!" : withingsStatus === "saving" ? "Saving..." : "Save Token"}
                  </button>
                </div>
              </>
            )}

            {hasWithingsKey && (
              <button onClick={handleDeleteWithings} className="btn-secondary text-sm text-rose-500 hover:text-rose-600">
                <Trash2 className="w-4 h-4" />
                Disconnect
              </button>
            )}

            {withingsStatus !== "idle" && withingsStatus !== "saving" && (
              <div
                role="alert"
                className={cn(
                  "p-4 rounded-xl border text-sm flex items-center gap-3",
                  withingsStatus === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400"
                )}
              >
                {withingsStatus === "success" ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                {withingsMessage}
              </div>
            )}
          </div>
        </div>

        {/* Security info */}
        <div className="premium-card p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Security & Privacy</h3>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <li>&#8226; All API keys are stored as secure, HTTP-only browser cookies</li>
                <li>&#8226; Keys are never stored on the server or in any database</li>
                <li>&#8226; Each user&apos;s data is fully isolated &mdash; no one else can see your data</li>
                <li>&#8226; AI analysis is processed through Anthropic&apos;s API with no data retention</li>
                <li>&#8226; All API calls are made server-side to protect your tokens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
