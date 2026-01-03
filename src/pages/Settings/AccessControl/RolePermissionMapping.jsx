import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  Settings2,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { FK } from "../../../capabilities/featureKeys";
import PageHeader from "../../../components/common/PageHeader";
import TopSelectorBar from "../../../components/common/TopSelectorBar";
import StatusPill from "../../../components/common/StatusPill";
import TabbedNav from "../../../components/common/TabbedNav";
import SectionCard from "../../../components/common/SectionCard";
import StyledTable from "../../../components/common/StyledTable";
import RoleDrawer from "./components/RoleDrawer";

import {
  createBusinessRole,
  deleteBusinessRole,
  getBusinessRoles,
  getPermissionsCatalog,
  getRolePermissions,
  getTeamStaff,
  saveRolePermissions,
  updateBusinessRole,
} from "../../../api/accessControlApi";

function normalizeRole(r) {
  return {
    id: r?.id ?? r?.Id,
    name: r?.name ?? r?.Name ?? "",
    description: r?.description ?? r?.Description ?? "",
    isActive: r?.isActive ?? r?.IsActive ?? true,
  };
}

function normalizePermission(p) {
  const rawCode = p?.code ?? p?.Code ?? "";
  const code = String(rawCode || "")
    .trim()
    .toUpperCase();

  // Use permission Code as the stable key because backend role-permission mapping
  // is stored/replaced via PermissionCodes (not PermissionIds).
  const id =
    code ||
    String(
      p?.id ?? p?.Id ?? p?.permissionId ?? p?.PermissionId ?? rawCode ?? ""
    ).trim();
  return {
    id: id != null ? String(id) : "",
    code,
    name: p?.name ?? p?.Name ?? p?.displayName ?? p?.DisplayName ?? "",
    group: p?.group ?? p?.Group ?? "Other",
    description: p?.description ?? p?.Description ?? "",
  };
}

function extractArrayPayload(res) {
  const data = res?.data?.data ?? res?.data?.Data ?? res?.data ?? res;
  return Array.isArray(data) ? data : [];
}

function extractPermissionCatalogPayload(res) {
  const payload = res?.data?.data ?? res?.data?.Data ?? res?.data ?? res;

  // Flat list: PermissionSummaryDto[] (admin-only) or legacy arrays.
  if (Array.isArray(payload)) {
    // Grouped list: GroupedPermissionDto[] => flatten into permissions with group set.
    const looksGrouped =
      payload.length > 0 &&
      typeof payload[0] === "object" &&
      payload[0] &&
      (Array.isArray(payload[0].Features) || Array.isArray(payload[0].features));

    if (looksGrouped) {
      const flattened = [];
      payload.forEach(g => {
        const groupName = g?.Group ?? g?.group ?? "Other";
        const features = g?.Features ?? g?.features ?? [];
        if (!Array.isArray(features)) return;
        features.forEach(p => {
          flattened.push({ ...p, Group: p?.Group ?? p?.group ?? groupName });
        });
      });
      return flattened;
    }

    return payload;
  }

  return [];
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

  // BusinessRolePermissionsDto: { permissionCodes: string[] }
  const codes =
    payload.permissionCodes ??
    payload.PermissionCodes ??
    payload.codes ??
    payload.Codes ??
    [];
  if (Array.isArray(codes)) return codes.map(x => String(x)).filter(Boolean);

  // Fallback legacy shapes
  const ids = payload.permissionIds ?? payload.PermissionIds ?? payload.ids ?? [];
  if (Array.isArray(ids)) return ids.map(x => String(x)).filter(Boolean);
  return [];
}

