import React, { useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Save, Lock } from "lucide-react";
import { toast } from "react-toastify";
import { changePassword } from "../../../api/auth";
import { motion } from "framer-motion";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const validation = useMemo(() => {
    if (!currentPassword && !newPassword && !confirmNewPassword) return { ok: false, message: "" }; // Initial state
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return { ok: false, message: "All fields are required." };
    }
    if (newPassword.length < 6) {
      return { ok: false, message: "New password must be at least 6 characters." };
    }
    if (newPassword !== confirmNewPassword) {
      return { ok: false, message: "New passwords do not match." };
    }
    if (newPassword === currentPassword) {
      return { ok: false, message: "New password must be different." };
    }
    return { ok: true, message: "" };
  }, [confirmNewPassword, currentPassword, newPassword]);

  const onSubmit = async e => {
    e.preventDefault();
    if (!validation.ok || saving) return;

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password updated. Logging out...");
      
      // Short delay to let the toast be seen/processed
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 1500);
      
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update password.";
      toast.error(msg);
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400";

  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Security Settings
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage your password and account security
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Sidebar / Info */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Password</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Update your account password regularly to keep your business data secure.
            </p>
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/60">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-blue-800 mb-1">Security Tip</p>
                        <p className="text-xs text-blue-600 leading-snug">
                            Use a mix of letters, numbers, and symbols to create a strong password.
                        </p>
                    </div>
                </div>
            </div>
          </div>

          {/* Form Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="md:col-span-2"
          >
            <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Current Password */}
                <div>
                  <label className={labelClass}>Current Password</label>
                  <div className="relative group">
                    <input
                      className={inputClass}
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* New Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>New Password</label>
                        <div className="relative group">
                            <input
                            className={inputClass}
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            />
                            <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                            >
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Confirm Password</label>
                        <div className="relative group">
                            <input
                            className={inputClass}
                            type={showConfirm ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={e => setConfirmNewPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            />
                            <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                            >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50/80 px-6 py-4 flex items-center justify-between border-t border-slate-100">
                 <div className="text-xs text-slate-400 font-medium">
                    {validation.message && !validation.ok && (
                        <span className="text-amber-600 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {validation.message}
                        </span>
                    )}
                    {validation.ok && currentPassword && (
                        <span className="text-emerald-600 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ready to update
                        </span>
                    )}
                 </div>
                 <button
                    type="submit"
                    disabled={!validation.ok || saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-300 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
                  >
                    {saving ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <Save size={16} />
                            Update Password
                        </>
                    )}
                  </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

