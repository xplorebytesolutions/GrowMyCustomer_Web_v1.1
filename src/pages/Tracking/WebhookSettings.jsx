import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { Button } from "../../components/ui/button";
import { toast } from "react-toastify";
import {
  Activity,
  Trash2,
  Bug,
  RefreshCcw,
  Clock,
  ShieldAlert,
} from "lucide-react";

const WebhookSettings = () => {
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [lastCleanup, setLastCleanup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logsCount, setLogsCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStatus = async () => {
    try {
      const [statusRes, countRes] = await Promise.all([
        axiosClient.get("/webhooks/settings"),
        axiosClient.get("/webhooks/failed/count"),
      ]);
      setAutoCleanup(!!statusRes.data.enabled); // ensure boolean
      setLastCleanup(statusRes.data.lastCleanupAt || null);
      setLogsCount(countRes.data.count ?? 0);
    } catch (err) {
      console.error("❌ Failed to load webhook settings", err);
      toast.error("❌ Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const toggleCleanup = async () => {
    setIsSubmitting(true);
    try {
      const endpoint = autoCleanup
        ? "/webhooks/disable-cleanup"
        : "/webhooks/enable-cleanup";
      await axiosClient.post(endpoint);
      toast.success(
        autoCleanup ? "🧹 Auto Cleanup Disabled" : "✅ Auto Cleanup Enabled"
      );
      await fetchStatus();
    } catch (err) {
      console.error("❌ Toggle failed", err);
      toast.error("❌ Failed to toggle auto cleanup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runManualCleanup = async () => {
    setIsSubmitting(true);
    try {
      const res = await axiosClient.post("/webhooks/cleanup-now");
      toast.success(res.data.message || "✅ Manual cleanup complete");
      await fetchStatus();
    } catch (err) {
      console.error("❌ Manual cleanup failed", err);
      toast.error("❌ Manual cleanup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const injectTest = async () => {
    setIsSubmitting(true);
    try {
      await axiosClient.post("/webhooks/inject-test-log");
      toast.success("🧪 Test failure log injected successfully.");
      await fetchStatus();
    } catch (err) {
      console.error("❌ Injection failed", err);
      toast.error("❌ Failed to inject test log");
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskLevel =
    logsCount === 0
      ? "none"
      : logsCount < 100
      ? "low"
      : logsCount < 1000
      ? "medium"
      : "high";

  const riskLabel =
    riskLevel === "none"
      ? "No failures"
      : riskLevel === "low"
      ? "Low"
      : riskLevel === "medium"
      ? "Medium"
      : "High";

  const riskColorClasses =
    riskLevel === "none"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : riskLevel === "low"
      ? "bg-sky-50 text-sky-700 border-sky-100"
      : riskLevel === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-red-50 text-red-700 border-red-100";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Local animated border CSS, same vibe as workspaces */}
      <style>{`
        @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

        .tile:hover .topline    { animation: drawRight .9s ease forwards; }
        .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
        .tile:hover .bottomline { animation: drawLeft  .9s ease .36s forwards; }
        .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-medium mb-2">
            <ShieldAlert size={14} />
            Webhook Reliability
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
            ⚙️ Webhook Settings
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl mt-1">
            Keep your webhook logs under control. Enable automatic cleanup for
            peace of mind and use manual tools while debugging integrations.
          </p>
        </div>

        {!loading && (
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${riskColorClasses}`}
          >
            <Activity size={14} />
            <span>Failure Risk: {riskLabel}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-5 animate-pulse">
            <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
            <div className="h-3 w-48 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-40 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-5 animate-pulse">
            <div className="h-4 w-40 bg-slate-100 rounded mb-3" />
            <div className="flex gap-3">
              <div className="h-9 w-28 bg-slate-100 rounded" />
              <div className="h-9 w-32 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          {/* Summary / Stats card */}
          <div className="tile relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            {/* Animated border */}
            <span
              aria-hidden
              className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(90deg, #A7F3D0, #34D399, #059669)",
                transform: "scaleX(0)",
              }}
            />
            <span
              aria-hidden
              className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(180deg, #A7F3D0, #34D399, #059669)",
                transform: "scaleY(0)",
              }}
            />
            <span
              aria-hidden
              className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(270deg, #A7F3D0, #34D399, #059669)",
                transform: "scaleX(0)",
              }}
            />
            <span
              aria-hidden
              className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(0deg, #A7F3D0, #34D399, #059669)",
                transform: "scaleY(0)",
              }}
            />

            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-emerald-900">
                      Failure Log Summary
                    </h3>
                    <p className="text-xs text-slate-500">
                      Monitor how many webhook calls are failing and when they
                      were last cleaned up.
                    </p>
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <dt className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                    <Trash2 size={14} className="text-slate-500" />
                    Total Failed Logs
                  </dt>
                  <dd className="text-xl font-semibold text-slate-900">
                    {logsCount.toLocaleString("en-IN")}
                  </dd>
                  <p className="mt-1 text-[11px] text-slate-500">
                    These entries are safe to clean up once you’ve finished
                    debugging.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <dt className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                    <RefreshCcw size={14} className="text-emerald-600" />
                    Auto-Cleanup Status
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        autoCleanup
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                    >
                      {autoCleanup ? "Enabled" : "Disabled"}
                    </span>
                  </dd>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {autoCleanup
                      ? "Older failed logs will be cleaned automatically."
                      : "Failed logs will keep growing until you clean them manually."}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3 sm:col-span-2">
                  <dt className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                    <Clock size={14} className="text-sky-600" />
                    Last Cleanup
                  </dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {lastCleanup
                      ? new Date(lastCleanup).toLocaleString()
                      : "Never run"}
                  </dd>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Run a manual cleanup after heavy testing or once you’re
                    confident in your webhook stability.
                  </p>
                </div>
              </dl>
            </div>
          </div>

          {/* Actions card */}
          <div className="tile relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col">
            {/* Animated border */}
            <span
              aria-hidden
              className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(90deg, #EEF2FF, #C4B5FD, #A78BFA)",
                transform: "scaleX(0)",
              }}
            />
            <span
              aria-hidden
              className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(180deg, #EEF2FF, #C4B5FD, #A78BFA)",
                transform: "scaleY(0)",
              }}
            />
            <span
              aria-hidden
              className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(270deg, #EEF2FF, #C4B5FD, #A78BFA)",
                transform: "scaleX(0)",
              }}
            />
            <span
              aria-hidden
              className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(0deg, #EEF2FF, #C4B5FD, #A78BFA)",
                transform: "scaleY(0)",
              }}
            />

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  Webhook Tools
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Use these tools while developing or debugging. All actions are
                  safe for production once your logic is stable.
                </p>
              </div>

              <div className="space-y-3">
                {/* Auto Cleanup button - emerald */}
                <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      Auto Cleanup
                    </span>
                    <Button
                      size="sm"
                      onClick={toggleCleanup}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600"
                    >
                      {autoCleanup
                        ? "Disable Auto Cleanup"
                        : "Enable Auto Cleanup"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Automatically remove old failed webhook logs on a schedule.
                  </p>
                </div>

                {/* Manual cleanup button - emerald */}
                <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      <Trash2 size={14} className="text-emerald-700" />
                      Manual Cleanup
                    </span>
                    <Button
                      size="sm"
                      onClick={runManualCleanup}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600"
                    >
                      🧹 Run Manual Cleanup
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Use this when you’ve finished debugging and want a clean
                    slate.
                  </p>
                </div>

                {/* Inject test button - emerald */}
                <div className="flex flex-col gap-1 rounded-lg border border-amber-100 bg-amber-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      <Bug size={14} className="text-amber-600" />
                      Inject Test Failure
                    </span>
                    <Button
                      size="sm"
                      onClick={injectTest}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600"
                    >
                      🧪 Inject Test Log
                    </Button>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Adds a fake failed webhook entry so you can verify cleanup
                    and monitoring without breaking production flows.
                  </p>
                </div>
              </div>

              {isSubmitting && (
                <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Processing your request…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookSettings;
