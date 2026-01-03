import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import MetricCard from "./components/MetricCard";
import TrendChart from "./components/TrendChart";
import InsightsTabs from "./components/InsightsTabs";

export default function AccountDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
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
        console.error("Failed to load account insights summary", err);
        toast.error("Failed to load Account Insights summary.");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  const s = summary || {};

  const totalAccounts = s.totalBusinesses ?? s.TotalBusinesses ?? 0;
  const activeAccounts = s.activeBusinesses ?? s.ActiveBusinesses ?? 0;
  const atRisk = s.atRiskBusinesses ?? s.AtRiskBusinesses ?? 0;
  const dormant = s.dormantBusinesses ?? s.DormantBusinesses ?? 0;
  const noUsage = s.noUsagePostApproval ?? s.NoUsagePostApproval ?? 0;

  const trialPlan = s.trialPlan ?? s.TrialPlan ?? 0;
  const paidPlan = s.paidPlan ?? s.PaidPlan ?? 0;
  const unknownPlan = s.unknownPlan ?? s.UnknownPlan ?? 0;

  const trialTotal = s.trialTotal ?? s.TrialTotal ?? trialPlan;
  const trialExpSoon = s.trialExpiringSoon ?? s.TrialExpiringSoon ?? 0;
  const trialExpiredNoUpgrade =
    s.trialExpiredNoUpgrade ?? s.TrialExpiredNoUpgrade ?? 0;

  const activationRate =
    totalAccounts > 0 ? ((activeAccounts + paidPlan) / totalAccounts) * 100 : 0;

  const paidConversionRate =
    totalAccounts > 0 ? (paidPlan / totalAccounts) * 100 : 0;

  // Temporary sample trends (replace with real series later)
  const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const newAccountsTrend = [2, 4, 3, 5];
  const usageTrend = [1, 3, 2, 4];

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Account Insights Overview
        </h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          High-level intelligence across all accounts: signup quality,
          activation, lifecycle stages, trials, and paid distribution.
        </p>
      </div>

      <InsightsTabs />

      {loading && (
        <div className="w-full py-10 flex items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading Account Insights...
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Core counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              label="Total Accounts"
              value={totalAccounts}
              subtitle="All businesses registered on the platform."
              highlight
            />
            <MetricCard
              label="Active"
              value={activeAccounts}
              subtitle="Currently healthy & engaged."
            />
            <MetricCard
              label="At Risk"
              value={atRisk}
              subtitle="Low recent usage; watch closely."
            />
            <MetricCard
              label="Dormant"
              value={dormant}
              subtitle="Idle for a long time."
            />
          </div>

          {/* Lifecycle risk */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="No Usage Post-Approval"
              value={noUsage}
              subtitle="Approved but never used — top churn risk."
            />
            <MetricCard
              label="Activation Rate"
              value={`${activationRate.toFixed(1)}%`}
              subtitle="(Active + Paid) / Total Accounts"
            />
            <MetricCard
              label="Paid Conversion"
              value={`${paidConversionRate.toFixed(1)}%`}
              subtitle="Paid / Total Accounts"
            />
          </div>

          {/* Plan & trial snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="On Trial Plan"
              value={trialPlan}
              subtitle="Currently on a trial plan."
            />
            <MetricCard
              label="On Paid Plan"
              value={paidPlan}
              subtitle="Any paid subscription."
              highlight
            />
            <MetricCard
              label="Unknown Plan"
              value={unknownPlan}
              subtitle="Check mapping / billing sync."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Trials (Total)"
              value={trialTotal}
              subtitle="Active trials in the system."
            />
            <MetricCard
              label="Trials Expiring Soon"
              value={trialExpSoon}
              subtitle="Ideal targets for save / upsell."
            />
            <MetricCard
              label="Trials Expired, No Upgrade"
              value={trialExpiredNoUpgrade}
              subtitle="Lost opportunities; review patterns."
            />
          </div>

          {/* Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
              <TrendChart
                title="New Accounts (Sample Trend)"
                labels={labels}
                values={newAccountsTrend}
                type="bar"
              />
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
              <TrendChart
                title="Active Usage Proxy (Sample)"
                labels={labels}
                values={usageTrend}
                type="line"
              />
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            For deeper cohorts and actions, use the Funnels and Alerts tabs in
            Account Insights.
          </div>
        </>
      )}
    </div>
  );
}
// import React, { useEffect, useState } from "react";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import MetricCard from "./components/MetricCard";
// import TrendChart from "./components/TrendChart";
// import InsightsTabs from "./components/InsightsTabs";

// export default function AccountDashboard() {
//   const [loading, setLoading] = useState(true);
//   const [summary, setSummary] = useState(null);

//   useEffect(() => {
//     const loadSummary = async () => {
//       try {
//         setLoading(true);
//         const res = await axiosClient.get("/admin/account-insights/summary");

//         if (!res.data) {
//           throw new Error(
//             "Empty response from /admin/account-insights/summary"
//           );
//         }

//         setSummary(res.data);
//       } catch (err) {
//         console.error("Failed to load account insights summary", err);
//         toast.error("Failed to load Account Insights summary.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadSummary();
//   }, []);

//   const s = summary || {};

//   const totalAccounts = s.totalBusinesses ?? s.TotalBusinesses ?? 0;
//   const activeAccounts = s.activeBusinesses ?? s.ActiveBusinesses ?? 0;
//   const atRisk = s.atRiskBusinesses ?? s.AtRiskBusinesses ?? 0;
//   const dormant = s.dormantBusinesses ?? s.DormantBusinesses ?? 0;
//   const noUsage = s.noUsagePostApproval ?? s.NoUsagePostApproval ?? 0;

//   const trialPlan = s.trialPlan ?? s.TrialPlan ?? 0;
//   const paidPlan = s.paidPlan ?? s.PaidPlan ?? 0;
//   const unknownPlan = s.unknownPlan ?? s.UnknownPlan ?? 0;

//   const trialTotal = s.trialTotal ?? s.TrialTotal ?? trialPlan;
//   const trialExpSoon = s.trialExpiringSoon ?? s.TrialExpiringSoon ?? 0;
//   const trialExpiredNoUpgrade =
//     s.trialExpiredNoUpgrade ?? s.TrialExpiredNoUpgrade ?? 0;

//   const activationRate =
//     totalAccounts > 0 ? ((activeAccounts + paidPlan) / totalAccounts) * 100 : 0;

//   const paidConversionRate =
//     totalAccounts > 0 ? (paidPlan / totalAccounts) * 100 : 0;

//   // Temporary sample trends (replace with real series later)
//   const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
//   const newAccountsTrend = [2, 4, 3, 5];
//   const usageTrend = [1, 3, 2, 4];

//   return (
//     <div className="px-6 py-4 space-y-6">
//       {/* Header */}
//       <div className="flex flex-col gap-1">
//         <h1 className="text-2xl font-semibold text-slate-900">
//           Account Insights Overview
//         </h1>
//         <p className="text-sm text-slate-500 max-w-3xl">
//           High-level intelligence across all accounts: signup quality,
//           activation, lifecycle stages, trials, and paid distribution.
//         </p>
//       </div>

//       <InsightsTabs />

//       {loading && (
//         <div className="w-full py-10 flex items-center justify-center">
//           <div className="text-sm text-slate-500">
//             Loading Account Insights...
//           </div>
//         </div>
//       )}

//       {!loading && (
//         <>
//           {/* Core counts */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
//             <MetricCard
//               label="Total Accounts"
//               value={totalAccounts}
//               subtitle="All businesses registered on the platform."
//               highlight
//             />
//             <MetricCard
//               label="Active"
//               value={activeAccounts}
//               subtitle="Currently healthy & engaged."
//             />
//             <MetricCard
//               label="At Risk"
//               value={atRisk}
//               subtitle="Low recent usage; watch closely."
//             />
//             <MetricCard
//               label="Dormant"
//               value={dormant}
//               subtitle="Idle for a long time."
//             />
//           </div>

//           {/* Lifecycle risk */}
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <MetricCard
//               label="No Usage Post-Approval"
//               value={noUsage}
//               subtitle="Approved but never used — top churn risk."
//             />
//             <MetricCard
//               label="Activation Rate"
//               value={`${activationRate.toFixed(1)}%`}
//               subtitle="(Active + Paid) / Total Accounts"
//             />
//             <MetricCard
//               label="Paid Conversion"
//               value={`${paidConversionRate.toFixed(1)}%`}
//               subtitle="Paid / Total Accounts"
//             />
//           </div>

//           {/* Plan & trial snapshot */}
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <MetricCard
//               label="On Trial Plan"
//               value={trialPlan}
//               subtitle="Currently on a trial plan."
//             />
//             <MetricCard
//               label="On Paid Plan"
//               value={paidPlan}
//               subtitle="Any paid subscription."
//               highlight
//             />
//             <MetricCard
//               label="Unknown Plan"
//               value={unknownPlan}
//               subtitle="Check mapping / billing sync."
//             />
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <MetricCard
//               label="Trials (Total)"
//               value={trialTotal}
//               subtitle="Active trials in the system."
//             />
//             <MetricCard
//               label="Trials Expiring Soon"
//               value={trialExpSoon}
//               subtitle="Ideal targets for save / upsell."
//             />
//             <MetricCard
//               label="Trials Expired, No Upgrade"
//               value={trialExpiredNoUpgrade}
//               subtitle="Lost opportunities; review patterns."
//             />
//           </div>

//           {/* Trends */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//             <TrendChart
//               title="New Accounts (Sample Trend)"
//               labels={labels}
//               values={newAccountsTrend}
//               type="bar"
//             />
//             <TrendChart
//               title="Active Usage Proxy (Sample)"
//               labels={labels}
//               values={usageTrend}
//               type="line"
//             />
//           </div>

//           <div className="mt-2 text-[11px] text-slate-500">
//             For deeper cohorts and actions, use the Funnels and Alerts tabs in
//             Account Insights.
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
