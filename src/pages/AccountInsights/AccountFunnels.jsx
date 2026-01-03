import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import FunnelChart from "./components/FunnelChart";
import MetricCard from "./components/MetricCard";
import InsightsTabs from "./components/InsightsTabs";
import { useNavigate } from "react-router-dom";

export default function AccountFunnels() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get("/admin/account-insights/summary");
        if (!res.data) {
          throw new Error(
            "Empty response from /admin/account-insights/summary"
          );
        }
        setSummary(res.data);
      } catch (err) {
        console.error("Failed to load funnels summary", err);
        toast.error("Failed to load Account Funnels.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const goToSegment = segmentKey => {
    navigate(
      `/app/campaigns/CampaignWizard?segment=${encodeURIComponent(segmentKey)}`
    );
  };

  if (loading) {
    return (
      <div className="px-6 py-4">
        <div className="text-sm text-slate-500">
          Loading funnel analytics...
        </div>
      </div>
    );
  }

  const s = summary || {};
  const byStage = s.byLifecycleStage || s.ByLifecycleStage || {};

  const total = s.totalBusinesses ?? s.TotalBusinesses ?? 0;

  const trial = byStage.Trial ?? byStage["Trial"] ?? 0;
  const active = byStage.Active ?? byStage["Active"] ?? 0;
  const atRisk = byStage.AtRisk ?? byStage["AtRisk"] ?? 0;
  const dormant = byStage.Dormant ?? byStage["Dormant"] ?? 0;
  const noUsage =
    byStage.NoUsagePostApproval ?? byStage["NoUsagePostApproval"] ?? 0;

  const lifecycleSteps = [
    { label: "Total Approved/Live", value: total },
    { label: "Active", value: active },
    { label: "At Risk", value: atRisk },
    { label: "Dormant", value: dormant },
  ];

  const usageSteps = [
    { label: "Approved/Live", value: total },
    { label: "No Usage Post-Approval", value: noUsage },
    { label: "Healthy (Active)", value: active },
  ];

  return (
    <div className="px-6 py-4 space-y-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Account Funnels & Stages
        </h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          View how accounts flow across lifecycle stages and jump directly into
          targeted recovery or upgrade campaigns.
        </p>
      </div>

      <InsightsTabs />

      {/* Stage snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total"
          value={total}
          subtitle="All known businesses."
          highlight
        />
        <MetricCard label="Active" value={active} subtitle="Healthy usage." />
        <MetricCard
          label="At Risk"
          value={atRisk}
          subtitle="Low recent usage."
        />
        <MetricCard
          label="Dormant"
          value={dormant}
          subtitle="Long-term idle."
        />
        <MetricCard
          label="No Usage Post-Approval"
          value={noUsage}
          subtitle="Approved but never active."
        />
      </div>

      {/* Lifecycle funnel */}
      <FunnelChart title="Lifecycle Funnel (Health)" steps={lifecycleSteps} />
      <div className="flex flex-wrap gap-2 text-[10px] mt-1">
        <button
          onClick={() => goToSegment("registered-never-active")}
          className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
        >
          Target: Registered / Approved, Never Active
        </button>
        <button
          onClick={() => goToSegment("at-risk")}
          className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          Target: At-Risk Accounts
        </button>
        <button
          onClick={() => goToSegment("dormant")}
          className="px-2 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        >
          Target: Dormant Accounts
        </button>
      </div>

      {/* Usage / WA funnel */}
      <FunnelChart title="Usage / WA Engagement Funnel" steps={usageSteps} />
      <div className="flex flex-wrap gap-2 text-[10px] mt-1">
        <button
          onClick={() => goToSegment("no-usage-post-approval")}
          className="px-2 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
        >
          Target: No Usage Post-Approval
        </button>
        <button
          onClick={() => goToSegment("healthy-active")}
          className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        >
          Target: Healthy Active (for cross-sell)
        </button>
      </div>

      <div className="mt-2 text-[10px] text-slate-500">
        These funnels are built from the same summary data your alerts use.
        Later, a dedicated Segment API can resolve these CTAs into live
        audiences.
      </div>
    </div>
  );
}
