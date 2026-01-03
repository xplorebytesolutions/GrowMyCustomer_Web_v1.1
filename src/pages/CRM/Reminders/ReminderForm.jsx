import React, { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

/**
 * ReminderForm
 *
 * Props:
 * - contactId?: Guid/string of the contact (for contact-scoped usage like Inbox panel or Contact 360)
 * - selectedReminder?: existing reminder object for edit mode
 * - onSaveComplete?: callback() -> parent should refresh list / close drawer
 *
 * Notes:
 * - If selectedReminder is provided, the form works in "edit" mode.
 * - If no contactId + no selectedReminder.contactId is provided, the backend will still receive
 *   an empty contactId; later, when wiring from Inbox/Contact, we will ALWAYS pass a real contactId.
 */
function ReminderForm({
  contactId,
  selectedReminder,
  onSaveComplete,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    contactId: "",
    title: "",
    description: "",
    dueAt: "",
    reminderType: "",
    priority: 2,
    isRecurring: false,
    recurrencePattern: "",
    sendWhatsappNotification: false,
  });

  // 🔄 Initialise / reset form when selectedReminder or contactId changes
  useEffect(() => {
    if (selectedReminder) {
      setFormData({
        contactId:
          selectedReminder.contactId ||
          selectedReminder.contactID ||
          selectedReminder.contact_id ||
          contactId ||
          "",
        title: selectedReminder.title || "",
        description: selectedReminder.description || "",
        // Assume backend stores UTC; convert to local datetime-local format if present
        dueAt: selectedReminder.dueAt
          ? toLocalDateTimeInput(selectedReminder.dueAt)
          : "",
        reminderType: selectedReminder.reminderType || "",
        priority:
          typeof selectedReminder.priority === "number"
            ? selectedReminder.priority
            : 2,
        isRecurring: !!selectedReminder.isRecurring,
        recurrencePattern: selectedReminder.recurrencePattern || "",
        sendWhatsappNotification: !!selectedReminder.sendWhatsappNotification,
      });
    } else {
      // New reminder
      setFormData(prev => ({
        ...prev,
        contactId: contactId || "",
        title: "",
        description: "",
        dueAt: "",
        reminderType: "",
        priority: 2,
        isRecurring: false,
        recurrencePattern: "",
        sendWhatsappNotification: false,
      }));
    }
  }, [selectedReminder, contactId]);

  const shouldShowContactPicker = !contactId;

  useEffect(() => {
    if (!shouldShowContactPicker) return;

    let cancelled = false;

    const fetchContacts = async () => {
      try {
        setContactsLoading(true);
        const res = await axiosClient.get("/contacts/", {
          params: {
            tab: "all",
            search: contactSearch || "",
            page: 1,
            pageSize: 20,
          },
        });

        const payload = res.data?.data ?? res.data;
        const items = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.Items)
          ? payload.Items
          : Array.isArray(payload)
          ? payload
          : [];
        if (!cancelled) setContacts(items);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load contacts for reminders", err);
          toast.error("Failed to load contacts.");
          setContacts([]);
        }
      } finally {
        if (!cancelled) setContactsLoading(false);
      }
    };

    fetchContacts();

    return () => {
      cancelled = true;
    };
  }, [shouldShowContactPicker, contactSearch]);

  // 🧮 Convert ISO/UTC to value usable by <input type="datetime-local">
  function toLocalDateTimeInput(value) {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      const pad = n => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch {
      return "";
    }
  }

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (errors?.[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    if (type === "checkbox") {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else if (name === "priority") {
      setFormData(prev => ({
        ...prev,
        priority: Number(value),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const nextErrors = {};
    if (!formData.contactId) nextErrors.contactId = "Contact is required.";
    if (!formData.title.trim()) nextErrors.title = "Title is required.";
    if (!formData.dueAt) nextErrors.dueAt = "Due date & time is required.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.warn("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);

    // Convert local datetime-local string → UTC ISO string for backend
    const dueAtUtc = formData.dueAt
      ? new Date(formData.dueAt).toISOString()
      : null;

    const payload = {
      contactId: formData.contactId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      dueAt: dueAtUtc,
      reminderType: formData.reminderType,
      priority: formData.priority,
      isRecurring: formData.isRecurring,
      recurrencePattern: formData.recurrencePattern,
      sendWhatsappNotification: formData.sendWhatsappNotification,
    };

    try {
      if (selectedReminder?.id) {
        // ✏️ Update existing reminder
        await axiosClient.put(`/reminders/${selectedReminder.id}`, payload);
        toast.success("✅ Reminder updated successfully");
      } else {
        // ➕ Create new reminder
        await axiosClient.post("/reminders", payload);
        toast.success("✅ Reminder added successfully");
      }

      // Inform parent (Reminders page or Inbox panel) to refresh list/close UI
      onSaveComplete?.();

      // For "new" mode, reset the form (keep contactId so user can add multiple)
      if (!selectedReminder) {
        setFormData(prev => ({
          ...prev,
          title: "",
          description: "",
          dueAt: "",
          reminderType: "",
          priority: 2,
          isRecurring: false,
          recurrencePattern: "",
          sendWhatsappNotification: false,
        }));
      }
    } catch (err) {
      console.error("❌ Failed to save reminder:", err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save reminder.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {shouldShowContactPicker && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Contact
          </label>
          <input
            type="text"
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            placeholder="Search contacts by name or phone"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            name="contactId"
            value={formData.contactId}
            onChange={handleChange}
            className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.contactId ? "border-red-300" : "border-slate-200"}`}
          >
            <option value="">
              {contactsLoading ? "Loading contacts..." : "Select a contact"}
            </option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name || "Unnamed"}{" "}
                {c.phoneNumber ? `• ${c.phoneNumber}` : ""}
              </option>
            ))}
          </select>
          {errors.contactId && (
            <p className="text-[11px] text-red-600">{errors.contactId}</p>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Title
        </label>
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Reminder title"
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.title ? "border-red-300" : "border-slate-200"}`}
        />
        {errors.title && (
          <p className="text-[11px] text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add a short note..."
          rows={3}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Due date/time */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Due date &amp; time
        </label>
        <input
          type="datetime-local"
          name="dueAt"
          value={formData.dueAt}
          onChange={handleChange}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.dueAt ? "border-red-300" : "border-slate-200"}`}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <ShortcutChip
            label="Later today"
            onClick={() =>
              setFormData(prev => ({ ...prev, dueAt: laterToday() }))
            }
          />
          <ShortcutChip
            label="Tomorrow morning"
            onClick={() =>
              setFormData(prev => ({ ...prev, dueAt: tomorrowMorning() }))
            }
          />
          <ShortcutChip
            label="Next business day"
            onClick={() =>
              setFormData(prev => ({ ...prev, dueAt: nextBusinessDay() }))
            }
          />
          <ShortcutChip
            label="Next week"
            onClick={() =>
              setFormData(prev => ({ ...prev, dueAt: nextWeekSameTime() }))
            }
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Uses your local timezone.
        </p>
        {errors.dueAt && (
          <p className="text-[11px] text-red-600">{errors.dueAt}</p>
        )}
      </div>

      {/* Reminder type & priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reminder type
          </label>
          <select
            name="reminderType"
            value={formData.reminderType}
            onChange={handleChange}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select type</option>
            <option value="Call">Call</option>
            <option value="FollowUp">Follow-up</option>
            <option value="Meeting">Meeting</option>
            <option value="Payment">Payment</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Priority
          </label>
          <div className="flex gap-2">
            <PriorityChip
              label="High"
              active={formData.priority === 1}
              onClick={() =>
                setFormData(prev => ({ ...prev, priority: 1 }))
              }
              activeClass="bg-red-50 text-red-700 border-red-200"
            />
            <PriorityChip
              label="Medium"
              active={formData.priority === 2}
              onClick={() =>
                setFormData(prev => ({ ...prev, priority: 2 }))
              }
              activeClass="bg-amber-50 text-amber-700 border-amber-200"
            />
            <PriorityChip
              label="Low"
              active={formData.priority === 3}
              onClick={() =>
                setFormData(prev => ({ ...prev, priority: 3 }))
              }
              activeClass="bg-slate-50 text-slate-700 border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Recurring + WhatsApp toggle */}
      <div className="space-y-2">
        <label className="inline-flex items-center text-xs text-slate-700">
          <input
            type="checkbox"
            name="isRecurring"
            checked={formData.isRecurring}
            onChange={handleChange}
            className="mr-2"
          />
          Recurring reminder
        </label>
        {formData.isRecurring && (
          <input
            name="recurrencePattern"
            value={formData.recurrencePattern}
            onChange={handleChange}
            placeholder="e.g. Every Monday, Monthly, etc."
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        )}

        <label className="inline-flex items-center text-xs text-slate-700">
          <input
            type="checkbox"
            name="sendWhatsappNotification"
            checked={formData.sendWhatsappNotification}
            onChange={handleChange}
            className="mr-2"
          />
          Send WhatsApp notification
        </label>
        <p className="text-[11px] text-slate-500">
          Sends a WhatsApp reminder to the contact at due time.
        </p>
      </div>

      <div className="sticky bottom-0 bg-white pt-3 border-t border-slate-100 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving
            ? "Saving..."
            : selectedReminder
            ? "Update reminder"
            : "Save reminder"}
        </button>
      </div>
    </form>
  );
}

export default ReminderForm;

function ShortcutChip({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition"
    >
      {label}
    </button>
  );
}

function PriorityChip({ label, active, onClick, activeClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
        active
          ? activeClass
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function toLocalInputValue(d) {
  const pad = n => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function laterToday() {
  const now = new Date();
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 3);
  if (d.getHours() >= 19) {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
  }
  return toLocalInputValue(d);
}

function tomorrowMorning() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInputValue(d);
}

function nextBusinessDay() {
  const d = new Date();
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  d.setHours(10, 0, 0, 0);
  return toLocalInputValue(d);
}

function nextWeekSameTime() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() + 7);
  d.setMinutes(0, 0, 0);
  return toLocalInputValue(d);
}
