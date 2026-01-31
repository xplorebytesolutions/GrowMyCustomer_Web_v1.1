import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

/**
 * Reusable modal for Meta WhatsApp PIN registration/activation.
 * triggered after successful Embedded Signup (ESU).
 */
export default function MetaPinActivationModal({ 
  isOpen, 
  onClose, 
  businessId, 
  onSuccess 
}) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleaned = (pin || "").trim();

    if (!/^\d{6}$/.test(cleaned)) {
      toast.error("PIN must be exactly 6 digits.");
      return;
    }

    if (!businessId) {
      toast.error("Business context missing. Please try again.");
      return;
    }

    try {
      setSubmitting(true);
      await axiosClient.post(
        "esu/facebook/register-number",
        { pin: cleaned },
        { 
          headers: { "X-Business-Id": businessId },
          __silentToast: true // Suppress the global toast
        }
      );

      toast.success("✅ WhatsApp number activated successfully.");
      setSuccess(true);
      if (onSuccess) onSuccess();
      
      // Close after a brief delay to show success state
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setSuccess(false);
        setPin("");
      }, 1500);
      
    } catch (err) {
      // Show user-friendly error instead of technical jargon
      setError("Invalid PIN. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={!submitting ? onClose : undefined}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-emerald-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="font-bold text-slate-900">Complete Two-Step Verification</h3>
              </div>
              {!submitting && (
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6">
              {success ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">Successfully Activated!</h4>
                  <p className="mt-2 text-sm text-slate-500">Your number is now registered with Meta and ready for use.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2 text-center sm:text-left">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                      Enter the 6-digit PIN you created during the Meta Embedded Signup process to register and enable your number.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                          if (error) setError(null);
                        }}
                        placeholder="Enter 6-digit PIN"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-center text-2xl font-black tracking-[0.5em] focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal"
                        disabled={submitting}
                      />
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg bg-rose-50 px-4 py-2 text-center"
                      >
                        <p className="text-xs font-bold text-rose-600">{error}</p>
                      </motion.div>
                    )}

                    <p className="text-[11px] text-center text-slate-400 font-medium bg-slate-50 py-2 rounded-lg leading-relaxed px-4">
                      Note: PIN registration is required by Meta to start sending messages. 
                      Your PIN is processed securely and never stored on our servers.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting || pin.length !== 6}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Activating Number...
                        </>
                      ) : (
                        "Register & Activate Number"
                      )}
                    </button>
                    {!submitting && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1"
                      >
                        Skip for now
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