export default function AccessControlPage() {
  const navigate = useNavigate();
  const { can, hasAllAccess, refreshEntitlements, refreshAuthContext } = useAuth();

  const canView =
    !!hasAllAccess ||
    (typeof can === "function" &&
      (can(FK.SETTINGS_ROLE_PERMISSIONS_MAPPING) || can("roles.view")));

  // If the plan grants the settings mapping key, allow manage actions too.
  const canManage =
    !!hasAllAccess ||
    (typeof can === "function" &&
      (can(FK.SETTINGS_ROLE_PERMISSIONS_MAPPING) || can("roles.manage")));

  const canManagePermissions =
    !!hasAllAccess ||
    (typeof can === "function" &&
      (can(FK.SETTINGS_ROLE_PERMISSIONS_MAPPING) ||
        can("rolepermissions.manage")));

  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const selectedRole = useMemo(() => {
    const found = (roles || []).find(r => String(r.id) === String(selectedRoleId));
    return found || null;
  }, [roles, selectedRoleId]);

  const [activeTab, setActiveTab] = useState("details");

  const [roleFormMode, setRoleFormMode] = useState("create"); // create | edit
  const [roleForm, setRoleForm] = useState({
    id: "",
    name: "",
    description: "",
    isActive: true,
  });
  const [savingRole, setSavingRole] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [permissionFilter, setPermissionFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [assignedPermissionKeys, setAssignedPermissionKeys] = useState(new Set());
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  const [assignedUsers, setAssignedUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await getBusinessRoles();
      const list = extractArrayPayload(res).map(normalizeRole).filter(r => r.id);
      setRoles(list);
      if (!selectedRoleId && list.length > 0) {
        setSelectedRoleId(String(list[0].id));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Failed to load roles");
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedRoleId]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await getPermissionsCatalog();
      const list = extractPermissionCatalogPayload(res)
        .map(normalizePermission)
        .filter(p => p.id && p.code);
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

  const loadRolePermissions = useCallback(async roleId => {
    if (!roleId) {
      setAssignedPermissionKeys(new Set());
      return;
    }
    setLoadingAssigned(true);
    try {
      const res = await getRolePermissions(roleId);
      const keys = extractAssignedPermissionKeys(res);
      setAssignedPermissionKeys(new Set(keys));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Failed to load role permissions");
    } finally {
      setLoadingAssigned(false);
    }
  }, []);

  const loadAssignedUsers = useCallback(
    async roleId => {
      if (!roleId) {
        setAssignedUsers([]);
        return;
      }
      setUsersLoading(true);
      try {
        const res = await getTeamStaff();
        const list = extractArrayPayload(res);
        const normalized = list.map(u => ({
          id: u?.id ?? u?.Id,
          name: u?.name ?? u?.Name ?? "",
          email: u?.email ?? u?.Email ?? "",
          status: u?.status ?? u?.Status ?? "",
          roleId: u?.roleId ?? u?.RoleId,
          roleName: u?.roleName ?? u?.RoleName,
          createdAt: u?.createdAt ?? u?.CreatedAt,
        }));
        setAssignedUsers(
          normalized.filter(u => String(u.roleId || "") === String(roleId))
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        toast.error("Failed to load assigned users");
      } finally {
        setUsersLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!canView) return;
    loadRoles();
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    if (!selectedRoleId) return;
    loadRolePermissions(selectedRoleId);
    loadAssignedUsers(selectedRoleId);
  }, [canView, selectedRoleId, loadRolePermissions, loadAssignedUsers]);

  useEffect(() => {
    if (!selectedRole) return;
    setRoleFormMode("edit");
    setRoleForm({
      id: String(selectedRole.id),
      name: selectedRole.name || "",
      description: selectedRole.description || "",
      isActive: !!selectedRole.isActive,
    });
  }, [selectedRoleId, selectedRole]);

  const openCreateRole = () => {
    setRoleFormMode("create");
    setRoleForm({
      id: "",
      name: "",
      description: "",
      isActive: true,
    });
    setActiveTab("details");
    setRoleDrawerOpen(true);
  };

  const openEditRole = () => {
    if (!selectedRole) return;
    setRoleFormMode("edit");
    setRoleForm({
      id: String(selectedRole.id),
      name: selectedRole.name || "",
      description: selectedRole.description || "",
      isActive: !!selectedRole.isActive,
    });
    setActiveTab("details");
    setRoleDrawerOpen(true);
  };

  const saveRole = async () => {
    if (!canManage) return;
    const name = String(roleForm.name || "").trim();
    if (!name) {
      toast.warn("Role name is required");
      return;
    }

    setSavingRole(true);
    try {
      if (roleFormMode === "create") {
        const res = await createBusinessRole({
          name,
          description: String(roleForm.description || "").trim(),
          isActive: !!roleForm.isActive,
        });
        toast.success("Role created");

        await loadRoles();

        const created = res?.data?.data ?? res?.data;
        const createdId = created?.id ?? created?.Id;
        if (createdId) setSelectedRoleId(String(createdId));
        setRoleDrawerOpen(false);
      } else {
        await updateBusinessRole(roleForm.id, {
          name,
          description: String(roleForm.description || "").trim(),
          isActive: !!roleForm.isActive,
        });
        toast.success("Role updated");
        await loadRoles();
        setRoleDrawerOpen(false);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save role");
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!canManage) return;
    if (!selectedRole) return;
    const ok = window.confirm(
      `Delete role "${selectedRole.name}"? This will deactivate or remove it depending on server policy.`
    );
    if (!ok) return;

    try {
      await deleteBusinessRole(selectedRole.id);
      toast.success("Role deleted");
      setSelectedRoleId("");
      await loadRoles();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete role");
    }
  };

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

  const savePermissions = async () => {
    if (!canManagePermissions) return;
    if (!selectedRoleId) return;

    setSavingPermissions(true);
    try {
      const permissionCodes = Array.from(assignedPermissionKeys);
      await saveRolePermissions(selectedRoleId, { permissionCodes });
      toast.success("Permissions saved");
      await loadRolePermissions(selectedRoleId);
      await refreshEntitlements?.();
      await refreshAuthContext?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const tabs = useMemo(
    () => [
      { id: "details", label: "Role details" },
      { id: "permissions", label: "Role permissions", disabled: !selectedRoleId },
      { id: "users", label: "Assigned users", disabled: !selectedRoleId },
    ],
    [selectedRoleId]
  );

  if (!canView) {
    return (
      <div className="flex flex-col gap-4 h-full px-4">
        <PageHeader
          icon={Settings2}
          title="Access Control"
          subtitle="You do not have access to view roles."
        />
        <SectionCard
          title="Access denied"
          subtitle="Ask an administrator to grant access."
          minHeight="min-h-[160px]"
          bodyClassName="px-4 py-4"
        >
          <div className="text-xs text-slate-500">
            Required permission:{" "}
            <span className="font-semibold">
              {FK.SETTINGS_ROLE_PERMISSIONS_MAPPING}
            </span>{" "}
            (or <span className="font-semibold">roles.view</span>)
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-[#f5f6f7] min-h-[calc(100vh-80px)] px-4">
      <PageHeader
        icon={Settings2}
        title="Access Control"
        subtitle="Create business roles, assign permissions, and review which staff members are assigned."
        actions={
          <>
            <button
              type="button"
              onClick={openCreateRole}
              disabled={!canManage}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Role
            </button>
          </>
        }
      />

      <TopSelectorBar
        left={
          <>
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            <span className="text-xs text-slate-500">Role</span>
            <select
              className="min-w-[220px] rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedRoleId}
              onChange={e => setSelectedRoleId(e.target.value)}
              disabled={loadingRoles || (roles || []).length === 0}
            >
              <option value="" disabled>
                {loadingRoles ? "Loading roles…" : "Select role"}
              </option>
              {(roles || []).map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {selectedRole ? <StatusPill isActive={!!selectedRole.isActive} /> : null}
          </>
        }
        right={
          <>
            <button
              type="button"
              onClick={openEditRole}
              disabled={!selectedRole || !canManage}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDeleteRole}
              disabled={!selectedRole || !canManage}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </>
        }
      />

      <TabbedNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 min-h-0 pt-3 flex flex-col gap-3 pl-4 pr-2">
        {(roles || []).length === 0 && !loadingRoles ? (
          <SectionCard
            title="No roles yet"
            subtitle="Create a role first."
            minHeight="min-h-[180px]"
            bodyClassName="px-4 py-4"
            actions={
              <button
                type="button"
                onClick={openCreateRole}
                disabled={!canManage}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                Create role
              </button>
            }
          >
            <div className="text-xs text-slate-500">
              Add roles like <span className="font-semibold">Manager</span> or{" "}
              <span className="font-semibold">Support</span>, then map their
              permissions.
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "details" ? (
          <SectionCard
            title="Role details"
            subtitle="Create or update the selected role."
            minHeight="min-h-[220px]"
            actions={
              <button
                type="button"
                onClick={saveRole}
                disabled={!canManage || savingRole}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {savingRole ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Save
              </button>
            }
            bodyClassName="px-4 py-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Role name
                </label>
                <input
                  value={roleForm.name}
                  onChange={e =>
                    setRoleForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Support"
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600">
                    Status
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill isActive={!!roleForm.isActive} />
                    <button
                      type="button"
                      onClick={() =>
                        setRoleForm(prev => ({ ...prev, isActive: !prev.isActive }))
                      }
                      disabled={!canManage}
                      className="text-xs rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Toggle
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Inactive roles remain in history but cannot be assigned.
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={e =>
                    setRoleForm(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What should this role be used for?"
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400">
              Mode:{" "}
              <span className="font-semibold">
                {roleFormMode === "create" ? "Create" : "Edit"}
              </span>
              {roleFormMode === "edit" && selectedRole ? (
                <>
                  {" "}
                  • Editing:{" "}
                  <span className="font-semibold">{selectedRole.name}</span>
                </>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "permissions" ? (
          <SectionCard
            title="Role permissions"
            subtitle="Assign permissions to the selected role."
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
                  onClick={savePermissions}
                  disabled={!selectedRoleId || savingPermissions || !canManagePermissions}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {savingPermissions ? (
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
                    {selectedRole?.name || "Role"}
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
            {!catalogLoading && grouped.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <div>
                    <div className="font-semibold">No permissions available</div>
                    <div className="text-amber-700">
                      The catalog from <span className="font-mono">/api/permission/grouped</span>{" "}
                      is empty. In backend this endpoint returns only{" "}
                      <span className="font-semibold">IsActive = true</span> permissions.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
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
                        {enabledCount}/{totalCount} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setGroupAll(permissions, true);
                        }}
                        disabled={!canManagePermissions}
                        className="px-1.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setGroupAll(permissions, false);
                        }}
                        disabled={!canManagePermissions}
                        className="px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                      >
                        Clear
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
                              disabled={!canManagePermissions}
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

        {activeTab === "users" ? (
          <SectionCard
            title="Assigned users"
            subtitle="Staff members currently assigned to this role."
            minHeight="min-h-[220px]"
            actions={
              <button
                type="button"
                onClick={() => navigate("/app/settings/team-management")}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Users className="h-4 w-4" />
                Manage staff
              </button>
            }
            bodyClassName="px-4 py-3"
          >
            <StyledTable
              loading={usersLoading}
              emptyText="No users assigned to this role."
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: r => <span className="text-slate-900 font-medium">{r.name}</span>,
                },
                {
                  key: "email",
                  label: "Email",
                  render: r => <span className="text-slate-600">{r.email}</span>,
                },
                {
                  key: "status",
                  label: "Status",
                  render: r => <StatusPill status={r.status} />,
                },
                {
                  key: "createdAt",
                  label: "Created",
                  render: r => (
                    <span className="text-slate-500">
                      {r.createdAt ? String(r.createdAt).slice(0, 10) : "—"}
                    </span>
                  ),
                },
              ]}
              rows={assignedUsers}
              rowKey={r => r.id}
            />
          </SectionCard>
        ) : null}
      </div>

      <RoleDrawer
        open={roleDrawerOpen}
        mode={roleFormMode}
        value={roleForm}
        onChange={setRoleForm}
        onClose={() => setRoleDrawerOpen(false)}
        onSave={saveRole}
        saving={savingRole}
        canManage={canManage}
      />
    </div>
  );
}
