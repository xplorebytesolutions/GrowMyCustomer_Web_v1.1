import React from "react";
import { FaEllipsisV } from "react-icons/fa";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  return parts
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

export default function ContactList({
  contacts,
  onEdit,
  onDelete,
  onNotes,
  onTimeline,
}) {
  return (
    <div className="overflow-x-auto mt-4 rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="min-w-full bg-white">
        <thead className="text-left bg-slate-50 text-sm font-medium text-slate-600">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Tags</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700">
          {contacts.map(contact => (
            <tr key={contact.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm">
                  {getInitials(contact.name)}
                </div>
                <span className="font-semibold text-slate-900">{contact.name}</span>
              </td>

              <td className="px-4 py-3 text-slate-700">
                {contact.phoneNumber || (
                  <span className="text-slate-400 italic">No number</span>
                )}
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(contact.tags ?? contact.contactTags ?? []).length > 0 ? (
                    (contact.tags ?? contact.contactTags).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs rounded-full font-medium"
                        style={{
                          backgroundColor: tag.colorHex || "#EEE",
                          color: "#0F172A",
                        }}
                      >
                        {tag.tagName || tag.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs italic">
                      No tags
                    </span>
                  )}
                </div>
              </td>

              <td className="px-4 py-3 text-right relative">
                <DropdownMenu
                  onEdit={() => onEdit(contact)}
                  onDelete={() => onDelete(contact)}
                  onNotes={() => onNotes(contact)}
                  onTimeline={() => onTimeline(contact)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DropdownMenu({ onEdit, onDelete, onNotes, onTimeline }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="p-2 rounded-full hover:bg-slate-100"
      >
        <FaEllipsisV size={14} />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right overflow-hidden rounded-lg bg-white shadow-lg border border-slate-200">
          <div className="py-1 text-sm text-slate-700">
            <button
              onClick={onEdit}
              className="block w-full px-4 py-2 hover:bg-slate-50 text-left"
            >
              ✏️ Edit
            </button>
            <button
              onClick={onNotes}
              className="block w-full px-4 py-2 hover:bg-slate-50 text-left"
            >
              📝 Notes
            </button>
            <button
              onClick={onTimeline}
              className="block w-full px-4 py-2 hover:bg-slate-50 text-left"
            >
              🕒 Timeline
            </button>
            <button
              onClick={onDelete}
              className="block w-full px-4 py-2 text-rose-700 hover:bg-rose-50 text-left"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
