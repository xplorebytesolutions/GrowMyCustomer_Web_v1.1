import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Users,
  Plus,
  Edit3,
  UserX,
  UserCheck,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";

import PageHeader from "../../components/common/PageHeader";
import TopSelectorBar from "../../components/common/TopSelectorBar";
import StatusPill from "../../components/common/StatusPill";
import TabbedNav from "../../components/common/TabbedNav";
import SectionCard from "../../components/common/SectionCard";
import StyledTable from "../../components/common/StyledTable";

import {
  createTeamStaff,
  getTeamStaffList,
  getTeamStaffRoles,
  setTeamStaffStatus,
  updateTeamStaff,
} from "../../api/teamStaffApi";

function extractArrayPayload(res) {
  const data = res?.data?.data ?? res?.data?.Data ?? res?.data ?? res;
  return Array.isArray(data) ? data : [];
}

function normalizeRole(r) {
  return {
    id: r?.id ?? r?.Id,
    name: r?.name ?? r?.Name ?? "",
    isActive: r?.isActive ?? r?.IsActive ?? true,
  };
}

function normalizeUser(u) {
  return {
    id: u?.id ?? u?.Id,
    name: u?.name ?? u?.Name ?? "",
    email: u?.email ?? u?.Email ?? "",
    roleId: u?.roleId ?? u?.RoleId,
    roleName: u?.roleName ?? u?.RoleName ?? "",
    status: u?.status ?? u?.Status ?? "",
    createdAt: u?.createdAt ?? u?.CreatedAt,
    updatedAt:
      u?.updatedAt ?? u?.UpdatedAt ?? u?.lastUpdatedAt ?? u?.LastUpdatedAt,
  };
}

const emptyForm = {
  id: "",
  name: "",
  email: "",
  password: "",
  roleId: "",
};

