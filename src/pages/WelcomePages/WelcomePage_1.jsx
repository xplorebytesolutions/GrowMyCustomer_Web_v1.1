import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Settings,
  Zap,
  PhoneCall,
  CheckCircle2,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

const isGuid = v =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

export default function WelcomePage() {
  const auth = useAuth() || {};
  const {
    isLoading,
    userName,
    businessId: directBusinessId,
    planId: directPlanId,
    business,
  } = auth;

  const businessId =
    directBusinessId || business?.businessId || business?.id || null;

  const planId = directPlanId ?? business?.planId ?? null;
  const hasPlan = !!planId;
  const [search] = useSearchParams();
  const [showMigration, setShowMigration] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [migrationSubmitted, setMigrationSubmitted] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // 🔍 WhatsApp connection status (from WhatsAppSettings)
  const [waStatus, setWaStatus] = useState({
    loading: true,
    hasSettings: false,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!isGuid(businessId)) {
      setWaStatus({ loading: false, hasSettings: false, data: null });
      return;
    }

    axiosClient
      .get("whatsappsettings/me")
      .then(res => {
        if (cancelled) return;

        const has = !!res?.data?.hasSettings;
        setWaStatus({
          loading: false,
          hasSettings: has,
          data: has ? res.data.data : null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setWaStatus({ loading: false, hasSettings: false, data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const whatsappConnected = waStatus.hasSettings;

  const navigate = useNavigate();
  useEffect(() => {
    const status = search.get("esuStatus");
    if (status === "success") {
      toast.success("🎉 WhatsApp Business API connected successfully.");
    } else if (status === "failed") {
      toast.error(
        "WhatsApp connection failed. Please retry the embedded signup."
      );
    }

    if (status) {
      const params = new URLSearchParams(search);
      params.delete("esuStatus");
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [search, navigate]);

  // ESU: start connect
  const startFacebookConnect = async () => {
    try {
      setConnecting(true);
      const returnUrlAfterSuccess = "/app/welcomepage";

      if (!isGuid(businessId)) {
        toast.error("Business context missing. Please re-login.");
        return;
      }

      const res = await axiosClient.post(
        "esu/facebook/start",
        { returnUrlAfterSuccess },
        { headers: { "X-Business-Id": businessId } }
      );

      const authUrl =
        res?.data?.data?.authUrl || res?.data?.authUrl || res?.data?.url;

      if (!authUrl) {
        toast.error(
          res?.data?.message || "Could not get Facebook connect URL."
        );
        return;
      }

      window.location.href = authUrl;
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to start Facebook Connect."
      );
    } finally {
      setConnecting(false);
    }
  };

  if (isLoading) {
    return (
      // ✅ CHANGED: Set to bg-slate-50
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-emerald-700 font-semibold">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // Simple onboarding “score” just for the header badge
  const completedSteps = (whatsappConnected ? 1 : 0) + (hasPlan ? 1 : 0);
  const totalSteps = 3; // Profile, WhatsApp, Plan

  return (
    // ✅ CHANGED: Set to bg-slate-50 (This provides contrast for the white cards)
    <div className="h-full w-full bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Header + high-level status */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {userName ? `Welcome back, ${userName}` : "Welcome to XploreByte"}
            </h1>

            <p className="mt-1 text-sm text-slate-600 max-w-xl">
              Follow the steps below to get your WhatsApp workspace ready for
              real customers. You can explore safely even before choosing a
              plan.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* WhatsApp badge */}
              {waStatus.loading ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-500 border border-slate-200">
                  Checking WhatsApp status…
                </span>
              ) : (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    whatsappConnected
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}
                >
                  {whatsappConnected
                    ? `WhatsApp Active${
                        waStatus.data?.whatsAppBusinessNumber
                          ? ` · ${waStatus.data.whatsAppBusinessNumber}`
                          : ""
                      }`
                    : "WhatsApp Not Connected"}
                </span>
              )}

              {/* Plan badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  hasPlan
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-sky-100 text-sky-700 border-sky-200"
                }`}
              >
                {hasPlan ? "Plan Selected" : "Plan Not Selected"}
              </span>

              {/* Onboarding progress badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200">
                Onboarding {completedSteps}/{totalSteps} steps complete
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm text-xs text-slate-600 max-w-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <HelpCircle size={14} className="text-emerald-600" />
              Need help getting started?
            </div>
            <p>
              Watch the intro video in the welcome panel below or reach out to
              support from the help center.
            </p>
            <div className="flex flex-wrap gap-2">
              <p
                href="tel:+919306099863"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-slate-950 shadow-sm hover:bg-emerald-400 transition"
              >
                <PhoneCall className="h-4 w-4" />
                +91 9306099863
              </p>
              <a
                href="https://wa.me/919306099863?text=Hi%2C%20I%20need%20help%20setting%20up%20XploreByte%20and%20connecting%20WhatsApp%20API."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-400 hover:text-emerald-200 transition"
              >
                <MessageCircle className="h-4 w-4" />
                Chat with us
              </a>
            </div>
          </div>
        </div>

        {!whatsappConnected && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-5 py-4 flex flex-col gap-3">
            {/* local animation + tooltip styles */}
            <style>{`
      @keyframes stepBubble {
        0%, 100% {
          transform: translateY(0);
          box-shadow: 0 0 0 0 rgba(16,185,129,0.0);
        }
        50% {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px -10px rgba(16,185,129,0.45);
        }
      }
      @keyframes stepDotPulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.9;
        }
        50% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
      .step-bubble-animate {
        animation: stepBubble 1.4s ease-in-out infinite;
      }
      .step-dot-pulse {
        animation: stepDotPulse 1.4s ease-in-out infinite;
      }

      .step-tooltip::after {
        content: "";
        position: absolute;
        top: -3px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 0 5px 5px 5px;
        border-style: solid;
        border-color: transparent transparent #022c22 transparent;
      }
    `}</style>

            <div className="mt-1 rounded-xl bg-white border border-emerald-100 px-4 py-3 flex flex-col gap-3 shadow-sm">
              {/* status pill like offline badge */}
              <div className="inline-flex items-center self-start rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-100 mb-1">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-500 step-dot-pulse" />
                WhatsApp API not connected
              </div>

              {/* Progress strip */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Steps line with progression dots */}
                <div className="flex items-center gap-4 text-[13px] font-medium text-slate-600">
                  {/* Step 1 */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] text-emerald-700">
                      1
                    </span>
                    <span>Complete business profile</span>
                  </div>

                  <div className="h-px w-8 bg-emerald-200" />

                  {/* Step 2 – CURRENT STEP with bounce + tooltip */}
                  <div className="relative flex items-center gap-1.5 step-bubble-animate group">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] text-amber-700">
                      2
                    </span>
                    <span className="text-amber-800">Connect WhatsApp API</span>

                    {/* tooltip bubble */}
                    <div className="step-tooltip pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-950 text-[10px] text-emerald-50 px-2 py-0.5 opacity-100">
                      You are here
                    </div>
                  </div>

                  <div className="h-px w-8 bg-slate-200" />

                  {/* Step 3 */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-600">
                      3
                    </span>
                    <span>Choose a plan</span>
                  </div>
                </div>
              </div>

              {/* How to complete this step – actual guidance */}
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-slate-700">
                  How to complete this step:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[12px] text-slate-600">
                  <li>
                    Scroll down to the{" "}
                    <span className="font-semibold text-emerald-700">
                      “Connect your official WhatsApp Business API”
                    </span>{" "}
                    section on this page.
                  </li>
                  <li>
                    Click{" "}
                    <span className="font-semibold text-slate-800">
                      “Continue with Facebook (Meta)”
                    </span>{" "}
                    and log in with the Facebook account that manages your
                    Business Manager.
                  </li>
                  <li>
                    In Facebook&apos;s popup, follow the steps: select your
                    business, verify details, choose or create a WhatsApp
                    number, and approve access.
                  </li>
                </ol>
              </div>

              <p className="text-[12px] text-slate-500">
                You can explore the plaform meanwhile, but{" "}
                <span className="font-semibold text-slate-700">
                  sending messages, campaigns and automations etc. is disabled
                </span>{" "}
                until the WhatsApp API is connected.
              </p>
            </div>
          </div>
        )}

        {/* Step-by-step onboarding checklist */}
        {/* WhatsApp Engagement CTA – redesigned */}
        {!waStatus.hasSettings && (
          <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 px-5 py-5">
              {/* Text + badge + actions */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-slate-900">
                    Connect your official WhatsApp Business API
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-700 max-w-xl">
                    Use Meta&apos;s official onboarding flow to link your
                    business number with XploreByte. This enables templates,
                    campaigns and two-way conversations from a single dashboard.
                  </p>
                </div>

                <ul className="grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2 max-w-xl">
                  <li>• Meta verified flow – no unofficial workarounds</li>
                  <li>• Works with a new or existing business number</li>
                  <li>• Full control of display name and business profile</li>
                  <li>• Can migrate later from your current provider</li>
                </ul>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
                  >
                    Continue with Facebook (Meta)
                  </button>
                  <button
                    className="border border-emerald-500 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-md text-sm font-semibold transition"
                    onClick={() => setShowMigration(true)}
                  >
                    I&apos;m already using another provider
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 max-w-xl">
                  XploreByte does not charge for onboarding. Meta or your
                  WhatsApp provider may still charge conversation fees as per
                  their pricing.
                </p>
              </div>

              {/* Illustration – only on md+ */}
              <div className="hidden md:flex flex-shrink-0 items-center justify-center">
                <img
                  src="/img/applyforwhatsappapi.webp"
                  alt="Connect WhatsApp Business API"
                  className="h-32 w-auto object-contain drop-shadow-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Migration Modal */}
      {showMigration && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100]">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl p-8 text-emerald-900 relative border border-slate-200">
            <button
              onClick={() => setShowMigration(false)}
              className="absolute right-5 top-5 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center"
              aria-label="Close Migration Modal"
            >
              <span className="text-xl text-slate-700 font-bold">×</span>
            </button>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-slate-900">
              Migration <span className="text-lg">📖</span>
              <span className="text-base font-medium text-slate-500">
                How to migrate to XploreByte
              </span>
            </h2>
            <p className="mb-4 mt-1 text-slate-700">
              Before migrating, please check the following to ensure a smooth
              process:
            </p>
            <ol className="list-decimal ml-5 mb-5 space-y-1 text-slate-700 text-sm">
              <li>Ensure your WhatsApp Display Name is approved.</li>
              <li>Turn off two-factor authentication on your WA number.</li>
              <li>Make sure the number is active and can receive SMS OTP.</li>
            </ol>
            <div className="flex gap-4 mt-6">
              {!migrationSubmitted && (
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-md shadow transition"
                  onClick={() => setMigrationSubmitted(true)}
                >
                  Start Migration
                </button>
              )}
              <button
                className="border border-slate-300 text-slate-700 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-slate-50 transition"
                onClick={() => setShowMigration(false)}
              >
                <span className="text-xl">←</span> Go back
              </button>
            </div>

            {migrationSubmitted && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-30 rounded-2xl px-6 py-16 text-center">
                <div className="flex items-center justify-center mb-3">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 40 40"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="20" cy="20" r="20" fill="#10B981" />
                      <path
                        d="M13.5 21.5L18 26L27 17"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-emerald-900">
                  Migration request submitted
                </h3>
                <p className="mb-5 text-slate-700 max-w-md">
                  Our team will contact you within 48 hours to assist with your
                  migration.
                </p>
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-2 rounded-md shadow mt-4 mb-4"
                  onClick={() => {
                    setShowMigration(false);
                    setMigrationSubmitted(false);
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply for WhatsApp Business API Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100]">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl p-8 text-gray-900 relative border border-gray-200">
            <button
              onClick={() => setShowApplyModal(false)}
              className="absolute right-5 top-5 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
              aria-label="Close Apply Modal"
            >
              <span className="text-xl">×</span>
            </button>

            <h2 className="text-xl md:text-2xl font-bold mb-2 text-emerald-900">
              Apply for WhatsApp Business API
            </h2>
            <p className="mb-2 text-[15px] font-medium text-emerald-700">
              Click on “Continue With Facebook” to apply for WhatsApp Business
              API using Meta&apos;s official embedded signup.
            </p>

            <div className="mb-6">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-slate-800 space-y-2">
                <p className="font-semibold text-emerald-900">
                  What happens after you click &quot;Continue With
                  Facebook&quot;?
                </p>
                <ol className="mt-1 list-decimal list-inside space-y-1 text-[13px] text-slate-800">
                  <li>
                    A secure Meta (Facebook) window will open in a new tab or
                    popup.
                  </li>
                  <li>
                    Log in with the Facebook account that manages your business
                    (or create one if needed).
                  </li>
                  <li>
                    Select or create your{" "}
                    <span className="font-semibold">Business Manager</span> and{" "}
                    <span className="font-semibold">
                      WhatsApp Business Account
                    </span>
                    .
                  </li>
                  <li>
                    Choose the phone number you want to use (new number or move
                    an existing WhatsApp Business / WhatsApp API number).
                  </li>
                  <li>
                    Verify the number using the SMS or call OTP that Meta sends
                    to that phone.
                  </li>
                  <li>
                    Review and grant the requested permissions so XploreByte can
                    send and receive WhatsApp messages on your behalf.
                  </li>
                  <li>
                    When Meta shows{" "}
                    <span className="font-semibold">
                      &quot;Setup complete&quot;
                    </span>
                    , close the Facebook window and return to this dashboard.
                  </li>
                  <li>
                    Your WhatsApp connection status in XploreByte will update
                    automatically once Meta confirms the setup.
                  </li>
                </ol>
              </div>

              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Before you start, keep this ready
                </p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-[13px] text-slate-700">
                  <li>A registered business and a working website URL</li>
                  <li>
                    Access to the phone number you want to connect (to receive
                    OTP via SMS or call)
                  </li>
                  <li>
                    A Facebook account with permission to manage your business
                    (or ability to create one)
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 justify-end mt-3">
              <button
                className="border border-emerald-400 text-emerald-900 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-50 transition"
                onClick={() => {
                  setShowApplyModal(false);
                  setShowMigration(true);
                }}
              >
                Migrate from another vendor
              </button>
              <button
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md font-semibold shadow transition disabled:opacity-60"
                disabled={connecting}
                onClick={async () => {
                  setShowApplyModal(false);
                  await startFacebookConnect();
                }}
              >
                {connecting ? "Connecting…" : "Continue With Facebook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({
  step,
  title,
  desc,
  to,
  icon: Icon,
  status,
  statusTone = "neutral",
  primaryAction,
  primaryLabel,
}) {
  const toneClasses =
    statusTone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : statusTone === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : statusTone === "info"
      ? "bg-sky-50 text-sky-700 border-sky-100"
      : "bg-slate-50 text-slate-600 border-slate-100";

  // Card is still clickable to the target page
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
            Step {step}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              {title}
              {statusTone === "success" && (
                <CheckCircle2 size={15} className="text-emerald-600" />
              )}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{desc}</p>
          </div>
        </div>
        {Icon && (
          <div className="rounded-xl bg-emerald-50 p-2.5 ml-2">
            <Icon className="h-4 w-4 text-emerald-600" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${toneClasses}`}
        >
          {status}
        </span>

        {primaryAction && primaryLabel ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
            onClick={e => {
              e.preventDefault(); // keep Link but run action
              primaryAction();
            }}
          >
            {primaryLabel}
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-emerald-600 group-hover:underline">
            Open →
          </span>
        )}
      </div>
    </Link>
  );
}
// import React, { useState, useEffect } from "react";
// import { Link, useSearchParams, useNavigate } from "react-router-dom";
// import {
//   AlertTriangle,
//   Settings,
//   Zap,
//   PhoneCall,
//   CheckCircle2,
//   MessageCircle,
//   HelpCircle,
// } from "lucide-react";
// import { useAuth } from "../../app/providers/AuthProvider";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// const isGuid = v =>
//   !!v &&
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
//     v
//   );

// export default function WelcomePage() {
//   const auth = useAuth() || {};
//   const {
//     isLoading,
//     userName,
//     businessId: directBusinessId,
//     planId: directPlanId,
//     business,
//   } = auth;

//   const businessId =
//     directBusinessId || business?.businessId || business?.id || null;

//   const planId = directPlanId ?? business?.planId ?? null;
//   const hasPlan = !!planId;
//   const [search] = useSearchParams();
//   const [showMigration, setShowMigration] = useState(false);
//   const [showApplyModal, setShowApplyModal] = useState(false);
//   const [migrationSubmitted, setMigrationSubmitted] = useState(false);
//   const [connecting, setConnecting] = useState(false);

//   // 🔍 WhatsApp connection status (from WhatsAppSettings)
//   const [waStatus, setWaStatus] = useState({
//     loading: true,
//     hasSettings: false,
//     data: null,
//   });

//   useEffect(() => {
//     let cancelled = false;

//     if (!isGuid(businessId)) {
//       setWaStatus({ loading: false, hasSettings: false, data: null });
//       return;
//     }

//     axiosClient
//       .get("whatsappsettings/me")
//       .then(res => {
//         if (cancelled) return;

//         const has = !!res?.data?.hasSettings;
//         setWaStatus({
//           loading: false,
//           hasSettings: has,
//           data: has ? res.data.data : null,
//         });
//       })
//       .catch(() => {
//         if (cancelled) return;
//         setWaStatus({ loading: false, hasSettings: false, data: null });
//       });

//     return () => {
//       cancelled = true;
//     };
//   }, [businessId]);

//   const whatsappConnected = waStatus.hasSettings;

//   const navigate = useNavigate();
//   useEffect(() => {
//     const status = search.get("esuStatus");
//     if (status === "success") {
//       toast.success("🎉 WhatsApp Business API connected successfully.");
//     } else if (status === "failed") {
//       toast.error(
//         "WhatsApp connection failed. Please retry the embedded signup."
//       );
//     }

//     if (status) {
//       const params = new URLSearchParams(search);
//       params.delete("esuStatus");
//       navigate({ search: params.toString() }, { replace: true });
//     }
//   }, [search, navigate]);

//   // ESU: start connect
//   const startFacebookConnect = async () => {
//     try {
//       setConnecting(true);
//       const returnUrlAfterSuccess = "/app/welcomepage";

//       if (!isGuid(businessId)) {
//         toast.error("Business context missing. Please re-login.");
//         return;
//       }

//       const res = await axiosClient.post(
//         "esu/facebook/start",
//         { returnUrlAfterSuccess },
//         { headers: { "X-Business-Id": businessId } }
//       );

//       const authUrl =
//         res?.data?.data?.authUrl || res?.data?.authUrl || res?.data?.url;

//       if (!authUrl) {
//         toast.error(
//           res?.data?.message || "Could not get Facebook connect URL."
//         );
//         return;
//       }

//       window.location.href = authUrl;
//     } catch (err) {
//       toast.error(
//         err?.response?.data?.message ||
//           err?.message ||
//           "Failed to start Facebook Connect."
//       );
//     } finally {
//       setConnecting(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
//           <p className="text-emerald-700 font-semibold">Loading dashboard…</p>
//         </div>
//       </div>
//     );
//   }

//   // Simple onboarding “score” just for the header badge
//   const completedSteps = (whatsappConnected ? 1 : 0) + (hasPlan ? 1 : 0);
//   const totalSteps = 3; // Profile, WhatsApp, Plan

//   return (
//     <div className="h-full w-full bg-gradient-to-b from-emerald-50/60 to-cyan-50/40">
//       <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
//         {/* Header + high-level status */}
//         <div className="flex flex-wrap items-start justify-between gap-4">
//           <div>
//             <h1 className="text-2xl font-semibold text-slate-900">
//               {userName ? `Welcome back, ${userName}` : "Welcome to XploreByte"}
//             </h1>

//             <p className="mt-1 text-sm text-slate-600 max-w-xl">
//               Follow the steps below to get your WhatsApp workspace ready for
//               real customers. You can explore safely even before choosing a
//               plan.
//             </p>

//             <div className="mt-3 flex flex-wrap items-center gap-2">
//               {/* WhatsApp badge */}
//               {waStatus.loading ? (
//                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
//                   Checking WhatsApp status…
//                 </span>
//               ) : (
//                 <span
//                   className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
//                     whatsappConnected
//                       ? "bg-emerald-100 text-emerald-700"
//                       : "bg-amber-100 text-amber-700"
//                   }`}
//                 >
//                   {whatsappConnected
//                     ? `WhatsApp Active${
//                         waStatus.data?.whatsAppBusinessNumber
//                           ? ` · ${waStatus.data.whatsAppBusinessNumber}`
//                           : ""
//                       }`
//                     : "WhatsApp Not Connected"}
//                 </span>
//               )}

//               {/* Plan badge */}
//               <span
//                 className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
//                   hasPlan
//                     ? "bg-emerald-100 text-emerald-700"
//                     : "bg-sky-100 text-sky-700"
//                 }`}
//               >
//                 {hasPlan ? "Plan Selected" : "Plan Not Selected"}
//               </span>

//               {/* Onboarding progress badge */}
//               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/80 text-slate-700 border border-slate-200">
//                 Onboarding {completedSteps}/{totalSteps} steps complete
//               </span>
//             </div>
//           </div>

//           <div className="rounded-xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm text-xs text-slate-600 max-w-xs flex flex-col gap-2">
//             <div className="flex items-center gap-2 font-semibold text-slate-900">
//               <HelpCircle size={14} className="text-emerald-600" />
//               Need help getting started?
//             </div>
//             <p>
//               Watch the intro video in the welcome panel below or reach out to
//               support from the help center.
//             </p>
//             <div className="flex flex-wrap gap-2">
//               <p
//                 href="tel:+919306099863"
//                 className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-slate-950 shadow-sm hover:bg-emerald-400 transition"
//               >
//                 <PhoneCall className="h-4 w-4" />
//                 +91 9306099863
//               </p>
//               <a
//                 href="https://wa.me/919306099863?text=Hi%2C%20I%20need%20help%20setting%20up%20XploreByte%20and%20connecting%20WhatsApp%20API."
//                 target="_blank"
//                 rel="noreferrer"
//                 className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-400 hover:text-emerald-200 transition"
//               >
//                 <MessageCircle className="h-4 w-4" />
//                 Chat with us
//               </a>
//             </div>
//           </div>
//         </div>

//         {/* Plan status / callout – only soft warning */}
//         {/* {!hasPlan && (
//           <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 flex items-start gap-3">
//             <div className="mt-0.5 rounded-full bg-white/80 p-2 shadow-sm">
//               <AlertTriangle className="h-4 w-4 text-amber-500" />
//             </div>
//             <div className="flex-1">
//               <p className="text-sm font-medium text-amber-800">
//                 You haven&apos;t selected a plan yet
//               </p>
//               <p className="mt-1 text-xs text-amber-700">
//                 You can explore everything and set up WhatsApp first. When
//                 you&apos;re ready to go live with real customers, choose a plan
//                 from the{" "}
//                 <Link
//                   to="/app/settings/billing"
//                   className="font-semibold underline"
//                 >
//                   Billing
//                 </Link>{" "}
//                 page.
//               </p>
//             </div>
//           </div>
//         )} */}
//         {!whatsappConnected && (
//           <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 flex flex-col gap-3">
//             {/* local animation + tooltip styles */}
//             <style>{`
//       @keyframes stepBubble {
//         0%, 100% {
//           transform: translateY(0);
//           box-shadow: 0 0 0 0 rgba(16,185,129,0.0);
//         }
//         50% {
//           transform: translateY(-2px);
//           box-shadow: 0 8px 18px -10px rgba(16,185,129,0.45);
//         }
//       }
//       @keyframes stepDotPulse {
//         0%, 100% {
//           transform: scale(1);
//           opacity: 0.9;
//         }
//         50% {
//           transform: scale(1.2);
//           opacity: 1;
//         }
//       }
//       .step-bubble-animate {
//         animation: stepBubble 1.4s ease-in-out infinite;
//       }
//       .step-dot-pulse {
//         animation: stepDotPulse 1.4s ease-in-out infinite;
//       }

//       .step-tooltip::after {
//         content: "";
//         position: absolute;
//         top: -3px;
//         left: 50%;
//         transform: translateX(-50%);
//         border-width: 0 5px 5px 5px;
//         border-style: solid;
//         border-color: transparent transparent #022c22 transparent;
//       }
//     `}</style>

//             <div className="mt-1 rounded-xl bg-white/70 border border-emerald-100 px-4 py-3 flex flex-col gap-3">
//               {/* status pill like offline badge */}
//               <div className="inline-flex items-center self-start rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-100 mb-1">
//                 <span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-500 step-dot-pulse" />
//                 WhatsApp API not connected
//               </div>

//               {/* Progress strip */}
//               <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
//                 {/* Steps line with progression dots */}
//                 <div className="flex items-center gap-4 text-[13px] font-medium text-slate-600">
//                   {/* Step 1 */}
//                   <div className="flex items-center gap-1.5">
//                     <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] text-emerald-700">
//                       1
//                     </span>
//                     <span>Complete business profile</span>
//                   </div>

//                   <div className="h-px w-8 bg-emerald-200" />

//                   {/* Step 2 – CURRENT STEP with bounce + tooltip */}
//                   <div className="relative flex items-center gap-1.5 step-bubble-animate group">
//                     <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] text-amber-700">
//                       2
//                     </span>
//                     <span className="text-amber-800">Connect WhatsApp API</span>

//                     {/* tooltip bubble */}
//                     <div className="step-tooltip pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-950 text-[10px] text-emerald-50 px-2 py-0.5 opacity-100">
//                       You are here
//                     </div>
//                   </div>

//                   <div className="h-px w-8 bg-slate-200" />

//                   {/* Step 3 */}
//                   <div className="flex items-center gap-1.5">
//                     <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-600">
//                       3
//                     </span>
//                     <span>Choose a plan</span>
//                   </div>
//                 </div>
//               </div>

//               {/* How to complete this step – actual guidance */}
//               <div className="space-y-2">
//                 <p className="text-[12px] font-semibold text-slate-700">
//                   How to complete this step:
//                 </p>
//                 <ol className="list-decimal list-inside space-y-1 text-[12px] text-slate-600">
//                   <li>
//                     Scroll down to the{" "}
//                     <span className="font-semibold text-emerald-700">
//                       “Connect your official WhatsApp Business API”
//                     </span>{" "}
//                     section on this page.
//                   </li>
//                   <li>
//                     Click{" "}
//                     <span className="font-semibold text-slate-800">
//                       “Continue with Facebook (Meta)”
//                     </span>{" "}
//                     and log in with the Facebook account that manages your
//                     Business Manager.
//                   </li>
//                   <li>
//                     In Facebook&apos;s popup, follow the steps: select your
//                     business, verify details, choose or create a WhatsApp
//                     number, and approve access.
//                   </li>
//                 </ol>
//               </div>

//               <p className="text-[12px] text-slate-500">
//                 You can explore the plaform meanwhile, but{" "}
//                 <span className="font-semibold text-slate-700">
//                   sending messages, campaigns and automations etc. is disabled
//                 </span>{" "}
//                 until the WhatsApp API is connected.
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Step-by-step onboarding checklist */}
//         {/* WhatsApp Engagement CTA – redesigned */}
//         {!waStatus.hasSettings && (
//           <div className="relative rounded-2xl border border-slate-100 bg-white shadow-sm">
//             <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 px-5 py-5">
//               {/* Text + badge + actions */}
//               <div className="flex-1 space-y-3">
//                 <div>
//                   <h3 className="text-lg md:text-xl font-semibold text-slate-900">
//                     Connect your official WhatsApp Business API
//                   </h3>
//                   <p className="mt-1 text-xs sm:text-sm text-slate-700 max-w-xl">
//                     Use Meta&apos;s official onboarding flow to link your
//                     business number with XploreByte. This enables templates,
//                     campaigns and two-way conversations from a single dashboard.
//                   </p>
//                 </div>

//                 <ul className="grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2 max-w-xl">
//                   <li>• Meta verified flow – no unofficial workarounds</li>
//                   <li>• Works with a new or existing business number</li>
//                   <li>• Full control of display name and business profile</li>
//                   <li>• Can migrate later from your current provider</li>
//                 </ul>

//                 <div className="flex flex-col sm:flex-row gap-2 pt-1">
//                   <button
//                     onClick={() => setShowApplyModal(true)}
//                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
//                   >
//                     Continue with Facebook (Meta)
//                   </button>
//                   <button
//                     className="border border-emerald-500 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-md text-sm font-semibold transition"
//                     onClick={() => setShowMigration(true)}
//                   >
//                     I&apos;m already using another provider
//                   </button>
//                 </div>

//                 <p className="text-[11px] text-slate-500 max-w-xl">
//                   XploreByte does not charge for onboarding. Meta or your
//                   WhatsApp provider may still charge conversation fees as per
//                   their pricing.
//                 </p>
//               </div>

//               {/* Illustration – only on md+ */}
//               <div className="hidden md:flex flex-shrink-0 items-center justify-center">
//                 <img
//                   src="/img/applyforwhatsappapi.webp"
//                   alt="Connect WhatsApp Business API"
//                   className="h-32 w-auto object-contain drop-shadow-lg"
//                 />
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Migration Modal */}
//       {showMigration && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100]">
//           <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-white max-w-2xl w-full rounded-2xl shadow-lg p-8 text-emerald-900 relative border border-emerald-100">
//             <button
//               onClick={() => setShowMigration(false)}
//               className="absolute right-5 top-5 bg-emerald-100 hover:bg-emerald-200 rounded-full w-8 h-8 flex items-center justify-center"
//               aria-label="Close Migration Modal"
//             >
//               <span className="text-xl text-emerald-900 font-bold">×</span>
//             </button>
//             <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
//               Migration <span className="text-lg">📖</span>
//               <span className="text-base font-medium text-slate-700">
//                 How to migrate to XploreByte
//               </span>
//             </h2>
//             <p className="mb-4 mt-1 text-slate-700">
//               Before migrating, please check the following to ensure a smooth
//               process:
//             </p>
//             <ol className="list-decimal ml-5 mb-5 space-y-1 text-slate-700 text-sm">
//               <li>Ensure your WhatsApp Display Name is approved.</li>
//               <li>Turn off two-factor authentication on your WA number.</li>
//               <li>Make sure the number is active and can receive SMS OTP.</li>
//             </ol>
//             <div className="flex gap-4 mt-6">
//               {!migrationSubmitted && (
//                 <button
//                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-md shadow transition"
//                   onClick={() => setMigrationSubmitted(true)}
//                 >
//                   Start Migration
//                 </button>
//               )}
//               <button
//                 className="border border-emerald-400 text-emerald-900 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-50 transition"
//                 onClick={() => setShowMigration(false)}
//               >
//                 <span className="text-xl">←</span> Go back
//               </button>
//             </div>

//             {migrationSubmitted && (
//               <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-30 rounded-2xl px-6 py-16 text-center">
//                 <div className="flex items-center justify-center mb-3">
//                   <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
//                     <svg
//                       width="28"
//                       height="28"
//                       viewBox="0 0 40 40"
//                       fill="none"
//                       xmlns="http://www.w3.org/2000/svg"
//                     >
//                       <circle cx="20" cy="20" r="20" fill="#10B981" />
//                       <path
//                         d="M13.5 21.5L18 26L27 17"
//                         stroke="white"
//                         strokeWidth="3"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       />
//                     </svg>
//                   </span>
//                 </div>
//                 <h3 className="text-xl font-bold mb-2 text-emerald-900">
//                   Migration request submitted
//                 </h3>
//                 <p className="mb-5 text-slate-700 max-w-md">
//                   Our team will contact you within 48 hours to assist with your
//                   migration.
//                 </p>
//                 <button
//                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-2 rounded-md shadow mt-4 mb-4"
//                   onClick={() => {
//                     setShowMigration(false);
//                     setMigrationSubmitted(false);
//                   }}
//                 >
//                   Close
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Apply for WhatsApp Business API Modal */}
//       {showApplyModal && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100]">
//           <div className="bg-white max-w-2xl w-full rounded-2xl shadow-lg p-8 text-gray-900 relative border border-gray-200">
//             <button
//               onClick={() => setShowApplyModal(false)}
//               className="absolute right-5 top-5 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
//               aria-label="Close Apply Modal"
//             >
//               <span className="text-xl">×</span>
//             </button>

//             <h2 className="text-xl md:text-2xl font-bold mb-2 text-emerald-900">
//               Apply for WhatsApp Business API
//             </h2>
//             <p className="mb-2 text-[15px] font-medium text-emerald-700">
//               Click on “Continue With Facebook” to apply for WhatsApp Business
//               API using Meta&apos;s official embedded signup.
//             </p>

//             <div className="mb-6">
//               <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-slate-800 space-y-2">
//                 <p className="font-semibold text-emerald-900">
//                   What happens after you click &quot;Continue With
//                   Facebook&quot;?
//                 </p>
//                 <ol className="mt-1 list-decimal list-inside space-y-1 text-[13px] text-slate-800">
//                   <li>
//                     A secure Meta (Facebook) window will open in a new tab or
//                     popup.
//                   </li>
//                   <li>
//                     Log in with the Facebook account that manages your business
//                     (or create one if needed).
//                   </li>
//                   <li>
//                     Select or create your{" "}
//                     <span className="font-semibold">Business Manager</span> and{" "}
//                     <span className="font-semibold">
//                       WhatsApp Business Account
//                     </span>
//                     .
//                   </li>
//                   <li>
//                     Choose the phone number you want to use (new number or move
//                     an existing WhatsApp Business / WhatsApp API number).
//                   </li>
//                   <li>
//                     Verify the number using the SMS or call OTP that Meta sends
//                     to that phone.
//                   </li>
//                   <li>
//                     Review and grant the requested permissions so XploreByte can
//                     send and receive WhatsApp messages on your behalf.
//                   </li>
//                   <li>
//                     When Meta shows{" "}
//                     <span className="font-semibold">
//                       &quot;Setup complete&quot;
//                     </span>
//                     , close the Facebook window and return to this dashboard.
//                   </li>
//                   <li>
//                     Your WhatsApp connection status in XploreByte will update
//                     automatically once Meta confirms the setup.
//                   </li>
//                 </ol>
//               </div>

//               <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
//                 <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
//                   Before you start, keep this ready
//                 </p>
//                 <ul className="mt-1 list-disc list-inside space-y-1 text-[13px] text-slate-700">
//                   <li>A registered business and a working website URL</li>
//                   <li>
//                     Access to the phone number you want to connect (to receive
//                     OTP via SMS or call)
//                   </li>
//                   <li>
//                     A Facebook account with permission to manage your business
//                     (or ability to create one)
//                   </li>
//                 </ul>
//               </div>
//             </div>

//             <div className="flex flex-col md:flex-row gap-3 justify-end mt-3">
//               <button
//                 className="border border-emerald-400 text-emerald-900 px-6 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-50 transition"
//                 onClick={() => {
//                   setShowApplyModal(false);
//                   setShowMigration(true);
//                 }}
//               >
//                 Migrate from another vendor
//               </button>
//               <button
//                 className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md font-semibold shadow transition disabled:opacity-60"
//                 disabled={connecting}
//                 onClick={async () => {
//                   setShowApplyModal(false);
//                   await startFacebookConnect();
//                 }}
//               >
//                 {connecting ? "Connecting…" : "Continue With Facebook"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// function StepCard({
//   step,
//   title,
//   desc,
//   to,
//   icon: Icon,
//   status,
//   statusTone = "neutral",
//   primaryAction,
//   primaryLabel,
// }) {
//   const toneClasses =
//     statusTone === "success"
//       ? "bg-emerald-50 text-emerald-700 border-emerald-100"
//       : statusTone === "warning"
//       ? "bg-amber-50 text-amber-700 border-amber-100"
//       : statusTone === "info"
//       ? "bg-sky-50 text-sky-700 border-sky-100"
//       : "bg-slate-50 text-slate-600 border-slate-100";

//   // Card is still clickable to the target page
//   return (
//     <Link
//       to={to}
//       className="group flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
//     >
//       <div className="flex items-start justify-between gap-3">
//         <div className="flex items-center gap-3">
//           <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
//             Step {step}
//           </div>
//           <div>
//             <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
//               {title}
//               {statusTone === "success" && (
//                 <CheckCircle2 size={15} className="text-emerald-600" />
//               )}
//             </h3>
//             <p className="mt-1 text-xs text-slate-500">{desc}</p>
//           </div>
//         </div>
//         {Icon && (
//           <div className="rounded-xl bg-emerald-50 p-2.5 ml-2">
//             <Icon className="h-4 w-4 text-emerald-600" />
//           </div>
//         )}
//       </div>

//       <div className="mt-3 flex items-center justify-between gap-2">
//         <span
//           className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${toneClasses}`}
//         >
//           {status}
//         </span>

//         {primaryAction && primaryLabel ? (
//           <button
//             type="button"
//             className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
//             onClick={e => {
//               e.preventDefault(); // keep Link but run action
//               primaryAction();
//             }}
//           >
//             {primaryLabel}
//           </button>
//         ) : (
//           <span className="text-[11px] font-semibold text-emerald-600 group-hover:underline">
//             Open →
//           </span>
//         )}
//       </div>
//     </Link>
//   );
// }
