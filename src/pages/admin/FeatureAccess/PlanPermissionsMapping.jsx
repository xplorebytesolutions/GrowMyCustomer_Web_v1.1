import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  Settings2,
  Filter,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";
import TopSelectorBar from "../../../components/common/TopSelectorBar";
import StatusPill from "../../../components/common/StatusPill";
import TabbedNav from "../../../components/common/TabbedNav";
import SectionCard from "../../../components/common/SectionCard";

import {
  getPermissionsCatalog,
  getPlanPermissions,
  getPlans,
  savePlanPermissions,
} from "../../../api/planPermissionsApi";

function extractArrayPayload(res) {
  const data = res?.data?.data ?? res?.data?.Data ?? res?.data ?? res;
  return Array.isArray(data) ? data : [];
}

function normalizePlan(p) {
  return {
    id: p?.id ?? p?.Id,
    name: p?.name ?? p?.Name ?? "",
    code: p?.code ?? p?.Code ?? "",
    description: p?.description ?? p?.Description ?? "",
    isActive: p?.isActive ?? p?.IsActive ?? true,
  };
}

function normalizePermission(p) {
  const id =
    p?.id ??
    p?.Id ??
    p?.permissionId ??
    p?.PermissionId ??
    (p?.code ?? p?.Code ?? "");
  return {
    id: id != null ? String(id) : "",
    code: p?.code ?? p?.Code ?? "",
    name: p?.name ?? p?.Name ?? p?.displayName ?? p?.DisplayName ?? "",
    group: p?.group ?? p?.Group ?? "Other",
    description: p?.description ?? p?.Description ?? "",
  };
}

