// 📄 src/pages/Messaging/TemplateMessagingComingSoon.jsx
import { useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, Sparkles } from "lucide-react";

export default function TemplateMessagingComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10 bg-[#f5f6f7]">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-emerald-100 p-8 relative overflow-hidden">
        {/* soft background glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-100 opacity-40" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cyan-100 opacity-40" />

        <div className="relative flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-emerald-50 p-3">
            <FileText className="h-8 w-8 text-emerald-700" />
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 mb-3 border border-amber-200">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Coming soon
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Template-based Messaging is on the way
            </h1>

            <p className="text-sm text-slate-600 mb-3">
              You’ll soon be able to send{" "}
              <span className="font-semibold">approved WhatsApp templates</span>{" "}
              directly from this workspace – perfect for OTPs, alerts, and
              recurring campaigns that must stay compliant.
            </p>

            <ul className="list-disc list-inside text-sm text-slate-600 mb-4 space-y-1">
              <li>Pick from pre-approved WhatsApp templates.</li>
              <li>Personalise placeholders with contact fields.</li>
              <li>Track delivery and performance for every send.</li>
            </ul>

            <p className="text-xs text-slate-500 mb-6">
              We’re wiring this to the same Entitlements & Quota engine, so your
              plan limits and permissions will apply automatically when this
              feature goes live.
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

              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                You already discovered this before launch 🚀
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
