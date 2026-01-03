import React from "react";

export default function SectionCard({
  title,
  subtitle,
  actions,
  infoBar,
  minHeight,
  children,
  className = "",
  bodyClassName = "",
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col ${
        minHeight ? minHeight : ""
      } ${className}`}
    >
      {(title || subtitle || actions) && (
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title ? (
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                {title}
              </p>
            ) : null}
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}

      {infoBar ? (
        <div className="px-4 py-2 border-b border-sky-100 bg-[#EBFFFF] flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2 text-xs text-indigo-900">
            {infoBar.left}
          </div>
          {infoBar.right ? <div>{infoBar.right}</div> : null}
        </div>
      ) : null}

      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

