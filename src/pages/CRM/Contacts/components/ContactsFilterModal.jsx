import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  X,
  Search,
  Check,
  Calendar,
  Layers,
  Tag,
  Hash,
  Filter,
  Trash2,
  Plus,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

import axiosClient from "../../../../api/axiosClient";
import { getCustomFieldDefinitions } from "../../../CustomFields/customFieldsApi";

// ────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────
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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toDateInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function presetToRange(presetKey) {
  const now = new Date();
  if (presetKey === "24h") {
    const from = new Date(now);
    from.setHours(from.getHours() - 24);
    return { from, to: now };
  }
  if (presetKey === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from, to: now };
  }
  if (presetKey === "month") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    return { from, to: now };
  }
  if (presetKey === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  return { from: null, to: null };
}

// ────────────────────────────────────────────────
// Constants & Defaults
// ────────────────────────────────────────────────
export const DEFAULT_CONTACT_FILTERS = Object.freeze({
  lastSeenPreset: "",
  lastSeenFrom: "",
  lastSeenTo: "",

  createdPreset: "",
  createdFrom: "",
  createdTo: "",

  optedIn: "all", // all | yes | no
  incomingBlocked: "all", // all | yes | no

  tagIds: [],
  tagMatch: "any", // any | all

  // Attribute conditions (requires backend support to filter server-side)
  // { fieldId, op: "is"|"contains", value, join: "and"|"or" }
  attributes: [],
});

const SECTIONS = [
  { id: "dates", label: "Date Ranges", icon: Calendar },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "attributes", label: "Attributes", icon: Hash },
  { id: "status", label: "Status", icon: Layers },
];

// ────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────

function StatusTab({ filters, setField }) {
  const RadioGroup = ({ label, value, onChange, options }) => (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                isActive
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-100"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">Status</h3>
        <p className="text-xs text-slate-500">
          Filter contacts based on their opt-in status and availability.
        </p>
      </div>

      <div className="space-y-6">
        <RadioGroup
          label="Marketing Opt-in"
          value={filters.optedIn}
          onChange={(v) => setField("optedIn", v)}
          options={[
            { value: "all", label: "All Contacts" },
            { value: "yes", label: "Opted In" },
            { value: "no", label: "Opted Out" },
          ]}
        />
        <div className="h-px bg-slate-100" />
        <RadioGroup
          label="Incoming Messages"
          value={filters.incomingBlocked}
          onChange={(v) => setField("incomingBlocked", v)}
          options={[
            { value: "all", label: "All Contacts" },
            { value: "yes", label: "Incoming Blocked" },
            { value: "no", label: "Allowed" },
          ]}
        />
      </div>
    </div>
  );
}

