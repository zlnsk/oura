"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BASE_PATH } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";

function SettingsSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--m3-on-surface-variant)]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--m3-on-surface-variant)]">{description}</p>
          )}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();

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

    const params = new URLSearchParams(window.location.search);
    const withingsResult = params.get("withings");
    if (withingsResult === "success") {
      setHasWithingsKey(true);
      setWithingsStatus("success");
      setWithingsMessage("Withings account connected successfully!");
      toast("Withings account connected", "success");
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

  const connectedChip = (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-0.5">
      <CheckCircle2 className="w-3 h-3" />
      Connected
    </span>
  );

  return (
    <DashboardShell>
      <PageHeader title="Settings" icon={Settings} iconColor="#64748b" />

      <div className="max-w-2xl mx-auto space-y-10">
        <SettingsSection
          title="Oura API"
          description="Your API key is stored securely in a server-side HTTP-only cookie."
          aside={connectedChip}
        />

        <SettingsSection
          title="AI Health Insights"
          description="Summaries and correlations generated from your Oura data."
          aside={connectedChip}
        />

        <SettingsSection
          title="Withings"
          description="Connect your Withings smart scale for weight and body composition data."
          aside={hasWithingsKey ? connectedChip : undefined}
        >
          <div className="space-y-4">
            {withingsOAuthAvailable && (
              <div>
                <a
                  href={`${BASE_PATH}/api/withings/auth`}
                  className="btn-primary text-sm inline-flex items-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  {hasWithingsKey ? "Reconnect Withings Account" : "Connect with Withings"}
                </a>
                <p className="text-xs text-[var(--m3-on-surface-variant)] mt-2">
                  Sign in with your Withings account to authorize access to your data. Tokens refresh automatically.
                </p>
              </div>
            )}

            {withingsOAuthAvailable && (
              <button
                onClick={() => setShowManualWithings(!showManualWithings)}
                className="text-xs text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] flex items-center gap-1 transition-colors"
              >
                {showManualWithings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showManualWithings ? "Hide manual token entry" : "Or enter an access token manually"}
              </button>
            )}

            {(!withingsOAuthAvailable || showManualWithings) && (
              <>
                <div>
                  <label
                    htmlFor="withings-api-key"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--m3-on-surface-variant)] mb-2"
                  >
                    Withings Access Token
                  </label>
                  <div className="relative">
                    <input
                      id="withings-api-key"
                      type={showWithingsKey ? "text" : "password"}
                      value={withingsKey}
                      onChange={(e) => setWithingsKey(e.target.value)}
                      placeholder={hasWithingsKey ? "Token saved (enter new value to update)" : "Paste your Withings access token..."}
                      className="input-field pr-12"
                    />
                    <button
                      onClick={() => setShowWithingsKey(!showWithingsKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors"
                      aria-label="Toggle Withings key visibility"
                    >
                      {showWithingsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--m3-on-surface-variant)] mt-2">
                    Get your access token from the Withings developer portal.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveWithings}
                    className="btn-primary text-sm"
                    disabled={withingsStatus === "saving" || !withingsKey.trim()}
                  >
                    {withingsStatus === "saving" ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {withingsSaved ? "Saved" : withingsStatus === "saving" ? "Saving..." : "Save Token"}
                  </button>
                </div>
              </>
            )}

            {hasWithingsKey && (
              <button
                onClick={handleDeleteWithings}
                className="btn-secondary text-sm text-rose-500 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
                Disconnect
              </button>
            )}

            {withingsStatus !== "idle" && withingsStatus !== "saving" && (
              <div
                role="alert"
                className={cn(
                  "p-4 rounded-xl text-sm flex items-center gap-3",
                  withingsStatus === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
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
        </SettingsSection>

        <SettingsSection
          title="Security & Privacy"
          description="How your data and credentials are handled."
        >
          <ul className="space-y-2 text-sm text-[var(--m3-on-surface-variant)]">
            <li>&#8226; All API keys are stored as secure, HTTP-only browser cookies.</li>
            <li>&#8226; Keys are never stored on the server or in any database.</li>
            <li>&#8226; Each user&apos;s data is fully isolated — no one else can see yours.</li>
            <li>&#8226; AI analysis is processed through Anthropic&apos;s API with no data retention.</li>
            <li>&#8226; All API calls are made server-side to protect your tokens.</li>
          </ul>
        </SettingsSection>
      </div>
    </DashboardShell>
  );
}
