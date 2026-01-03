import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  getSchemaWithValues,
  upsertCustomFieldValues,
} from "./customFieldsApi";

const toDateInputValue = value => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return "";
};

const formatDisplayValue = (dataType, value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (dataType === "Boolean") return value ? "Yes" : "No";
  if (dataType === "MultiSelect" && Array.isArray(value)) {
    return value.join(", ") || "-";
  }
  if (dataType === "Date") {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  return String(value);
};

export default function CustomFieldsEditor({
  entityType = "Contact",
  entityId,
  mode = "edit",
}) {
  const [definitions, setDefinitions] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isViewMode = mode === "view";

  const normalizedEntityType = useMemo(
    () => {
      const trimmed = String(entityType || "Contact").trim();
      return trimmed || "Contact";
    },
    [entityType]
  );

  const loadSchema = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { definitions: defs, valuesMap } = await getSchemaWithValues({
        entityType: normalizedEntityType,
        entityId,
      });

      const normalizedValues = { ...(valuesMap || {}) };
      defs.forEach(def => {
        const raw = valuesMap?.[def.id];
        if (def.dataType === "Boolean") {
          normalizedValues[def.id] =
            raw === true || raw === "true" || raw === 1 || raw === "1";
        }
        if (def.dataType === "MultiSelect") {
          normalizedValues[def.id] = Array.isArray(raw)
            ? raw
            : raw
            ? [raw]
            : [];
        }
        if (def.dataType === "Number") {
          normalizedValues[def.id] =
            raw === null || raw === undefined ? "" : String(raw);
        }
        if (def.dataType === "Date") {
          normalizedValues[def.id] = toDateInputValue(raw);
        }
      });

      setDefinitions(defs);
      setValues(normalizedValues);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load attributes."
      );
      setDefinitions([]);
      setValues({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, normalizedEntityType]);

  const orderedDefinitions = useMemo(
    () => definitions.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [definitions]
  );

  const handleValueChange = (fieldId, nextValue) => {
    setValues(prev => ({ ...prev, [fieldId]: nextValue }));
  };

  const handleMultiSelectToggle = (fieldId, option) => {
    const current = Array.isArray(values[fieldId]) ? values[fieldId] : [];
    if (current.includes(option)) {
      handleValueChange(
        fieldId,
        current.filter(item => item !== option)
      );
      return;
    }
    handleValueChange(fieldId, [...current, option]);
  };

  const buildValuesPayload = () =>
    orderedDefinitions.map(def => {
      let value = values[def.id];
      if (def.dataType === "Number") {
        if (value === "" || value === null || value === undefined) {
          value = null;
        } else {
          const parsed = Number(value);
          value = Number.isFinite(parsed) ? parsed : null;
        }
      }
      if (def.dataType === "Date") {
        value = value ? new Date(value).toISOString() : null;
      }
      if (def.dataType === "Boolean") {
        value = Boolean(value);
      }
      if (def.dataType === "MultiSelect") {
        value = Array.isArray(value) ? value : [];
      }
      return { fieldId: def.id, value };
    });

  const handleSave = async () => {
    if (!entityId) return;
    setSaving(true);
    try {
      const payload = {
        entityType: normalizedEntityType,
        entityId,
        values: buildValuesPayload(),
      };
      await upsertCustomFieldValues(payload);
      toast.success("Attributes saved.");
      await loadSchema();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save attributes."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!entityId) {
    return (
      <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Save contact first to set attributes.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-md border border-slate-100 bg-white px-3 py-3 text-xs text-slate-500">
        Loading attributes...
      </div>
    );
  }

  if (!orderedDefinitions.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
        No attributes configured yet.
      </div>
    );
  }

  if (isViewMode) {
    return (
      <div className="space-y-3">
        {orderedDefinitions.map(def => (
          <div
            key={def.id}
            className="rounded-md border border-slate-100 bg-white px-3 py-2"
          >
            <p className="text-[11px] font-semibold text-slate-500">
              {def.label}
            </p>
            <p className="text-sm text-slate-800">
              {formatDisplayValue(def.dataType, values[def.id])}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orderedDefinitions.map(def => (
          <div key={def.id} className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              {def.label}
              {def.isRequired && (
                <span className="ml-1 text-rose-500">*</span>
              )}
            </label>

            {def.dataType === "Text" && (
              <input
                type="text"
                value={values[def.id] ?? ""}
                onChange={e => handleValueChange(def.id, e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            )}

            {def.dataType === "Number" && (
              <input
                type="number"
                value={values[def.id] ?? ""}
                onChange={e => handleValueChange(def.id, e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            )}

            {def.dataType === "Date" && (
              <input
                type="date"
                value={toDateInputValue(values[def.id])}
                onChange={e => handleValueChange(def.id, e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            )}

            {def.dataType === "Boolean" && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={Boolean(values[def.id])}
                  onChange={e => handleValueChange(def.id, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                {Boolean(values[def.id]) ? "Yes" : "No"}
              </label>
            )}

            {def.dataType === "SingleSelect" && (
              <select
                value={values[def.id] ?? ""}
                onChange={e => handleValueChange(def.id, e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                <option value="">Select...</option>
                {def.options.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {def.dataType === "MultiSelect" && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                {def.options.length === 0 ? (
                  <p className="text-xs text-slate-400">No options.</p>
                ) : (
                  <div className="space-y-2">
                    {def.options.map(option => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <input
                          type="checkbox"
                          checked={
                            Array.isArray(values[def.id]) &&
                            values[def.id].includes(option)
                          }
                          onChange={() =>
                            handleMultiSelectToggle(def.id, option)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-purple-300"
        >
          {saving ? "Saving..." : "Save Attributes"}
        </button>
      </div>
    </div>
  );
}
