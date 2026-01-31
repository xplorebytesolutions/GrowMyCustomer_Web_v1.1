import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  ShieldCheck, 
  BarChart3,
  Activity,
  Loader2
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

dayjs.extend(relativeTime);

const QUALITIES = {
  GREEN: { color: "text-emerald-600 bg-emerald-50 border-emerald-100", label: "High Quality", dot: "bg-emerald-500" },
  YELLOW: { color: "text-amber-600 bg-amber-50 border-amber-100", label: "Medium Quality", dot: "bg-amber-500" },
  RED: { color: "text-rose-600 bg-rose-50 border-rose-100", label: "Low Quality", dot: "bg-rose-500" },
  NA: { color: "text-slate-500 bg-slate-50 border-slate-100", label: "N/A", dot: "bg-slate-400" },
  UNKNOWN: { color: "text-slate-500 bg-slate-50 border-slate-100", label: "Unknown", dot: "bg-slate-400" }
};

const TIERS = {
  TIER_NOT_VERIFIED: "Trial (50/day)",
  TIER_250: "250/day",
  TIER_1K: "1K/day",
  TIER_10K: "10K/day",
  TIER_100K: "100K/day",
  TIER_UNLIMITED: "Unlimited"
};

export default function ConnectionSummaryCard({ businessId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await axiosClient.get("whatsappsettings/connection-summary");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch connection summary", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await axiosClient.post("whatsappsettings/connection-summary/refresh");
      if (res.data.success) {
        setData(res.data.data);
        toast.success("Connection status updated from Meta.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to refresh status.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchSummary();
    };
    init();
  }, []);

  const hasAutoRefreshed = React.useRef(false);

  // Auto-refresh once if data has NEVER been synced (lastUpdated is null)
  useEffect(() => {
    if (
      !loading && 
      !refreshing && 
      data && 
      !data.lastUpdated && 
      !hasAutoRefreshed.current
    ) {
      hasAutoRefreshed.current = true;
      handleRefresh();
    }
  }, [loading, data]);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-slate-200 bg-white animate-pulse">
        <div className="h-6 w-1/3 bg-slate-100 rounded mb-4" />
        <div className="flex gap-4">
          <div className="h-16 w-1/4 bg-slate-100 rounded-xl" />
          <div className="h-16 w-1/4 bg-slate-100 rounded-xl" />
          <div className="h-16 w-1/4 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // If no data (e.g. before first sync), show placeholder or nothing
  if (!data) return null;

  const rawQuality = data.qualityRating?.toUpperCase();
  const qualityConfig = QUALITIES[rawQuality] || QUALITIES.UNKNOWN;
  const qualityLabel = (rawQuality === 'UNKNOWN' || !rawQuality)
    ? "Pending"
    : (qualityConfig === QUALITIES.UNKNOWN && data.qualityRating ? data.qualityRating : qualityConfig.label);

  const tierLabel = TIERS[data.messagingLimitTier] || data.messagingLimitTier || "Unknown Tier";
  
  const lastUpdated = data.lastUpdated 
    ? dayjs(data.lastUpdated).fromNow()
    : "Never";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                Account Summary
            </h3>
            <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-medium">Updated {lastUpdated}</span>
                <button 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                    title="Refresh from Meta"
                >
                    <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-500" : ""} />
                </button>
            </div>
        </div>

        {/* Metrics Grid */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            
            {/* Status */}
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <div className="flex items-center gap-2">
                     {data.status === 'CONNECTED' ? (
                         <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                     ) : (
                         <div className="h-2 w-2 rounded-full bg-rose-500" />
                     )}
                     <span className="text-sm font-bold text-slate-900">{data.status || "Unknown"}</span>
                </div>
            </div>

            {/* Connected Numbers */}
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connected Numbers</p>
                <div className="flex flex-wrap items-center gap-1.5">
                    {data.whatsAppBusinessNumbers && data.whatsAppBusinessNumbers.length > 0 ? (
                        data.whatsAppBusinessNumbers.map((num, idx) => (
                          <span key={idx} className="text-sm font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {num}
                          </span>
                        ))
                    ) : (
                        <span className="text-sm font-bold text-slate-900">{data.whatsAppBusinessNumber || "None"}</span>
                    )}
                </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Name</p>
                <div className="flex items-center gap-1.5">
                    {data.verifiedName ? (
                        <>
                            <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]" title={data.verifiedName}>
                                {data.verifiedName}
                            </span>
                            {data.nameStatus === 'APPROVED' && (
                                <ShieldCheck size={14} className="text-emerald-500 fill-emerald-50" title="Verified by Meta" />
                            )}
                        </>
                    ) : (
                        <span className="text-sm text-slate-400 italic">Not set</span>
                    )}
                </div>
            </div>

            {/* Quality Rating */}
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quality</p>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${qualityConfig.color}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${qualityConfig.dot}`} />
                    {qualityLabel}
                </div>
            </div>

            {/* Messaging Tier */}
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Messaging Limit</p>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <BarChart3 size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm font-bold text-slate-900 truncate">{tierLabel}</span>
                </div>
            </div>

        </div>
    </div>
);
}
