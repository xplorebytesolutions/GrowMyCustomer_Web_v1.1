import React, { useEffect, useMemo, useState } from "react";
import { X, Save } from "lucide-react";
import { toast } from "react-toastify";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  roleId: "",
};

export default function StaffDrawer({
  open,
  mode, // create | edit
  roles = [],
  initial,
  onClose,
  onCreate,
  onUpdate,
}) {
  const isEdit = mode === "edit";

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;

    if (isEdit && initial) {
      setForm({
        name: initial.name || "",
        email: initial.email || "",
        password: "",
        roleId: initial.roleId || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, isEdit, initial]);

  const roleOptions = useMemo(() => {
    return (roles || []).map(r => ({
      id: r.id,
      name: r.name,
    }));
  }, [roles]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.name || form.name.trim().length < 2) {
      toast.warn("Name must be at least 2 characters.");
      return false;
    }
    if (!isEdit) {
      if (!form.email || !String(form.email).includes("@")) {
        toast.warn("Enter a valid email.");
        return false;
      }
      if (!form.password || form.password.length < 6) {
        toast.warn("Password must be at least 6 characters.");
        return false;
      }
    }
    if (!form.roleId) {
      toast.warn("Please select a role.");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (!isEdit) {
        await onCreate({
          name: form.name.trim(),
          email: String(form.email).trim(),
          password: form.password,
          roleId: form.roleId,
        });
      } else {
        await onUpdate(initial.id, {
          name: form.name.trim(),
          roleId: form.roleId,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={saving ? undefined : onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-slate-950/95 border-l border-slate-700/60 shadow-2xl">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? "Edit Staff User" : "Add Staff User"}
              </h2>
              <p className="text-sm text-slate-400">
                {isEdit
                  ? "Update name and role. Status is managed from the table."
                  : "Create a staff user under your business."}
              </p>
            </div>

            <button
              onClick={saving ? undefined : onClose}
              className="p-2 rounded-xl hover:bg-slate-800/60 text-slate-200"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-5 space-y-4">
            <div>
              <label className="text-sm text-slate-300">Name</label>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-700/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                placeholder="e.g., Rahul Sharma"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Email</label>
              <input
                value={form.email}
                onChange={e => set("email", e.target.value)}
                disabled={isEdit}
                className={`mt-1 w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-700/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 ${
                  isEdit ? "opacity-70 cursor-not-allowed" : ""
                }`}
                placeholder="e.g., staff@company.com"
              />
              {isEdit && (
                <p className="mt-1 text-xs text-slate-500">
                  Email is locked for safety in MVP.
                </p>
              )}
            </div>

            {!isEdit && (
              <div>
                <label className="text-sm text-slate-300">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-700/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                  placeholder="Min 6 characters"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-slate-300">Role</label>
              <select
                value={form.roleId}
                onChange={e => set("roleId", e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-700/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
              >
                <option value="">Select a role</option>
                {roleOptions.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {roleOptions.length === 0 && (
                <p className="mt-1 text-xs text-amber-300/90">
                  Roles list is empty. If your roles API route is different,
                  update ROLE_ENDPOINT in TeamStaffPage.jsx.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-700/60 flex gap-2 justify-end">
            <button
              onClick={saving ? undefined : onClose}
              className="px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-700/60 text-slate-200 hover:bg-slate-900/60"
              disabled={saving}
            >
              Cancel
            </button>

            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Staff"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
