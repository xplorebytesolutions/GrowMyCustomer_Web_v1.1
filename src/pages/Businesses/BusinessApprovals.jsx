import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, PauseCircle, Search, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { confirmAlert } from "react-confirm-alert";
import { toast } from "react-toastify";
import { Navigate, useLocation } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

import { useAuth } from "../../app/providers/AuthProvider";
import "react-confirm-alert/src/react-confirm-alert.css";

// MVP: only admins may view this page (partners/reviewers later)
const allowedRoles = ["admin", "superadmin"];

const STATUS = {
  pending: "pending",
  hold: "hold",
  rejected: "rejected",
  approved: "approved",
};

const STATUS_TABS = [
  { key: STATUS.pending, label: "Pending" },
  { key: STATUS.hold, label: "On hold" },
  { key: STATUS.rejected, label: "Rejected" },
  { key: STATUS.approved, label: "Approved" },
];

const EMPTY_BY_TAB = {
  [STATUS.pending]: "No pending businesses found.",
  [STATUS.hold]: "No businesses on hold.",
  [STATUS.rejected]: "No rejected businesses found.",
  [STATUS.approved]: "No approved businesses found.",
};

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data?.success && Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeStatusValue(raw, fallback = STATUS.pending) {
  const v = String(raw || "").toLowerCase();
  if (v === "approved" || v === "approve") return STATUS.approved;
  if (v === "rejected" || v === "reject") return STATUS.rejected;
  if (v === "hold" || v === "on_hold" || v === "on-hold") return STATUS.hold;
  if (v === "pending") return STATUS.pending;
  return fallback;
}

