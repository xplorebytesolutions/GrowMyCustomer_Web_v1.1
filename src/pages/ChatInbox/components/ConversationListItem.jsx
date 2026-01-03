// 📄 src/pages/ChatInbox/components/ConversationListItem.jsx
import React from "react";
import { Circle } from "lucide-react";

const statusColors = {
  New: "bg-emerald-100 text-emerald-700",
  Open: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-700",
  Closed: "bg-gray-100 text-gray-600",
};

export function ConversationListItem({ conversation, isActive, onClick }) {
  const statusClass =
    statusColors[conversation.status] || "bg-gray-100 text-gray-600";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 flex gap-2 items-start border-b border-gray-50 hover:bg-gray-50 ${
        isActive ? "bg-emerald-50/80" : ""
      }`}
    >
      {/* Avatar placeholder */}
      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-semibold text-white">
        {conversation.contactName?.[0] || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate">
            <div className="text-sm font-medium text-gray-900 truncate">
              {conversation.contactName}
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {conversation.contactPhone}
            </div>
          </div>
          <div className="text-[11px] text-gray-400">
            {conversation.lastMessageAt}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="text-[11px] text-gray-500 truncate">
            {conversation.lastMessagePreview}
          </div>
          <div className="flex items-center gap-1 ml-1">
            {/* Number badge */}
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              <Circle size={8} className="mr-1 text-emerald-500" />
              {conversation.numberLabel}
            </span>
            {/* Unread */}
            {conversation.unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] h-5 w-5">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${statusClass}`}
          >
            {conversation.status}
          </span>
          {!conversation.within24h && (
            <span className="text-[10px] text-amber-600 font-medium">
              24h window over
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
