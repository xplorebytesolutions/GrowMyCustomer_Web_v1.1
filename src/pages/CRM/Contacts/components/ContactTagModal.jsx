import React from "react";
import { toast } from "react-toastify";

import axiosClient from "../../../../api/axiosClient";

function normalizeTagsResponse(res) {
  const payload = res?.data?.data ?? res?.data;
  return Array.isArray(payload) ? payload : [];
}

async function fetchAllTags() {
  try {
    const res = await axiosClient.get("/tags");
    const tags = normalizeTagsResponse(res);
    if (tags.length > 0) return tags;
  } catch (_) {
    // fallback below
  }

  const res = await axiosClient.get("/tags/get-tags");
  return normalizeTagsResponse(res);
}

function getContactTags(contact) {
  return (
    contact?.tags ||
    contact?.contactTags ||
    contact?.tagSummaries ||
    contact?.tagList ||
    []
  );
}

export default function ContactTagModal({
  isOpen,
  mode, // "add" | "remove"
  contact,
  onClose,
  onUpdated,
}) {
  const [availableTags, setAvailableTags] = React.useState([]);
  const [selectedTagId, setSelectedTagId] = React.useState("");
  const [loadingTags, setLoadingTags] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const existingTags = React.useMemo(
    () => getContactTags(contact),
    [contact]
  );

  React.useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setLoadingTags(true);
      try {
        if (mode === "remove") {
          const list = Array.isArray(existingTags) ? existingTags : [];
          setAvailableTags(list);
          const firstId = list?.[0]?.id ?? list?.[0]?.tagId ?? "";
          setSelectedTagId(firstId ? String(firstId) : "");
          return;
        }

        const all = await fetchAllTags();
        const existingIds = new Set(
          (existingTags || []).map(t => String(t?.id ?? t?.tagId)).filter(Boolean)
        );
        const filtered = (all || []).filter(t => !existingIds.has(String(t?.id)));
        setAvailableTags(filtered);
        setSelectedTagId(filtered?.[0]?.id ? String(filtered[0].id) : "");
      } catch (error) {
        toast.error("Failed to load tags.");
        setAvailableTags([]);
        setSelectedTagId("");
      } finally {
        setLoadingTags(false);
      }
    };

    load();
  }, [isOpen, mode, existingTags]);

  const title = mode === "remove" ? "Remove tag" : "Add tag";

  const handleSubmit = async e => {
    e.preventDefault();
    if (!contact?.id) {
      toast.error("No contact selected.");
      return;
    }
    if (!selectedTagId) {
      toast.warn("Select a tag first.");
      return;
    }
    if (saving) return;

    const tagId = Number.isFinite(Number(selectedTagId))
      ? Number(selectedTagId)
      : selectedTagId;

    setSaving(true);
    try {
      if (mode === "remove") {
        const body = { contactIds: [contact.id], tagId };

        try {
          await axiosClient.request({
            url: "/contacts/bulk-unassign-tag",
            method: "DELETE",
            data: body,
          });
        } catch (err) {
          const status = err?.response?.status;
          if (status === 404 || status === 405) {
            await axiosClient.post("/contacts/bulk-unassign-tag", body);
          } else {
            throw err;
          }
        }

        toast.success("Tag removed.");
      } else {
        await axiosClient.post("/contacts/bulk-assign-tag", {
          contactIds: [contact.id],
          tagId,
        });
        toast.success("Tag added.");
      }

      onUpdated?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update tag.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const emptyText =
    mode === "remove"
      ? "This contact has no tags to remove."
      : "No tags available to add. Create tags first.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {contact?.name || "Unnamed contact"}
          </p>
        </div>

        <div className="px-5 py-4">
          {loadingTags ? (
            <p className="text-xs text-slate-500">Loading tags...</p>
          ) : availableTags.length === 0 ? (
            <p className="text-xs text-slate-500">{emptyText}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Select tag
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                  value={selectedTagId}
                  onChange={e => setSelectedTagId(e.target.value)}
                  disabled={saving}
                >
                  {availableTags.map(tag => {
                    const id = tag?.id ?? tag?.tagId;
                    const label = tag?.name ?? tag?.tagName ?? tag?.label ?? "Tag";
                    return (
                      <option key={String(id)} value={String(id)}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedTagId}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ${
                    mode === "remove"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {saving ? "Saving..." : title}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

