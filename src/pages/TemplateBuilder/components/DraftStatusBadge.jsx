import React from "react";

export default function DraftStatusBadge({ status, language }) {
  // Backend shape: { success, draftId, name, items: [{ language, status, reason }] }
  const item =
    status?.items?.find(x => x.language === language) ??
    status?.items?.[0] ??
    null;

  const raw = item?.status;
  const reason = item?.reason;

  if (!raw) {
    return (
      <span className="text-xs px-2 py-1 rounded border text-gray-600">
        Draft • Not submitted
      </span>
    );
  }

  const s = String(raw).toUpperCase();

  const normalized =
    s === "IN_REVIEW" ? "PENDING" : s === "PENDING_REVIEW" ? "PENDING" : s;

  const color =
    normalized === "APPROVED"
      ? "bg-green-100 text-green-700 border-green-200"
      : normalized === "REJECTED"
      ? "bg-red-100 text-red-700 border-red-200"
      : normalized === "PAUSED"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-blue-100 text-blue-700 border-blue-200";

  return (
    <span
      className={`text-xs px-2 py-1 rounded border ${color}`}
      title={normalized === "REJECTED" && reason ? reason : undefined}
    >
      {normalized}
    </span>
  );
}
