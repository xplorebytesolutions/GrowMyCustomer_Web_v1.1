import React, { useEffect, useMemo, useState } from "react";
import OptionsEditor from "./OptionsEditor";
import { CUSTOM_FIELD_DATA_TYPES } from "./customFieldsApi";

const snakeCasePattern = /^(?!_)[a-z0-9]+(_[a-z0-9]+)*$/;
const isSelectType = type =>
  type === "SingleSelect" || type === "MultiSelect";

export default function DefinitionFormModal({
  isOpen,
  onClose,
  onSave,
  initialDefinition,
}) {
  const [formState, setFormState] = useState({
    key: "",
    label: "",
    dataType: "",
    isRequired: false,
    sortOrder: 0,
    options: [],
  });
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(initialDefinition?.id);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (initialDefinition) {
      setFormState({
        key: initialDefinition.key || "",
        label: initialDefinition.label || "",
        dataType: initialDefinition.dataType || "",
        isRequired: Boolean(initialDefinition.isRequired),
        sortOrder: Number(initialDefinition.sortOrder || 0),
        options: Array.isArray(initialDefinition.options)
          ? initialDefinition.options
          : [],
      });
    } else {
      setFormState({
        key: "",
        label: "",
        dataType: "",
        isRequired: false,
        sortOrder: 0,
        options: [],
      });
    }
  }, [initialDefinition, isOpen]);

  const validate = () => {
    const nextErrors = {};
    if (!formState.label.trim()) nextErrors.label = "Label is required.";
    if (!formState.dataType) nextErrors.dataType = "Data type is required.";

    if (!isEditing) {
      if (!formState.key.trim()) {
        nextErrors.key = "Key is required.";
      } else if (!snakeCasePattern.test(formState.key.trim())) {
        nextErrors.key = "Key must be snake_case.";
      }
    }

    if (isSelectType(formState.dataType)) {
      const options = Array.isArray(formState.options)
        ? formState.options
        : [];
      if (options.length === 0) {
        nextErrors.options = "At least one option is required.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canShowOptions = useMemo(
    () => isSelectType(formState.dataType),
    [formState.dataType]
  );

  const handleSubmit = e => {
    e.preventDefault();
    if (!validate()) return;
    onSave?.(formState);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
              Attribute Definition
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? "Edit Attribute" : "Create Attribute"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Key
              </label>
              <input
                type="text"
                value={formState.key}
                disabled={isEditing}
                onChange={e =>
                  setFormState(prev => ({ ...prev, key: e.target.value }))
                }
                placeholder="snake_case_key"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:bg-slate-50"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Use snake_case for keys.
              </p>
              {errors.key && (
                <p className="mt-1 text-xs text-rose-600">{errors.key}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Label
              </label>
              <input
                type="text"
                value={formState.label}
                onChange={e =>
                  setFormState(prev => ({ ...prev, label: e.target.value }))
                }
                placeholder="Customer Tier"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              {errors.label && (
                <p className="mt-1 text-xs text-rose-600">{errors.label}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Data Type
              </label>
              <select
                value={formState.dataType}
                onChange={e =>
                  setFormState(prev => ({ ...prev, dataType: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                <option value="">Select type</option>
                {CUSTOM_FIELD_DATA_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.dataType && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.dataType}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Sort Order
              </label>
              <input
                type="number"
                value={formState.sortOrder}
                onChange={e =>
                  setFormState(prev => ({
                    ...prev,
                    sortOrder: Number(e.target.value || 0),
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={formState.isRequired}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  isRequired: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            Required
          </label>

          {canShowOptions && (
            <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Options
                  </p>
                  <p className="text-xs text-slate-500">
                    Provide selectable values for this attribute.
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <OptionsEditor
                  value={formState.options}
                  onChange={options =>
                    setFormState(prev => ({ ...prev, options }))
                  }
                />
                {errors.options && (
                  <p className="mt-2 text-xs text-rose-600">
                    {errors.options}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              {isEditing ? "Update Attribute" : "Create Attribute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

