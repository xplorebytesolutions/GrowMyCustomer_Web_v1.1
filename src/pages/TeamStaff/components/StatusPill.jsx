import React from "react";

export default function StatusPill({ status }) {
  const st = String(status || "")
    .trim()
    .toLowerCase();

  const base =
    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";

  if (st === "active") {
    return (
      <span
        className={`${base} bg-emerald-500/10 text-emerald-200 border-emerald-500/25`}
      >
        Active
      </span>
    );
  }

  if (st === "hold" || st === "inactive") {
    return (
      <span
        className={`${base} bg-rose-500/10 text-rose-200 border-rose-500/25`}
      >
        Hold
      </span>
    );
  }

  if (st === "pending") {
    return (
      <span
        className={`${base} bg-amber-500/10 text-amber-200 border-amber-500/25`}
      >
        Pending
      </span>
    );
  }

  if (st === "rejected") {
    return (
      <span
        className={`${base} bg-slate-500/10 text-slate-200 border-slate-500/25`}
      >
        Rejected
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-slate-500/10 text-slate-200 border-slate-500/25`}
    >
      {status || "Unknown"}
    </span>
  );
}