export default function TeamStaffPage() {
  const { can, hasAllAccess } = useAuth();

  const canView =
    !!hasAllAccess ||
    (typeof can === "function" &&
      (can(FK.SETTINGS_STAFF_MANAGEMENT) ||
        can(FK.SETTINGS_TEAM_STAFF_MANAGEMENT) ||
        can("teamstaff.view")));
  const canManage =
    !!hasAllAccess ||
    (typeof can === "function" &&
      (can(FK.SETTINGS_STAFF_MANAGEMENT) ||
        can(FK.SETTINGS_TEAM_STAFF_MANAGEMENT) ||
        can("teamstaff.manage")));

  const [activeTab, setActiveTab] = useState("list"); // list | edit | audit

  const [roles, setRoles] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [formMode, setFormMode] = useState("create"); // create | edit
  const [savingForm, setSavingForm] = useState(false);

  const [auditUserId, setAuditUserId] = useState("");

  const loadAll = async () => {
    setLoadingUsers(true);
    try {
      const [staffRes, roleRes] = await Promise.all([
        getTeamStaffList(),
        getTeamStaffRoles().catch(() => null),
      ]);

      const staffList = extractArrayPayload(staffRes)
        .map(normalizeUser)
        .filter(u => u.id);
      setUsers(staffList);

      const roleList = roleRes ? extractArrayPayload(roleRes).map(normalizeRole) : [];
      setRoles(roleList.filter(r => r.id && r.name));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load Team Staff.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const filteredUsers = useMemo(() => {
    const list = users || [];
    if (roleFilter === "all") return list;
    return list.filter(u => String(u.roleId || "") === String(roleFilter));
  }, [users, roleFilter]);

  const selectedRole = useMemo(() => {
    if (roleFilter === "all") return null;
    return (roles || []).find(r => String(r.id) === String(roleFilter)) || null;
  }, [roles, roleFilter]);

  const openCreate = () => {
    setFormMode("create");
    setForm(emptyForm);
    setActiveTab("edit");
  };

  const openEdit = user => {
    setFormMode("edit");
    setForm({
      id: String(user.id),
      name: user.name || "",
      email: user.email || "",
      password: "",
      roleId: user.roleId ? String(user.roleId) : "",
    });
    setActiveTab("edit");
  };

  const saveUser = async () => {
    if (!canManage) return;

    const name = String(form.name || "").trim();
    const email = String(form.email || "").trim();
    const roleId = String(form.roleId || "").trim();

    if (!name) {
      toast.warn("Name is required.");
      return;
    }
    if (!roleId) {
      toast.warn("Role is required.");
      return;
    }

    if (formMode === "create") {
      if (!email || !email.includes("@")) {
        toast.warn("Valid email is required.");
        return;
      }
      if (!form.password || form.password.length < 6) {
        toast.warn("Password must be at least 6 characters.");
        return;
      }
    }

    setSavingForm(true);
    try {
      if (formMode === "create") {
        await createTeamStaff({
          name,
          email,
          password: form.password,
          roleId,
        });
        toast.success("Staff user created.");
        setForm(emptyForm);
      } else {
        await updateTeamStaff(form.id, {
          name,
          email,
          roleId,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("Staff user updated.");
      }

      await loadAll();
      setActiveTab("list");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(err?.response?.data?.message || "Save failed.");
    } finally {
      setSavingForm(false);
    }
  };

  const toggleStatus = async (user, toStatus) => {
    if (!canManage) return;
    const ok = window.confirm(
      toStatus === "Active"
        ? `Activate ${user.name || "this user"}?`
        : `Put ${user.name || "this user"} on Hold?`
    );
    if (!ok) return;

    setSavingStatusId(user.id);
    try {
      await setTeamStaffStatus(user.id, toStatus);
      toast.success(toStatus === "Active" ? "User activated." : "User set to Hold.");
      await loadAll();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(err?.response?.data?.message || "Status update failed.");
    } finally {
      setSavingStatusId(null);
    }
  };

  const tabs = useMemo(
    () => [
      { id: "list", label: "Staff list" },
      { id: "edit", label: "Create / edit staff", disabled: !canManage },
      { id: "audit", label: "Status & audit" },
    ],
    [canManage]
  );

  if (!canView) {
    return (
      <div className="flex flex-col gap-4 h-full px-4">
        <PageHeader
          icon={Users}
          title="Team Staff"
          subtitle="You do not have access to view staff users."
        />
        <SectionCard
          title="Access denied"
          subtitle="Ask an administrator to grant access."
          minHeight="min-h-[160px]"
          bodyClassName="px-4 py-4"
        >
          <div className="text-xs text-slate-500">
            Required permission:{" "}
            <span className="font-semibold">{FK.SETTINGS_STAFF_MANAGEMENT}</span>{" "}
            (or <span className="font-semibold">teamstaff.view</span>)
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <PageHeader
        icon={Users}
        title="Team Staff"
        subtitle="Create staff users, assign roles, and activate/deactivate access."
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={!canManage}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Staff User
          </button>
        }
      />

      <TopSelectorBar
        left={
          <>
            <Users className="h-4 w-4 text-indigo-500" />
            <span className="text-xs text-slate-500">Filter</span>
            <select
              className="min-w-[220px] rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="all">All staff</option>
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
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={loadingUsers}
          >
            {loadingUsers ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        }
      />

      <TabbedNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 min-h-0 pt-3 flex flex-col gap-3 pl-4 pr-2">
        {activeTab === "list" ? (
          <SectionCard
            title="Staff list"
            subtitle="Manage staff accounts for your workspace."
            minHeight="min-h-[220px]"
            bodyClassName="px-4 py-3"
          >
            <StyledTable
              loading={loadingUsers}
              emptyText="No staff users found."
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: r => (
                    <button
                      type="button"
                      onClick={() => {
                        setAuditUserId(String(r.id));
                        setActiveTab("audit");
                      }}
                      className="text-slate-900 font-medium hover:text-indigo-700"
                      title="View audit"
                    >
                      {r.name || "—"}
                    </button>
                  ),
                },
                {
                  key: "email",
                  label: "Email",
                  render: r => <span className="text-slate-600">{r.email || "—"}</span>,
                },
                {
                  key: "role",
                  label: "Role",
                  render: r => <span className="text-slate-700">{r.roleName || "—"}</span>,
                },
                {
                  key: "status",
                  label: "Status",
                  render: r => <StatusPill status={r.status} />,
                },
                {
                  key: "createdAt",
                  label: "CreatedAt",
                  render: r => (
                    <span className="text-slate-500">
                      {r.createdAt ? String(r.createdAt).slice(0, 10) : "—"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  className: "w-44",
                  render: r => {
                    const st = String(r.status || "").toLowerCase();
                    const isActive = st === "active";
                    const isBusy = String(savingStatusId || "") === String(r.id);
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          disabled={!canManage}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => toggleStatus(r, "Hold")}
                            disabled={!canManage || isBusy}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Hold
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleStatus(r, "Active")}
                            disabled={!canManage || isBusy}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Activate
                          </button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              rows={filteredUsers}
              rowKey={r => r.id}
            />
          </SectionCard>
        ) : null}

        {activeTab === "edit" ? (
          <SectionCard
            title="Create / edit staff"
            subtitle="Create new staff users or update existing staff profiles."
            minHeight="min-h-[220px]"
            actions={
              <button
                type="button"
                onClick={saveUser}
                disabled={!canManage || savingForm}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {savingForm ? (
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
                <label className="text-xs font-medium text-slate-600">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Rahul Sharma"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Role</label>
                <select
                  value={form.roleId}
                  onChange={e => setForm(p => ({ ...p, roleId: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select role</option>
                  {(roles || []).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Email</label>
                <input
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  disabled={formMode === "edit"}
                  className={`mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                    formMode === "edit" ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  placeholder="e.g., staff@company.com"
                />
                {formMode === "edit" ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Email is locked for safety.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  {formMode === "create" ? "Password" : "Password (optional)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={
                    formMode === "create"
                      ? "Min 6 characters"
                      : "Leave blank to keep current"
                  }
                />
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400">
              Mode:{" "}
              <span className="font-semibold">
                {formMode === "create" ? "Create" : "Edit"}
              </span>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "audit" ? (
          <SectionCard
            title="Status & audit"
            subtitle="Quick view of status and recent changes."
            minHeight="min-h-[220px]"
            bodyClassName="px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Staff user</span>
              <select
                className="min-w-[240px] rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={auditUserId}
                onChange={e => setAuditUserId(e.target.value)}
              >
                <option value="">Select user</option>
                {(users || []).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {auditUserId ? (
              (() => {
                const u = (users || []).find(x => String(x.id) === String(auditUserId));
                if (!u) return null;
                return (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-slate-100 rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                      <p className="text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                        Identity
                      </p>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500 font-medium">Name</span>
                          <span className="text-slate-800 font-medium">
                            {u.name || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500 font-medium">Email</span>
                          <span className="text-slate-800 font-medium">
                            {u.email || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                      <p className="text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                        Access
                      </p>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex justify-between gap-3 items-center">
                          <span className="text-slate-500 font-medium">Role</span>
                          <span className="uppercase bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] tracking-wide">
                            {u.roleName || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 items-center">
                          <span className="text-slate-500 font-medium">Status</span>
                          <StatusPill status={u.status} />
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl p-3 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                      <p className="text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                        Timestamps
                      </p>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500 font-medium">Created</span>
                          <span className="text-slate-800 font-medium">
                            {u.createdAt ? String(u.createdAt) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500 font-medium">Last updated</span>
                          <span className="text-slate-800 font-medium">
                            {u.updatedAt ? String(u.updatedAt) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="mt-4 text-xs text-slate-500">
                Select a user to view status and timestamps.
              </div>
            )}
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