function extractAssignedPermissionKeys(res) {
  const payload = res?.data?.data ?? res?.data?.Data ?? res?.data ?? res;
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload
      .map(x => {
        if (typeof x === "string" || typeof x === "number") return String(x);
        if (x && typeof x === "object") {
          return String(x.id ?? x.Id ?? x.code ?? x.Code ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  const ids = payload.permissionIds ?? payload.PermissionIds ?? payload.ids ?? [];
  if (Array.isArray(ids)) return ids.map(x => String(x)).filter(Boolean);
  return [];
}

export default function PlanPermissionsMappingPage() {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const selectedPlan = useMemo(() => {
    const found = (plans || []).find(p => String(p.id) === String(selectedPlanId));
    return found || null;
  }, [plans, selectedPlanId]);

  const [activeTab, setActiveTab] = useState("details"); // details | mapping | quotas

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [permissionFilter, setPermissionFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const [assignedPermissionKeys, setAssignedPermissionKeys] = useState(new Set());
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await getPlans();
      const list = extractArrayPayload(res).map(normalizePlan).filter(p => p.id);
      setPlans(list);
      if (!selectedPlanId && list.length > 0) {
        setSelectedPlanId(String(list[0].id));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Failed to load plans");
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedPlanId]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await getPermissionsCatalog();
      const list = extractArrayPayload(res).map(normalizePermission);
      setCatalog(list);
      setExpandedGroups(new Set(list.map(p => p.group || "Other")));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Failed to load permissions catalog");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadPlanMapping = useCallback(async planId => {
    if (!planId) {
      setAssignedPermissionKeys(new Set());
      return;
    }
    setLoadingAssigned(true);
    try {
      const res = await getPlanPermissions(planId);
      const keys = extractAssignedPermissionKeys(res);
      setAssignedPermissionKeys(new Set(keys));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Failed to load permissions for this plan");
    } finally {
      setLoadingAssigned(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPlanId) return;
    loadPlanMapping(selectedPlanId);
  }, [selectedPlanId, loadPlanMapping]);

  const grouped = useMemo(() => {
    const q = String(permissionFilter || "").trim().toLowerCase();
    const filtered = (catalog || []).filter(p => {
      if (!q) return true;
      return (
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.code || "").toLowerCase().includes(q) ||
        String(p.group || "").toLowerCase().includes(q)
      );
    });

    const byGroup = new Map();
    filtered.forEach(p => {
      const g = p.group || "Other";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(p);
    });

    return Array.from(byGroup.entries())
      .map(([name, permissions]) => ({
        name,
        permissions: permissions.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, permissionFilter]);

  const toggleGroupExpanded = groupName => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const setGroupAll = (permissions, enabled) => {
    setAssignedPermissionKeys(prev => {
      const next = new Set(prev);
      permissions.forEach(p => {
        if (!p?.id) return;
        if (enabled) next.add(String(p.id));
        else next.delete(String(p.id));
      });
      return next;
    });
  };

  const togglePermission = (permissionId, enabled) => {
    setAssignedPermissionKeys(prev => {
      const next = new Set(prev);
      if (enabled) next.add(String(permissionId));
      else next.delete(String(permissionId));
      return next;
    });
  };

  const saveMapping = async () => {
    if (!selectedPlanId) return;
    setSavingMapping(true);
    try {
      const permissionIds = Array.from(assignedPermissionKeys);
      await savePlanPermissions(selectedPlanId, { permissionIds, replaceAll: true });
      toast.success("Plan permissions saved");
      await loadPlanMapping(selectedPlanId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save mapping");
    } finally {
      setSavingMapping(false);
    }
  };

  const tabs = useMemo(
    () => [
      { id: "details", label: "Plan details" },
      { id: "mapping", label: "Permission mapping", disabled: !selectedPlanId },
      { id: "quotas", label: "Quotas & usage", disabled: !selectedPlanId },
    ],
    [selectedPlanId]
  );

  return (
    <div className="flex flex-col gap-4 h-full px-4">
      <PageHeader
        icon={Settings2}
        title="Plan Permissions"
        subtitle="Assign permissions to subscription plans with the same mapping UX as Plan Management."
        actions={
          <button
            type="button"
            onClick={() => navigate("/app/admin/plan-management")}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Plan management
          </button>
        }
      />

      <TopSelectorBar
        left={
          <>
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            <span className="text-xs text-slate-500">Plan</span>
            <select
              className="min-w-[220px] rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedPlanId}
              onChange={e => setSelectedPlanId(e.target.value)}
              disabled={loadingPlans || (plans || []).length === 0}
            >
              <option value="" disabled>
                {loadingPlans ? "Loading plans…" : "Select plan"}
              </option>
              {(plans || []).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {selectedPlan ? <StatusPill isActive={!!selectedPlan.isActive} /> : null}
          </>
        }
        right={
          <button
            type="button"
            onClick={loadPlans}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={loadingPlans}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingPlans ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <TabbedNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 min-h-0 pt-3 flex flex-col gap-3 pl-4 pr-2">
        {activeTab === "details" ? (
          <SectionCard
            title="Plan details"
            subtitle="Summary of the selected plan."
            minHeight="min-h-[220px]"
            bodyClassName="p-4"
          >
            {!selectedPlan ? (
              <div className="flex items-center justify-center px-4 py-6">
                <p className="text-xs text-slate-400">
                  Select a plan in the header above to view details.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedPlan.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Code:{" "}
                        <span className="uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded">
                          {selectedPlan.code}
                        </span>
                      </p>
                    </div>
                  </div>
                  <StatusPill isActive={!!selectedPlan.isActive} />
                </div>

                {selectedPlan.description ? (
                  <p className="text-xs text-slate-600">{selectedPlan.description}</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    No description provided for this plan.
                  </p>
                )}

                <div className="border border-slate-100 rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Use the <span className="font-semibold">Permission mapping</span>{" "}
                    tab to toggle which capabilities are available for businesses on
                    this plan.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeTab === "mapping" ? (
          <SectionCard
            title="Permission mapping"
            subtitle="Toggle which permissions are granted by the selected plan."
            minHeight="min-h-[220px]"
            actions={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Filter className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-1.5" />
                  <input
                    type="text"
                    placeholder="Search…"
                    className="w-44 pl-7 pr-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    value={permissionFilter}
                    onChange={e => setPermissionFilter(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveMapping}
                  disabled={!selectedPlanId || savingMapping}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {savingMapping ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Save mapping
                </button>
              </div>
            }
            infoBar={{
              left: (
                <>
                  <span className="font-semibold text-slate-900">
                    {selectedPlan?.name || "Plan"}
                  </span>
                  <span className="text-indigo-400">›</span>
                  <span className="uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-indigo-100 text-indigo-700">
                    {selectedPlan?.code || "—"}
                  </span>
                  <span className="text-indigo-400">›</span>
                  <span className="text-indigo-800">Permissions</span>
                </>
              ),
              right:
                loadingAssigned || catalogLoading ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </span>
                ) : null,
            }}
            bodyClassName="px-4 py-3 space-y-3 overflow-y-auto"
          >
            {grouped.map(({ name, permissions }) => {
              const isOpen = expandedGroups.has(name);
              const ids = permissions.map(p => p.id).filter(Boolean);
              const enabledCount = ids.filter(id => assignedPermissionKeys.has(id)).length;
              const totalCount = ids.length;

              return (
                <div
                  key={name}
                  className="border border-slate-100 rounded-md overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroupExpanded(name)}
                    className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-slate-500" />
                      )}
                      <span className="text-xs font-semibold text-slate-700">
                        {name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {enabledCount}/{totalCount} enabled
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setGroupAll(permissions, true);
                        }}
                        className="px-1.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Enable all
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setGroupAll(permissions, false);
                        }}
                        className="px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      >
                        Disable all
                      </button>
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="px-3 py-1.5">
                      {permissions.map(p => {
                        const checked = assignedPermissionKeys.has(p.id);
                        return (
                          <label key={p.id} className="flex items-start gap-3 py-1.5">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={checked}
                              onChange={e => togglePermission(p.id, e.target.checked)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">
                                  {p.name || p.code || p.id}
                                </span>
                                {p.code ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                                    {p.code}
                                  </span>
                                ) : null}
                              </div>
                              {p.description ? (
                                <p className="text-xs text-slate-500">{p.description}</p>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </SectionCard>
        ) : null}

        {activeTab === "quotas" ? (
          <SectionCard
            title="Quotas & usage"
            subtitle="Quota editing is managed in Plan Management."
            minHeight="min-h-[180px]"
            bodyClassName="px-4 py-4"
            actions={
              <button
                type="button"
                onClick={() => navigate("/app/admin/plan-management")}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500"
              >
                <ExternalLink className="h-4 w-4" />
                Open quotas
              </button>
            }
          >
            <div className="text-xs text-slate-600">
              Use <span className="font-semibold">Admin → Plan Management</span> →
              <span className="font-semibold"> Quotas &amp; usage</span> to configure
              usage limits for each plan.
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

