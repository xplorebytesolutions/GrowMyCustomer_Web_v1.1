import React from "react";

function TabButton({ id, label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(id)}
      className={`relative px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors disabled:opacity-60 ${
        active
          ? "border-indigo-500 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

export default function TabbedNav({ tabs, activeTab, onChange }) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-200 pl-1">
      {(tabs || []).map(t => (
        <TabButton
          key={t.id}
          id={t.id}
          label={t.label}
          active={activeTab === t.id}
          onClick={onChange}
          disabled={t.disabled}
        />
      ))}
    </div>
  );
}

