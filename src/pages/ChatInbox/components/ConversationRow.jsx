import React from "react";
import { getInitial } from "../utils/formatters";

function getComplianceBadges(conv) {
  const optStatus = Number(conv?.optStatus ?? conv?.contact?.optStatus);
  const channelStatus = Number(
    conv?.channelStatus ?? conv?.contact?.channelStatus
  );
  const badges = [];

  if (optStatus === 2) {
    badges.push({
      key: "opted-out",
      label: "Opted out",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    });
  }

  if (channelStatus === 2) {
    badges.push({
      key: "invalid",
      label: "Invalid",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    });
  } else if (channelStatus === 1) {
    badges.push({
      key: "blocked",
      label: "Blocked",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    });
  }

  return badges;
}

export function ConversationRow({ conv, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-slate-100 hover:bg-white transition ${
        isSelected ? "bg-white" : "bg-slate-50"
      }`}
    >
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
          {getInitial(conv.contactName, conv.contactPhone)}
        </div>
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-semibold rounded-full px-1.5 py-[1px]">
            {conv.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate">
                {conv.contactName || conv.contactPhone || "Unknown"}
              </span>
              {getComplianceBadges(conv).map(badge => (
                <span
                  key={badge.key}
                  className={`inline-flex items-center rounded-full border px-1.5 py-[1px] text-[9px] font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-slate-400">{conv.contactPhone}</span>
          </div>
          <span className="text-[10px] text-slate-400 ml-2">
            {conv.lastMessageAt
              ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-600 truncate pr-4">
            {conv.lastMessagePreview || "No recent message"}
          </p>

          <div className="flex flex-col items-end gap-0.5">
            <span
              className={`text-[9px] px-1.5 py-[1px] rounded-full border ${
                conv.within24h
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {conv.within24h ? "24h window" : "Outside 24h"}
            </span>
            {conv.assignedToUserName && (
              <span className="text-[9px] text-slate-400">
                {conv.assignedToUserName}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
