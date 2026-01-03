import React from "react";

export default function TopSelectorBar({ left, right, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

