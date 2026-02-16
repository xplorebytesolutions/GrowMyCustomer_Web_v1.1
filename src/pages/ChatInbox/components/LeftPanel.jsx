import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Filter, Search, ChevronDown, Activity, X } from "lucide-react";
import { ConversationRow } from "./ConversationRow";
import { Tooltip } from "react-tooltip";

const MOCK_NUMBERS = [
  { id: "all", label: "All numbers" },
  { id: "wa-1", label: "+91 98765 43210" },
  { id: "wa-2", label: "+91 99887 77665" },
];

const TABS = [
  {
    id: "live",
    label: "Live",
    title: "Open conversations with inbound activity in the last 24 hours.",
  },
  {
    id: "unassigned",
    label: "Unassigned",
    title: "Open conversations not assigned to any agent.",
  },
  { id: "my", label: "My", title: "Open conversations assigned to you." },
  {
    id: "closed",
    label: "Closed",
    title: "Conversations marked as Closed, Archived, or Inactive.",
  },
  {
    id: "history",
    label: "History",
    title: "Open conversations with no activity in the last 24 hours.",
  },
];

export function LeftPanel({
  activeTab,
  setActiveTab,
  selectedNumberId,
  setSelectedNumberId,
  searchTerm,
  setSearchTerm,
  filteredConversations,
  isLoading,
  conversationsHasMore,
  isConversationsLoadingMore,
  onLoadMoreConversations,
  selectedConversationId,
  setSelectedConversationId,
  isConnected,
}) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleCloseSearch = () => {
    setIsSearchExpanded(false);
    setSearchTerm("");
  };

  return (
    <div className="w-[360px] border-r border-slate-200 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          <span className="text-lg font-semibold text-slate-800">
            Chat Inbox
          </span>
        </div>

        <div className="flex gap-2 items-center h-8">
          {!isSearchExpanded ? (
            <>
              <div className="relative flex-1">
                <select
                  value={selectedNumberId}
                  onChange={e => setSelectedNumberId(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs rounded-full pl-3 pr-7 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {MOCK_NUMBERS.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                title="Search conversations"
              >
                <Search className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-700 focus:outline-none p-0"
                />
              </div>
              <button
                type="button"
                onClick={handleCloseSearch}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              data-tooltip-id="chat-tab-tooltip"
              data-tooltip-content={tab.title}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-emerald-600"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
          >
            <Filter className="w-3 h-3" />
            More
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto bg-slate-50">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-slate-50/70 backdrop-blur-[1px] flex justify-center pt-6">
            <div className="text-xs text-slate-500">Loading chats...</div>
          </div>
        )}

        {!isLoading && filteredConversations.length === 0 && (
          <div className="p-4 text-xs text-slate-400 italic">
            No conversations found for this filter.
          </div>
        )}

        {filteredConversations.map(conv => (
          <ConversationRow
            key={conv.id}
            conv={conv}
            isSelected={selectedConversationId === conv.id}
            onClick={() => setSelectedConversationId(conv.id)}
          />
        ))}

        {conversationsHasMore && (
          <div className="p-3 flex justify-center">
            <button
              type="button"
              onClick={onLoadMoreConversations}
              disabled={isConversationsLoadingMore}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                isConversationsLoadingMore
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-wait"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {isConversationsLoadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Global Tooltip for Tabs */}
      <Tooltip
        id="chat-tab-tooltip"
        place="bottom-start"
        noArrow={false}
        style={{
          backgroundColor: "#1e293b", // slate-800
          color: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          padding: "8px 12px",
          fontSize: "12px",
          fontWeight: "500",
          opacity: 1,
          zIndex: 60,
        }}
      />
    </div>
  );
}
