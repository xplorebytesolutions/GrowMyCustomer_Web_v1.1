// 📄 src/pages/CampaignReports/CampaignRetargetWizardPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ChevronLeft, Wand2 } from "lucide-react";

import { Card } from "../../components/ui/card";
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
import { runCampaignRetargetWizard } from "../../api/campaignReportApi";

export default function CampaignRetargetWizardPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const presetBucket =
    params.get("bucket") || params.get("segment") || "READ_NOT_REPLIED";
  const presetRepliedWindowDays = Number(params.get("windowDays") || 7);
  const returnTab = params.get("tab");

  const reportUrl = `/app/campaigns/${campaignId}/reports/logs${
    returnTab ? `?tab=${encodeURIComponent(returnTab)}` : ""
  }`;

  const { can, isLoading } = useAuth();

  const allowed = useMemo(() => {
    return can?.(FK.CAMPAIGN_BUILDER) || can?.(FK.CAMPAIGN_STATUS_VIEW);
  }, [can]);

  const [bucket, setBucket] = useState(presetBucket);
  const [repliedWindowDays, setRepliedWindowDays] = useState(
    Number.isFinite(presetRepliedWindowDays) && presetRepliedWindowDays > 0
      ? presetRepliedWindowDays
      : 7
  );
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!campaignId) return;

    const safeBucket = String(bucket || "").trim();
    if (!safeBucket) {
      toast.warn("Select a bucket.");
      return;
    }

    const wd = Number(repliedWindowDays);
    const safeWindowDays = Number.isFinite(wd) && wd > 0 ? wd : 7;

    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      toast.warn("Campaign name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await runCampaignRetargetWizard(campaignId, {
        bucket: safeBucket,
        repliedWindowDays: safeWindowDays,
        windowDays: safeWindowDays, // Backward compatibility
        name: trimmedName,
      });

      const data = res?.data?.data ?? res?.data ?? null;

      if (data?.newCampaignId) {
        toast.success("Retargeted draft campaign created.");
        navigate(`/app/campaigns/${data.newCampaignId}`, { replace: true });
        return;
      }

      // If we reach here, it means backend didn't return a new campaign ID
      console.warn("Retarget wizard response missing newCampaignId:", data);
      toast.error("Failed to initialize new campaign. Returning to report.");
      navigate(reportUrl, { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Failed to run retarget wizard.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    navigate(reportUrl);
  }

  if (isLoading)
    return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Retarget Wizard
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            You don’t have permission to run retargeting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to report
          </button>

        <h1 className="text-2xl font-semibold text-slate-900 mt-2 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-emerald-600" />
          Retarget Wizard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Create a fresh draft campaign for your selected audience segment.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Target Segment</p>
            <select
              value={bucket}
              onChange={e => setBucket(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-900"
            >
              <option value="DELIVERED_NOT_READ">Delivered not read</option>
              <option value="READ_NOT_REPLIED">Read, not replied</option>
              <option value="CLICKED_NOT_REPLIED">Clicked, not replied</option>
              <option value="DELIVERED_NOT_REPLIED">
                Delivered, not replied
              </option>
              <option value="FAILED">Failed</option>
              <option value="REPLIED">Replied (for follow-up)</option>
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Engagement Window
            </p>
            <select
              value={repliedWindowDays}
              onChange={e => setRepliedWindowDays(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-900"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              New Campaign Name <span className="text-rose-500">*</span>
            </p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="E.g. Retargeting Run - [Segment Name] - Jan 2024"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <Wand2 className="w-4 h-4" />
            {loading ? "Initializing..." : "Create Draft Campaign"}
          </button>
        </div>
      </Card>
    </div>
  );
}
