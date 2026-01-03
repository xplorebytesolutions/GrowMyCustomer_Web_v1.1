// 📄 src/pages/ChatInbox/components/ConversationList.jsx
import React from "react";
import { Search, Filter, Clock } from "lucide-react";

export function ConversationList({
  activeTab,
  onTabChange,
  tabCounts,
  numbers,
  selectedNumberId,
  onNumberChange,
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchTerm,
  onSearchChange,
}) {
  const renderTab = (key, label, count) => {
    const isActive = activeTab === key;
    return (
      <button
        key={key}
        onClick={() => onTabChange(key)}
        className={
          "px-3 py-1.5 rounded-full text-xs font-medium mr-2 transition " +
          (isActive
            ? "bg-white shadow text-emerald-700"
            : "bg-emerald-50 text-emerald-700/70 hover:bg-white")
        }
      >
        {label}
        {typeof count === "number" && (
          <span className="ml-1 text-[10px] text-gray-500">({count})</span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col w-72 bg-white rounded-2xl shadow-sm border border-gray-200 min-w-[260px]">
      {/* Tabs */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-50 flex items-center justify-between">
        <div>
          {renderTab("live", "Live", tabCounts.live)}
          {renderTab("history", "History", tabCounts.history)}
          {renderTab("unassigned", "Unassigned", tabCounts.unassigned)}
          {renderTab("my", "My chats", tabCounts.my)}
        </div>
      </div>

      {/* Search + filter */}
      <div className="px-3 pt-2 pb-2 border-b border-gray-50 space-y-2">
        <div className="flex items-center bg-gray-50 rounded-full px-3 py-1.5 text-xs">
          <Search size={14} className="text-gray-400 mr-2" />
          <input
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="bg-transparent flex-1 outline-none text-xs text-gray-700 placeholder:text-gray-400"
            placeholder="Search name or phone"
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center text-gray-500">
            <Filter size={13} className="mr-1" />
            Number
          </div>
          <select
            value={selectedNumberId}
            onChange={e => onNumberChange(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-full px-2 py-1 bg-white"
          >
            <option value="all">All numbers</option>
            {numbers.map(n => (
              <option key={n.id} value={n.id}>
                {n.label} ({n.displayPhoneNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-gray-400 px-3 text-center">
            No conversations in this view yet.
          </div>
        ) : (
          conversations.map(conv => {
            const isSelected = conv.id === selectedConversationId;
            const isOutOfWindow = !conv.within24h;
            const isAssigned = !!(
              conv.assignedToUserId || conv.assignedToUserName
            );

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={
                  "w-full text-left px-3 py-2.5 border-b border-gray-50 flex gap-2 items-start text-xs transition " +
                  (isSelected ? "bg-emerald-50/70" : "hover:bg-gray-50/80") +
                  (isOutOfWindow ? " opacity-80" : "")
                }
              >
                {/* Avatar */}
                <div className="mt-0.5">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-[11px] font-semibold text-white">
                    {conv.contactName?.[0] || "?"}
                  </div>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="truncate font-semibold text-gray-900 text-xs">
                      {conv.contactName}
                    </div>
                    <div className="text-[10px] text-gray-400 ml-2">
                      {new Date(conv.lastMessageAt).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {conv.contactPhone}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {conv.lastMessagePreview}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      {/* Line badge */}
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600">
                        {conv.numberLabel}
                      </span>
                      {/* Status */}
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] text-emerald-700">
                        {conv.status}
                      </span>
                      {/* Out-of-window icon */}
                      {isOutOfWindow && (
                        <span
                          title="24h window expired"
                          className="inline-flex items-center text-[10px] text-amber-600"
                        >
                          <Clock size={11} className="mr-1" />
                          24h over
                        </span>
                      )}
                    </div>

                    {/* Unread + agent chip */}
                    <div className="flex items-center gap-1">
                      {conv.unreadCount > 0 && (
                        <span className="h-5 min-w-[18px] px-1 rounded-full bg-emerald-500 text-[10px] text-white flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                      {isAssigned && (
                        <div
                          title={
                            conv.isAssignedToMe
                              ? "Assigned to you"
                              : `Assigned to ${conv.assignedToUserName}`
                          }
                          className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-600"
                        >
                          {(conv.assignedToUserName || "U")[0]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
