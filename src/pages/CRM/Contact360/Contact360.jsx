// 📄 File: src/pages/CRM/Contact360/Contact360.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Tag,
  Bell,
  Activity,
  StickyNote,
  Clock,
  X,
} from "lucide-react";

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function Contact360() {
  const { contactId } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [tagsState, setTagsState] = useState([]);
  const [removingTagIds, setRemovingTagIds] = useState([]);

  useEffect(() => {
    if (!contactId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // 🔗 Same endpoint used by ChatInbox mini-panel
        const res = await axiosClient.get(`/crm/contact-summary/${contactId}`);
        const payload = res.data?.data ?? res.data;

        if (!cancelled) {
          setSummary(payload || null);
        }
      } catch (error) {
        console.error("❌ Failed to load contact 360 summary:", error);
        if (!cancelled) {
          setLoadError(
            error?.response?.data?.message ||
              "Failed to load contact 360 summary."
          );
          toast.error(
            error?.response?.data?.message ||
              "Failed to load contact 360 summary."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  // Safe fallbacks for fields (because we don’t fully trust backend shape yet)
  const contactName =
    summary?.name ||
    summary?.fullName ||
    summary?.contactName ||
    summary?.basic?.name ||
    "Unknown contact";

  const contactPhone =
    summary?.phone ||
    summary?.phoneNumber ||
    summary?.contactPhone ||
    summary?.basic?.phone ||
    "-";

  const contactEmail =
    summary?.email || summary?.contactEmail || summary?.basic?.email || null;

  const company =
    summary?.company || summary?.companyName || summary?.basic?.company || null;

  const leadSource =
    summary?.leadSource ||
    summary?.source ||
    summary?.basic?.leadSource ||
    null;

  const derivedTags = useMemo(() => {
    const list =
      summary?.tags ??
      summary?.contactTags ??
      summary?.contactTagsDto ??
      summary?.basic?.tags ??
      [];
    return Array.isArray(list) ? list : [];
  }, [summary]);

  useEffect(() => {
    setTagsState(derivedTags);
  }, [derivedTags]);

  const recentNotes = summary?.recentNotes ?? [];
  const nextReminder = summary?.nextReminder ?? null;
  const recentTimeline = summary?.recentTimeline ?? [];

  const handleRemoveTag = async tagId => {
    if (!tagId || !contactId) return;

    setRemovingTagIds(prev =>
      prev.includes(tagId) ? prev : [...prev, tagId]
    );

    try {
      await axiosClient.delete(`/contacts/${contactId}/tags/${tagId}`);
      setTagsState(prev =>
        prev.filter(t => (t.id || t.tagId) !== tagId)
      );
      toast.success("Tag removed.");
    } catch (error) {
      if (error?.response?.status === 404) {
        setTagsState(prev =>
          prev.filter(t => (t.id || t.tagId) !== tagId)
        );
        toast.info("Already removed.");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to remove tag."
        );
      }
    } finally {
      setRemovingTagIds(prev => prev.filter(id => id !== tagId));
    }
  };

  const stats = useMemo(() => {
    return {
      firstSeen: summary?.firstSeenAt || summary?.basic?.firstSeenAt || null,
      lastInbound:
        summary?.lastInboundAt || summary?.basic?.lastInboundAt || null,
      lastOutbound:
        summary?.lastOutboundAt || summary?.basic?.lastOutboundAt || null,
      totalMessages:
        summary?.totalMessages ?? summary?.metrics?.totalMessages ?? undefined,
      totalCampaigns:
        summary?.totalCampaigns ??
        summary?.metrics?.totalCampaigns ??
        undefined,
    };
  }, [summary]);

  return (
    <div className="h-full flex flex-col bg-[#f5f6f7]">
      {/* Header bar */}
      <div className="h-[60px] border-b border-slate-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
              {String(contactName).trim()[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {contactName}
                </span>
                {company && (
                  <span className="text-[11px] text-slate-500">
                    • {company}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {contactPhone}
                </span>
                {contactEmail && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {contactEmail}
                  </span>
                )}
                {leadSource && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Lead source: {leadSource}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Contact 360 • CRM Workspace
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Loading contact 360…
          </div>
        )}

        {!isLoading && loadError && (
          <div className="max-w-xl mx-auto bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg p-3">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && (
          <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4">
            {/* Left column: stats + tags */}
            <div className="col-span-1 space-y-3">
              {/* Stats */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800">
                    Interaction stats
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 rounded-md p-2">
                    <div className="text-slate-400">First seen</div>
                    <div className="font-medium">
                      {formatDateTime(stats.firstSeen)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-md p-2">
                    <div className="text-slate-400">Last inbound</div>
                    <div className="font-medium">
                      {formatDateTime(stats.lastInbound)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-md p-2">
                    <div className="text-slate-400">Last outbound</div>
                    <div className="font-medium">
                      {formatDateTime(stats.lastOutbound)}
                    </div>
                  </div>
                  {typeof stats.totalMessages === "number" && (
                    <div className="bg-slate-50 rounded-md p-2">
                      <div className="text-slate-400">Total messages</div>
                      <div className="font-medium">{stats.totalMessages}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-800">
                      Tags
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tagsState && tagsState.length > 0 ? (
                    tagsState.map((t, index) => {
                      const tagId = t.id || t.tagId;
                      const isRemoving = removingTagIds.includes(tagId);
                      return (
                        <span
                          key={t.id || t.tagId || index}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-medium border border-slate-200"
                          style={{
                            backgroundColor: t.colorHex || "#EEF2FF",
                          }}
                        >
                          {t.tagName || t.name || "Tag"}
                          {tagId && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tagId)}
                              disabled={isRemoving}
                              className="ml-1 text-slate-500 hover:text-slate-700 disabled:opacity-50"
                              aria-label="Remove tag"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      No tags yet. Use CRM &gt; Tags to segment this contact.
                    </span>
                  )}
                </div>
              </div>

              {/* Next reminder */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800">
                    Next reminder
                  </span>
                </div>
                {nextReminder ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-md p-2 text-[11px] text-amber-900">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {nextReminder.title}
                      </span>
                      <span className="text-[10px]">
                        {formatDateTime(nextReminder.dueAt)}
                      </span>
                    </div>
                    {nextReminder.description && (
                      <div className="mt-0.5">{nextReminder.description}</div>
                    )}
                    {nextReminder.status && (
                      <div className="mt-0.5 text-[10px]">
                        Status: {nextReminder.status}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    No upcoming reminder. Use CRM &gt; Reminders to schedule a
                    follow-up.
                  </span>
                )}
              </div>
            </div>

            {/* Right columns: notes + timeline */}
            <div className="col-span-2 space-y-3">
              {/* Recent notes */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-800">
                      Recent notes
                    </span>
                  </div>
                </div>
                {recentNotes && recentNotes.length > 0 ? (
                  <div className="space-y-1.5">
                    {recentNotes.map(note => (
                      <div
                        key={note.id}
                        className="bg-slate-50 border border-slate-100 rounded-md p-2 text-[11px]"
                      >
                        <div className="text-slate-800">
                          {note.content || note.text || "(no content)"}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400 flex justify-between">
                          <span>
                            {note.createdByName || note.createdBy || "Agent"}
                          </span>
                          <span>
                            {note.createdAt
                              ? new Date(note.createdAt).toLocaleString()
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    No notes yet. Use CRM &gt; Notes to document this lead’s
                    context.
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-800">
                      Recent activity
                    </span>
                  </div>
                </div>
                {recentTimeline && recentTimeline.length > 0 ? (
                  <div className="space-y-1.5 text-[11px]">
                    {recentTimeline.map(event => (
                      <div key={event.id} className="flex gap-2 items-start">
                        <div className="mt-1 w-1 h-1 rounded-full bg-slate-400" />
                        <div className="flex-1">
                          <div className="text-slate-800">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    No timeline entries yet. Your future CTA flows, campaigns
                    and reminders will populate this stream.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
