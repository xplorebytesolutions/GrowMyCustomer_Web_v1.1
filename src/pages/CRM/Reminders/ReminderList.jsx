import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

/**
 * ReminderList
 *
 * Props:
 * - onEdit(reminder): callback when user clicks "Edit"
 * - refreshKey: number to force refetch when incremented by parent
 *
 * Behaviour:
 * - Loads all reminders for the current business.
 * - Shows a simple table with key fields.
 * - Allows delete, then refreshes list.
 */
function ReminderList({ onEdit, refreshKey }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState("open"); // open | overdue | completed | all
  const [dueFilter, setDueFilter] = useState("all"); // all | today | tomorrow | week | range
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [priorityFilter, setPriorityFilter] = useState(""); // "", "1", "2", "3"
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchReminders();
  }, [refreshKey]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/reminders");

      const root = res?.data;
      let list = [];
      if (Array.isArray(root)) {
        list = root;
      } else if (Array.isArray(root?.items)) {
        list = root.items;
      } else if (Array.isArray(root?.data)) {
        list = root.data;
      } else if (Array.isArray(root?.data?.items)) {
        list = root.data.items;
      }

      setReminders(list);
    } catch (err) {
      console.error("❌ Failed to fetch reminders:", err);
      toast.error("Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!id) return;
    const confirm = window.confirm(
      "Are you sure you want to delete this reminder?"
    );
    if (!confirm) return;

    try {
      await axiosClient.delete(`/reminders/${id}`);
      toast.success("✅ Reminder deleted");
      // Refresh list
      fetchReminders();
    } catch (err) {
      console.error("❌ Failed to delete reminder:", err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to delete reminder.";
      toast.error(message);
    }
  };

  const formatDate = value => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  };

  const filteredReminders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const startOfDayAfterTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );
    const startOfNextWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (7 - now.getDay() || 7)
    );

    const parseDue = value => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const isCompletedStatus = status => {
      const s = String(status || "").toLowerCase();
      return s.includes("complete") || s.includes("done");
    };

    return reminders.filter(r => {
      const due = parseDue(r.dueAt);
      const completed = isCompletedStatus(r.status);

      // Tabs
      if (activeTab === "open" && completed) return false;
      if (activeTab === "completed" && !completed) return false;
      if (activeTab === "overdue" && (!due || due >= now || completed))
        return false;

      // Due filters
      if (dueFilter === "today") {
        if (!due || due < startOfToday || due >= startOfTomorrow) return false;
      } else if (dueFilter === "tomorrow") {
        if (!due || due < startOfTomorrow || due >= startOfDayAfterTomorrow)
          return false;
      } else if (dueFilter === "week") {
        if (!due || due < startOfToday || due >= startOfNextWeek) return false;
      } else if (dueFilter === "range") {
        const rs = rangeStart ? new Date(rangeStart) : null;
        const re = rangeEnd ? new Date(rangeEnd) : null;
        if (!due) return false;
        if (rs && due < rs) return false;
        if (re && due > re) return false;
      }

      // Priority
      if (priorityFilter) {
        if (String(r.priority ?? "") !== String(priorityFilter)) return false;
      }

      // Type
      if (typeFilter) {
        if (String(r.reminderType || "") !== typeFilter) return false;
      }

      return true;
    });
  }, [
    reminders,
    activeTab,
    dueFilter,
    rangeStart,
    rangeEnd,
    priorityFilter,
    typeFilter,
  ]);

  return (
    <div className="mt-4">
      {/* Filters */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {["open", "overdue", "completed", "all"].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
                activeTab === tab
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab === "open"
                ? "Open"
                : tab === "overdue"
                ? "Overdue"
                : tab === "completed"
                ? "Completed"
                : "All"}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={dueFilter}
            onChange={e => setDueFilter(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="all">All due dates</option>
            <option value="today">Due today</option>
            <option value="tomorrow">Due tomorrow</option>
            <option value="week">Due this week</option>
            <option value="range">Custom range</option>
          </select>

          {dueFilter === "range" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={rangeStart}
                onChange={e => setRangeStart(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={e => setRangeEnd(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
              />
            </div>
          )}

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All priorities</option>
            <option value="1">High</option>
            <option value="2">Medium</option>
            <option value="3">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All types</option>
            <option value="Call">Call</option>
            <option value="FollowUp">Follow-up</option>
            <option value="Meeting">Meeting</option>
            <option value="Payment">Payment</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      {loading && (
        <div className="text-xs text-slate-500 mb-2">Loading reminders…</div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-md bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-emerald-50 text-xs uppercase text-emerald-700">
            <tr>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Due</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReminders.map(reminder => (
              <tr
                key={reminder.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">
                    {reminder.title || "Untitled"}
                  </div>
                  {reminder.description && (
                    <div className="text-[11px] text-slate-500 line-clamp-2">
                      {reminder.description}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-700">
                  {reminder.reminderType || "-"}
                </td>
                <td className="px-3 py-2 text-xs text-slate-700">
                  {formatDate(reminder.dueAt)}
                </td>
                <td className="px-3 py-2 text-xs text-slate-700">
                  {reminder.status || "-"}
                </td>
                <td className="px-3 py-2 text-xs text-slate-700">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(reminder)}
                      className="px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(reminder.id)}
                      className="px-2 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && filteredReminders.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-xs text-slate-500"
                >
                  No reminders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReminderList;
