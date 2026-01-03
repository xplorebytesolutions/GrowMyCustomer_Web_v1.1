import { Download, Search, Plus, SlidersHorizontal, Upload } from "lucide-react";

export default function ContactsTopBar({
  onAddClick,
  onSearchChange,
  activeTab,
  onTabChange,
  searchTerm,
  onFilterClick,
  onImportClick,
  onDownloadSample,
  importing = false,
  activeFiltersCount = 0,
}) {
  const tabs = [
    { key: "all", label: "All" },
    { key: "favourites", label: "Favourites" },
    { key: "archived", label: "Archived" },
    { key: "groups", label: "Groups" },
  ];

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by name, phone, or email"
            value={searchTerm}
            onChange={e => onSearchChange?.(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onFilterClick}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
              activeFiltersCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={16} /> 
            Filters
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={onDownloadSample}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Download size={16} /> Download Sample CSV
          </button>
          <button
            onClick={onImportClick}
            disabled={importing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload size={16} /> {importing ? "Importing..." : "Import CSV"}
          </button>
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus size={16} /> Add contact
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm font-medium">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange?.(tab.key)}
              className={`px-3 py-1.5 rounded-full border transition-colors ${
                isActive
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
