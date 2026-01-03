import React from "react";
import {
  Clock,
  CheckCircle2,
  MessageCircle,
  Mail,
  User,
  Smile,
  Paperclip,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
// import { useAuth } from "../../../app/providers/AuthProvider";
// import { FK } from "../../../capabilities/featureKeys";

import { useAuth } from "../../../app/providers/AuthProvider";
import { FK } from "../../../capabilities/featureKeys";
import { StatusIcon } from "./shared/StatusIcon";
import { ComposerTabs } from "./ComposerTabs";
import EmojiPicker from "./EmojiPicker";
import { formatDateTime, getInitial } from "../utils/formatters";

export function MiddlePanel({
  selectedConversation,
  messages,
  messagesEndRef,
  messagesWithSeparators,
  messagesHasMore,
  newMessage,
  setNewMessage,
  isSending,
  handleSendMessage,
  handleComposerKeyDown,
  headerIsAssigned,
  headerIsAssignedToMe,
  headerAssignedName,
  isWithin24h,
  normalizedStatus,
  statusPillClass,
  agents,
  isAgentsLoading,
  currentUserId,
  isAssigning,
  handleAssignToMe,
  handleAssignToAgent,
  handleUnassign,
  isUpdatingStatus,
  handleUpdateConversationStatus,
  isMessagesLoading,
  isMessagesLoadingOlder,
  onLoadOlderMessages,
  isConversationClosed,
  showRightPanel,
  setShowRightPanel,
  assigneeMenuOpen,
  setAssigneeMenuOpen,
  statusMenuOpen,
  setStatusMenuOpen,
}) {
  const messagesScrollRef = React.useRef(null);
  const composerRef = React.useRef(null);
  const [openTab, setOpenTab] = React.useState(null);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const textareaRef = React.useRef(null);

  const { hasAllAccess, role, can } = useAuth() || {};
  const roleLower = String(role || "").toLowerCase();
  const isPrivilegedRole =
    ["admin", "superadmin", "business", "partner"].includes(roleLower) ||
    Boolean(hasAllAccess);
  const canAssignOthers = Boolean(
    isPrivilegedRole || (typeof can === "function" && can(FK.INBOX_CHAT_ASSIGN))
  );

  // const otherAgents = React.useMemo(() => {
  //   return (agents ?? []).filter(a =>
  //     currentUserId ? String(a.userId) !== String(currentUserId) : true
  //   );
  // }, [agents, currentUserId]);
  const otherAgents = React.useMemo(() => {
    const list = agents ?? [];

    const isBusinessOwner = a => {
      // Prefer an explicit flag if your API provides it
      const flag =
        a?.isBusinessOwner ??
        a?.IsBusinessOwner ??
        a?.isOwner ??
        a?.IsOwner ??
        false;

      if (flag) return true;

      // Fallback to roleName/roleCode (your agents mapper includes roleName)
      const role = String(a?.roleName ?? a?.roleCode ?? a?.role ?? "")
        .toLowerCase()
        .trim();
      return (
        role === "business" ||
        role === "businessowner" ||
        role === "business owner" ||
        role === "owner"
      );
    };

    return list
      .filter(a =>
        currentUserId ? String(a.userId) !== String(currentUserId) : true
      )
      .filter(a => !isBusinessOwner(a));
  }, [agents, currentUserId]);

  const handleLoadOlderMessages = React.useCallback(async () => {
    const el = messagesScrollRef.current;
    if (!el || typeof onLoadOlderMessages !== "function") {
      await onLoadOlderMessages?.();
      return;
    }

    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    await onLoadOlderMessages();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const current = messagesScrollRef.current;
        if (!current) return;
        const newScrollHeight = current.scrollHeight;
        current.scrollTop =
          prevScrollTop + (newScrollHeight - prevScrollHeight);
      });
    });
  }, [onLoadOlderMessages]);

  const isComposerDisabled =
    !selectedConversation || isConversationClosed || !isWithin24h || isSending;

  const insertAtCursor = React.useCallback(
    snippet => {
      const el = textareaRef.current;
      if (!el) {
        setNewMessage(prev => (prev ? `${prev}${snippet}` : snippet));
        return;
      }
      const start = el.selectionStart ?? (newMessage?.length ?? 0);
      const end = el.selectionEnd ?? (newMessage?.length ?? 0);
      const base = newMessage ?? "";
      const next = base.slice(0, start) + snippet + base.slice(end);
      setNewMessage(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + snippet.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [newMessage, setNewMessage]
  );

  const handleTextareaKeyDown = e => {
    if (e.key === "Escape" && emojiOpen) {
      e.preventDefault();
      e.stopPropagation();
      setEmojiOpen(false);
      return;
    }

    if (
      !isComposerDisabled &&
      e.key === "/" &&
      !e.shiftKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      const msg = newMessage ?? "";
      const start = e.currentTarget?.selectionStart ?? msg.length;
      const end = e.currentTarget?.selectionEnd ?? msg.length;
      const cursorAtStart = start === 0 && end === 0;
      const messageEmpty = msg.length === 0;

      if (messageEmpty || cursorAtStart) {
        e.preventDefault();
        setEmojiOpen(false);
        setOpenTab("quickReply");
        return;
      }
    }

    handleComposerKeyDown?.(e);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-4">
        {selectedConversation ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
                {getInitial(
                  selectedConversation.contactName,
                  selectedConversation.contactPhone
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedConversation.contactName ||
                      selectedConversation.contactPhone}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedConversation.contactPhone}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedConversation.lastInboundAt
                      ? formatDateTime(selectedConversation.lastInboundAt)
                      : "Last inbound: -"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-[1px] rounded-full text-[10px] border ${
                      isWithin24h
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {isWithin24h ? "Within 24h" : "Outside 24h"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {selectedConversation.sourceName || "WhatsApp"}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {selectedConversation.mode || "Live"}
              </span>

              <div className="relative ml-2">
                <button
                  type="button"
                  aria-label="Assignee"
                  onClick={() => {
                    setStatusMenuOpen(false);
                    setAssigneeMenuOpen(v => !v);
                  }}
                  disabled={isAssigning}
                  className={`inline-flex items-center gap-1 rounded-full border bg-white px-3 py-[3px] text-[11px] ${
                    isAssigning
                      ? "border-slate-200 text-slate-400 cursor-wait"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <User className="w-3 h-3" />
                  {headerIsAssigned
                    ? headerIsAssignedToMe
                      ? "You"
                      : headerAssignedName || "Agent"
                    : "Unassigned"}
                  <ChevronDown className="w-3 h-3" />
                </button>

                {assigneeMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close assignee menu"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setAssigneeMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
                      <div className="px-3 py-2 text-[10px] text-slate-500 border-b border-slate-100">
                        Agent List
                      </div>

                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => {
                          setAssigneeMenuOpen(false);
                          handleAssignToMe();
                        }}
                        disabled={!currentUserId || headerIsAssignedToMe}
                      >
                        Assign to me
                      </button>

                      <div className="max-h-56 overflow-y-auto">
                        {canAssignOthers ? (
                          <>
                            {isAgentsLoading && (
                              <div className="px-3 py-2 text-[11px] text-slate-400">
                                Loading agents...
                              </div>
                            )}

                            {!isAgentsLoading &&
                              otherAgents.map(a => (
                                <button
                                  key={a.userId}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50"
                                  onClick={() => {
                                    setAssigneeMenuOpen(false);
                                    handleAssignToAgent(a.userId);
                                  }}
                                >
                                  Assign to {a.name}
                                  {a.roleName ? (
                                    <span className="ml-1 text-[10px] text-slate-400">
                                      ({a.roleName})
                                    </span>
                                  ) : null}
                                </button>
                              ))}

                            {!isAgentsLoading && otherAgents.length === 0 && (
                              <div className="px-3 py-2 text-[11px] text-slate-400">
                                No other agents found.
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-2 text-[11px] text-slate-500">
                            You can only assign to yourself. Ask an admin to
                            reassign.
                          </div>
                        )}
                      </div>

                      {headerIsAssigned &&
                        (headerIsAssignedToMe || canAssignOthers) && (
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-[11px] text-rose-700 hover:bg-rose-50 border-t border-slate-100 disabled:opacity-50"
                            onClick={() => {
                              setAssigneeMenuOpen(false);
                              handleUnassign();
                            }}
                            disabled={isAssigning}
                          >
                            Unassign
                          </button>
                        )}
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Status"
                  onClick={() => {
                    if (!headerIsAssignedToMe) return;
                    setAssigneeMenuOpen(false);
                    setStatusMenuOpen(v => !v);
                  }}
                  disabled={!headerIsAssignedToMe || isUpdatingStatus}
                  title={
                    headerIsAssignedToMe
                      ? "Update status"
                      : "Assign to yourself to update status"
                  }
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-[3px] text-[11px] ${
                    !headerIsAssignedToMe || isUpdatingStatus
                      ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                      : `${statusPillClass} hover:opacity-90`
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {normalizedStatus}
                  <ChevronDown className="w-3 h-3" />
                </button>

                {statusMenuOpen && headerIsAssignedToMe && (
                  <>
                    <button
                      type="button"
                      aria-label="Close status menu"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setStatusMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
                      {["Open", "Pending", "Closed"].map(s => (
                        <button
                          key={s}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 ${
                            s === "Closed"
                              ? "text-rose-700"
                              : s === "Pending"
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                          onClick={() => {
                            setStatusMenuOpen(false);
                            handleUpdateConversationStatus(s);
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowRightPanel(v => !v)}
                aria-label={
                  showRightPanel ? "Hide details panel" : "Show details panel"
                }
                title={showRightPanel ? "Hide details" : "Show details"}
                className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-emerald-600 hover:bg-slate-50 hover:text-emerald-700"
              >
                {showRightPanel ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-400">
            Select a conversation to start chatting.
          </div>
        )}
      </div>

      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto bg-slate-50 px-4 py-3"
      >
        {!selectedConversation && (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No conversation selected.
          </div>
        )}

        {selectedConversation && (
          <div className="flex flex-col gap-2 text-xs">
            {messagesHasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadOlderMessages}
                  disabled={isMessagesLoadingOlder}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                    isMessagesLoadingOlder
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-wait"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {isMessagesLoadingOlder
                    ? "Loading older..."
                    : "Load older messages"}
                </button>
              </div>
            )}

            {isMessagesLoading && (
              <div className="text-slate-400">Loading messages...</div>
            )}

            {!isMessagesLoading && messages.length === 0 && (
              <div className="text-slate-400 italic">
                No messages yet for this contact.
              </div>
            )}

            {!isMessagesLoading &&
              messagesWithSeparators.length > 0 &&
              messagesWithSeparators.map(item => {
                if (item.type === "separator") {
                  return (
                    <div key={item.id} className="flex justify-center my-2">
                      <span className="px-3 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                const msg = item;
                const isInbound = !!msg.isInbound;
                const key = String(
                  msg.id ??
                    msg.messageLogId ??
                    msg.serverId ??
                    msg.messageId ??
                    msg.providerMessageId ??
                    msg.clientMessageId ??
                    `${msg.sentAt ?? "unknown"}-${
                      isInbound ? "in" : "out"
                    }-${String(msg.text ?? "").slice(0, 32)}`
                );

                return (
                  <div
                    key={key}
                    className={`flex ${
                      isInbound ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`relative max-w-[70%] px-3 py-2 pb-4 shadow-md ${
                        isInbound
                          ? "bg-white text-slate-900 border border-slate-200/70 rounded-xl rounded-tl-sm"
                          : "bg-[#117957] text-white border border-emerald-950/20 rounded-xl rounded-tr-sm"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute top-2 w-3 h-3 rotate-45 ${
                          isInbound
                            ? "left-[-5px] bg-white border-l border-b border-slate-200/70"
                            : "right-[-5px] bg-[#117957] border-r border-t border-emerald-950/20"
                        }`}
                      />
                      <div
                        className={`whitespace-pre-wrap break-words ${
                          isInbound ? "pr-8" : "pr-12"
                        }`}
                      >
                        {msg.text || "-"}
                      </div>
                      <div
                        className={`absolute bottom-[2px] right-2 text-[10px] leading-none flex items-center gap-0.5 ${
                          isInbound ? "text-slate-500" : "text-white/70"
                        }`}
                      >
                        {msg.sentAt &&
                          new Date(msg.sentAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}

                        {!msg.isInbound && (
                          <StatusIcon status={msg.status} variant="onDark" />
                        )}
                      </div>

                      {msg.errorMessage && (
                        <div className="mt-0.5 text-[10px] text-rose-200">
                          {msg.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3">
        {selectedConversation && isConversationClosed && (
          <div className="text-[11px] text-rose-600 mb-2">
            This conversation is <span className="font-semibold">closed</span>.
            Reopen it to send a reply.
          </div>
        )}

        {selectedConversation && !isConversationClosed && !isWithin24h && (
          <div className="text-[11px] text-amber-600 mb-2">
            This conversation is <span className="font-semibold">outside</span>{" "}
            the 24-hour WhatsApp window. Free-form replies are disabled here.
            Use approved templates (campaigns / flows) to re-engage.
          </div>
        )}

        <div ref={composerRef} className="relative space-y-2">
          <ComposerTabs
            openTab={openTab}
            setOpenTab={setOpenTab}
            composerRef={composerRef}
            onQuickReplyInsert={text => {
              insertAtCursor(text);
            }}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEmojiOpen(false);
                setOpenTab(prev => (prev === "quickReply" ? null : "quickReply"));
              }}
              disabled={isComposerDisabled}
              className={`h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium ${
                isComposerDisabled
                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              title="Quick replies"
            >
              <Zap className="w-4 h-4" />
              Quick reply
            </button>

            <div className="relative">
              <button
                type="button"
                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border ${
                  isComposerDisabled
                    ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                }`}
                title="Emoji"
                disabled={isComposerDisabled}
                aria-expanded={emojiOpen}
                onClick={() => {
                  setOpenTab(null);
                  setEmojiOpen(v => !v);
                }}
              >
                <Smile className="w-4 h-4" />
              </button>

              {emojiOpen && !isComposerDisabled && (
                <div className="absolute left-0 bottom-full mb-2 z-50">
                  <EmojiPicker
                    onPick={emoji => {
                      insertAtCursor(emoji);
                      setEmojiOpen(false);
                    }}
                    onClose={() => setEmojiOpen(false)}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              title="Attach (coming soon)"
              disabled
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={
                selectedConversation
                  ? isConversationClosed
                    ? "Conversation is closed."
                    : isWithin24h
                    ? "Type a reply."
                    : "24h window expired - send via template campaign."
                  : "Select a conversation first."
              }
              disabled={
                !selectedConversation ||
                isConversationClosed ||
                !isWithin24h ||
                isSending
              }
              className={`flex-1 resize-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 ${
                !selectedConversation || isConversationClosed || !isWithin24h
                  ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                  : "bg-white"
              }`}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={
                isSending ||
                !newMessage.trim() ||
                !selectedConversation ||
                isConversationClosed ||
                !isWithin24h
              }
              className={`bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm ${
                isSending ||
                !newMessage.trim() ||
                !selectedConversation ||
                isConversationClosed ||
                !isWithin24h
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-emerald-700"
              }`}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
