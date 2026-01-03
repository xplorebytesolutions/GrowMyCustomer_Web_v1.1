import React, { useState } from "react";
import { Pencil, UserCheck, UserX } from "lucide-react";
import StatusPill from "./StatusPill";

export default function StaffTable({ loading, rows, onEdit, onToggleStatus }) {
  const [busyId, setBusyId] = useState(null);

  const toggle = async (user, toStatus) => {
    try {
      setBusyId(user.id);
      onToggleStatus(user, toStatus);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
        <div className="text-sm text-slate-200 font-semibold">Staff List</div>
        <div className="text-xs text-slate-400">
          {Array.isArray(rows) ? rows.length : 0} users
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/30">
            <tr className="text-left text-slate-300">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/70">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={5}>
                  Loading staff…
                </td>
              </tr>
            ) : !rows || rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={5}>
                  No staff users found.
                </td>
              </tr>
            ) : (
              rows.map(r => {
                const st = String(r.status || "").toLowerCase();
                const isActive = st === "active";
                const isHold = st === "hold";
                const isBusy = busyId === r.id;

                return (
                  <tr key={r.id} className="hover:bg-slate-950/20">
                    <td className="px-4 py-3 text-white">{r.name}</td>
                    <td className="px-4 py-3 text-slate-200">{r.email}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {r.roleName || "unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(r)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-700/60 text-slate-200 hover:bg-slate-900/60"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {isActive && (
                          <button
                            onClick={() => toggle(r, "Hold")}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 hover:bg-rose-500/15 disabled:opacity-60"
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4" />
                            <span className="hidden sm:inline">Deactivate</span>
                          </button>
                        )}

                        {(isHold || (!isActive && !isHold)) && (
                          <button
                            onClick={() => toggle(r, "Active")}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                            title="Activate"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Activate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
