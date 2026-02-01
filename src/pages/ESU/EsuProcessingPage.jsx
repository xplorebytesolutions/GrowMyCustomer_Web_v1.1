import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Loader2, 
  Facebook, 
  CheckCircle2, 
  Zap,
  AlertCircle
} from "lucide-react";

export default function EsuProcessingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("syncing"); // syncing | finalizing | success

  useEffect(() => {
    const esuStatus = searchParams.get("esuStatus");
    
    // Simulate a brief "finalizing" state for UX feel
    const timer = setTimeout(() => {
      if (esuStatus === "success") {
        setStatus("success");
        setTimeout(() => {
          navigate("/app/welcomepage?esuStatus=success", { replace: true });
        }, 3000);
      } else if (esuStatus === "needs_pin") {
        navigate("/app/welcomepage?esuStatus=needs_pin", { replace: true });
      } else {
        // Default fallback if something went wrong
        navigate("/app/welcomepage", { replace: true });
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-slate-50 to-emerald-50/30">
      <div className="max-w-md w-full">
        <div className="relative">
          {/* Background Glows */}
          <div className="absolute inset-0 -m-20 bg-emerald-500/5 blur-[100px] rounded-full" />
          <div className="absolute top-0 right-0 -mr-20 bg-blue-500/5 blur-[80px] rounded-full" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl shadow-emerald-500/10 p-10 text-center space-y-8"
          >
            {/* Animated Logo / Icon Section */}
            <div className="flex justify-center">
              <div className="relative">
                <AnimatePresence mode="wait">
                  {status === "syncing" ? (
                    <motion.div
                      key="sync"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.2, opacity: 0 }}
                      className="relative h-24 w-24 flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-emerald-100 rounded-3xl rotate-12 animate-pulse" />
                      <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl -rotate-6" />
                      <div className="relative bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                         <Loader2 className="text-emerald-600 animate-spin" size={40} strokeWidth={1.5} />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative h-24 w-24 flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-emerald-100 rounded-3xl rotate-12" />
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl -rotate-6" />
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12 }}
                        className="relative bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-emerald-600"
                      >
                         <CheckCircle2 size={40} strokeWidth={1.5} />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {status === "syncing" ? "Finalizing Connection" : "Connection Verified"}
              </h2>
              <div className="flex items-center justify-center gap-2">
                 <Facebook size={14} className="text-emerald-600 fill-emerald-600" />
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Meta Secure Handshake</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed px-4">
                {status === "syncing" 
                  ? "We're verifying your business numbers and establishing your secure WhatsApp API channel..."
                  : "Great news! Your WhatsApp Business API is now successfully linked to XploreByte."}
              </p>
            </div>

            {/* Safety Warning */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.5 }}
               className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left"
            >
               <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
               <div>
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-0.5">Safety Protocol</p>
                  <p className="text-[11px] text-amber-700 leading-tight">Please <span className="font-bold underline">do not refresh</span> or close this window while we finalize your secure connection.</p>
               </div>
            </motion.div>

            {/* Stepper / Progress indicators */}
            <div className="pt-2 flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 rounded-full transition-all duration-1000 ${
                    s === 1 ? "w-10 bg-emerald-500" : 
                    s === 2 ? (status === "success" ? "w-10 bg-emerald-500" : "w-4 bg-emerald-100") : 
                    "w-4 bg-slate-100"
                  }`} 
                />
              ))}
            </div>

            {/* Footer Features */}
            <div className="pt-2 grid grid-cols-2 gap-4">
               <div className="p-3 bg-slate-50 rounded-2xl flex flex-col items-center gap-2 border border-slate-100">
                  <Zap size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Instant Sync</span>
               </div>
               <div className="p-3 bg-slate-50 rounded-2xl flex flex-col items-center gap-2 border border-slate-100">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Secure API</span>
               </div>
            </div>
          </motion.div>

          {/* Bottom Branding */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center text-xs font-medium text-slate-400"
          >
            Secure connection by <span className="text-emerald-600 font-bold">XploreByte</span>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
