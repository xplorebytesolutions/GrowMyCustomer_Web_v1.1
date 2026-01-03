import React from "react";
import axiosClient from "../../api/chatInboxApi";
import { toast } from "react-toastify";

// 🔹 Quick Tag modal for Inbox – adds ONE new tag to the current contact
export function InboxAddTagModal({
  isOpen,
  onClose,
  contactId,
  currentTags,
  onTagAdded,
}) {
  const [availableTags, setAvailableTags] = React.useState([]);
  const [selectedTagId, setSelectedTagId] = React.useState("");
  const [loadingTags, setLoadingTags] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Load all tags when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    const fetchTags = async () => {
      try {
        setLoadingTags(true);

        // ✅ use correct backend route: /tags/get-tags
        const response = await axiosClient.get("/tags/get-tags");
        const allTags = response.data?.data || response.data || [];

        // Remove tags that this contact already has
        const existingIds = new Set(
          (currentTags || []).map(t => t.id || t.tagId)
        );
        const filtered = allTags.filter(t => !existingIds.has(t.id));

        setAvailableTags(filtered);
        setSelectedTagId(filtered.length > 0 ? filtered[0].id : "");
      } catch (error) {
        console.error("Failed to load tags for Inbox:", error);
        toast.error("Failed to load tags");
        setAvailableTags([]);
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, [isOpen, currentTags]);

  const handleSubmit = async e => {
    e.preventDefault();

    if (!selectedTagId) {
      toast.warn("Select a tag to add.");
      return;
    }
    if (!contactId) {
      toast.error("No contact selected.");
      return;
    }

    try {
      setSaving(true);

      // Reuse existing bulk assign endpoint from CRM
      await axiosClient.post("/contacts/bulk-assign-tag", {
        contactIds: [contactId],
        tagId: selectedTagId,
      });

      toast.success("Tag added to this contact");
      onTagAdded && onTagAdded();
      onClose();
    } catch (error) {
      console.error("Failed to assign tag from Inbox:", error);
      const message = error.response?.data?.message || "Failed to assign tag";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Add tag to this contact
        </h2>

        {loadingTags ? (
          <p className="text-xs text-slate-500">Loading tags…</p>
        ) : availableTags.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              No new tags available. Create tags in the CRM workspace first, or
              this contact already has all tags.
            </p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Select tag
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={selectedTagId}
                onChange={e => setSelectedTagId(e.target.value)}
                disabled={saving}
              >
                {availableTags.map(tag => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name || tag.tagName || "Tag"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || availableTags.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add tag"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
