// 📄 src/pages/ChatInbox/hooks/useLeadTimelinePreview.js

import { useState, useEffect, useCallback } from "react";
import axiosClient from "../api/chatInboxApi";
import { toast } from "react-toastify";

/**
 * Small hook to fetch a limited number of recent timeline events
 * for a given contact.
 *
 * This reuses the existing CRM Timeline API:
 *   GET /leadtimeline/contact/{contactId}
 *
 * We keep it Inbox-specific for now (preview only),
 * but we can later promote it to a shared hook if needed.
 *
 * @param {string | null | undefined} contactId
 * @param {{ limit?: number, enabled?: boolean }} options
 */
export function useLeadTimelinePreview(contactId, options = {}) {
  const { limit = 5, enabled = true } = options;

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!enabled) return;
    if (!contactId) {
      setEntries([]);
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.get(`/leadtimeline/contact/${contactId}`);

      const all = Array.isArray(res.data) ? res.data : [];
      // We keep only the latest N entries for the Inbox preview
      setEntries(all.slice(0, limit));
    } catch (error) {
      console.error("Failed to fetch lead timeline preview", error);
      toast.error("❌ Failed to load recent activity");
    } finally {
      setLoading(false);
    }
  }, [contactId, limit, enabled]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    entries,
    loading,
    reload: fetchTimeline,
  };
}
