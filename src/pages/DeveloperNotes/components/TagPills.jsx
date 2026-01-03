// 📄 src/pages/DeveloperNotes/components/TagPills.jsx
import React from "react";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function TagPills({ tags = [], className }) {
  if (!tags?.length) return null;
  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {tags.map(t => (
        <span
          key={t}
          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

