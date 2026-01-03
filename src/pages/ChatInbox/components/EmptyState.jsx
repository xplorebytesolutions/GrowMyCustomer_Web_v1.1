// 📄 src/pages/ChatInbox/components/EmptyState.jsx
import React from "react";
import { MessageCircle } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <MessageCircle className="text-emerald-600" size={24} />
      </div>
      <h2 className="text-sm font-semibold text-gray-800 mb-1">
        Select a conversation to start chatting
      </h2>
      <p className="text-xs text-gray-500 max-w-xs">
        When customers message your WhatsApp numbers, they’ll appear here.
        Assign chats to agents, manage automations, and reply within the 24-hour
        service window.
      </p>
    </div>
  );
}
