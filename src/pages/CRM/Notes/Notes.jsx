import React, { useState } from "react";
import NoteForm from "./NoteForm";
import NoteList from "./NoteList";

function Notes({ contactId }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = note => {
    setSelectedNote(note);
    setIsDrawerOpen(true);
  };

  const handleAddNew = () => {
    setSelectedNote(null);
    setIsDrawerOpen(true);
  };

  const handleSaveComplete = () => {
    setSelectedNote(null);
    setIsDrawerOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-4 relative bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-purple-700">📝 Notes</h2>
        <button
          onClick={handleAddNew}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow"
        >
          ➕ Add Note
        </button>
      </div>

      {/* Note List */}
      <NoteList
        contactId={contactId}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      {/* Drawer */}
      {isDrawerOpen && (
        <div className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-50 transition-transform duration-300 border-l overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">
              {selectedNote ? "Edit Note" : "Add Note"}
            </h2>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-gray-500 text-xl"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            <NoteForm
              contactId={contactId}
              selectedNote={selectedNote}
              onSaveComplete={handleSaveComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Notes;