function normalizeBusiness(item, statusHint) {
  if (!item) return null;
  const businessId = item.businessId ?? item.id ?? item.businessID ?? item.business_id;
  if (!businessId) return null;

  const statusFromItem = normalizeStatusValue(
    item.approvalStatus ?? item.status,
    statusHint
  );

  return {
    ...item,
    businessId,
    approvalStatus: statusFromItem,
  };
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function statusBadge(statusRaw) {
  const status = normalizeStatusValue(statusRaw, STATUS.pending);
  switch (status) {
    case STATUS.approved:
      return {
        label: "Approved",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case STATUS.rejected:
      return {
        label: "Rejected",
        className: "bg-red-50 text-red-700 ring-red-200",
      };
    case STATUS.hold:
      return {
        label: "On hold",
        className: "bg-amber-50 text-amber-800 ring-amber-200",
      };
    default:
      return {
        label: "Pending",
        className: "bg-slate-50 text-slate-700 ring-slate-200",
      };
  }
}

function MoreActionsMenu({ disabled, items = [] }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const menuWidth = 176;
  const estimatedRowHeight = 40;
  const menuHeight = Math.max(1, items.length) * estimatedRowHeight + 12;
  const margin = 8;

  const computeAndSetPosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();

    const canOpenDown = rect.bottom + menuHeight + margin <= window.innerHeight;
    const top = canOpenDown
      ? rect.bottom + margin
      : Math.max(margin, rect.top - menuHeight - margin);

    let left = rect.right - menuWidth;
    left = Math.min(left, window.innerWidth - menuWidth - margin);
    left = Math.max(margin, left);

    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = e => {
      const target = e.target;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = e => {
      if (e.key === "Escape") setOpen(false);
    };

    const onWindowChange = () => computeAndSetPosition();

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onWindowChange, true);
    window.addEventListener("resize", onWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onWindowChange, true);
      window.removeEventListener("resize", onWindowChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!items.length) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) computeAndSetPosition();
          setOpen(v => !v);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50"
      >
        More <ChevronDown size={14} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: menuWidth,
            }}
            className="z-[1000] rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden"
            role="menu"
          >
            {items.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={item.className}
                role="menuitem"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export default function BusinessApprovals() {
  const {
    isLoading: authLoading,
    role: ctxRole = "",
    hasAllAccess,
  } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(STATUS.pending);

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingIds, setLoadingIds] = useState({});
  const [unauthorized, setUnauthorized] = useState(false);

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt_desc");

  const role = String(ctxRole || "").toLowerCase();
  const selectedBusinessId = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const v = params.get("businessId");
    return v ? String(v) : "";
  }, [location.search]);

  const counts = useMemo(() => {
    const c = {
      [STATUS.pending]: 0,
      [STATUS.hold]: 0,
      [STATUS.rejected]: 0,
      [STATUS.approved]: 0,
    };
    for (const b of businesses) {
      const s = normalizeStatusValue(b?.approvalStatus ?? b?.status, STATUS.pending);
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [businesses]);

  const tabBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const s = normalizeStatusValue(b?.approvalStatus ?? b?.status, STATUS.pending);
      return s === activeTab;
    });
  }, [activeTab, businesses]);

  const planOptions = useMemo(() => {
    const map = new Map();
    for (const b of tabBusinesses) {
      const raw = String(b?.plan || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, raw);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tabBusinesses]);

  const filteredBusinesses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tabBusinesses.filter(b => {
      if (planFilter !== "all") {
        const plan = String(b?.plan || "").toLowerCase();
        if (plan !== planFilter) return false;
      }

      if (!q) return true;
      const company = String(b?.companyName || "").toLowerCase();
      const email = String(b?.businessEmail || "").toLowerCase();
      const rep = String(b?.representativeName || "").toLowerCase();
      const phone = String(b?.phone || "").toLowerCase();
      return (
        company.includes(q) ||
        email.includes(q) ||
        rep.includes(q) ||
        phone.includes(q)
      );
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === "createdAt_asc" || sortBy === "createdAt_desc") {
        const aTime = new Date(a?.createdAt || 0).getTime() || 0;
        const bTime = new Date(b?.createdAt || 0).getTime() || 0;
        return sortBy === "createdAt_asc" ? aTime - bTime : bTime - aTime;
      }

      const aName = String(a?.companyName || "");
      const bName = String(b?.companyName || "");
      return aName.localeCompare(bName);
    });
    return sorted;
  }, [planFilter, query, sortBy, tabBusinesses]);

  useEffect(() => {
    if (authLoading) return;

    if (!hasAllAccess && !allowedRoles.includes(role)) {
      setUnauthorized(true);
      return;
    }

    let isMounted = true;

    const fetchList = async (url, { silent = false } = {}) => {
      const resp = await axiosClient.get(url, {
        withCredentials: true,
        __silentToast: silent,
        __silent401: silent,
        __silent403: silent,
        __silent429: silent,
      });
      return extractList(resp.data);
    };

    const tryFetchList = async urls => {
      for (const url of urls) {
        try {
          return await fetchList(url, { silent: true });
        } catch (err) {
          const code = err?.response?.status;
          if (code === 401 || code === 403) return [];
          if (code === 404 || code === 405) continue;
          continue;
        }
      }
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError("");

      const pendingReq = fetchList("/businesses/pending", { silent: false });
      const holdReq = tryFetchList([
        "/businesses/hold",
        "/businesses/held",
        "/businesses/on-hold",
        "/businesses/on_hold",
        "/businesses/pending?status=hold",
        "/businesses/pending?status=on-hold",
      ]);
      const rejectedReq = tryFetchList([
        "/businesses/rejected",
        "/businesses/reject",
        "/businesses/pending?status=rejected",
        "/businesses/pending?status=reject",
      ]);
      const approvedReq = fetchList("/businesses/approved", { silent: true }).catch(
        () => []
      );

      const [pendingRes, holdRes, rejectedRes, approvedRes] =
        await Promise.allSettled([pendingReq, holdReq, rejectedReq, approvedReq]);

      if (!isMounted) return;

      if (pendingRes.status === "rejected") {
        const code = pendingRes.reason?.response?.status;
        if (code === 401 || code === 403) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
        setError(
          pendingRes.reason?.response?.data?.message ||
            pendingRes.reason?.message ||
            "Failed to fetch businesses"
        );
        setBusinesses([]);
        setLoading(false);
        return;
      }

      const pending = Array.isArray(pendingRes.value) ? pendingRes.value : [];
      const hold = holdRes.status === "fulfilled" ? holdRes.value : [];
      const rejected = rejectedRes.status === "fulfilled" ? rejectedRes.value : [];
      const approved = approvedRes.status === "fulfilled" ? approvedRes.value : [];

      const merged = new Map();
      const addMany = (items, statusHint) => {
        for (const raw of items) {
          const b = normalizeBusiness(raw, statusHint);
          if (!b) continue;
          const existing = merged.get(String(b.businessId));
          merged.set(String(b.businessId), { ...existing, ...b });
        }
      };

      addMany(pending, STATUS.pending);
      addMany(hold, STATUS.hold);
      addMany(rejected, STATUS.rejected);
      addMany(approved, STATUS.approved);

      const values = Array.from(merged.values()).map(b => ({
        ...b,
        approvalStatus: normalizeStatusValue(
          b?.approvalStatus ?? b?.status,
          STATUS.pending
        ),
      }));

      setBusinesses(values);
      setLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [authLoading, hasAllAccess, role]);

  if (authLoading) {
    return (
      <div
        data-test-id="business-approvals-auth-loading"
        aria-busy="true"
        style={{ display: "none" }}
      />
    );
  }

  if (unauthorized) return <Navigate to="/no-access" replace />;

  const confirmAction = ({ action, businessName, onConfirm }) => {
    confirmAlert({
      title: `Confirm ${action}`,
      message: businessName
        ? `Are you sure you want to ${action.toLowerCase()} "${businessName}"?`
        : `Are you sure you want to ${action.toLowerCase()} this business?`,
      buttons: [
        { label: "Yes", onClick: onConfirm },
        { label: "No", onClick: () => {} },
      ],
    });
  };

  const handleStatusChange = (id, nextStatus) => {
    const key = String(id);
    setLoadingIds(prev => ({ ...prev, [key]: true }));

    axiosClient
      .post(`/businesses/${String(nextStatus).toLowerCase()}/${id}`, null, {
        withCredentials: true,
      })
      .then(() => {
        const verb = String(nextStatus || "").toLowerCase();
        const msg =
          verb === "approve"
            ? "Business activated successfully"
            : verb === "reject"
            ? "Business rejected successfully"
            : verb === "hold"
            ? "Business put on hold"
            : "Business updated successfully";
        toast.success(msg);

        const newStatus = normalizeStatusValue(nextStatus, STATUS.pending);
        setBusinesses(prev =>
          prev.map(b =>
            String(b.businessId) === key
              ? { ...b, approvalStatus: newStatus, status: newStatus }
              : b
          )
        );
        setActiveTab(newStatus);
      })
      .catch(err => {
        const statusCode = err?.response?.status;
        if (statusCode === 401 || statusCode === 403) setUnauthorized(true);
        const msg =
          err?.response?.data?.message ||
          err.message ||
          `Failed to ${nextStatus} business`;
        toast.error(msg);
      })
      .finally(() =>
        setLoadingIds(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        })
      );
  };

  const activeTabLabel =
    STATUS_TABS.find(t => t.key === activeTab)?.label || "Businesses";

  return (
    <div className="p-6 space-y-4 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
                Business Approvals
              </h1>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                {loading ? "Loading..." : `${counts[activeTab]} ${activeTabLabel}`}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Review, hold, reject, and activate businesses from one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-[320px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search company, email, phone..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
              />
            </div>

            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              className="w-full sm:w-[170px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
              aria-label="Filter by plan"
            >
              <option value="all">All plans</option>
              {planOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full sm:w-[190px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
              aria-label="Sort businesses"
            >
              <option value="createdAt_desc">Newest first</option>
              <option value="createdAt_asc">Oldest first</option>
              <option value="companyName_asc">Company A - Z</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_TABS.map(t => {
            const isActive = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border",
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <span>{t.label}</span>
                <span
                  className={[
                    "inline-flex items-center justify-center min-w-[22px] h-[18px] px-1 rounded-full text-[11px] font-bold",
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700",
                  ].join(" ")}
                >
                  {counts[t.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        </div>
      )}

      {!loading && tabBusinesses.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow-sm ring-1 ring-black/5 text-center text-slate-600">
          {EMPTY_BY_TAB[activeTab] || "No businesses found."}
        </div>
      )}

      {!loading && tabBusinesses.length > 0 && filteredBusinesses.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow-sm ring-1 ring-black/5 text-center text-slate-600">
          No matches for your filters.
        </div>
      )}

      {!loading && filteredBusinesses.length > 0 && (
        <div className="overflow-x-auto overflow-y-visible bg-white rounded-xl shadow-sm ring-1 ring-black/5">
          <table className="min-w-[1020px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold text-slate-600">
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBusinesses.map(b => {
                const id = b.businessId;
                const key = String(id);
                const isSelected =
                  selectedBusinessId && String(id) === selectedBusinessId;
                const status = normalizeStatusValue(
                  b?.approvalStatus ?? b?.status,
                  STATUS.pending
                );
                const badge = statusBadge(status);
                const isBusy = !!loadingIds[key];

                const primaryLabel =
                  status === STATUS.approved
                    ? "Approved"
                    : status === STATUS.pending
                    ? "Approve"
                    : "Activate";
                const primaryDisabled = isBusy || status === STATUS.approved;

                const menuItems = [];
                if (status === STATUS.pending) {
                  menuItems.push({
                    key: "hold",
                    label: "Put on hold",
                    icon: <PauseCircle size={14} />,
                    className:
                      "w-full px-3 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2",
                    onClick: () =>
                      confirmAction({
                        action: "Hold",
                        businessName: b.companyName,
                        onConfirm: () => handleStatusChange(id, "hold"),
                      }),
                  });
                  menuItems.push({
                    key: "reject",
                    label: "Reject",
                    icon: <XCircle size={14} />,
                    className:
                      "w-full px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 flex items-center gap-2",
                    onClick: () =>
                      confirmAction({
                        action: "Reject",
                        businessName: b.companyName,
                        onConfirm: () => handleStatusChange(id, "reject"),
                      }),
                  });
                } else if (status === STATUS.hold) {
                  menuItems.push({
                    key: "reject",
                    label: "Reject",
                    icon: <XCircle size={14} />,
                    className:
                      "w-full px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 flex items-center gap-2",
                    onClick: () =>
                      confirmAction({
                        action: "Reject",
                        businessName: b.companyName,
                        onConfirm: () => handleStatusChange(id, "reject"),
                      }),
                  });
                } else if (status === STATUS.rejected) {
                  menuItems.push({
                    key: "hold",
                    label: "Put on hold",
                    icon: <PauseCircle size={14} />,
                    className:
                      "w-full px-3 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2",
                    onClick: () =>
                      confirmAction({
                        action: "Hold",
                        businessName: b.companyName,
                        onConfirm: () => handleStatusChange(id, "hold"),
                      }),
                  });
                }

                return (
                  <tr
                    key={key}
                    className={[
                      "hover:bg-emerald-50/40 transition-colors",
                      isSelected ? "bg-emerald-50/60" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {b.companyName || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[280px] truncate">
                      <span title={b.businessEmail || ""}>
                        {b.businessEmail || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="leading-5">
                        <div className="font-medium text-slate-900">
                          {b.representativeName || "-"}
                        </div>
                        <div className="text-slate-600">{b.phone || "-"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 capitalize">
                      {b.plan || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={primaryDisabled}
                          onClick={() =>
                            confirmAction({
                              action: primaryLabel,
                              businessName: b.companyName,
                              onConfirm: () => handleStatusChange(id, "approve"),
                            })
                          }
                          className={[
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 disabled:opacity-50",
                            status === STATUS.approved
                              ? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200",
                          ].join(" ")}
                        >
                          <Check size={14} />
                          {primaryLabel}
                        </button>

                        <MoreActionsMenu disabled={isBusy} items={menuItems} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
