import React from "react";
import { Phone, Filter, Search, ChevronDown, Activity } from "lucide-react";
import { ConversationRow } from "./ConversationRow";

const MOCK_NUMBERS = [
  { id: "all", label: "All numbers" },
  { id: "wa-1", label: "+91 98765 43210" },
  { id: "wa-2", label: "+91 99887 77665" },
];

const TABS = [
  { id: "live", label: "Live" },
  { id: "unassigned", label: "Unassigned" },
  { id: "my", label: "My" },
  { id: "closed", label: "Closed" },
  { id: "history", label: "History" },
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
  return (
    <div className="w-[360px] border-r border-slate-200 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">
            Chat Inbox
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500">
            <Activity
              className={`w-3 h-3 ${
                isConnected ? "text-emerald-500" : "text-slate-400"
              }`}
            />
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <select
              value={selectedNumberId}
              onChange={e => setSelectedNumberId(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-xs rounded-full pl-3 pr-7 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {MOCK_NUMBERS.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-full px-2">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <input
              type="text"
              placeholder="Search name, number, message..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
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
    </div>
  );
}