function TagsTab({
  filters,
  setField,
  tags,
  loadingTags,
  tagQuery,
  setTagQuery,
  toggleTag,
}) {
  const selectedTagIds = Array.isArray(filters.tagIds) ? filters.tagIds : [];
  const normalizedTagQuery = tagQuery.trim().toLowerCase();
  const visibleTags =
    normalizedTagQuery.length === 0
      ? tags
      : tags.filter((t) =>
          String(t?.name || "")
            .toLowerCase()
            .includes(normalizedTagQuery)
        );

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="flex-none mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-1">Tags</h3>
            <p className="text-xs text-slate-500">
              Select tags to include in your filter.
            </p>
          </div>
          {selectedTagIds.length > 0 && (
            <button
              onClick={() => setField("tagIds", [])}
              className="text-[11px] font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* Match Mode */}
          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setField("tagMatch", "any")}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                filters.tagMatch === "any"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Match Any
            </button>
            <button
              type="button"
              onClick={() => setField("tagMatch", "all")}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                filters.tagMatch === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Match All
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        {loadingTags ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <RefreshCw className="h-4 w-4 mx-auto mb-2 animate-spin text-slate-400" />
            Loading tags...
          </div>
        ) : visibleTags.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No tags found.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag) => {
              const id = String(tag.id);
              const isSelected = selectedTagIds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleTag(id)}
                  className={`group relative flex items-center pr-3 pl-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${
                      isSelected ? "ring-2 ring-emerald-100" : ""
                    }`}
                    style={{ backgroundColor: tag.colorHex || "#10B981" }}
                  />
                  {tag.name}
                  {isSelected && (
                    <Check className="ml-2 h-3 w-3 text-emerald-600" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DateRangeTab({
  title,
  presets,
  presetKey,
  from,
  to,
  onPreset,
  onFrom,
  onTo,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {title}
        </label>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-4 gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPreset(p.key)}
            className={`px-3 py-2 text-[11px] font-medium rounded-lg border transition-all ${
              presetKey === p.key
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Range */}
      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex-1 space-y-1">
          <span className="text-[10px] uppercase text-slate-400 font-semibold pl-1">
            From
          </span>
          <input
            type="date"
            value={from || ""}
            onChange={onFrom}
            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="pt-4 text-slate-400">→</div>
        <div className="flex-1 space-y-1">
          <span className="text-[10px] uppercase text-slate-400 font-semibold pl-1">
            To
          </span>
          <input
            type="date"
            value={to || ""}
            onChange={onTo}
            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}

function AttributesTab({
  filters,
  setFilters,
  attributeDefs,
  loadingAttributes,
}) {
  const addRow = () => {
    setFilters((prev) => ({
      ...prev,
      attributes: [
        ...(Array.isArray(prev.attributes) ? prev.attributes : []),
        { fieldId: "", op: "is", value: "", join: "and" },
      ],
    }));
  };

  const updateRow = (index, patch) => {
    setFilters((prev) => {
      const rows = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
      rows[index] = { ...rows[index], ...patch };
      return { ...prev, attributes: rows };
    });
  };

  const removeRow = (index) => {
    setFilters((prev) => {
      const rows = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
      rows.splice(index, 1);
      return { ...prev, attributes: rows };
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="flex-none mb-4">
        <h3 className="text-sm font-medium text-slate-900 mb-1">
          Custom Attributes
        </h3>
        <p className="text-xs text-slate-500">
          Construct advanced queries based on custom fields.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        {loadingAttributes ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <RefreshCw className="h-4 w-4 mx-auto mb-2 animate-spin text-slate-400" />
            Loading definitions...
          </div>
        ) : attributeDefs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <Hash className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs">No attribute definitions found.</p>
            <p className="text-[10px] mt-1 text-slate-400">
              Create custom fields in CRM settings first.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(filters.attributes || []).map((row, idx) => (
              <div
                key={idx}
                className="group relative flex items-start gap-2 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-200 hover:shadow-md transition-all sm:items-center"
              >
                {/* Join Operator (AND/OR) */}
                {idx > 0 && (
                  <div className="absolute -top-5 left-8 px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded border border-slate-200 z-10">
                    {row.join === "or" ? "OR" : "AND"}
                  </div>
                )}

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Field Select */}
                  <div className="sm:col-span-5">
                    <select
                      value={row.fieldId || ""}
                      onChange={(e) => updateRow(idx, { fieldId: e.target.value })}
                      className="w-full text-xs bg-slate-50 border-0 rounded-lg px-2 py-2 font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="" disabled>
                        Select Attribute...
                      </option>
                      {attributeDefs.map((def) => (
                        <option key={def.id} value={def.id}>
                          {def.label || def.key}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operator */}
                  <div className="sm:col-span-3">
                    <select
                      value={row.op || "is"}
                      onChange={(e) => updateRow(idx, { op: e.target.value })}
                      className="w-full text-xs bg-slate-50 border-0 rounded-lg px-2 py-2 text-slate-600 focus:ring-1 focus:ring-emerald-500 text-center"
                    >
                      <option value="is">is exactly</option>
                      <option value="contains">contains</option>
                    </select>
                  </div>

                  {/* Value Input */}
                  <div className="sm:col-span-4">
                    <input
                      value={row.value || ""}
                      onChange={(e) => updateRow(idx, { value: e.target.value })}
                      placeholder="Enter value..."
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Join Toggle (Bottom) */}
                {idx < (filters.attributes || []).length - 1 && (
                  <select
                    value={row.join || "and"}
                    onChange={(e) => updateRow(idx, { join: e.target.value })}
                    className="absolute -bottom-3 right-4 h-6 text-[10px] font-bold uppercase bg-slate-50 border border-slate-200 rounded px-1 text-slate-500 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 border-dashed w-full justify-center transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Condition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Main Modal Container
// ────────────────────────────────────────────────

export default function ContactsFilterModal({
  isOpen,
  initialFilters,
  onClose,
  onApply,
  onClear,
}) {
  const [filters, setFilters] = useState(
    initialFilters || DEFAULT_CONTACT_FILTERS
  );
  const [activeSection, setActiveSection] = useState("dates");
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [attributeDefs, setAttributeDefs] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [tagQuery, setTagQuery] = useState("");

  // 🔹 Reset when opening
  React.useEffect(() => {
    if (!isOpen) return;
    setFilters(initialFilters || DEFAULT_CONTACT_FILTERS);
    setTagQuery("");
    setActiveSection("dates");
  }, [isOpen, initialFilters]);

  // 🔹 Load Tags
  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoadingTags(true);
      try {
        const list = await fetchAllTags();
        setTags(list);
      } catch {
        toast.error("Failed to load tags.");
        setTags([]);
      } finally {
        setLoadingTags(false);
      }
    })();
  }, [isOpen]);

  // 🔹 Load Attributes
  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoadingAttributes(true);
      try {
        const defs = await getCustomFieldDefinitions({ entityType: "Contact" });
        setAttributeDefs(Array.isArray(defs) ? defs : []);
      } catch {
        setAttributeDefs([]);
      } finally {
        setLoadingAttributes(false);
      }
    })();
  }, [isOpen]);

  // 🔹 Helpers
  const setField = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tagId) => {
    setFilters((prev) => {
      const current = Array.isArray(prev.tagIds) ? prev.tagIds : [];
      const id = String(tagId);
      const updated = current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id];
      return { ...prev, tagIds: updated };
    });
  };

  const applyPreset = (section, presetKey) => {
    const { from, to } = presetToRange(presetKey);
    const prefix = section === "lastSeen" ? "lastSeen" : "created";
    setFilters((prev) => ({
      ...prev,
      [`${prefix}Preset`]: presetKey,
      [`${prefix}From`]: toDateInputValue(from),
      [`${prefix}To`]: toDateInputValue(to),
    }));
  };

  const handleClearAll = () => {
    setFilters(DEFAULT_CONTACT_FILTERS);
    setTagQuery("");
    onClear?.();
  };

  if (!isOpen) return null;

  // 🔹 Count Logic
  const getSectionCount = (id) => {
    let c = 0;
    if (id === "status") {
      if (filters.optedIn && filters.optedIn !== "all") c++;
      if (filters.incomingBlocked && filters.incomingBlocked !== "all") c++;
    }
    if (id === "tags") {
      if (filters.tagIds?.length > 0) c += filters.tagIds.length;
    }
    if (id === "dates") {
      if (filters.lastSeenFrom || filters.lastSeenTo) c++;
      if (filters.createdFrom || filters.createdTo) c++;
    }
    if (id === "attributes") {
      if (filters.attributes?.length > 0) c += filters.attributes.length;
    }
    return c;
  };

  const totalApplied =
    getSectionCount("status") +
    getSectionCount("tags") +
    getSectionCount("dates") +
    getSectionCount("attributes");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              <p className="text-xs text-slate-500">
                Refine your contact list with advanced conditions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-slate-50 border-r border-slate-100 p-3 flex flex-col gap-1 overflow-y-auto">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              const count = getSectionCount(section.id);
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-emerald-500" : "text-slate-400 group-hover:text-slate-500"
                      }`}
                    />
                    {section.label}
                  </div>
                  {count > 0 && (
                    <span className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content Panel */}
          <div className="flex-1 p-6 bg-white overflow-y-auto relative">
            {activeSection === "status" && (
              <StatusTab filters={filters} setField={setField} />
            )}

            {activeSection === "tags" && (
              <TagsTab
                filters={filters}
                setField={setField}
                tags={tags}
                loadingTags={loadingTags}
                tagQuery={tagQuery}
                setTagQuery={setTagQuery}
                toggleTag={toggleTag}
              />
            )}

            {activeSection === "dates" && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                <DateRangeTab
                  title="Last Seen"
                  presetKey={filters.lastSeenPreset}
                  presets={[
                    { key: "24h", label: "Last 24h" },
                    { key: "week", label: "Last 7 Days" },
                    { key: "month", label: "Last 30 Days" },
                  ]}
                  onPreset={(k) => applyPreset("lastSeen", k)}
                  from={filters.lastSeenFrom}
                  to={filters.lastSeenTo}
                  onFrom={(e) => {
                    setField("lastSeenPreset", "");
                    setField("lastSeenFrom", e.target.value);
                  }}
                  onTo={(e) => {
                    setField("lastSeenPreset", "");
                    setField("lastSeenTo", e.target.value);
                  }}
                />

                <div className="h-px bg-slate-100" />

                <DateRangeTab
                  title="Created Date"
                  presetKey={filters.createdPreset}
                  presets={[
                    { key: "today", label: "Today" },
                    { key: "week", label: "Last 7 Days" },
                    { key: "month", label: "Last 30 Days" },
                  ]}
                  onPreset={(k) => applyPreset("created", k)}
                  from={filters.createdFrom}
                  to={filters.createdTo}
                  onFrom={(e) => {
                    setField("createdPreset", "");
                    setField("createdFrom", e.target.value);
                  }}
                  onTo={(e) => {
                    setField("createdPreset", "");
                    setField("createdTo", e.target.value);
                  }}
                />
              </div>
            )}

            {activeSection === "attributes" && (
              <AttributesTab
                filters={filters}
                setFilters={setFilters}
                attributeDefs={attributeDefs}
                loadingAttributes={loadingAttributes}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClearAll}
              disabled={totalApplied === 0}
              className="group flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50 disabled:hover:text-slate-500 transition-colors"
            >
              <Trash2 className="h-4 w-4 group-hover:text-red-600 transition-colors" />
              Reset All
            </button> 
            {totalApplied > 0 && (
              <span className="text-xs text-slate-400">
                {totalApplied} filter{totalApplied !== 1 ? "s" : ""} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApply?.(filters);
                onClose?.();
              }}
              className="px-6 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-[0.98]"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
