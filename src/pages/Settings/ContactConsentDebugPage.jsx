import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Search, RefreshCcw } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../app/providers/AuthProvider";

function readErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export default function ContactConsentDebugPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const roleKey = String(role || "").toLowerCase();
  const isAllowed = useMemo(
    () => roleKey === "admin" || roleKey === "superadmin",
    [roleKey]
  );

  const [phone, setPhone] = useState("");
  const [resetChannel, setResetChannel] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingForce, setLoadingForce] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [forceResult, setForceResult] = useState(null);

  if (!isAllowed) {
    return <Navigate to="/no-access" replace />;
  }

  const phoneValue = phone.trim();

  const handleCheckStatus = async () => {
    if (!phoneValue) {
      toast.error("Enter a phone number first.");
      return;
    }

    try {
      setLoadingStatus(true);
      setStatusResult(null);

      const res = await axiosClient.get("/contacts/debug/opt-status", {
        params: { phone: phoneValue },
      });

      setStatusResult(res?.data || null);
      toast.success("Opt status loaded.");
    } catch (err) {
      const msg = readErrorMessage(err, "Failed to load opt status.");
      toast.error(msg);
      setStatusResult({ error: msg, raw: err?.response?.data || null });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleForceOptIn = async () => {
    if (!phoneValue) {
      toast.error("Enter a phone number first.");
      return;
    }

    try {
      setLoadingForce(true);
      setForceResult(null);

      const res = await axiosClient.post(
        "/contacts/debug/force-opt-in",
        null,
        {
          params: { phone: phoneValue, resetChannel },
        }
      );

      setForceResult(res?.data || null);
      toast.success("Force opt-in applied.");
      await handleCheckStatus();
    } catch (err) {
      const msg = readErrorMessage(err, "Failed to force opt-in.");
      toast.error(msg);
      setForceResult({ error: msg, raw: err?.response?.data || null });
    } finally {
      setLoadingForce(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => navigate("/app/settings")}
        className="inline-flex items-center gap-2 text-sm text-emerald-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Settings
      </button>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h1 className="text-xl font-semibold text-slate-900">
          Contact Consent Debug
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Admin-only tools to check opt status and force opt-in for a contact.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Enter phone (e.g. 919876543210)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={loadingStatus}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Search size={14} />
            {loadingStatus ? "Checking..." : "Check Status"}
          </button>

          <button
            type="button"
            onClick={handleForceOptIn}
            disabled={loadingForce}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-700 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCcw size={14} />
            {loadingForce ? "Applying..." : "Force Opt-In"}
          </button>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={resetChannel}
            onChange={e => setResetChannel(e.target.checked)}
            className="accent-emerald-600"
          />
          Reset channel status to Valid
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">
            Status Response
          </div>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap break-all">
            {statusResult
              ? JSON.stringify(statusResult, null, 2)
              : "No status response yet."}
          </pre>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">
            Force Opt-In Response
          </div>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap break-all">
            {forceResult
              ? JSON.stringify(forceResult, null, 2)
              : "No force opt-in response yet."}
          </pre>
        </div>
      </div>
    </div>
  );
}
