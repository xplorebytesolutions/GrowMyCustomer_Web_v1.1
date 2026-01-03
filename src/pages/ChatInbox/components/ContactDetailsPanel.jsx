// 📄 src/pages/ChatInbox/components/ContactDetailsPanel.jsx
import React from "react";
import { User, Tag, Clock, Phone, Bot, MessageSquare } from "lucide-react";
import { RecentActivityTimeline } from "./RecentActivityTimeline";

// Small formatter helpers – later you can centralize these
function formatDateTime(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleString();
  } catch {
    return value;
  }
}

export function ContactDetailsPanel({ conversation }) {
  if (!conversation) {
    return (
      <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 min-w-[260px] flex flex-col">
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center px-3">
          Select a conversation to view contact details and activity.
        </div>
      </div>
    );
  }

  const modeLabel =
    conversation.mode === "automation" ? "Automation" : "Agent handover";

  // Fake tags for now – later you’ll bind real contact tags from backend
  const fakeTags = ["High intent", "Hair care", "WhatsApp lead"];

  // Build “source” line
  let sourceLine = "Source: -";
  if (conversation.sourceType === "Campaign" && conversation.sourceName) {
    sourceLine = `Source: Campaign – ${conversation.sourceName}`;
  } else if (
    conversation.sourceType === "AutoReply" &&
    conversation.sourceName
  ) {
    sourceLine = `Source: AutoReply – ${conversation.sourceName}`;
  } else if (conversation.sourceType === "Manual") {
    sourceLine = "Source: Manual WhatsApp chat";
  }

  const assignedLabel = conversation.assignedToUserName || "Unassigned";

  return (
    <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 min-w-[260px] flex flex-col">
      {/* Header: avatar + name + phone */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-semibold text-white">
          {conversation.contactName?.[0] || "?"}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {conversation.contactName || "Unknown contact"}
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            <Phone size={12} /> {conversation.contactPhone || "-"}
          </div>
        </div>
      </div>

      {/* Body sections */}
      <div className="mt-3 space-y-4 text-[11px] text-gray-600 flex-1 overflow-y-auto pr-1">
        {/* Conversation status / meta */}
        <div>
          <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1">
            <MessageSquare size={12} /> Conversation
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span>Status</span>
            <span className="font-medium">{conversation.status || "-"}</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span>Assigned to</span>
            <span className="font-medium">{assignedLabel}</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span>Mode</span>
            <span className="font-medium flex items-center gap-1">
              <Bot
                size={12}
                className={
                  conversation.mode === "automation"
                    ? "text-emerald-600"
                    : "text-gray-500"
                }
              />
              {modeLabel}
            </span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span>24h window</span>
            <span
              className={
                "font-medium " +
                (conversation.within24h ? "text-emerald-600" : "text-amber-600")
              }
            >
              {conversation.within24h ? "Active" : "Expired"}
            </span>
          </div>

          <div className="space-y-1 mt-1">
            <div className="flex items-center justify-between">
              <span>First seen</span>
              <span className="font-medium">
                {formatDateTime(conversation.firstSeenAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total messages</span>
              <span className="font-medium">
                {conversation.totalMessages ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last agent reply</span>
              <span className="font-medium">
                {formatDateTime(conversation.lastAgentReplyAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last automation</span>
              <span className="font-medium">
                {formatDateTime(conversation.lastAutomationAt)}
              </span>
            </div>
          </div>

          {/* Source line */}
          <p className="mt-2 text-[11px] text-gray-500">{sourceLine}</p>
        </div>

        {/* Recent activity (Timeline preview) */}
        <div>
          <RecentActivityTimeline contactId={conversation.contactId} />
        </div>

        {/* Tags / labels */}
        <div>
          <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1">
            <Tag size={12} /> Labels
          </div>
          <div className="flex flex-wrap gap-1">
            {fakeTags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] cursor-pointer hover:bg-emerald-100"
                title="Later: click to filter / view timeline by this tag"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Footer placeholder – later quick actions like 'Open contact', 'View full CRM' */}
      <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400">
        More contact insights (tags, notes, campaigns, full timeline) will
        appear here.
      </div>
    </div>
  );
}
