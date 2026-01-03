import React from "react";
import { X, Save, CheckCircle2, Loader2 } from "lucide-react";
import StatusPill from "../../../../components/common/StatusPill";

export default function RoleDrawer({
  open,
  mode, // create | edit
  value,
  onChange,
  onClose,
  onSave,
  saving,
  canManage,
}) {
  const isEdit = mode === "edit";

  if (!open) return null;

  const set = (key, nextValue) =>
    onChange(prev => ({ ...(prev || {}), [key]: nextValue }));

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={saving ? undefined : onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white border-l border-slate-200 shadow-2xl">
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isEdit ? "Edit role" : "Create role"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? "Update role name, status and description."
                  : "Create a new business role, then map permissions."}
              </p>
            </div>

            <button
              type="button"
              onClick={saving ? undefined : onClose}
              className="p-2 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-60"
              disabled={saving}
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600">
                Role name
              </label>
              <input
                value={value?.name ?? ""}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g., Support"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <div className="mt-1 flex items-center gap-2">
                <StatusPill isActive={!!value?.isActive} />
                <button
                  type="button"
                  onClick={() => set("isActive", !value?.isActive)}
                  disabled={!canManage}
                  className="text-xs rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-60"
                >
                  Toggle
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Inactive roles remain in history but cannot be assigned.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">
                Description
              </label>
              <textarea
                rows={4}
                value={value?.description ?? ""}
                onChange={e => set("description", e.target.value)}
                placeholder="What should this role be used for?"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={saving ? undefined : onClose}
              disabled={saving}
              className="px-3 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={!canManage || saving}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Save className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create role"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

