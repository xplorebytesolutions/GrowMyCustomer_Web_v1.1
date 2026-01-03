import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Edit3, Plus, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
import { requestUpgrade } from "../../utils/upgradeBus";
import DefinitionFormModal from "./DefinitionFormModal";
import {
  buildOptionsPayload,
  createCustomFieldDefinition,
  CUSTOM_FIELD_DATA_TYPES,
  deleteCustomFieldDefinition,
  getCustomFieldDefinitions,
  updateCustomFieldDefinition,
} from "./customFieldsApi";

const DATA_TYPE_LABELS = {
  Text: "Text",
  Number: "Number",
  Date: "Date",
  Boolean: "Boolean",
  SingleSelect: "Single Select",
  MultiSelect: "Multi Select",
};

const isSelectType = type =>
  type === "SingleSelect" || type === "MultiSelect";

export default function AttributesPage() {
  const { isLoading, entLoading, hasAllAccess, can } = useAuth();

  // Permission gating: if custom fields keys exist, prefer them.
  const viewPermission =
    FK.CUSTOMFIELDS_VIEW || FK.CRM_ATTRIBUTE_VIEW || FK.CRM_CONTACT_VIEW;
  const managePermission =
    FK.CUSTOMFIELDS_MANAGE ||
    FK.CRM_ATTRIBUTE_VIEW ||
    FK.CRM_TAGS_EDIT ||
    FK.CRM_TAGS_VIEW;

  const canView =
    hasAllAccess || (typeof can === "function" && can(viewPermission));
  const canManage =
    hasAllAccess || (typeof can === "function" && can(managePermission));

  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadDefinitions = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const list = await getCustomFieldDefinitions({
        entityType: "Contact",
        includeInactive: showInactive,
      });
      setDefinitions(list);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to load attribute definitions."
      );
      setDefinitions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive, canView]);

  const tableRows = useMemo(() => definitions, [definitions]);

  const handleOpenCreate = () => {
    if (!canManage) return;
    setEditing(null);
    setModalOpen(true);
  };

  const handleOpenEdit = def => {
    if (!canManage) return;
    setEditing(def);
    setModalOpen(true);
  };

  const handleSave = async formState => {
    const payload = {
      entityType: "Contact",
      key: formState.key.trim(),
      label: formState.label.trim(),
      dataType: formState.dataType,
      isRequired: Boolean(formState.isRequired),
      sortOrder: Number(formState.sortOrder || 0),
      options: isSelectType(formState.dataType)
        ? buildOptionsPayload(formState.options)
        : buildOptionsPayload([]),
    };

    try {
      if (editing?.id) {
        await updateCustomFieldDefinition(editing.id, {
          Label: payload.label,
          DataType: payload.dataType,
          Options: payload.options,
          IsRequired: payload.isRequired,
          IsActive: editing.isActive !== false,
          SortOrder: payload.sortOrder,
        });
        toast.success("Attribute updated.");
      } else {
        await createCustomFieldDefinition({
          EntityType: payload.entityType,
          Key: payload.key,
          Label: payload.label,
          DataType: payload.dataType,
          Options: payload.options,
          IsRequired: payload.isRequired,
          SortOrder: payload.sortOrder,
        });
        toast.success("Attribute created.");
      }
      setModalOpen(false);
      setEditing(null);
      await loadDefinitions();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save attribute."
      );
    }
  };

  const handleDeactivate = async def => {
    if (!canManage) return;
    if (!window.confirm("Deactivate this attribute?")) return;
    try {
      await deleteCustomFieldDefinition(def.id);
      toast.success("Attribute deactivated.");
      await loadDefinitions();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to deactivate attribute."
      );
    }
  };

  const handleActivate = async def => {
    if (!canManage) return;
    try {
      await updateCustomFieldDefinition(def.id, {
        Label: def.label,
        DataType: def.dataType || CUSTOM_FIELD_DATA_TYPES[0],
        Options: buildOptionsPayload(def.options || []),
        IsRequired: Boolean(def.isRequired),
        IsActive: true,
        SortOrder: Number(def.sortOrder || 0),
      });
      toast.success("Attribute activated.");
      await loadDefinitions();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to activate attribute."
      );
    }
  };

  if (isLoading || entLoading) {
    return (
      <div className="p-8 text-sm text-slate-500">Loading attributes...</div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-amber-600">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Attributes are locked
                </p>
                <p className="text-xs text-amber-700">
                  Your current plan does not include access to custom
                  attributes.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    requestUpgrade({
                      reason: "feature",
                      code: viewPermission,
                      source: "crm.attributes.page",
                    })
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Unlock Attributes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7]">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              CRM Workspace
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-8 w-8 rounded-md bg-emerald-100 flex items-center justify-center">
                <SlidersHorizontal size={16} className="text-emerald-700" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">
                Attributes
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Create and manage custom attributes for contacts (dynamic fields).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-500 flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              Show inactive
            </label>

            <button
              type="button"
              onClick={handleOpenCreate}
              disabled={!canManage}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
                canManage
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Plus size={16} />
              Create Attribute
            </button>
          </div>
        </div>

        {!canManage && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            You don't have permission to manage attributes.
          </div>
        )}

        <div className="rounded-md border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Attribute Library
              </p>
              <p className="text-xs text-slate-500">
                {loading
                  ? "Loading definitions..."
                  : `${tableRows.length} attribute(s)`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Label</th>
                  <th className="px-4 py-3 text-left font-semibold">Key</th>
                  <th className="px-4 py-3 text-left font-semibold">Data Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Required</th>
                  <th className="px-4 py-3 text-left font-semibold">Active</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    SortOrder
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-xs text-slate-400"
                      colSpan={7}
                    >
                      Loading definitions...
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-xs text-slate-400"
                      colSpan={7}
                    >
                      No attributes configured yet.
                    </td>
                  </tr>
                ) : (
                  tableRows.map(def => (
                    <tr key={def.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {def.label}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {def.key}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {DATA_TYPE_LABELS[def.dataType] || def.dataType}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            def.isRequired
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {def.isRequired ? "Required" : "Optional"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            def.isActive !== false
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {def.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {def.sortOrder}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(def)}
                            disabled={!canManage}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                              canManage
                                ? "text-purple-600 hover:bg-purple-50"
                                : "text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>

                          {def.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(def)}
                              disabled={!canManage}
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                canManage
                                  ? "text-rose-600 hover:bg-rose-50"
                                  : "text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivate(def)}
                              disabled={!canManage}
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                canManage
                                  ? "text-emerald-600 hover:bg-emerald-50"
                                  : "text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DefinitionFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initialDefinition={editing}
      />
    </div>
  );
}

