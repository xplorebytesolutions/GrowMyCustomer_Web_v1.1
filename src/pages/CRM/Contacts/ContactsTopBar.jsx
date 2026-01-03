// 📄 File: src/pages/Contacts/ContactsTopBar.jsx

import { useState } from "react";
import { Search, Filter, Plus } from "lucide-react";

const tabs = [
  { id: "all", label: "All Contacts", count: 266 },
  { id: "favourites", label: "Favourites", count: 86 },
  { id: "groups", label: "Groups", count: 23 },
  { id: "archived", label: "Archived", count: 8 },
];

export default function ContactsTopBar({ onAdd }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* 🔍 Search + Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center w-full md:max-w-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <Search size={18} className="text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search contact, group or project"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full outline-none text-sm text-slate-700"
          />
        </div>

        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <button className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 border px-3 py-2 rounded-md border-slate-200 hover:bg-slate-50">
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button
            onClick={onAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-md flex items-center gap-2 shadow"
          >
            <Plus size={16} />
            Add Contact
          </button>
        </div>
      </div>

      {/* 📁 Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-sm font-medium">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 border-b-2 ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}{" "}
            <span className="text-xs text-slate-400 ml-1">({tab.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
