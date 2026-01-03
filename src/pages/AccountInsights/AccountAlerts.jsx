// // 📄 src/pages/AccountInsights/AccountAlerts.jsx
// import React, { useEffect, useState } from "react";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import MetricCard from "./components/MetricCard";
// import AlertCard from "./components/AlertCard";
// import InsightsTabs from "./components/InsightsTabs";

// export default function AccountAlerts() {
//   const [loading, setLoading] = useState(true);
//   const [alerts, setAlerts] = useState([]);

//   useEffect(() => {
//     const loadAlerts = async () => {
//       try {
//         setLoading(true);

//         const [trialRes, noUsageRes] = await Promise.all([
//           axiosClient.get("/admin/account-insights/trial-expiring-soon", {
//             params: { days: 3 },
//           }),
//           axiosClient.get("/admin/account-insights/by-stage", {
//             params: {
//               stage: "NoUsagePostApproval",
//               page: 1,
//               pageSize: 200,
//             },
//           }),
//         ]);

//         // Trials expiring soon
//         const trialItems = Array.isArray(trialRes.data)
//           ? trialRes.data.map(x => ({
//               id: `trial-${x.businessId}`,
//               severity: "warning",
//               title: "Trial ending soon",
//               message:
//                 "Trial is ending soon and this account has not upgraded yet.",
//               businessId: x.businessId,
//               businessName: x.businessName,
//               daysToEvent: null, // can compute from trial end date if backend exposes it
//               createdAtUtc: x.createdAt,
//             }))
//           : [];

//         // No usage after approval
//         const noUsageSource = Array.isArray(noUsageRes.data?.items)
//           ? noUsageRes.data.items
//           : Array.isArray(noUsageRes.data)
//           ? noUsageRes.data
//           : [];

//         const noUsageItems = noUsageSource.map(x => ({
//           id: `no-usage-${x.businessId}`,
//           severity: "warning",
//           title: "No usage after approval",
//           message:
//             "Approved but no messages sent post-approval. High churn risk.",
//           businessId: x.businessId,
//           businessName: x.businessName,
//           daysToEvent: null,
//           createdAtUtc: x.createdAt,
//         }));

//         // Merge & de-duplicate (by business + title so we don't show exact clones)
//         const merged = [...trialItems, ...noUsageItems];
//         const dedupMap = merged.reduce((acc, alert) => {
//           const key = `${alert.businessId || "na"}|${alert.title}`;
//           if (!acc[key]) acc[key] = alert;
//           return acc;
//         }, {});
//         const uniqueAlerts = Object.values(dedupMap);

//         setAlerts(uniqueAlerts);
//       } catch (err) {
//         console.error("Failed to load account insight alerts", err);
//         toast.error("Failed to load Account Alerts.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadAlerts();
//   }, []);

//   const totalAlerts = alerts.length;
//   const criticalCount = alerts.filter(a => a.severity === "critical").length;
//   const warningCount = alerts.filter(a => a.severity === "warning").length;
//   const infoCount = alerts.filter(a => a.severity === "info").length;

//   return (
//     <div className="px-6 py-4 space-y-6">
//       {/* Header */}
//       <div className="flex flex-col gap-1">
//         <h1 className="text-2xl font-semibold text-slate-900">
//           Account Alerts
//         </h1>
//         <p className="text-sm text-slate-500 max-w-3xl">
//           Concrete cohorts that need attention: trials expiring soon and
//           approved accounts with zero usage.
//         </p>
//       </div>

//       <InsightsTabs />

//       {loading && (
//         <div className="w-full py-10 flex items-center justify-center">
//           <div className="text-sm text-slate-500">
//             Loading alerts &amp; signals...
//           </div>
//         </div>
//       )}

//       {!loading && (
//         <>
//           {/* Summary */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//             <MetricCard
//               label="Total Alerts"
//               value={totalAlerts}
//               subtitle="Accounts needing action."
//               highlight
//             />
//             <MetricCard
//               label="Critical"
//               value={criticalCount}
//               subtitle="Reserved for severe issues."
//             />
//             <MetricCard
//               label="Warnings"
//               value={warningCount}
//               subtitle="Risk & opportunity cohorts."
//             />
//             <MetricCard
//               label="Informational"
//               value={infoCount}
//               subtitle="General signals."
//             />
//           </div>

