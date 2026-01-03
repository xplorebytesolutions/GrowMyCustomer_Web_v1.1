import React from "react";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-rose-100 text-rose-700 border-rose-200",
  hold: "bg-rose-100 text-rose-700 border-rose-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  rejected: "bg-slate-100 text-slate-700 border-slate-200",
  unknown: "bg-slate-100 text-slate-700 border-slate-200",
};

function normalizeStatus(status) {
  const st = String(status || "").trim().toLowerCase();
  if (!st) return "unknown";
  if (st === "active") return "active";
  if (st === "inactive") return "inactive";
  if (st === "hold") return "hold";
  if (st === "pending") return "pending";
  if (st === "rejected") return "rejected";
  return st;
}

export default function StatusPill({ isActive, status }) {
  const normalized =
    typeof isActive === "boolean"
      ? isActive
        ? "active"
        : "inactive"
      : normalizeStatus(status);

  const color = STATUS_COLORS[normalized] ?? STATUS_COLORS.unknown;
  const label =
    typeof isActive === "boolean"
      ? isActive
        ? "Active"
        : "Inactive"
      : status || "Unknown";

  const dot =
    normalized === "active"
      ? "bg-emerald-500"
      : normalized === "inactive" || normalized === "hold"
      ? "bg-rose-500"
      : normalized === "pending"
      ? "bg-amber-500"
      : "bg-slate-400";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

