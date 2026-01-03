// 📄 src/pages/ChatInbox/components/ChatHeader.jsx
import React from "react";
import {
  Phone,
  MoreVertical,
  ShieldCheck,
  UserCheck,
  Bot,
  User,
  Clock,
} from "lucide-react";

export function ChatHeader({ conversation, onAssignToMe, onToggleMode }) {
  if (!conversation) return null;

  const isUnassigned =
    !conversation.assignedToUserId && !conversation.assignedToUserName;
  const isAssignedToMe = conversation.isAssignedToMe;
  const isAutomation = conversation.mode === "automation";
  const within24h = conversation.within24h;

  return (
    <div className="border-b border-gray-100 px-4 py-3 flex flex-col gap-2">
      {/* Top row: contact name + channel badge + phone */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {conversation.contactName}
            </h2>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              WhatsApp
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
            <span className="inline-flex items-center gap-1 truncate">
              <Phone size={12} /> {conversation.contactPhone}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <ShieldCheck size={12} />
              Customer
            </span>
          </div>
        </div>

        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Second row: grouped chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
        {/* Group 1: channel & line */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-700 border border-gray-100">
            <Bot size={12} className="mr-1 text-gray-500" />
            WhatsApp line
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
            {conversation.numberLabel || "Default line"}
          </span>
        </div>

        {/* Group 2: assignment + mode */}
        <div className="flex items-center gap-3">
          {/* Assignment chip + button */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
              <UserCheck size={12} className="mr-1 text-gray-500" />
              {isUnassigned
                ? "Unassigned"
                : isAssignedToMe
                ? "Assigned to you"
                : `Assigned to: ${conversation.assignedToUserName}`}
            </span>

            {isUnassigned && (
              <button
                type="button"
                onClick={onAssignToMe}
                className="inline-flex items-center rounded-full bg-emerald-500 text-white px-3 py-1 text-[11px] font-medium hover:bg-emerald-600"
              >
                <User size={12} className="mr-1" />
                Assign to me
              </button>
            )}
          </div>

          {/* Mode pill + toggle */}
          <div className="flex items-center gap-2">
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border " +
                (isAutomation
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-emerald-600 text-white border-emerald-600")
              }
            >
              {isAutomation ? (
                <>
                  <Bot size={12} className="mr-1" /> Automation
                </>
              ) : (
                <>
                  <User size={12} className="mr-1" /> Agent
                </>
              )}
            </span>

            <button
              type="button"
              onClick={onToggleMode}
              className="inline-flex items-center text-[11px] text-emerald-600 hover:text-emerald-700 underline-offset-2 hover:underline"
            >
              {isAutomation ? (
                <>Take over as agent</>
              ) : (
                <>Return to automation</>
              )}
            </button>
          </div>
        </div>

        {/* Group 3: 24h service window */}
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border " +
              (within24h
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-amber-50 text-amber-700 border-amber-200")
            }
          >
            <Clock
              size={12}
              className={
                within24h ? "mr-1 text-emerald-500" : "mr-1 text-amber-500"
              }
            />
            {within24h
              ? "Within 24h service window"
              : "24h service window expired"}
          </span>
        </div>
      </div>
    </div>
  );
}
