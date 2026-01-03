// 📄 src/pages/ChatInbox/components/MessageList.jsx
import React from "react";

export function MessageList({ messages }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
        <div className="h-full flex items-center justify-center text-xs text-gray-400">
          No messages yet.
        </div>
      </div>
    );
  }

  const formatTime = raw => {
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      // fallback if it's already a simple "10:31" style string
      return raw;
    }
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDayLabel = raw => {
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;

    const today = new Date();
    const todayKey = today.toDateString();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toDateString();

    const msgKey = d.toDateString();

    if (msgKey === todayKey) return "Today";
    if (msgKey === yesterdayKey) return "Yesterday";

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  let lastDayLabel = null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
      {messages.map(msg => {
        const direction = msg.direction || "in"; // fallback
        const sentAtRaw = msg.sentAt || msg.at;
        const timeLabel = formatTime(sentAtRaw);
        const dayLabel = getDayLabel(sentAtRaw);
        const showDayDivider = dayLabel && dayLabel !== lastDayLabel;
        lastDayLabel = dayLabel || lastDayLabel;

        // --- Automation / system bubble (centered) ---
        const isSystemLike =
          direction === "automation" || direction === "system";

        if (isSystemLike) {
          return (
            <React.Fragment key={msg.id}>
              {showDayDivider && (
                <div className="flex justify-center my-2">
                  <span className="px-3 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-500">
                    {dayLabel}
                  </span>
                </div>
              )}

              <div className="flex justify-center my-1">
                <div className="max-w-[80%] text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-600">
                    {/* Small label to show it's from automation */}
                    <span className="font-medium mr-1">Automation</span>
                    <span className="text-gray-500">•</span>
                    <span className="ml-1 text-gray-600">{msg.text}</span>
                  </div>
                  {timeLabel && (
                    <div className="mt-1 text-[10px] text-gray-400">
                      {timeLabel}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        }

        // --- Normal in/out bubbles ---
        const isIncoming = direction === "in";
        const wrapperJustify = isIncoming ? "justify-start" : "justify-end";
        const bubbleColors = isIncoming
          ? "bg-white text-gray-900"
          : "bg-emerald-600 text-white";
        const metaTextColor = isIncoming ? "text-gray-400" : "text-emerald-100";

        return (
          <React.Fragment key={msg.id}>
            {showDayDivider && (
              <div className="flex justify-center my-2">
                <span className="px-3 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-500">
                  {dayLabel}
                </span>
              </div>
            )}

            <div className={`flex mb-1 ${wrapperJustify}`}>
              <div className="max-w-[70%]">
                {/* Sender label for agent messages */}
                {!isIncoming && msg.senderName && (
                  <div className="text-[10px] text-gray-400 text-right mb-0.5">
                    {msg.senderName}
                  </div>
                )}

                <div
                  className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${bubbleColors}`}
                >
                  <div>{msg.text}</div>
                  {timeLabel && (
                    <div
                      className={`mt-1 text-[10px] ${metaTextColor} text-right`}
                    >
                      {timeLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
