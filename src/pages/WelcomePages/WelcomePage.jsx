// 📄 src/pages/WelcomePage/WelcomePage.jsx (or your current path)

import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Zap,
  PhoneCall,
  CheckCircle2,
  MessageCircle,
  Building,
  CreditCard,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Facebook,
  Calendar,
  Loader2,
  Rocket,
  Shield,
  Clock,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../app/providers/AuthProvider";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import ConnectionSummaryCard from "../../components/WhatsApp/ConnectionSummaryCard";
import MetaPinActivationModal from "../../components/modals/MetaPinActivationModal";

const isGuid = v =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );

function pickFirstNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}


// --- Sub-components for Vertical Stepper ---

export default function WelcomePage() {
  const auth = useAuth() || {};
  const navigate = useNavigate();

  // --- Sub-components (Moved inside to fix scope/hoisting issues) ---
  const VerticalStep = ({ step, title, desc, status, isLast, isActive, isCompleted, onClick }) => (
    <div 
      className={`relative flex gap-4 ${onClick ? "cursor-pointer group/step" : ""}`}
      onClick={onClick}
    >
      {!isLast && (
        <div 
          className={`absolute left-[15px] top-[30px] bottom-[-10px] w-0.5 transition-colors duration-500 ${
            isCompleted ? "bg-emerald-500" : "bg-slate-200"
          }`}
        />
      )}
      
      <div className="relative z-10 flex flex-col items-center">
        <div 
          className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
            isCompleted 
              ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" 
              : isActive 
                ? "bg-white border-rose-500 text-rose-600 shadow-md" 
                : "bg-white border-slate-200 text-slate-400"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 size={16} />
          ) : (
            <span className="text-xs font-bold">{step}</span>
          )}
        </div>
      </div>
  
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2">
          <h4 className={`text-sm font-bold transition-colors ${
            isCompleted || isActive ? "text-slate-900" : "text-slate-400"
          }`}>
            {title}
          </h4>
          {isActive && (
            <span className="ml-auto text-[10px] font-bold text-rose-600 flex items-center gap-0.5 opacity-0 group-hover/step:opacity-100 transition-opacity">
              Start <ArrowRight size={10} />
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
          {desc}
        </p>
        {status && (
          <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
            isCompleted 
              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
              : isActive
                ? "bg-rose-50 border-rose-100 text-rose-600"
                : "bg-slate-50 border-slate-100 text-slate-500"
          }`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );

  const VerticalStepper = ({ whatsappConnected, hasPlan, onConnect }) => {
    return (
      <div className="space-y-1">
        <VerticalStep
          step={1}
          title="Business Profile"
          desc="Profile & workspace"
          status="Created"
          isCompleted={true}
          onClick={() => navigate("/app/settings/profile-completion")}
        />
        <VerticalStep
          step={2}
          title="Connect WhatsApp"
          desc="Link Meta Account"
          status={whatsappConnected ? "Connected" : "Action Required"}
          isCompleted={whatsappConnected}
          isActive={!whatsappConnected}
          onClick={() => !whatsappConnected && onConnect()}
        />
        <VerticalStep
          step={3}
          title="Select Plan"
          desc="Unlock scaling"
          status={hasPlan ? "Plan Active" : "Pending"}
          isCompleted={hasPlan}
          isActive={whatsappConnected && !hasPlan}
          isLast={true}
          onClick={() => !hasPlan && navigate("/app/settings/billing")}
        />
      </div>
    );
  };

  const EngagementBanner = ({ onConnect, connecting, whatsappConnected }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-xl shadow-emerald-500/5"
    >
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-2xl" />
      
      <div className="relative p-7 md:p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-5">
          <div className="space-y-3">
             <div className="flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border transition-all duration-300 ${
                  whatsappConnected 
                    ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                    : "bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                }`}>
                   <div className="relative flex h-2 w-2 items-center justify-center">
                     <motion.div
                       animate={{ 
                         scale: [1, 1.5, 1],
                         opacity: [0.5, 0.2, 0.5]
                       }}
                       transition={{ 
                         duration: 2, 
                         repeat: Infinity,
                         ease: "easeInOut"
                       }}
                       className={`absolute inset-0 rounded-full ${whatsappConnected ? "bg-emerald-400" : "bg-rose-400"}`}
                     />
                     <div className={`relative h-1.5 w-1.5 rounded-full bg-white shadow-sm`} />
                   </div>
                   <span className="leading-none">
                     {whatsappConnected ? "WhatsApp Business API Connected" : "WhatsApp Business API Not Connected"}
                   </span>
                </div>
             </div>

             <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                WhatsApp <span className="text-emerald-500">Customer Engagement</span>
             </h2>
             <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-lg">
                Setting up your official <span className="text-emerald-400 font-semibold">WhatsApp Business API is 100% FREE</span>. 
                Scale your business beyond limits with WhatsApp Business API.
             </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
             {[
               { icon: Layers, label: "Broadcasting", color: "text-emerald-400" },
               { icon: Clock, label: "Automation", color: "text-emerald-400" },
               { icon: MessageCircle, label: "Team Inbox", color: "text-emerald-400" },
               { icon: Zap, label: "Campaigns", color: "text-emerald-400" }
             ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                   <div className={`h-6 w-6 rounded-md bg-white/5 flex items-center justify-center transition-colors group-hover:bg-white/10 border border-white/5`}>
                      <item.icon size={12} className={item.color} />
                   </div>
                   <span className="text-[10px] font-bold text-slate-300">{item.label}</span>
                </div>
             ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
             <button
               onClick={onConnect}
               disabled={connecting}
               className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-tight uppercase transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
             >
               <Facebook className="fill-white" size={14} />
               {connecting ? "Connecting..." : "Connect with Meta"}
             </button>
             
             <button
               onClick={() => window.open('https://xplorebyte.com/demo', '_blank')}
               className="w-full sm:w-auto px-6 py-3 bg-transparent border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold tracking-tight uppercase transition-all flex items-center justify-center gap-2"
             >
               <Calendar size={14} />
               Live Demo
             </button>
          </div>
        </div>

        <div className="hidden lg:block relative shrink-0">
           <div className="relative z-10 p-2">
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 1, 0]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="relative h-32 w-32 bg-gradient-to-br from-emerald-500/10 to-slate-500/10 rounded-full flex items-center justify-center backdrop-blur-2xl border border-white/5 shadow-xl shadow-emerald-500/10">
                   <Rocket size={60} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]" />
                </div>
              </motion.div>
           </div>
           {/* Floating sparkles */}
           <div className="absolute top-5 left-5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
           <div className="absolute bottom-5 right-10 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );

  // Best-effort: try to pick a connected number from whatever shape your API returns.
  function getConnectedNumber(settings) {
    if (!settings) return null;
    return pickFirstNonEmpty(
      settings.whatsAppBusinessNumber,
      settings.WhatsAppBusinessNumber,
      settings.displayPhoneNumber,
      settings.DisplayPhoneNumber,
      settings.phoneNumber,
      settings.PhoneNumber,
      settings.senderNumber,
      settings.SenderNumber,
      settings.connectedPhoneNumber,
      settings.ConnectedPhoneNumber,
      settings?.primaryPhone?.displayPhoneNumber,
      settings?.primaryPhone?.phoneNumber,
      settings?.PrimaryPhone?.DisplayPhoneNumber,
      settings?.PrimaryPhone?.PhoneNumber,
      settings?.data?.displayPhoneNumber,
      settings?.data?.phoneNumber,
    );
  }

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

  // WhatsApp connection status (from WhatsAppSettings)
  const [waStatus, setWaStatus] = useState({
    loading: true,
    hasSettings: false,
    data: null,
  });

  // Post-ESU activation (PIN)
  const [showPinModal, setShowPinModal] = useState(() => {
    return sessionStorage.getItem("xb_pending_esu_pin") === "true";
  });
  const [pinActivated, setPinActivated] = useState(false);

  const closePinModal = () => {
    setShowPinModal(false);
    sessionStorage.removeItem("xb_pending_esu_pin");
  };

  const fetchWaStatus = async () => {
    if (!isGuid(businessId)) {
      setWaStatus({ loading: false, hasSettings: false, data: null });
      return;
    }

    setWaStatus(prev => ({ ...prev, loading: true }));

    try {
      const res = await axiosClient.get("whatsappsettings/me");
      const has = !!res?.data?.hasSettings;

      setWaStatus({
        loading: false,
        hasSettings: has,
        data: has ? res.data.data : null,
      });
    } catch {
      setWaStatus({ loading: false, hasSettings: false, data: null });
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await fetchWaStatus();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const whatsappConnected = waStatus.hasSettings;

  const connectedNumber = useMemo(
    () => getConnectedNumber(waStatus.data),
    [waStatus.data],
  );

  // Handle ESU redirect result: ?esuStatus=success|failed
  useEffect(() => {
    const params = new URLSearchParams(search);
    const rawStatus = params.get("esuStatus");
    const status = rawStatus?.toLowerCase();

    console.log("[WelcomePage] esuStatus check:", { rawStatus, status });

    if (status === "success" || sessionStorage.getItem("xb_pending_esu_pin") === "true") {
      if (status === "success") {
        toast.success("🎉 WhatsApp Business API connected successfully.");
        sessionStorage.setItem("xb_pending_esu_pin", "true");
      }
      setShowPinModal(true);
      setPinActivated(false); 
    }

    if (search.get("esuStatus")) {
      const nextParams = new URLSearchParams(search);
      nextParams.delete("esuStatus");
      navigate({ search: nextParams.toString() }, { replace: true });
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
        { headers: { "X-Business-Id": businessId } },
      );

      // Backend returns LaunchUrl sometimes. Keep backward compat.
      const authUrl =
        res?.data?.data?.launchUrl ||
        res?.data?.data?.LaunchUrl ||
        res?.data?.launchUrl ||
        res?.data?.LaunchUrl ||
        res?.data?.data?.authUrl ||
        res?.data?.authUrl ||
        res?.data?.url;

      if (!authUrl) {
        toast.error(
          res?.data?.message || "Could not get Facebook connect URL.",
        );
        return;
      }

      window.location.href = authUrl;
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to start Facebook Connect.",
      );
    } finally {
      setConnecting(false);
    }
  };

  const handlePinSuccess = async () => {
    setPinActivated(true);
    // Refresh settings so connected number / status can update (best-effort)
    await fetchWaStatus();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
          {/* Skeleton Hero Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="h-10 shimmer-bg rounded-xl w-2/3"></div>
              <div className="space-y-2">
                <div className="h-4 shimmer-bg rounded-md w-3/4"></div>
                <div className="h-4 shimmer-bg rounded-md w-1/2"></div>
              </div>
            </div>
            <div className="h-24 w-64 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center px-4 gap-4">
               <div className="h-14 w-14 rounded-full shimmer-bg shrink-0"></div>
               <div className="flex-1 space-y-2">
                 <div className="h-4 shimmer-bg rounded-md w-full"></div>
                 <div className="h-3 shimmer-bg rounded-md w-2/3"></div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Skeleton Stepper */}
            <div className="lg:col-span-3">
              <div className="h-[400px] bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm p-6 space-y-8">
                <div className="h-3 shimmer-bg rounded-full w-1/2 mb-8"></div>
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4">
                     <div className="h-10 w-10 rounded-full shimmer-bg shrink-0"></div>
                     <div className="flex-1 space-y-3 pt-2">
                       <div className="h-4 shimmer-bg rounded-md w-full"></div>
                       <div className="h-3 shimmer-bg rounded-md w-3/4"></div>
                     </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton Content Cards */}
            <div className="lg:col-span-9 space-y-8">
               <div className="h-48 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-4">
                  <div className="h-6 shimmer-bg rounded-lg w-1/4"></div>
                  <div className="h-20 shimmer-bg rounded-xl w-full"></div>
               </div>
               <div className="h-64 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="h-6 shimmer-bg rounded-lg w-1/3"></div>
                    <div className="h-10 shimmer-bg rounded-xl w-32"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-32 shimmer-bg rounded-xl w-full"></div>
                    <div className="h-32 shimmer-bg rounded-xl w-full"></div>
                    <div className="h-32 shimmer-bg rounded-xl w-full"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress
  const completedSteps = (whatsappConnected ? 1 : 0) + (hasPlan ? 1 : 0) + 1; // +1 for profile
  const totalSteps = 3;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="min-h-screen w-full bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            {/* Removed redundant status badges as requested */}

            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {progressPercent === 100 ? `You're all set, ${userName?.split(" ")[0]}! 🚀` : `Welcome to XploreByte, ${userName?.split(" ")[0]}! 👋`}
            </h1>
            <p className="text-slate-500 max-w-xl text-base">
              {progressPercent === 100 
                ? "Your business is now ready for the world. You can now create templates, launch campaigns, and engage with your customers in real-time."
                : "Let's get your business ready for the world. Complete these steps to unlock full potential."}
            </p>
          </div>

          {/* Progress Circle Visual */}
          <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative h-16 w-16 flex items-center justify-center">
              <svg
                className="h-full w-full -rotate-90 text-slate-100"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="text-emerald-500 drop-shadow-md transition-all duration-1000 ease-out"
                  strokeDasharray={`${progressPercent}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <span className="absolute text-xs font-bold text-slate-700">
                {progressPercent}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {completedSteps} of {totalSteps} Steps Complete
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {progressPercent === 100 ? "Ready to grow!" : `Next: ${whatsappConnected ? "Choose a Plan" : "Connect WhatsApp"}`}
              </p>
            </div>
          </div>
        </div>


        {/* WhatsApp Connection Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Left Column: Progress Stepper */}
          <div className="lg:col-span-3">
             <div className="sticky top-24 space-y-6">
                <div className="p-1 px-3 py-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-1">
                     Your Journey
                   </h3>
                   <VerticalStepper 
                     whatsappConnected={whatsappConnected} 
                     hasPlan={hasPlan} 
                     onConnect={startFacebookConnect}
                   />
                </div>
                
             </div>
          </div>

          {/* Right Column: Connection & Plan Cards */}
          <div className="lg:col-span-9 space-y-8">
             {/* Always show ConnectionSummaryCard if connected to WhatsApp */}
             {whatsappConnected && (
                <div className="space-y-6">
                  <ConnectionSummaryCard businessId={businessId} />
                </div>
             )}

             {/* Show relevant onboarding cards in a grid if any action is pending */}
             {(!whatsappConnected || !hasPlan) && (
                <div className="grid grid-cols-1 gap-6 items-stretch">
                   {/* Engagement Banner - Only show if not connected */}
                   {!whatsappConnected && (
                      <EngagementBanner 
                        onConnect={startFacebookConnect} 
                        connecting={connecting} 
                        whatsappConnected={whatsappConnected}
                      />
                   )}
                </div>
             )}
          </div>
        </motion.div>

        {/* Post-ESU PIN Activation Modal */}
        <MetaPinActivationModal
          isOpen={showPinModal}
          onClose={closePinModal}
          businessId={businessId}
          onSuccess={handlePinSuccess}
        />

      </div>

      {/* --- Modals --- */}
      <AnimatePresence>
        {showMigration && (
          <MigrationModal
            onClose={() => setShowMigration(false)}
            onSubmit={() => setMigrationSubmitted(true)}
            submitted={migrationSubmitted}
            setSubmitted={setMigrationSubmitted}
          />
        )}

        {showApplyModal && (
          <ApplyModal
            onClose={() => setShowApplyModal(false)}
            onMigrate={() => {
              setShowApplyModal(false);
              setShowMigration(true);
            }}
            onConnect={startFacebookConnect}
            connecting={connecting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MigrationModal({ onClose, onSubmit, submitted, setSubmitted }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[100] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden relative"
      >
        <div className="p-6 md:p-8">
          {!submitted ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Migrate to XploreByte
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Before you start:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                      <li>Disable Two-Step Verification on old account</li>
                      <li>Ensure number can receive SMS OTP</li>
                    </ul>
                  </div>
                </div>

                <p className="text-slate-600 text-sm">
                  Our migration team will handle the technical transfer. Once
                  you submit, we'll reach out within 24 hours to guide you
                  through the number porting process.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Request Migration
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Request Submitted!
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                We've received your request. Check your email for next steps.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="px-8 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ApplyModal({ onClose, onMigrate, onConnect, connecting }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[100] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 md:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-emerald-950">
              Connect WhatsApp API
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-3">
                Before you start, keep this ready
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2.5 text-sm text-emerald-900">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  A registered business and a working website URL
                </li>
                <li className="flex items-start gap-2.5 text-sm text-emerald-900">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Access to the phone number you want to use (to receive OTP via
                  SMS or call)
                </li>
                <li className="flex items-start gap-2.5 text-sm text-emerald-900">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  A Facebook account with permission to manage your business (or
                  ability to create one)
                </li>
              </ul>
            </div>

            <div className="border border-emerald-100 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between p-4 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 transition-colors"
              >
                <span className="font-semibold text-sm">
                  What happens after you click "Continue With Facebook"?
                </span>
                <ChevronRight
                  size={18}
                  className={`text-emerald-600 transition-transform duration-200 ${
                    showDetails ? "rotate-90" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-white"
                  >
                    <div className="p-5 border-t border-emerald-100 text-[13px] text-slate-700 leading-relaxed">
                      <ol className="list-decimal list-outside ml-4 space-y-2">
                        <li>
                          A secure Meta (Facebook) window will open in a new tab
                          or popup.
                        </li>
                        <li>
                          Log in with the Facebook account that manages your
                          business (or create one if needed).
                        </li>
                        <li>
                          Select or create your{" "}
                          <span className="font-semibold text-slate-900">
                            Business Manager
                          </span>{" "}
                          and{" "}
                          <span className="font-semibold text-slate-900">
                            WhatsApp Business Account
                          </span>
                          .
                        </li>
                        <li>
                          Choose the phone number you want to use (new number or
                          move an existing WhatsApp Business / WhatsApp API
                          number).
                        </li>
                        <li>
                          Verify the number using the SMS or call OTP that Meta
                          sends to that phone.
                        </li>
                        <li>
                          Review and grant the requested permissions so
                          XploreByte can send and receive WhatsApp messages on
                          your behalf.
                        </li>
                        <li>
                          When Meta shows{" "}
                          <span className="font-semibold text-slate-900">
                            Setup complete
                          </span>
                          , close the Facebook window and return to this
                          dashboard.
                        </li>
                        <li>
                          Your WhatsApp connection status in XploreByte will
                          update automatically once Meta confirms the setup.
                        </li>
                      </ol>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onMigrate}
            className="px-6 py-2.5 bg-white border border-emerald-500 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
          >
            Migrate from another vendor
          </button>

          <button
            disabled={connecting}
            onClick={onConnect}
            className="px-6 py-2.5 bg-[#008f5c] hover:bg-[#007a4d] text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
          >
            {connecting && (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            )}
            Continue With Facebook
          </button>
        </div>
      </motion.div>
    </div>
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
//   Building,
//   CreditCard,
//   ChevronRight,
//   ArrowRight,
//   ShieldCheck,
//   Smartphone,
//   Globe,
//   Loader2,
// } from "lucide-react";
// import { motion, AnimatePresence } from "framer-motion";
// import { useAuth } from "../../app/providers/AuthProvider";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// const isGuid = v =>
//   !!v &&
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
//     v,
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
//         "WhatsApp connection failed. Please retry the embedded signup.",
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
//         { headers: { "X-Business-Id": businessId } },
//       );

//       const authUrl =
//         res?.data?.data?.authUrl || res?.data?.authUrl || res?.data?.url;

//       if (!authUrl) {
//         toast.error(
//           res?.data?.message || "Could not get Facebook connect URL.",
//         );
//         return;
//       }

//       window.location.href = authUrl;
//     } catch (err) {
//       toast.error(
//         err?.response?.data?.message ||
//           err?.message ||
//           "Failed to start Facebook Connect.",
//       );
//     } finally {
//       setConnecting(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto mb-4" />
//           <p className="text-emerald-700 font-semibold text-sm tracking-wide">
//             Loading your dashboard...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // Calculate progress
//   const completedSteps = (whatsappConnected ? 1 : 0) + (hasPlan ? 1 : 0) + 1; // +1 for profile
//   const totalSteps = 3;
//   const progressPercent = Math.round((completedSteps / totalSteps) * 100);

//   return (
//     <div className="min-h-screen w-full bg-slate-50/50">
//       <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
//         {/* Hero Section */}
//         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
//           <div className="space-y-2">
//             {/* Dynamic Status Badge */}
//             {!whatsappConnected ? (
//               <motion.div
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-[13px] font-medium shadow-sm"
//               >
//                 <span className="relative flex h-2 w-2">
//                   <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F43F5E]"></span>
//                 </span>
//                 WhatsApp API not connected
//               </motion.div>
//             ) : !hasPlan ? (
//               <motion.div
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider shadow-sm"
//               >
//                 <span className="relative flex h-2 w-2">
//                   <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
//                 </span>
//                 Pending: Select Plan
//               </motion.div>
//             ) : (
//               <motion.div
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider shadow-sm"
//               >
//                 <CheckCircle2 size={12} />
//                 Active: Setup Complete
//               </motion.div>
//             )}
//             <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
//               Welcome to XploreByte, {userName?.split(" ")[0]}! 👋
//             </h1>
//             <p className="text-slate-500 max-w-xl text-base">
//               Let's get your business ready for the world. Complete these steps
//               to unlock full potential.
//             </p>
//           </div>

//           {/* Progress Circle Visual */}
//           <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
//             <div className="relative h-16 w-16 flex items-center justify-center">
//               <svg
//                 className="h-full w-full -rotate-90 text-slate-100"
//                 viewBox="0 0 36 36"
//               >
//                 <path
//                   className="text-slate-100"
//                   d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 />
//                 <path
//                   className="text-emerald-500 drop-shadow-md transition-all duration-1000 ease-out"
//                   strokeDasharray={`${progressPercent}, 100`}
//                   d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 />
//               </svg>
//               <span className="absolute text-xs font-bold text-slate-700">
//                 {progressPercent}%
//               </span>
//             </div>
//             <div>
//               <p className="text-sm font-semibold text-slate-900">
//                 {completedSteps} of {totalSteps} Steps Complete
//               </p>
//               <p className="text-xs text-slate-500 mt-1">
//                 Next: {whatsappConnected ? "Choose a Plan" : "Connect WhatsApp"}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Journey Cards Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <StepCard
//             step={1}
//             title="Business Profile"
//             desc="Your workspace identity"
//             icon={Building}
//             status="Completed"
//             statusTone="success"
//             to="/app/settings/profile-completion"
//           />
//           <StepCard
//             step={2}
//             title="Connect WhatsApp"
//             desc="Link your business number"
//             icon={MessageCircle}
//             status={whatsappConnected ? "Connected" : "Action Required"}
//             statusTone={whatsappConnected ? "success" : "warning"}
//             isActive={!whatsappConnected} // Highlight if pending
//             to="#"
//             onClick={() => !whatsappConnected && setShowApplyModal(true)}
//           />
//           <StepCard
//             step={3}
//             title="Select Plan"
//             desc="Unlock higher limits"
//             icon={CreditCard}
//             status={hasPlan ? "Selected" : "Optional"}
//             statusTone={hasPlan ? "success" : "neutral"}
//             to="/app/settings/billing"
//           />
//         </div>

//         {/* Focus Section: WhatsApp Connection */}
//         {!whatsappConnected && (
//           <motion.div
//             initial={{ opacity: 0, scale: 0.99 }}
//             animate={{ opacity: 1, scale: 1 }}
//             className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40"
//           >
//             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
//             {/* Reduced padding from p-8/10 to p-6/8, reduced gap from 10 to 6 */}
//             <div className="grid grid-cols-1 lg:grid-cols-5 p-6 lg:p-8 gap-6 items-center">
//               <div className="lg:col-span-3 space-y-4">
//                 <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
//                   <Zap size={12} className="fill-emerald-700" /> Recommended
//                   Next Step
//                 </div>
//                 {/* Reduced title from text-3xl to text-2xl */}
//                 <h2 className="text-2xl font-bold text-slate-900 leading-tight">
//                   Connect your Official WhatsApp API to start messaging
//                 </h2>
//                 {/* Reduced desc from text-lg to text-sm */}
//                 <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
//                   This is the official Meta integration. No workarounds, no
//                   risks. Get verified, send campaigns, and manage team inboxes
//                   instantly.
//                 </p>

//                 {/* Reduced gap from 4 to 2, text from sm to xs/sm */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-1">
//                   {[
//                     "Meta Verified Flow",
//                     "Use Existing Number",
//                     "Official Display Name",
//                     "24/7 Reliability",
//                   ].map((item, i) => (
//                     <div
//                       key={i}
//                       className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-medium"
//                     >
//                       <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{" "}
//                       {item}
//                     </div>
//                   ))}
//                 </div>

//                 <div className="flex flex-wrap items-center gap-3 pt-3">
//                   <button
//                     onClick={() => setShowApplyModal(true)}
//                     className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
//                   >
//                     <Facebook className="h-4 w-4" />
//                     Connect with Facebook
//                   </button>
//                   <button
//                     onClick={() => setShowMigration(true)}
//                     className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
//                   >
//                     I have another provider
//                   </button>
//                 </div>
//                 <p className="text-[10px] text-slate-400">
//                   By connecting, you agree to Meta's Commerce Policy. Setup
//                   takes ~2 minutes.
//                 </p>
//               </div>

//               <div className="lg:col-span-2 relative hidden lg:block h-full min-h-[14rem] flex items-center justify-center">
//                 {/* Decorative Elements - Reduced sizes */}
//                 <div className="absolute -top-10 -right-10 h-48 w-48 bg-emerald-100/50 rounded-full blur-3xl" />
//                 <div className="relative z-10 bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100 shadow-sm transform rotate-2 hover:rotate-0 transition-transform duration-500 max-w-[280px]">
//                   <img
//                     src="/img/applyforwhatsappapi.webp"
//                     alt="WhatsApp Integration"
//                     className="w-full h-auto drop-shadow-md"
//                   />
//                   <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-100 shadow-sm flex items-center gap-2">
//                     <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
//                       <ShieldCheck size={16} />
//                     </div>
//                     <div>
//                       <p className="text-[11px] font-bold text-slate-800">
//                         100% Secure Integration
//                       </p>
//                       <p className="text-[9px] text-slate-500">
//                         End-to-end encrypted by Meta
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </div>

//       {/* --- Modals (Migration & Apply) --- */}
//       <AnimatePresence>
//         {showMigration && (
//           <MigrationModal
//             onClose={() => setShowMigration(false)}
//             onSubmit={() => setMigrationSubmitted(true)}
//             submitted={migrationSubmitted}
//             setSubmitted={setMigrationSubmitted}
//           />
//         )}
//         {showApplyModal && (
//           <ApplyModal
//             onClose={() => setShowApplyModal(false)}
//             onMigrate={() => {
//               setShowApplyModal(false);
//               setShowMigration(true);
//             }}
//             onConnect={startFacebookConnect}
//             connecting={connecting}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// // --- Sub-Components ---

// function StepCard({
//   step,
//   title,
//   desc,
//   icon: Icon,
//   status,
//   statusTone,
//   isActive,
//   to,
//   onClick,
// }) {
//   const isClickable = !!onClick || to !== "#";

//   const toneClasses =
//     statusTone === "success"
//       ? "bg-emerald-50 text-emerald-700 border-emerald-100"
//       : statusTone === "warning"
//         ? "bg-amber-50 text-amber-700 border-amber-100"
//         : statusTone === "info"
//           ? "bg-sky-50 text-sky-700 border-sky-100"
//           : "bg-slate-50 text-slate-600 border-slate-100";

//   return (
//     <motion.div
//       whileHover={isClickable ? { y: -2, transition: { duration: 0.2 } } : {}}
//       onClick={onClick}
//       className={`relative md:col-span-1 bg-white p-4 rounded-xl border transition-all flex flex-col justify-between ${
//         isActive
//           ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-lg shadow-emerald-500/5 cursor-pointer"
//           : "border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200"
//       }`}
//     >
//       {isClickable && !onClick && <Link to={to} className="absolute inset-0" />}

//       <div className="flex items-start justify-between gap-3">
//         <div className="flex items-center gap-3">
//           <div
//             className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold border ${
//               isActive
//                 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
//                 : "bg-slate-50 text-slate-500 border-slate-100"
//             }`}
//           >
//             {step}
//           </div>
//           <div>
//             <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
//               {title}
//               {statusTone === "success" && (
//                 <CheckCircle2 size={14} className="text-emerald-500" />
//               )}
//             </h3>
//             <p className="text-xs text-slate-500 leading-snug max-w-[12rem]">
//               {desc}
//             </p>
//           </div>
//         </div>
//         {Icon && (
//           <div
//             className={`p-2 rounded-lg ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}
//           >
//             <Icon size={18} />
//           </div>
//         )}
//       </div>

//       <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
//         <span
//           className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneClasses}`}
//         >
//           {status}
//         </span>

//         {isActive ? (
//           <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
//             Start Now <ArrowRight size={12} />
//           </span>
//         ) : (
//           <span className="text-[10px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors">
//             View
//           </span>
//         )}
//       </div>
//     </motion.div>
//   );
// }

// function MigrationModal({ onClose, onSubmit, submitted, setSubmitted }) {
//   return (
//     <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[100] p-4">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         exit={{ opacity: 0, scale: 0.95 }}
//         className="bg-white max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden relative"
//       >
//         <div className="p-6 md:p-8">
//           {!submitted ? (
//             <>
//               <div className="flex items-center justify-between mb-6">
//                 <h2 className="text-2xl font-bold text-slate-900">
//                   Migrate to XploreByte
//                 </h2>
//                 <button
//                   onClick={onClose}
//                   className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
//                 >
//                   ✕
//                 </button>
//               </div>

//               <div className="space-y-4 mb-8">
//                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
//                   <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
//                   <div className="text-sm text-amber-800">
//                     <p className="font-semibold mb-1">Before you start:</p>
//                     <ul className="list-disc list-inside space-y-1 opacity-90">
//                       <li>Disable Two-Step Verification on old account</li>
//                       <li>Ensure number can receive SMS OTP</li>
//                     </ul>
//                   </div>
//                 </div>
//                 <p className="text-slate-600 text-sm">
//                   Our migration team will handle the technical transfer. Once
//                   you submit, we'll reach out within 24 hours to guide you
//                   through the number porting process.
//                 </p>
//               </div>

//               <div className="flex gap-3 justify-end">
//                 <button
//                   onClick={onClose}
//                   className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={onSubmit}
//                   className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
//                 >
//                   Request Migration
//                 </button>
//               </div>
//             </>
//           ) : (
//             <div className="text-center py-8">
//               <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <CheckCircle2 size={32} />
//               </div>
//               <h3 className="text-xl font-bold text-slate-900 mb-2">
//                 Request Submitted!
//               </h3>
//               <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
//                 We've received your request. Check your email for next steps.
//               </p>
//               <button
//                 onClick={() => {
//                   setSubmitted(false);
//                   onClose();
//                 }}
//                 className="px-8 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
//               >
//                 Done
//               </button>
//             </div>
//           )}
//         </div>
//       </motion.div>
//     </div>
//   );
// }

// function ApplyModal({ onClose, onMigrate, onConnect, connecting }) {
//   const [showDetails, setShowDetails] = useState(false);
//   return (
//     <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[100] p-4">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         exit={{ opacity: 0, scale: 0.95 }}
//         className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
//       >
//         <div className="p-6 md:p-8 overflow-y-auto">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-2xl font-bold text-emerald-950">
//               Connect WhatsApp API
//             </h2>
//             <button
//               onClick={onClose}
//               className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
//             >
//               ✕
//             </button>
//           </div>

//           <div className="space-y-6">
//             <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
//               <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-3">
//                 Before you start, keep this ready
//               </p>
//               <ul className="space-y-2">
//                 <li className="flex items-start gap-2.5 text-sm text-emerald-900">
//                   <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
//                   A registered business and a working website URL
//                 </li>
//                 <li className="flex items-start gap-2.5 text-sm text-emerald-900">
//                   <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
//                   Access to the phone number you want to use (to receive OTP via
//                   SMS or call)
//                 </li>
//                 <li className="flex items-start gap-2.5 text-sm text-emerald-900">
//                   <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
//                   A Facebook account with permission to manage your business (or
//                   ability to create one)
//                 </li>
//               </ul>
//             </div>

//             <div className="border border-emerald-100 rounded-xl overflow-hidden bg-white">
//               <button
//                 onClick={() => setShowDetails(!showDetails)}
//                 className="w-full flex items-center justify-between p-4 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 transition-colors"
//               >
//                 <span className="font-semibold text-sm">
//                   What happens after you click "Continue With Facebook"?
//                 </span>
//                 <ChevronRight
//                   size={18}
//                   className={`text-emerald-600 transition-transform duration-200 ${showDetails ? "rotate-90" : ""}`}
//                 />
//               </button>

//               <AnimatePresence>
//                 {showDetails && (
//                   <motion.div
//                     initial={{ height: 0, opacity: 0 }}
//                     animate={{ height: "auto", opacity: 1 }}
//                     exit={{ height: 0, opacity: 0 }}
//                     className="bg-white"
//                   >
//                     <div className="p-5 border-t border-emerald-100 text-[13px] text-slate-700 leading-relaxed">
//                       <ol className="list-decimal list-outside ml-4 space-y-2">
//                         <li>
//                           A secure Meta (Facebook) window will open in a new tab
//                           or popup.
//                         </li>
//                         <li>
//                           Log in with the Facebook account that manages your
//                           business (or create one if needed).
//                         </li>
//                         <li>
//                           Select or create your{" "}
//                           <span className="font-semibold text-slate-900">
//                             Business Manager
//                           </span>{" "}
//                           and{" "}
//                           <span className="font-semibold text-slate-900">
//                             WhatsApp Business Account
//                           </span>
//                           .
//                         </li>
//                         <li>
//                           Choose the phone number you want to use (new number or
//                           move an existing WhatsApp Business / WhatsApp API
//                           number).
//                         </li>
//                         <li>
//                           Verify the number using the SMS or call OTP that Meta
//                           sends to that phone.
//                         </li>
//                         <li>
//                           Review and grant the requested permissions so
//                           XploreByte can send and receive WhatsApp messages on
//                           your behalf.
//                         </li>
//                         <li>
//                           When Meta shows "
//                           <span className="font-semibold text-slate-900">
//                             Setup complete
//                           </span>
//                           ", close the Facebook window and return to this
//                           dashboard.
//                         </li>
//                         <li>
//                           Your WhatsApp connection status in XploreByte will
//                           update automatically once Meta confirms the setup.
//                         </li>
//                       </ol>
//                     </div>
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </div>
//         </div>

//         <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-center items-center">
//           <button
//             onClick={onMigrate}
//             className="px-6 py-2.5 bg-white border border-emerald-500 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
//           >
//             Migrate from another vendor
//           </button>
//           <button
//             disabled={connecting}
//             onClick={onConnect}
//             className="px-6 py-2.5 bg-[#008f5c] hover:bg-[#007a4d] text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
//           >
//             {connecting && (
//               <Loader2 className="h-4 w-4 animate-spin text-white" />
//             )}
//             Continue With Facebook
//           </button>
//         </div>
//       </motion.div>
//     </div>
//   );
// }
