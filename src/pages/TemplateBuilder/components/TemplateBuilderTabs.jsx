import React from "react";
import { Link, useLocation } from "react-router-dom";

const tabs = [
  { label: "Library", to: "/app/template-builder/library" },
  { label: "Drafts", to: "/app/template-builder/drafts" },
  { label: "Approved", to: "/app/template-builder/approved" },
];

function isActive(pathname, to) {
  if (!pathname || !to) return false;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function TemplateBuilderTabs() {
  const { pathname } = useLocation();

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        {tabs.map(t => {
          const active = isActive(pathname, t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={[
                "px-3 py-1.5 rounded-md text-sm font-semibold transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

