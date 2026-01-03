// 📄 src/pages/ChatInbox/components/MessageComposer.jsx
import React, { useState } from "react";
import { Paperclip, SmilePlus, Send, FileText } from "lucide-react";

export function MessageComposer({ canSendFreeForm, onSend, onSendTemplate }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!canSendFreeForm) return;
    if (!text.trim()) return;
    onSend?.(text.trim());
    setText("");
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateClick = () => {
    // Later: open template picker drawer / modal
    onSendTemplate?.();
  };

  return (
    <div className="border-t border-gray-100 bg-white px-4 py-3 space-y-2">
      {!canSendFreeForm && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          The 24-hour service window has expired. You can only reply using
          approved templates. Sending a template may be chargeable as per
          WhatsApp pricing.
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Left: attachment + emoji */}
        <button
          type="button"
          className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <Paperclip size={16} />
        </button>

        <button
          type="button"
          className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <SmilePlus size={16} />
        </button>

        {/* Middle: input */}
        <div className="flex-1">
          <textarea
            rows={1}
            className="w-full resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder={
              canSendFreeForm
                ? "Type a reply..."
                : "Free-form reply disabled, use a template."
            }
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canSendFreeForm}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          className="h-9 px-3 inline-flex items-center justify-center rounded-2xl bg-emerald-600 text-white text-[13px] font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={!canSendFreeForm || !text.trim()}
        >
          <Send size={16} className="mr-1" />
          Send
        </button>

        {/* Template button – always enabled */}
        <button
          type="button"
          onClick={handleTemplateClick}
          className="h-9 px-3 inline-flex items-center justify-center rounded-2xl border border-emerald-200 text-[13px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        >
          <FileText size={16} className="mr-1" />
          Template
        </button>
      </div>
    </div>
  );
}
