import React, { useEffect, useState, useRef } from "react";
import axiosClient from "../../../api/axiosClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowUpRight,
  PhoneCall,
  MessageCircle,
  Clock4,
  X,
} from "lucide-react";

/**
 * Right-side account detail drawer.
 *
 * Props:
 * - businessId: string | null
 * - onClose: () => void
 * - onUpdated?: (updated: any) => void
 */
export default function AccountDetailDrawer({
  businessId,
  onClose,
  onUpdated,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [recentActions, setRecentActions] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);

  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // --- Load account snapshot on businessId change ---
  useEffect(() => {
    if (!businessId) {
      setData(null);
      setRecentActions([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(
          `/admin/account-insights/${businessId}`
        );
        if (!cancelled) {
          setData(res.data || null);
        }
      } catch (err) {
        console.error("Failed to load account detail", err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // --- Load recent actions (timeline) on businessId change ---
  useEffect(() => {
    if (!businessId) {
      setRecentActions([]);
      return;
    }

    let cancelled = false;

    const loadActions = async () => {
      try {
        setActionsLoading(true);
        const res = await axiosClient.get(
          `/admin/account-insights/${businessId}/actions`,
          { params: { limit: 50 } } // can tune
        );

        if (cancelled) return;

        const raw = res.data || [];
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.items)
          ? raw.items
          : Array.isArray(raw.data)
          ? raw.data
          : [];

        const normalized = items
          .map(a => {
            const type = a.type || a.actionType || "ACTION";
            let meta = {};
            if (a.metaJson) {
              try {
                meta = JSON.parse(a.metaJson);
              } catch {
                meta = {};
              }
            }

            const label =
              a.label || prettyLabelFromType(type, meta) || "Account activity";

            return {
              id:
                a.id ||
                `${type}-${a.createdAt || a.timestamp || Math.random()}`,
              type,
              label,
              actor: a.actor || a.performedBy || null,
              createdAt: a.createdAt || a.timestamp || null,
              meta,
            };
          })
          .sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });

        setRecentActions(normalized);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load recent actions", err);
          setRecentActions([]);
        }
      } finally {
        if (!cancelled) setActionsLoading(false);
      }
    };

    loadActions();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // --- Close on Escape ---
  useEffect(() => {
    if (!businessId) return;

    const handleKey = e => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [businessId, onClose]);

  // --- Close on click outside (no overlay) ---
  useEffect(() => {
    if (!businessId) return;

    const handleClickOutside = event => {
      if (!drawerRef.current) return;
      if (!drawerRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [businessId, onClose]);

  if (!businessId) return null;

  // --- Derived flags from snapshot + timeline ---
  const businessKey = data?.businessId || data?.id || businessId;

  const stage = (
    data?.lifecycleStage ||
    data?.stage ||
    data?.lifecycle ||
    ""
  ).trim();

  const plan = (data?.planName || data?.planType || data?.plan || "").trim();

  const daysToTrialEnd =
    typeof data?.daysToTrialEnd === "number" ? data.daysToTrialEnd : null;

  const isTrial =
    stage === "Trial" || plan === "Trial" || data?.isTrial === true;

  const isNearTrialEnd =
    isTrial && daysToTrialEnd !== null && daysToTrialEnd <= 5;

  const hasWhatsApp =
    data?.hasWhatsAppConfigured === true ||
    data?.whatsAppConnected === true ||
    data?.whatsAppStatus === "Connected";

  const lastContactedAction = recentActions.find(
    a => a.type === "TAG_CONTACTED"
  );

  const lastContactedAt =
    lastContactedAction?.createdAt || data?.lastContactedAt || null;

  const isContacted =
    !!lastContactedAt || data?.isContacted === true || !!data?.lastOutreachOn;

  const normalizedStage = (stage || "").toLowerCase();

  const canShowExtendTrial =
    !!businessKey &&
    isTrial &&
    isNearTrialEnd &&
    data?.canExtendTrial !== false;

  const canShowTagAsContacted =
    !!businessKey &&
    [
      "trial",
      "trialexpiringsoon",
      "nousagepostapproval",
      "risk",
      "churned",
      "demo",
    ].includes(normalizedStage);

  const canShowViewWhatsAppSettings =
    !!businessKey &&
    (hasWhatsApp || ["Active", "Trial", "Risk"].includes(stage));

  // --- Micro-actions ---

  const handleOpenBusinessProfile = () => {
    if (!businessKey) {
      toast.error("Business id missing for this account.");
      return;
    }
    navigate(`/admin/accounts/${businessKey}`);
    onClose?.();
  };

  const handleTagAsContacted = async () => {
    if (!businessKey) {
      toast.error("Business id missing.");
      return;
    }

    try {
      const res = await axiosClient.post(
        `/admin/account-insights/${businessKey}/mark-contacted`
      );

      if (res.data?.ok === false) {
        toast.error(res.data.message || "Failed to log contact.");
        return;
      }

      const now = new Date().toISOString();

      prependLocalAction("TAG_CONTACTED", {
        label: "Contacted account",
      });

      const updated = {
        ...(data || {}),
        isContacted: true,
        lastContactedAt: now,
      };
      setData(updated);
      onUpdated?.(updated);

      toast.success(
        isContacted ? "Additional contact logged." : "Contact logged."
      );
    } catch (err) {
      console.error(err);
      toast.error("Error while logging contact.");
    }
  };

  const handleViewWhatsAppSettings = () => {
    if (!businessKey) {
      toast.error("Business id missing.");
      return;
    }
    navigate(`/admin/accounts/${businessKey}/whatsapp-settings`);
    onClose?.();
  };

  const handleExtendTrial = async () => {
    if (!businessKey) {
      toast.error("Business id missing.");
      return;
    }

    const extraDays = 7;

    try {
      const res = await axiosClient.post(
        `/admin/account-insights/${businessKey}/extend-trial`,
        { extraDays }
      );

      if (!res.data || res.data.ok === false) {
        toast.error(res.data?.message || "Unable to extend trial.");
        return;
      }

      const snapshot = res.data.snapshot;

      if (snapshot) {
        setData(snapshot);
        onUpdated?.(snapshot);
      } else {
        const newEnd = res.data.newEnd || data?.trialEndsOn || null;
        const updated = { ...(data || {}), trialEndsOn: newEnd };
        setData(updated);
        onUpdated?.(updated);
      }

      prependLocalAction("EXTEND_TRIAL", {
        label: `Trial extended by ${extraDays} days`,
      });

      toast.success("Trial extended successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Error while extending trial.");
    }
  };

  const prependLocalAction = (type, { label }) => {
    const now = new Date().toISOString();
    setRecentActions(prev => [
      {
        id: `local-${type}-${now}`,
        type,
        label: label || prettyLabelFromType(type) || "Account activity",
        actor: "You",
        createdAt: now,
        meta: {},
      },
      ...prev,
    ]);
  };

  // --- UI ---
  return (
    <div
      ref={drawerRef}
      className="
        fixed inset-y-0 right-0
        z-[9999]
        w-full sm:w-[420px]
        bg-white
        border-l border-slate-200
        shadow-xl
        flex flex-col
        animate-account-drawer-in
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Account details
          </h2>
        </div>
        <button
          onClick={onClose}
          className="
            h-7 w-7 flex items-center justify-center
            rounded-full
            bg-slate-100
            text-slate-700
            hover:bg-slate-200
            hover:text-slate-900
            border border-slate-300
            transition
          "
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main content: fixed top sections + scrollable recent activity */}
      <div className="flex-1 flex flex-col px-5 py-4 gap-4 overflow-hidden">
        {loading && (
          <div className="text-sm text-slate-500 text-center py-6">
            Loading details…
          </div>
        )}

        {!loading && !data && (
          <div className="text-sm text-slate-500 text-center py-6">
            No additional details available for this account.
          </div>
        )}

        {!loading && data && (
          <>
            {/* Non-scroll sections */}
            <div className="space-y-4">
              <Section title="Core">
                <DetailRow
                  label="Business name"
                  value={data.businessName || data.name}
                />
                <DetailRow label="Business ID" value={businessKey} />
                <DetailRow label="Lifecycle stage" value={stage || "—"} />
                <DetailRow label="Plan" value={plan || "—"} />
                <DetailRow
                  label="Status"
                  value={
                    data.status ||
                    data.approvalStatus ||
                    data.accountStatus ||
                    "—"
                  }
                />
              </Section>

              <Section title="Activity & Trial">
                <DetailRow label="Trial ends" value={data.trialEndsOn || "—"} />
                <DetailRow
                  label="Trial days left"
                  value={
                    daysToTrialEnd !== null
                      ? daysToTrialEnd
                      : isTrial
                      ? "—"
                      : "N/A"
                  }
                />
                <DetailRow
                  label="Last active"
                  value={
                    data.lastActiveOn ||
                    data.lastSeenAt ||
                    data.lastActivityOn ||
                    "—"
                  }
                />
                <DetailRow
                  label="Last contacted"
                  value={lastContactedAt ? formatWhen(lastContactedAt) : "—"}
                />
                <DetailRow
                  label="Created at"
                  value={
                    data.createdAt || data.createdOn || data.signupDate || "—"
                  }
                />
              </Section>

              {(data.ownerEmail || data.ownerName) && (
                <Section title="Owner">
                  <DetailRow
                    label="Owner email"
                    value={data.ownerEmail || "—"}
                  />
                  {data.ownerName && (
                    <DetailRow label="Owner name" value={data.ownerName} />
                  )}
                </Section>
              )}
            </div>

            {/* Recent Activity: takes remaining space, scrolls */}
            <div className="flex-1 min-h-0">
              <Section title="Recent activity">
                {actionsLoading && (
                  <div className="text-[11px] text-slate-500">
                    Loading activity…
                  </div>
                )}

                {!actionsLoading && recentActions.length === 0 && (
                  <div className="text-[11px] text-slate-500">
                    No recent actions recorded for this account.
                  </div>
                )}

                {!actionsLoading && recentActions.length > 0 && (
                  <div className="h-full overflow-y-auto pr-1 space-y-1.5 text-[11px]">
                    {recentActions.map(a => (
                      <div key={a.id} className="flex items-start gap-2">
                        <div className="w-1 h-1 mt-1.5 rounded-full bg-slate-400" />
                        <div className="flex-1">
                          <div className="text-slate-800">{a.label}</div>
                          <div className="text-[10px] text-slate-500">
                            {formatWhen(a.createdAt)}
                            {a.actor ? ` · ${a.actor}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </div>

      {/* Quick actions: pinned at bottom */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.14em] mb-1.5">
          Quick actions
        </div>

        {data ? (
          <div className="space-y-1.5 text-xs">
            <button
              onClick={handleOpenBusinessProfile}
              className="
                w-full flex items-center justify-between
                px-3 py-2 rounded-md
                bg-slate-900 text-slate-50
                hover:bg-slate-800
                transition
              "
            >
              <span className="flex items-center gap-2">
                <ArrowUpRight className="w-3 h-3" />
                Open Business Profile
              </span>
              <span className="text-[9px] text-slate-300">Full context</span>
            </button>

            {canShowTagAsContacted && (
              <button
                onClick={handleTagAsContacted}
                className="
                  w-full flex items-center justify-between
                  px-3 py-2 rounded-md
                  bg-emerald-50 text-emerald-900
                  border border-emerald-200
                  hover:bg-emerald-100
                  transition
                "
              >
                <span className="flex items-center gap-2">
                  <PhoneCall className="w-3 h-3" />
                  {isContacted ? "Log another contact" : "Tag as Contacted"}
                </span>
                <span className="text-[9px] text-emerald-700">
                  Touchpoint history
                </span>
              </button>
            )}

            {canShowViewWhatsAppSettings && (
              <button
                onClick={handleViewWhatsAppSettings}
                className="
                  w-full flex items-center justify-between
                  px-3 py-2 rounded-md
                  bg-sky-50 text-sky-900
                  border border-sky-200
                  hover:bg-sky-100
                  transition
                "
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" />
                  View Manual WhatsApp Business Api Setup
                </span>
                <span className="text-[9px] text-sky-700">
                  Channel readiness
                </span>
              </button>
            )}

            {canShowExtendTrial && (
              <button
                onClick={handleExtendTrial}
                className="
                  w-full flex items-center justify-between
                  px-3 py-2 rounded-md
                  bg-amber-50 text-amber-900
                  border border-amber-200
                  hover:bg-amber-100
                  transition
                "
              >
                <span className="flex items-center gap-2">
                  <Clock4 className="w-3 h-3" />
                  Extend Trial by 7 days
                </span>
                <span className="text-[9px] text-amber-700">
                  Retain high-intent
                </span>
              </button>
            )}

            {!canShowTagAsContacted &&
              !canShowViewWhatsAppSettings &&
              !canShowExtendTrial && (
                <div className="text-[10px] text-slate-500">
                  No special actions for this account right now.
                </div>
              )}
          </div>
        ) : (
          <div className="text-[10px] text-slate-500">
            Actions will appear once account details are loaded.
          </div>
        )}

        <div className="mt-2 text-[10px] text-slate-400">
          Press <span className="font-semibold">Esc</span>, click outside the
          panel, or use the <span className="font-semibold">X</span> button to
          close.
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes account-drawer-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-account-drawer-in {
          animation: account-drawer-in 0.22s ease-out;
        }
      `}</style>
    </div>
  );
}

/* ----- Helpers ----- */

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.14em]">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-1.5">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="text-sm font-semibold text-slate-900 text-right truncate max-w-[220px]">
        {value != null && value !== "" ? value : "—"}
      </div>
    </div>
  );
}

function formatWhen(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function prettyLabelFromType(type, meta = {}) {
  switch (type) {
    case "TAG_CONTACTED":
      return "Tagged as contacted";
    case "EXTEND_TRIAL":
      if (typeof meta.extraDays === "number") {
        return `Trial extended by ${meta.extraDays} days`;
      }
      return "Trial extended";
    default:
      return null;
  }
}
