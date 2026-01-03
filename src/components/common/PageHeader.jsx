import React from "react";

export default function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 text-indigo-600" /> : null}
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>
        {subtitle ? (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

