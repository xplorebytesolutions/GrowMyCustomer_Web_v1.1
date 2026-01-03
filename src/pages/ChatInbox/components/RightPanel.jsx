import React from "react";
import {
  User,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Tag,
  Bell,
  Activity,
  StickyNote,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { formatDateTime } from "../utils/formatters";

export function RightPanel({
  selectedConversation,
  selectedContactId,
  contactSummary,
  isSummaryLoading,
  showRightPanel,
  setShowDetails,
  showCrmPanel,
  showDetails,
  tagsList,
  recentNotes,
  recentTimeline,
  nextReminder,
  handleOpenFullCrm,
  handleRemoveTag,
  removingTagId,
  setIsTagModalOpen,
  normalizedStatus,
  openDeleteConfirm,
  handleAddReminder,
  handleUpdateReminder,
  isSavingReminder,
  isUpdatingReminder,
  reminderTitle,
  setReminderTitle,
  reminderDueAt,
  setReminderDueAt,
  reminderDescription,
  setReminderDescription,
  editingReminderId,
  setEditingReminderId,
  editReminderTitle,
  setEditReminderTitle,
  editReminderDueAt,
  setEditReminderDueAt,
  editReminderDescription,
  setEditReminderDescription,
  handleAddNote,
  handleUpdateNote,
  isSavingNote,
  isUpdatingNote,
  noteDraft,
  setNoteDraft,
  editingNoteId,
  setEditingNoteId,
  editNoteContent,
  setEditNoteContent,
}) {
  const [showQuickReminderForm, setShowQuickReminderForm] =
    React.useState(false);
  const [showQuickNoteForm, setShowQuickNoteForm] = React.useState(false);
  const [activityExpanded, setActivityExpanded] = React.useState(false);

  if (!showRightPanel) return null;

  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
      <div className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-800">
            Contact & CRM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            {showDetails ? "Hide" : "Show"}
            {showDetails ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="p-4 text-xs text-slate-600 overflow-y-auto flex flex-col gap-3">
          {selectedConversation ? (
            <>
              <div>
                <div className="font-semibold text-slate-800 mb-0.5">
                  {selectedConversation.contactName ||
                    selectedConversation.contactPhone ||
                    "Unknown contact"}
                </div>
                <div className="text-slate-500">
                  {selectedConversation.contactPhone}
                </div>
                {contactSummary?.leadSource && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Lead source:{" "}
                    <span className="text-slate-600">
                      {contactSummary.leadSource}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 rounded-md p-2">
                  <div className="text-slate-400">First seen</div>
                  <div className="font-medium">
                    {formatDateTime(selectedConversation.firstSeenAt)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-md p-2">
                  <div className="text-slate-400">Last inbound</div>
                  <div className="font-medium">
                    {formatDateTime(selectedConversation.lastInboundAt)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-md p-2">
                  <div className="text-slate-400">Last outbound</div>
                  <div className="font-medium">
                    {formatDateTime(selectedConversation.lastOutboundAt)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-md p-2">
                  <div className="text-slate-400">Status</div>
                  <div className="font-medium">{normalizedStatus}</div>
                </div>
              </div>

              <div className="h-px bg-slate-200 my-2" />

              {isSummaryLoading && (
                <div className="text-[11px] text-slate-400">
                  Loading CRM data...
                </div>
              )}

              {!isSummaryLoading && !contactSummary && (
                <div className="text-[11px] text-slate-400 italic">
                  No CRM data yet. Add a note or reminder from the CRM workspace
                  to enrich this contact.
                </div>
              )}

              {!isSummaryLoading && contactSummary && (
                <>
                  <div className="order-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-[11px] text-slate-700">
                          Tags
                        </span>
                      </div>

                      {selectedContactId && (
                        <button
                          type="button"
                          onClick={() => setIsTagModalOpen(true)}
                          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          + Tag
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {tagsList.length > 0 ? (
                        tagsList.map((tag, index) => {
                          const tid = tag?.id || tag?.tagId || `idx-${index}`;
                          const label = tag?.tagName || tag?.name || "Tag";
                          const bg = tag?.colorHex || "#EEF2FF";
                          const isRemoving =
                            removingTagId === (tag?.id || tag?.tagId);

                          return (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-medium border border-slate-200"
                              style={{ backgroundColor: bg }}
                            >
                              <span>{label}</span>

                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                disabled={!!removingTagId}
                                className={`ml-0.5 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/70 p-[2px] ${
                                  removingTagId
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-white"
                                }`}
                                title="Remove tag"
                              >
                                <X className="h-3 w-3 text-slate-600" />
                              </button>

                              {isRemoving && (
                                <span className="ml-1 text-[9px] text-slate-500">
                                  removing...
                                </span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          No tags yet. Use{" "}
                          <span className="font-semibold">+ Tag</span> or full
                          CRM to add tags.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="order-3 pt-3 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Bell className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-[11px] text-slate-700">
                          Next reminder
                        </span>
                      </div>
                    </div>

                    {nextReminder ? (
                      <div className="group relative bg-amber-50 border border-amber-100 rounded-md p-2">
                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReminderId(nextReminder.id);
                              setEditReminderTitle(nextReminder.title || "");
                              const due = nextReminder.dueAt
                                ? new Date(nextReminder.dueAt)
                                : null;
                              const dueLocal = due
                                ? `${due.getFullYear()}-${String(
                                    due.getMonth() + 1
                                  ).padStart(2, "0")}-${String(
                                    due.getDate()
                                  ).padStart(2, "0")}T${String(
                                    due.getHours()
                                  ).padStart(2, "0")}:${String(
                                    due.getMinutes()
                                  ).padStart(2, "0")}`
                                : "";
                              setEditReminderDueAt(dueLocal);
                              setEditReminderDescription(
                                nextReminder.description || ""
                              );
                            }}
                            className="rounded-md border border-amber-200 bg-white/70 p-1 text-amber-700 hover:bg-white"
                            title="Edit reminder"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openDeleteConfirm("reminder", nextReminder)
                            }
                            className="rounded-md border border-amber-200 bg-white/70 p-1 text-rose-600 hover:bg-white"
                            title="Delete reminder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {editingReminderId === nextReminder.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editReminderTitle}
                              onChange={e =>
                                setEditReminderTitle(e.target.value)
                              }
                              className="w-full border border-amber-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <input
                              type="datetime-local"
                              value={editReminderDueAt}
                              onChange={e =>
                                setEditReminderDueAt(e.target.value)
                              }
                              className="w-full border border-amber-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <textarea
                              rows={2}
                              value={editReminderDescription}
                              onChange={e =>
                                setEditReminderDescription(e.target.value)
                              }
                              className="w-full border border-amber-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReminderId(null);
                                  setEditReminderTitle("");
                                  setEditReminderDueAt("");
                                  setEditReminderDescription("");
                                }}
                                disabled={isUpdatingReminder}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateReminder(nextReminder)
                                }
                                disabled={isUpdatingReminder}
                                className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {isUpdatingReminder ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-amber-800">
                                {nextReminder.title}
                              </span>
                              <span className="text-[10px] text-amber-700">
                                {formatDateTime(nextReminder.dueAt)}
                              </span>
                            </div>
                            {nextReminder.description && (
                              <div className="mt-0.5 text-[11px] text-amber-900">
                                {nextReminder.description}
                              </div>
                            )}
                            {nextReminder.status && (
                              <div className="mt-0.5 text-[10px] text-amber-700">
                                Status: {nextReminder.status}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        No upcoming reminder for this contact.
                      </span>
                    )}

                    {selectedContactId && (
                      <div className="mt-2">
                        {!showQuickReminderForm ? (
                          <button
                            type="button"
                            onClick={() => setShowQuickReminderForm(true)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            + Add reminder
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[11px] text-slate-500">
                                Quick reminder
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowQuickReminderForm(false);
                                  setReminderTitle("");
                                  setReminderDueAt("");
                                  setReminderDescription("");
                                }}
                                disabled={isSavingReminder}
                                className="text-[11px] text-slate-500 hover:text-slate-700 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                            <input
                              type="text"
                              value={reminderTitle}
                              onChange={e => setReminderTitle(e.target.value)}
                              placeholder="Reminder title"
                              className="w-full mb-1 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <input
                              type="datetime-local"
                              value={reminderDueAt}
                              onChange={e => setReminderDueAt(e.target.value)}
                              className="w-full mb-1 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <textarea
                              rows={2}
                              value={reminderDescription}
                              onChange={e =>
                                setReminderDescription(e.target.value)
                              }
                              placeholder="Optional description"
                              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={async () => {
                                  const result = handleAddReminder?.();
                                  if (
                                    result &&
                                    typeof result.then === "function"
                                  ) {
                                    try {
                                      await result;
                                      setShowQuickReminderForm(false);
                                    } catch {
                                      // Keep the form open if saving fails.
                                    }
                                    return;
                                  }
                                  setShowQuickReminderForm(false);
                                }}
                                disabled={
                                  isSavingReminder ||
                                  !reminderTitle.trim() ||
                                  !reminderDueAt
                                }
                                className={`px-2 py-[3px] rounded-md text-[11px] font-medium ${
                                  isSavingReminder ||
                                  !reminderTitle.trim() ||
                                  !reminderDueAt
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-amber-600 text-white hover:bg-amber-700"
                                }`}
                              >
                                {isSavingReminder
                                  ? "Saving..."
                                  : "Add reminder"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="order-2 pt-3 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <StickyNote className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-[11px] text-slate-700">
                          Recent notes
                        </span>
                      </div>
                    </div>

                    {recentNotes.length > 0 ? (
                      <div className="space-y-1.5">
                        {recentNotes.map(note => (
                          <div
                            key={note.id}
                            className="group relative bg-slate-50 border border-slate-100 rounded-md p-2"
                          >
                            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteContent(
                                    note.content || note.text || ""
                                  );
                                }}
                                className="rounded-md border border-slate-200 bg-white/70 p-1 text-slate-600 hover:bg-white"
                                title="Edit note"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm("note", note)}
                                className="rounded-md border border-slate-200 bg-white/70 p-1 text-rose-600 hover:bg-white"
                                title="Delete note"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {editingNoteId === note.id ? (
                              <div className="space-y-2">
                                <textarea
                                  rows={3}
                                  value={editNoteContent}
                                  onChange={e =>
                                    setEditNoteContent(e.target.value)
                                  }
                                  className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingNoteId(null);
                                      setEditNoteContent("");
                                    }}
                                    disabled={isUpdatingNote}
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateNote(note)}
                                    disabled={isUpdatingNote}
                                    className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    {isUpdatingNote ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-[11px] text-slate-700">
                                  {note.content || note.text || "(no content)"}
                                </div>
                                <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
                                  <span>
                                    {note.createdByName ||
                                      note.createdBy ||
                                      "Agent"}
                                  </span>
                                  <span>
                                    {note.createdAt
                                      ? new Date(
                                          note.createdAt
                                        ).toLocaleString()
                                      : ""}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        No notes yet.
                      </span>
                    )}

                    {selectedContactId && (
                      <div className="mt-2">
                        {!showQuickNoteForm ? (
                          <button
                            type="button"
                            onClick={() => setShowQuickNoteForm(true)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            + Add note
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[11px] text-slate-500">
                                Add a quick note
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowQuickNoteForm(false);
                                  setNoteDraft("");
                                }}
                                disabled={isSavingNote}
                                className="text-[11px] text-slate-500 hover:text-slate-700 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={noteDraft}
                              onChange={e => setNoteDraft(e.target.value)}
                              placeholder="Type an internal note about this contact"
                              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={async () => {
                                  const result = handleAddNote?.();
                                  if (
                                    result &&
                                    typeof result.then === "function"
                                  ) {
                                    try {
                                      await result;
                                      setShowQuickNoteForm(false);
                                    } catch {
                                      // Keep the form open if saving fails.
                                    }
                                    return;
                                  }
                                  setShowQuickNoteForm(false);
                                }}
                                disabled={isSavingNote || !noteDraft.trim()}
                                className={`px-2 py-[3px] rounded-md text-[11px] font-medium ${
                                  isSavingNote || !noteDraft.trim()
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                              >
                                {isSavingNote ? "Saving..." : "Add note"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="order-4 pt-3 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-[11px] text-slate-700">
                          Recent activity
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivityExpanded(v => !v)}
                        className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        aria-expanded={activityExpanded}
                        aria-label={
                          activityExpanded
                            ? "Collapse activity"
                            : "Expand activity"
                        }
                      >
                        {activityExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {activityExpanded ? (
                      recentTimeline.length > 0 ? (
                        <div className="space-y-1.5">
                          {recentTimeline.map(event => (
                            <div
                              key={event.id}
                              className="bg-slate-50 border border-slate-100 rounded-md p-2"
                            >
                              <div className="text-[11px] text-slate-700">
                                {event.title ||
                                  event.shortDescription ||
                                  event.description ||
                                  "Activity"}
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
                                <span>
                                  {event.source ||
                                    event.category ||
                                    event.eventType ||
                                    ""}
                                </span>
                                <span>
                                  {event.createdAt
                                    ? new Date(event.createdAt).toLocaleString()
                                    : ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          No recent activity logged yet.
                        </span>
                      )
                    ) : null}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-slate-400 italic">
              Select a conversation to see CRM info.
            </div>
          )}
        </div>
      )}

      {showCrmPanel && (
        <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500">
          This mini-CRM view uses your existing Contacts, Tags, Notes,
          Reminders, and Timeline data. Use{" "}
          {selectedContactId ? (
            <button
              type="button"
              onClick={handleOpenFullCrm}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-[2px] text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 align-middle"
            >
              <ExternalLink className="w-3 h-3" />
              Open full CRM
            </button>
          ) : (
            <span className="font-semibold text-slate-700">Open full CRM</span>
          )}{" "}
          for a 360 view.
        </div>
      )}
    </div>
  );
}
