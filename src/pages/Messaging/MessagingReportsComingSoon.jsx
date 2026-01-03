// 📄 src/pages/Messaging/MessagingReportsComingSoon.jsx
import { useNavigate } from "react-router-dom";
import { BarChart3, ArrowLeft, Activity } from "lucide-react";

export default function MessagingReportsComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10 bg-[#f5f6f7]">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-indigo-100 p-8 relative overflow-hidden">
        {/* subtle background shapes */}
        <div className="pointer-events-none absolute -top-16 -right-10 h-36 w-36 rounded-full bg-indigo-100 opacity-40" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-emerald-100 opacity-30" />

        <div className="relative flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-indigo-50 p-3">
            <BarChart3 className="h-8 w-8 text-indigo-700" />
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 mb-3 border border-sky-200">
              <Activity className="h-4 w-4 text-sky-500" />
              <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
                Analytics in progress
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Messaging Reports & Analytics are coming
            </h1>

            <p className="text-sm text-slate-600 mb-3">
              Very soon you’ll see a visual dashboard for{" "}
              <span className="font-semibold">
                message sends, delivery, reads, and campaign performance
              </span>{" "}
              – all powered by the existing Message Logs and Catalog tracking.
            </p>

            <ul className="list-disc list-inside text-sm text-slate-600 mb-4 space-y-1">
              <li>Track delivery & read rates across campaigns.</li>
              <li>See which journeys and CTAs drive replies.</li>
              <li>Slice data by time range, template, and audience.</li>
            </ul>

            <p className="text-xs text-slate-500 mb-6">
              The Reports module is being designed with the same Entitlements
              system, so higher plans will unlock deeper analytics and
              breakdowns.
            </p>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/app/messaging")}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Messaging workspace
              </button>

              <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                This insight hub is under construction 📊
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
