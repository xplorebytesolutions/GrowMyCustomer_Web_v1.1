import React from "react";
import { X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  body,
  loading,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={loading ? undefined : onClose}
      />

      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700/60 bg-slate-950/95 shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-700/60 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {body ? (
              <p className="mt-1 text-sm text-slate-300">{body}</p>
            ) : null}
          </div>
          <button
            onClick={loading ? undefined : onClose}
            className="p-2 rounded-xl hover:bg-slate-800/60 text-slate-200"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 flex justify-end gap-2">
          <button
            onClick={loading ? undefined : onClose}
            className="px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-700/60 text-slate-200 hover:bg-slate-900/60 disabled:opacity-60"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Working…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