//           {/* Alerts list */}
//           {alerts.length === 0 ? (
//             <div className="w-full py-10 flex items-center justify-center">
//               <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full border border-emerald-100">
//                 No active alerts. Your accounts look stable.
//               </div>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 gap-3">
//               {alerts.map(a => (
//                 <AlertCard key={a.id} {...a} />
//               ))}
//             </div>
//           )}

//           <div className="mt-2 text-[10px] text-slate-500">
//             Each alert here represents a distinct risk or opportunity cohort.
//             Later, a shared Segment API can let these feed directly into
//             campaigns or workflows.
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
// 📄 src/pages/AccountInsights/AccountAlerts.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import MetricCard from "./components/MetricCard";
import AlertCard from "./components/AlertCard";
import InsightsTabs from "./components/InsightsTabs";

export default function AccountAlerts() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);

        const [trialRes, noUsageRes] = await Promise.all([
          axiosClient.get("/admin/account-insights/trial-expiring-soon", {
            params: { days: 3 },
          }),
          axiosClient.get("/admin/account-insights/by-stage", {
            params: {
              stage: "NoUsagePostApproval",
              page: 1,
              pageSize: 200,
            },
          }),
        ]);

        // Trials expiring soon
        const trialItems = Array.isArray(trialRes.data)
          ? trialRes.data.map(x => ({
              id: `trial-${x.businessId}`,
              severity: "warning",
              title: "Trial ending soon",
              message:
                "Trial is ending soon and this account has not upgraded yet.",
              businessId: x.businessId,
              businessName: x.businessName,
              daysToEvent: null, // can compute from trial end date if backend exposes it
              createdAtUtc: x.createdAt,
            }))
          : [];

        // No usage after approval
        const noUsageSource = Array.isArray(noUsageRes.data?.items)
          ? noUsageRes.data.items
          : Array.isArray(noUsageRes.data)
          ? noUsageRes.data
          : [];

        const noUsageItems = noUsageSource.map(x => ({
          id: `no-usage-${x.businessId}`,
          severity: "warning",
          title: "No usage after approval",
          message:
            "Approved but no messages sent post-approval. High churn risk.",
          businessId: x.businessId,
          businessName: x.businessName,
          daysToEvent: null,
          createdAtUtc: x.createdAt,
        }));

        // Merge & de-duplicate (by business + title so we don't show exact clones)
        const merged = [...trialItems, ...noUsageItems];
        const dedupMap = merged.reduce((acc, alert) => {
          const key = `${alert.businessId || "na"}|${alert.title}`;
          if (!acc[key]) acc[key] = alert;
          return acc;
        }, {});
        const uniqueAlerts = Object.values(dedupMap);

        setAlerts(uniqueAlerts);
      } catch (err) {
        console.error("Failed to load account insight alerts", err);
        toast.error("Failed to load Account Alerts.");
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const totalAlerts = alerts.length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  const infoCount = alerts.filter(a => a.severity === "info").length;

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Account Alerts
        </h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Concrete cohorts that need attention: trials expiring soon and
          approved accounts with zero usage.
        </p>
      </div>

      <InsightsTabs />

      {loading && (
        <div className="w-full py-10 flex items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading alerts &amp; signals...
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Alerts"
              value={totalAlerts}
              subtitle="Accounts needing action."
              highlight
            />
            <MetricCard
              label="Critical"
              value={criticalCount}
              subtitle="Reserved for severe issues."
            />
            <MetricCard
              label="Warnings"
              value={warningCount}
              subtitle="Risk & opportunity cohorts."
            />
            <MetricCard
              label="Informational"
              value={infoCount}
              subtitle="General signals."
            />
          </div>

          {/* Alerts list */}
          {alerts.length === 0 ? (
            <div className="w-full py-10 flex items-center justify-center">
              <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full border border-emerald-100">
                No active alerts. Your accounts look stable.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {alerts.map(a => (
                <AlertCard key={a.id} {...a} />
              ))}
            </div>
          )}

          <div className="mt-2 text-[10px] text-slate-500">
            Each alert here represents a distinct risk or opportunity cohort.
            Later, a shared Segment API can let these feed directly into
            campaigns or workflows.
          </div>
        </>
      )}
    </div>
  );
}
