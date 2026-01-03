import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosClient from "../../../api/axiosClient";

const emptyForm = {
  title: "",
  content: "",
  createdBy: "",
  source: "CRM",
  isPinned: false,
  isInternal: false,
};

function NoteForm({ contactId, selectedNote, onSaveComplete }) {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedNote?.id) {
      setFormData({
        title: selectedNote.title ?? "",
        content: selectedNote.content ?? "",
        createdBy: selectedNote.createdBy ?? "",
        source: selectedNote.source ?? "CRM",
        isPinned: !!selectedNote.isPinned,
        isInternal: !!selectedNote.isInternal,
      });
    } else {
      setFormData(emptyForm);
    }
  }, [selectedNote]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!contactId) {
      toast.error("ContactId missing. Open notes from a contact.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData, contactId };

      if (selectedNote?.id) {
        await axiosClient.put(`/notes/${selectedNote.id}`, payload);
        toast.info("📝 Note updated.");
      } else {
        await axiosClient.post("/notes", payload);
        toast.success("✅ Note added.");
      }

      // ✅ Backend already logs to LeadTimeline inside NoteService
      onSaveComplete?.();
    } catch (err) {
      console.error("❌ Failed to save note:", err);
      toast.error(err?.response?.data?.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        name="title"
        value={formData.title}
        onChange={handleChange}
        placeholder="Note Title"
        className="w-full border rounded-lg px-3 py-2"
      />

      <textarea
        name="content"
        value={formData.content}
        onChange={handleChange}
        placeholder="Write your note here."
        rows={5}
        className="w-full border rounded-lg px-3 py-2"
      />

      <input
        name="createdBy"
        value={formData.createdBy}
        onChange={handleChange}
        placeholder="Created by (optional)"
        className="w-full border rounded-lg px-3 py-2"
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="isPinned"
            checked={formData.isPinned}
            onChange={handleChange}
            className="mr-2"
          />
          Pin Note
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            name="isInternal"
            checked={formData.isInternal}
            onChange={handleChange}
            className="mr-2"
          />
          Internal Only
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg"
      >
        {saving ? "Saving..." : selectedNote ? "Update Note" : "Add Note"}
      </button>
    </form>
  );
}

export default NoteForm;
