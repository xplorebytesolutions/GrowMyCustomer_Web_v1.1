import React, { useEffect, useState, useCallback } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

function NoteList({ contactId, onEdit, refreshKey }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const res = await axiosClient.get(`/notes/contact/${contactId}`);

      // ✅ Backend returns ResponseResult.SuccessInfo("...", data)
      const rows = res?.data?.data ?? [];
      setNotes(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("❌ Failed to fetch notes:", err);
      toast.error("Failed to load notes.");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshKey]);

  const handleDelete = async id => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await axiosClient.delete(`/notes/${id}`);
      toast.info("🗑️ Note deleted.");
      fetchNotes();
    } catch (err) {
      console.error("❌ Failed to delete note:", err);
      toast.error("Failed to delete note.");
    }
  };

  if (!contactId) {
    return (
      <div className="text-gray-500 text-center py-6">
        Open a contact to view notes.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {loading && (
        <div className="text-gray-500 text-center py-6">Loading notes…</div>
      )}

      {!loading && notes.length === 0 && (
        <div className="text-gray-500 text-center py-6">
          No notes found for this contact.
        </div>
      )}

      {notes.map(note => (
        <div
          key={note.id}
          className={`border p-4 rounded-xl shadow-sm relative bg-white hover:shadow-md transition-all ${
            note.isPinned ? "border-purple-500" : "border-gray-200"
          }`}
        >
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg text-purple-700 flex gap-2 items-center">
              {note.title || "Untitled"}
              {note.isPinned && (
                <span title="Pinned" className="text-purple-500">
                  📌
                </span>
              )}
              {note.isInternal && (
                <span title="Internal Note" className="text-gray-400">
                  🔒
                </span>
              )}
            </h3>

            <div className="flex gap-2 text-sm">
              <button
                onClick={() => onEdit?.(note)}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-800 mt-2 whitespace-pre-line">
            {note.content}
          </p>

          <div className="text-xs text-gray-500 mt-3">
            Created by <b>{note.createdBy || "—"}</b> ·{" "}
            {note.createdAt ? new Date(note.createdAt).toLocaleString() : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

export default NoteList;
