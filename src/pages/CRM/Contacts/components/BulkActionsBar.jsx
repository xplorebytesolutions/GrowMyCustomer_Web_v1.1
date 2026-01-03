import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import axiosClient from "../../../../api/axiosClient";

function BulkActionsBar({ selectedIds = [], onClearSelection, onRefresh }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedIds.length > 0) {
      fetchTags();
    }
  }, [selectedIds.length]);

  const fetchTags = async () => {
    try {
      const normalize = res => {
        const payload = res.data?.data ?? res.data;
        return Array.isArray(payload) ? payload : [];
      };

      try {
        const res = await axiosClient.get("/tags");
        const tags = normalize(res);
        if (tags.length > 0) {
          setAvailableTags(tags);
          return;
        }
      } catch (_) {
        // fallback below
      }

      const res = await axiosClient.get("/tags/get-tags");
      setAvailableTags(normalize(res));
    } catch (error) {
      toast.error("Failed to load tags.");
    }
  };

  const handleApplyTag = async () => {
    if (!selectedTagId) {
      toast.warn("Select a tag first.");
      return;
    }

    try {
      if (isSaving) return;
      setIsSaving(true);

      const res = await axiosClient.post("/contacts/bulk-assign-tag", {
        contactIds: selectedIds,
        tagId: Number.isFinite(Number(selectedTagId))
          ? Number(selectedTagId)
          : selectedTagId,
      });

      toast.success(res?.data?.message || "Tag applied to selected contacts.");
      onClearSelection?.();
      setSelectedTagId("");
      onRefresh?.();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to apply tag.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async () => {
    if (!selectedTagId) {
      toast.warn("Select a tag first.");
      return;
    }

    try {
      if (isSaving) return;
      setIsSaving(true);

      const resolvedTagId = Number.isFinite(Number(selectedTagId))
        ? Number(selectedTagId)
        : selectedTagId;

      const body = {
        contactIds: selectedIds,
        tagId: resolvedTagId,
        // Some backends expect an array (even for single-tag operations)
        tagIds: [resolvedTagId],
      };

      // Some backends enforce DELETE for unassign; others accept POST only.
      // If the bulk endpoint isn't implemented, fallback to per-contact delete.
      let res = null;
      try {
        res = await axiosClient.request({
          url: "/contacts/bulk-unassign-tag",
          method: "DELETE",
          data: body,
        });
      } catch (err) {
        const status = err?.response?.status;
        if (status === 400 || status === 404 || status === 405 || status === 415) {
          try {
            res = await axiosClient.post("/contacts/bulk-unassign-tag", body);
          } catch (postErr) {
            const postStatus = postErr?.response?.status;
            if (postStatus === 404) {
              // Fallback: backend supports single-contact tag removal
              const results = await Promise.allSettled(
                selectedIds.map(contactId =>
                  axiosClient.delete(`/contacts/${contactId}/tags/${resolvedTagId}`)
                )
              );

              const succeeded = results.filter(r => {
                if (r.status === "fulfilled") return true;
                const s = r.reason?.response?.status;
                return s === 404; // already removed
              }).length;

              const failed = results.length - succeeded;
              if (failed === 0) {
                toast.success(`Tag removed from ${succeeded} contact(s).`);
              } else {
                toast.warn(
                  `Removed from ${succeeded} contact(s), failed for ${failed}.`
                );
              }

              onClearSelection?.();
              setSelectedTagId("");
              onRefresh?.();
              return;
            }
            throw postErr;
          }
        } else {
          throw err;
        }
      }

      toast.success(res?.data?.message || "Tag removed from selected contacts.");
      onClearSelection?.();
      setSelectedTagId("");
      onRefresh?.();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to remove tag.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-emerald-50/60 border border-emerald-200/70">
      <p className="text-sm text-slate-700 font-medium">
        {selectedIds.length} selected
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <select
          value={selectedTagId}
          onChange={e => setSelectedTagId(e.target.value)}
          disabled={isSaving}
          className="w-full sm:w-60 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
        >
          <option value="">Select tag</option>
          {availableTags.map(tag => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleApplyTag}
          disabled={!selectedTagId || isSaving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Apply tag"}
        </button>

        <button
          onClick={handleRemoveTag}
          disabled={!selectedTagId || isSaving}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Remove tag
        </button>

        <button
          onClick={onClearSelection}
          disabled={isSaving}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}

export default BulkActionsBar;
