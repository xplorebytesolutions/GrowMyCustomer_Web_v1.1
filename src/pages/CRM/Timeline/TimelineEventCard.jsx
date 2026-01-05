import React from "react";
import { formatAgo } from "./timelineUtils"; // ✅ Correct import

function TimelineEventCard({ entry }) {
  // 🔵 Pick Icon based on eventType
  const getIcon = () => {
    if (entry.eventType === "CatalogCTA") return "🛍️";
    if (entry.eventType === "CampaignSend") return "✉️"; // ✅ New: Campaign Send icon
    if (entry.eventType === "ReminderSet") return "⏰";
    if (entry.eventType === "NoteAdded") return "📝";
    if (entry.eventType === "CustomActivity") return "⚙️";
    return "📌"; // default for unknown event types
  };

  // 🏷️ Pick badge color
  const getBadgeStyle = () => {
    if (entry.eventType === "CatalogCTA") return "bg-green-100 text-green-800";
    if (entry.eventType === "CampaignSend")
      return "bg-indigo-100 text-indigo-800"; // ✅ New: Campaign Send badge
    if (entry.eventType === "ReminderSet")
      return "bg-yellow-100 text-yellow-800";
    if (entry.eventType === "NoteAdded") return "bg-blue-100 text-blue-800";
    if (entry.eventType === "CustomActivity")
      return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800"; // default style
  };

  return (
    <div className="relative">
      {/* 🔵 Dot */}
      <div className="absolute -left-7 top-5 w-4 h-4 bg-emerald-600 rounded-full border-2 border-white shadow"></div>

      {/* 🧩 Event Card */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex justify-between items-center mb-2">
          {/* 🧠 Icon + Event Type */}
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <span className="text-xl">{getIcon()}</span>
            <span>{entry.eventType}</span>
          </div>

          {/* 🏷️ Badge */}
          <div
            className={`text-xs font-bold px-2 py-1 rounded ${getBadgeStyle()}`}
          >
            {entry.eventType}
          </div>
        </div>

        {/* 📝 Description */}
        <div className="text-gray-700 text-sm mb-2">
          {entry.description || "(No description provided)"}
        </div>

        {/* 🕑 Timestamp */}
        <div className="text-xs text-gray-400">
          {formatAgo(entry.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default TimelineEventCard;
