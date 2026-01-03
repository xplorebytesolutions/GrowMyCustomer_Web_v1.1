import React, { useState } from "react";
import { Bell } from "lucide-react";

import ReminderForm from "./ReminderForm";
import ReminderList from "./ReminderList";

function Reminders() {
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleEdit = reminder => {
    setSelectedReminder(reminder);
    setIsDrawerOpen(true);
  };

  const handleAddNew = () => {
    setSelectedReminder(null);
    setIsDrawerOpen(true);
  };

  const handleSaveComplete = () => {
    setIsDrawerOpen(false);
    setSelectedReminder(null);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7] relative">
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Bell size={17} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Reminders
            </h2>
          </div>
        </div>

        {/* Reminder guidance */}
        <div className="mb-5 bg-emerald-50/70 border border-emerald-100 rounded-md px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-slate-800">
            <div className="font-semibold text-emerald-900">
              Pro tip: turn conversations into follow‑ups
            </div>
            <ul className="mt-1 text-xs text-slate-700 space-y-0.5">
              <li>
                Set a reminder right after a WhatsApp chat so nothing slips
                through.
              </li>
              <li>
                Use <b>Type</b> and <b>Priority</b> to batch your work (e.g. all
                “Payments” due today).
              </li>
              <li>
                Check the <b>Overdue</b> tab daily to clear missed follow‑ups
                fast.
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-xs font-semibold bg-emerald-700 text-white border border-emerald-700 hover:bg-emerald-800 whitespace-nowrap"
          >
            Create a reminder
          </button>
        </div>

        <div className="bg-white rounded-md border border-slate-100 shadow-sm px-6 py-5">
          <ReminderList onEdit={handleEdit} refreshKey={refreshKey} />
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-50 transition-transform duration-300 border-l overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">
              {selectedReminder ? "Edit Reminder" : "Add Reminder"}
            </h2>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-gray-500 text-xl"
            >
              &times;
            </button>
          </div>
          <div className="p-4">
            <ReminderForm
              selectedReminder={selectedReminder}
              onSaveComplete={handleSaveComplete}
              onCancel={() => setIsDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Reminders;
