// 📄 src/pages/MetaAccount/MetaAccountManagement.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import MetaPinActivationModal from "../../components/modals/MetaPinActivationModal";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { ShieldAlert, Trash2, RefreshCw, Plus } from "lucide-react";

// --- JWT businessId helper (aligned with ClaimsBusinessDetails) ---
const TOKEN_KEY = "xbyte_token";
const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBusinessIdFromJwt() {
  try {
    const jwt = localStorage.getItem(TOKEN_KEY);
    if (!jwt) return null;

    const [, payloadB64] = jwt.split(".");
    if (!payloadB64) return null;

    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
    );

    const bid = payload?.businessId || payload?.BusinessId || null;

    return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
  } catch {
    return null;
  }
}

export default function MetaAccountManagement() {
  const { business, hasAllAccess, isLoading } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [connectingEsu, setConnectingEsu] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState(null);

  // Hard delete modal + state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New: post-delete success modal
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // New: disconnect confirmation modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // After a successful hard-delete in THIS session, we freeze all actions
  const [deletedThisSession, setDeletedThisSession] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [showPinModal, setShowPinModal] = useState(() => {
    return sessionStorage.getItem("xb_pending_esu_pin") === "true";
  });

  const closePinModal = () => {
    setShowPinModal(false);
    sessionStorage.removeItem("xb_pending_esu_pin");
  };

  const isDev = process.env.NODE_ENV === "development";

  // Prefer AuthProvider if present, otherwise JWT claim
  const authBusinessId =
    business?.id || business?.businessId || business?.BusinessId || null;

  const jwtBusinessId = useMemo(() => getBusinessIdFromJwt(), []);
  const effectiveBusinessId = authBusinessId || jwtBusinessId;
  const hasBusinessContext = !!effectiveBusinessId;

  // ------- Load ESU status (JWT-based) -------
  const loadStatus = async () => {
    try {
      setStatusLoading(true);

      // Backend: GET /api/esu/facebook/status uses JWT to resolve businessId
      const res = await axiosClient.get("esu/facebook/status");
      const payload = res?.data ?? null;
      const data = payload?.data || payload?.Data || payload;

      setStatus(data || null);

      // ✅ NEW: If backend says it is already hard-deleted, freeze UI immediately
      const hardDeleted =
        data?.hardDeleted ?? data?.HardDeleted ?? data?.isHardDeleted ?? false;

      if (hardDeleted) {
        setDeletedThisSession(true);
      }
    } catch (err) {
      console.error("Failed to load ESU status", err);
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const rawStatus = searchParams.get("esuStatus");
    const status = rawStatus?.toLowerCase();

    console.log("[MetaAccountManagement] esuStatus check:", {
      rawStatus,
      status,
    });

    if (status === "success") {
      toast.success("✅ Connected to Meta! Your number is active.");
      sessionStorage.removeItem("xb_pending_esu_pin");
      setShowPinModal(false);
      loadStatus(); // Refresh health status
    } else if (
      status === "needs_pin" ||
      sessionStorage.getItem("xb_pending_esu_pin") === "true"
    ) {
      if (status === "needs_pin") {
        toast.info(
          "This number is already protected. Please enter your existing PIN.",
        );
        sessionStorage.setItem("xb_pending_esu_pin", "true");
      }
      setShowPinModal(true);
    }

    if (rawStatus) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("esuStatus");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handlePinSuccess = () => {
    loadStatus();
  };

  // ------- Normalized status -------
  const hasEsuFlag = status?.hasEsuFlag ?? status?.HasEsuFlag ?? false;

  const tokenExpiresAtRaw =
    status?.tokenExpiresAtUtc ??
    status?.TokenExpiresAtUtc ??
    status?.accessTokenExpiresAtUtc ??
    status?.AccessTokenExpiresAtUtc ??
    null;

  // Raw flags from backend
  const hasValidToken = status?.hasValidToken ?? status?.HasValidToken ?? false;

  const willExpireSoon =
    status?.willExpireSoon ??
    status?.WillExpireSoon ??
    status?.isExpiringSoon ??
    status?.IsExpiringSoon ??
    false;

  // ✅ NEW: Hard delete state from backend
  const hardDeleted =
    status?.hardDeleted ??
    status?.HardDeleted ??
    status?.isHardDeleted ??
    false;

  const debugMessage = status?.debug ?? status?.Debug ?? null;

  // If backend says hardDeleted, treat as deleted even after refresh
  const isHardDeletedEffective = !!hardDeleted || !!deletedThisSession;

  const isConfiguredViaEsu = !!hasEsuFlag;

  // Fully healthy = ESU connected AND backend says token is valid
  const isFullyHealthy = isConfiguredViaEsu && hasValidToken;

  // Expiring soon = ESU connected, backend says "not valid" BUT explicitly marks WillExpireSoon
  const isTokenExpiringSoon =
    isConfiguredViaEsu && !hasValidToken && willExpireSoon;

  // Expired/invalid = ESU connected, backend says "not valid", not in 'expiring soon' bucket,
  // and we have some expiry timestamp recorded
  const isTokenExpiredOrInvalid =
    isConfiguredViaEsu &&
    !hasValidToken &&
    !willExpireSoon &&
    !!tokenExpiresAtRaw;

  const formattedExpiry = tokenExpiresAtRaw
    ? new Date(tokenExpiresAtRaw).toLocaleString()
    : null;

  // "Any integration present?" — drives soft disconnect enabling
  const hasAnyIntegrationState =
    isConfiguredViaEsu || hasValidToken || !!tokenExpiresAtRaw;

  // Base capabilities (without the "deletedThisSession" override)
  const canSoftDisconnectBase = hasBusinessContext && hasAnyIntegrationState;
  const canHardDeleteBase = hasBusinessContext;

  // Final capabilities (respect hard-delete state)
  const canSoftDisconnect = canSoftDisconnectBase && !isHardDeletedEffective;
  const canHardDelete = canHardDeleteBase && !isHardDeletedEffective;

  // ------- ESU: Start / Generate / Manage -------
  const startFacebookEsu = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please log in again.");
      return;
    }

    try {
      setConnectingEsu(true);

      const res = await axiosClient.post("esu/facebook/start", {
        returnUrlAfterSuccess: "/app/welcomepage",
      });

      const authUrl =
        res?.data?.data?.authUrl ||
        res?.data?.authUrl ||
        res?.data?.url ||
        res?.data?.Data?.AuthUrl;

      if (!authUrl) {
        toast.error(
          res?.data?.message || "Could not get Meta Embedded Signup URL.",
        );
        return;
      }

      window.location.href = authUrl;
    } catch (err) {
      console.error("ESU start failed", err);
      toast.error("Failed to start Meta Embedded Signup.");
    } finally {
      setConnectingEsu(false);
    }
  };

  // ------- Disconnect (soft) – open confirmation modal -------
  const openDisconnectModal = () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }

    if (isHardDeletedEffective) {
      toast.info(
        "WhatsApp data is already deleted for this account. Disconnect is not applicable.",
      );
      return;
    }

    if (!canSoftDisconnect) {
      toast.info(
        "No active WhatsApp Business API connection is configured for this account.",
      );
      return;
    }

    setShowDisconnectModal(true);
  };

  const closeDisconnectModal = () => {
    if (!disconnectLoading) {
      setShowDisconnectModal(false);
    }
  };

  // ------- Disconnect (soft) – confirm in modal -------
  const confirmDisconnect = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }

    if (isHardDeletedEffective) {
      toast.info("WhatsApp data is already deleted for this account.");
      setShowDisconnectModal(false);
      return;
    }

    if (!hasAnyIntegrationState) {
      toast.info(
        "No active WhatsApp Business API connection is configured for this account.",
      );
      setShowDisconnectModal(false);
      return;
    }

    try {
      setLoading(true);
      setDisconnectLoading(true);

      const res = await axiosClient.delete("esu/facebook/disconnect");

      if (res?.data?.ok ?? true) {
        toast.success("WhatsApp was disconnected for this account.");
        setShowDisconnectModal(false);
      } else {
        toast.error(
          res?.data?.message ||
            "Failed to disconnect. Please check logs or contact support.",
        );
      }

      await loadStatus();
    } catch (err) {
      console.error("Disconnect failed", err);
      const message =
        err?.response?.data?.message ||
        "Failed to disconnect. Please check logs or contact support.";
      toast.error(message);
    } finally {
      setLoading(false);
      setDisconnectLoading(false);
    }
  };

  // ------- Deauthorize (debug) -------
  const handleDeauthorize = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }

    if (isHardDeletedEffective) {
      toast.info("WhatsApp data has already been deleted.");
      return;
    }

    try {
      setLoading(true);
      await axiosClient.post("esu/facebook/debug/deauthorize");
      toast.success("Local deauthorization complete (debug / internal).");
      await loadStatus();
    } catch (err) {
      console.error("Deauthorize failed", err);
      toast.error("Deauthorize failed or endpoint is disabled.");
    } finally {
      setLoading(false);
    }
  };

  // ------- Hard delete: modal + action -------
  const openDeleteModal = () => {
    if (!hasBusinessContext) {
      toast.error("Business context is missing. Please re-login.");
      return;
    }

    if (isHardDeletedEffective) {
      toast.info("WhatsApp data for this account is already deleted.");
      return;
    }

    setDeleteConfirmChecked(false);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (!deleteLoading) {
      setShowDeleteModal(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!hasBusinessContext) {
      toast.error("Workspace context is missing. Please re-login.");
      return;
    }
    if (!deleteConfirmChecked) {
      return;
    }

    try {
      setDeleteLoading(true);

      // Use your configured hard-delete endpoint
      const res = await axiosClient.delete(
        "esu/facebook/hard-delete-full-account",
      );

      if (res?.data?.ok) {
        toast.success(
          "Meta WhatsApp onboarding configuration and related data have been deleted for this account.",
        );
        setShowDeleteModal(false);

        // From this point in this session, treat as fully wiped
        setDeletedThisSession(true);
        setShowDeleteSuccessModal(true);

        await loadStatus();
      } else {
        toast.error(
          res?.data?.message ||
            "Failed to delete WhatsApp data. Please contact support.",
        );
      }
    } catch (err) {
      console.error("Hard delete failed", err);
      const message =
        err?.response?.data?.message ||
        "Failed to delete WhatsApp data. Please contact support.";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ------- Status Panel (Horizontal Banner Style) -------
  const renderStatusPanel = () => {
    // ✅ Hard deleted state (from backend OR this session)
    if (isHardDeletedEffective) {
      return (
        <div className="mb-6 rounded-xl border-l-4 border-slate-700 bg-slate-50 shadow-sm overflow-hidden transition-all">
          <div className="px-5 py-3.5 flex items-start gap-4">
            <div className="mt-0.5 p-1.5 bg-slate-200 rounded-lg text-slate-700">
              <Trash2 size={18} />
            </div>
            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Data Deleted
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                </div>
                <span className="text-xs text-slate-600 font-medium">
                  WhatsApp onboarding configuration and tokens were removed from
                  XploreByte. You can connect again via Embedded Signup.
                </span>
              </div>

              <button
                type="button"
                onClick={startFacebookEsu}
                disabled={connectingEsu || !hasBusinessContext}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/10 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {connectingEsu ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Connect via Facebook
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isConfigured = isConfiguredViaEsu;

    // Non-configured state
    if (!isConfigured) {
      return (
        <div className="mb-6 rounded-xl border-l-4 border-rose-500 bg-rose-50/40 shadow-sm overflow-hidden transition-all">
          <div className="px-5 py-3.5 flex items-start gap-4">
            <div className="mt-0.5 p-1.5 bg-rose-100 rounded-lg text-rose-600">
              <ShieldAlert size={18} />
            </div>
            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-rose-900">
                    Disconnected
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>
                <span className="text-xs text-rose-700/70 font-medium">
                  Account disconnected.
                </span>
              </div>
              <button
                type="button"
                onClick={startFacebookEsu}
                disabled={connectingEsu || !hasBusinessContext}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/10 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {connectingEsu ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Connect via Facebook
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Connected state
    return (
      <div className="mb-6 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/40 shadow-sm overflow-hidden transition-all">
        <div className="px-5 py-3.5 flex items-start gap-4">
          <div className="mt-0.5 p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
            <ShieldAlert size={18} />
          </div>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-900">
                    Connected
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                {isFullyHealthy && (
                  <span className="text-xs text-emerald-700/70 font-medium">
                    WhatsApp API is fully active via Meta Embedded Signup
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={startFacebookEsu}
                  disabled={connectingEsu || !hasBusinessContext}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  {connectingEsu ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isTokenExpiredOrInvalid || isTokenExpiringSoon ? (
                    "Refresh Token"
                  ) : (
                    "Manage Connection"
                  )}
                </button>

                {formattedExpiry && (
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider whitespace-nowrap">
                    Expires: {formattedExpiry}
                  </span>
                )}
              </div>
            </div>

            {isTokenExpiredOrInvalid && (
              <div className="mt-2 text-[10px] text-rose-700 bg-white/60 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <ShieldAlert size={12} className="shrink-0" />
                <p>
                  <b>Token Expired:</b> Generate a new long-lived token using{" "}
                  <b>Refresh Token</b> below.
                </p>
              </div>
            )}

            {isTokenExpiringSoon && (
              <div className="mt-2 text-[10px] text-amber-700 bg-white/60 border border-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <ShieldAlert size={12} className="shrink-0" />
                <p>
                  Your Meta access token will expire soon. Please refresh it to
                  avoid service gaps.
                </p>
              </div>
            )}

            {(isDev || hasAllAccess) && debugMessage && (
              <div className="mt-2 text-[10px] text-slate-500 font-mono">
                Debug: {debugMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ------- Render -------
  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm shadow-emerald-100/50">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  WhatsApp Api Integration
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Control your Meta WhatsApp Business Platform connection and
                  data settings
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => nav("/app/settings")}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all active:scale-95"
            >
              Back to Settings
            </button>
          </div>
        </div>

        {statusLoading || isLoading ? (
          <div className="space-y-6">
            <div className="h-20 shimmer-bg rounded-xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 shimmer-bg rounded-xl w-full" />
              <div className="h-48 shimmer-bg rounded-xl w-full" />
            </div>
          </div>
        ) : (
          <>
            {renderStatusPanel()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Soft disconnect card - HIDDEN TEMPORARILY */}
              {/* <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                      <ShieldAlert size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Disconnect WhatsApp (Temporary)
                    </h3>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Disables WhatsApp messaging in XploreByte. You can reconnect
                    later without repeating the full onboarding flow.
                  </p>

                  <button
                    type="button"
                    onClick={openDisconnectModal}
                    disabled={loading || !canSoftDisconnect}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                  >
                    Disconnect Account
                  </button>

                  {!canSoftDisconnect && (
                    <p className="text-[10px] text-slate-400 italic">
                      {isHardDeletedEffective
                        ? "WhatsApp data is deleted. Disconnect is not applicable."
                        : "No active integration found to disconnect."}
                    </p>
                  )}
                </div>
              </div> */}

              {/* Hard delete card */}
              <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-5 border-b border-rose-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                      <Trash2 size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                      Delete WhatsApp Data (Permanent)
                    </h3>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-xs text-rose-700/70 leading-relaxed font-medium">
                    Permanently deletes WhatsApp onboarding configuration and
                    tokens stored in XploreByte. This cannot be undone.
                  </p>

                  <button
                    type="button"
                    onClick={openDeleteModal}
                    disabled={!canHardDelete}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/10 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Delete All Data
                  </button>

                  {!canHardDelete && (
                    <p className="text-[10px] text-rose-400 italic">
                      {isHardDeletedEffective
                        ? "WhatsApp data is already deleted for this account."
                        : "Data has already been deleted or context is missing."}
                    </p>
                  )}
                </div>
              </div>

              {/* Debug Tools (Admins Only) */}
              {(isDev || hasAllAccess) && (
                <div className="md:col-span-2 bg-slate-900 rounded-xl border border-slate-800 shadow-inner overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
                        <RefreshCw size={14} />
                      </div>
                      <h3 className="text-[11px] font-bold text-slate-100 uppercase tracking-widest">
                        Internal Admin Tools
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="max-w-md">
                      <p className="text-[11px] text-slate-400 font-medium">
                        Trigger local deauthorization to clear ESU flags and
                        stored tokens without hitting Meta APIs.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDeauthorize}
                      disabled={
                        loading || !hasBusinessContext || isHardDeletedEffective
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    >
                      Run Local Deauth
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Disconnect confirmation modal */}
        {showDisconnectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={closeDisconnectModal}
            />
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                Disconnect WhatsApp Account?
              </h2>
              <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
                You are about to temporarily disconnect your WhatsApp account
                from XploreByte. This will pause all automated workflows,
                message sending, and template management. Your configuration
                stays stored for quick reconnection.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDisconnectModal}
                  disabled={disconnectLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDisconnect}
                  disabled={disconnectLoading}
                  className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {disconnectLoading ? "Disconnecting…" : "Confirm Disconnect"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={closeDeleteModal}
            />
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-rose-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                  <Trash2 size={20} />
                </div>
                <h2 className="text-lg font-bold text-rose-900">
                  Delete WhatsApp Data Permanently?
                </h2>
              </div>

              <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
                You are about to permanently remove your WhatsApp connection,
                phone settings, and configuration from XploreByte.{" "}
                <span className="text-rose-600 font-bold">
                  This action cannot be undone
                </span>
                , and you will need to complete the full setup process again to
                reconnect in the future.
              </p>

              <label className="flex items-start gap-3 p-3 bg-rose-50/50 rounded-lg mb-6 border border-rose-100/50 cursor-pointer transition-all hover:bg-rose-50">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  checked={deleteConfirmChecked}
                  onChange={e => setDeleteConfirmChecked(e.target.checked)}
                  disabled={deleteLoading}
                />
                <span className="text-[11px] text-rose-800 font-semibold leading-tight">
                  I confirm that I want to permanently delete all WhatsApp
                  configuration data for this account.
                </span>
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={!deleteConfirmChecked || deleteLoading}
                  className="px-5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-600/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {deleteLoading ? "Deleting Data..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data deletion success modal */}
        {showDeleteSuccessModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                  <Plus size={24} className="rotate-45" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">
                  Data Deleted Successfully
                </h2>
                <p className="text-xs text-slate-600 mb-6 font-medium leading-relaxed">
                  Your WhatsApp account connection and all your account data
                  have been deleted. These settings have been permanently
                  removed from XploreByte. You can reconnect at any time if you
                  wish to start over.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteSuccessModal(false)}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-600/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activation Modal */}
        <MetaPinActivationModal
          isOpen={showPinModal}
          onClose={closePinModal}
          businessId={effectiveBusinessId}
          onSuccess={handlePinSuccess}
        />
      </div>
    </div>
  );
}
