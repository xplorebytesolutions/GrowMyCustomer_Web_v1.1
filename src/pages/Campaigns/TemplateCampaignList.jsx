// 📄 src/pages/campaigns/TemplateCampaignList.jsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import WhatsAppBubblePreview from "../../components/WhatsAppBubblePreview";
import TemplateCard from "./components/templates/TemplateCard";
import normalizeCampaign from "../../utils/normalizeTemplate";
import { useNavigate } from "react-router-dom";
import { Menu, Portal, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaListUl,
  FaList,
  FaTable,
  FaThLarge,
  FaEye,
  FaEdit,
  FaTrash,
  FaUsers,
  FaPaperPlane,
  FaChartBar,
  FaEllipsisV,
  FaHistory,
  FaRegClock,
} from "react-icons/fa";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);


function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function CampaignRowMoreMenu({
  hasRecipients,
  canDelete,
  onPreview,
  onViewRecipients,
  onViewLogs,
  onLogReport,
  onDelete,
}) {
  const buttonRef = useRef(null);

  return (
    <Menu as="div" className="relative ml-2 inline-block text-left">
      {({ open }) => (
        <>
          <Menu.Button
            ref={buttonRef}
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span className="sr-only">Open options</span>
            <FaEllipsisV className="h-4 w-4" aria-hidden="true" />
          </Menu.Button>

          <CampaignRowMoreMenuItems
            open={open}
            buttonRef={buttonRef}
            hasRecipients={hasRecipients}
            canDelete={canDelete}
            onPreview={onPreview}
            onViewRecipients={onViewRecipients}
            onViewLogs={onViewLogs}
            onLogReport={onLogReport}
            onDelete={onDelete}
          />
        </>
      )}
    </Menu>
  );
}

function CampaignRowMoreMenuItems({
  open,
  buttonRef,
  hasRecipients,
  canDelete,
  onPreview,
  onViewRecipients,
  onViewLogs,
  onLogReport,
  onDelete,
}) {
  const itemsRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [originClass, setOriginClass] = useState("origin-top-right");
  const [positioned, setPositioned] = useState(false);

  const updatePosition = useCallback(() => {
    const anchor = buttonRef?.current;
    const menu = itemsRef?.current;
    if (!anchor || !menu) return;

    const anchorRect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    const margin = 8;
    const viewportPad = 8;

    const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;
    const openUp = spaceBelow < menuRect.height && spaceAbove > spaceBelow;

    const nextTop = openUp
      ? anchorRect.top - menuRect.height - margin
      : anchorRect.bottom + margin;

    const top = clamp(
      nextTop,
      viewportPad,
      Math.max(viewportPad, window.innerHeight - menuRect.height - viewportPad)
    );

    const nextLeft = anchorRect.right - menuRect.width;
    const left = clamp(
      nextLeft,
      viewportPad,
      Math.max(viewportPad, window.innerWidth - menuRect.width - viewportPad)
    );

    setOriginClass(openUp ? "origin-bottom-right" : "origin-top-right");
    setPosition({ top, left });
    setPositioned(true);
  }, [buttonRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPositioned(false);
      return;
    }

    setPositioned(false);
    const raf1 = requestAnimationFrame(updatePosition);
    const raf2 = requestAnimationFrame(updatePosition);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handler = () => updatePosition();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, updatePosition]);

  return (
    <Portal>
      <Transition
        show={open}
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          static
          ref={itemsRef}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            zIndex: 60,
            visibility: positioned ? "visible" : "hidden",
          }}
          className={cx(
            "w-48 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100 max-h-[60vh] overflow-auto",
            originClass
          )}
        >
          <div className="p-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onPreview}
                  className={cx(
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700",
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  )}
                >
                  <FaEye className="text-gray-400 group-hover:text-emerald-500" />
                  Preview Template
                </button>
              )}
            </Menu.Item>

            <Menu.Item disabled={!hasRecipients}>
              {({ active, disabled }) => (
                <button
                  disabled={disabled}
                  onClick={onViewRecipients}
                  className={cx(
                    disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700",
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  )}
                >
                  <FaUsers
                    className={cx(
                      "text-gray-400 group-hover:text-emerald-500",
                      disabled && "text-gray-300"
                    )}
                  />
                  View Recipients
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onViewLogs}
                  className={cx(
                    active ? "bg-amber-50 text-amber-700" : "text-gray-700",
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  )}
                >
                  <FaHistory className="text-gray-400 group-hover:text-amber-500" />
                  View Logs
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onLogReport}
                  className={cx(
                    active ? "bg-indigo-50 text-indigo-700" : "text-gray-700",
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  )}
                >
                  <FaChartBar className="text-gray-400 group-hover:text-indigo-500" />
                  Log Report
                </button>
              )}
            </Menu.Item>
          </div>

          <div className="p-1">
            <Menu.Item disabled={!canDelete}>
              {({ active, disabled }) => (
                <button
                  onClick={onDelete}
                  disabled={disabled}
                  className={cx(
                    disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : active
                      ? "bg-red-50 text-red-700"
                      : "text-gray-700",
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  )}
                >
                  <FaTrash
                    className={cx(
                      "text-gray-400 group-hover:text-red-500",
                      disabled && "text-gray-300"
                    )}
                  />
                  Delete Campaign
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Portal>
  );
}

const TYPE_FILTERS = [
  { id: "all", label: "All", icon: FaListUl },
  { id: "image_header", label: "Image Header", icon: FaEye },
  { id: "text_only", label: "Text Only", icon: FaEdit },
  { id: "with_buttons", label: "With Buttons", icon: FaPaperPlane },
  { id: "no_buttons", label: "No Buttons", icon: FaChartBar },
];

/* ---------- Inspector Modal ---------- */
function InspectorModal({ item, onClose }) {
  if (!item) return null;

  // Normalize fields from different shapes (DB list vs. detail vs. legacy)
  const messageTemplate =
    item.body || item.messageBody || item.templateBody || "";

  // Buttons can be `buttons`, `multiButtons`, or a JSON string
  let buttonsRaw = item.buttons ?? item.multiButtons ?? [];
  if (typeof buttonsRaw === "string") {
    try {
      buttonsRaw = JSON.parse(buttonsRaw);
    } catch {
      buttonsRaw = [];
    }
  }

  const imageUrl =
    item.imageUrl || item.mediaUrl || item.headerImageUrl || undefined;

  const caption = item.caption || item.imageCaption || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-slate-50 to-emerald-50">
          <div>
            <div className="text-lg font-bold text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-600">Template Preview</div>
          </div>
          <button
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <WhatsAppBubblePreview
            messageTemplate={messageTemplate}
            multiButtons={buttonsRaw}
            imageUrl={imageUrl}
            caption={caption}
            campaignId={item.id}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 bg-gray-50">
          <button
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Danger Delete Modal ---------- */
function DangerDeleteModal({
  open,
  target, // { id, name }
  usage, // { status, recipients, queuedJobs, sendLogs }
  loading, // loading usage
  deleting, // deleting flag
  onCancel,
  onConfirm,
}) {
  const [confirmed, setConfirmed] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  // React.useEffect removed to avoid update loop. 
  // State reset is handled by unmounting/remounting via key prop.

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b px-6 py-5 bg-red-50">
          <h3 className="text-xl font-bold text-gray-900">
            Delete this campaign permanently?
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            <strong>This action can't be undone.</strong> Deleting will
            permanently remove this campaign and everything linked to it— its
            audience and recipients, any scheduled or queued sends, and the full
            history for this campaign (messages and activity).
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Usage section */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
            {loading ? (
              <div className="text-sm text-gray-600">
                Loading campaign details…
              </div>
            ) : usage ? (
              <ul className="text-sm text-gray-800 space-y-2">
                <li className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <strong>{target?.name || "Untitled"}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <strong>{usage.status}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Recipients:</span>
                  <strong>{usage.recipients}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Scheduled/queued sends:</span>
                  <strong>{usage.queuedJobs}</strong>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Messages sent:</span>
                  <strong>{usage.sendLogs}</strong>
                </li>
              </ul>
            ) : (
              <div className="text-sm text-gray-600">No details available.</div>
            )}
          </div>

          {/* Confirmations */}
          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
              />
              <span>
                I understand this will permanently delete this campaign, its
                audience/recipients, any scheduled sends, and its history.
              </span>
            </label>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Type the campaign name to confirm:
              </label>
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={target?.name || "Campaign name"}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 bg-gray-50">
          <button
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className={cx(
              "rounded-xl px-4 py-2 text-white font-medium transition-colors",
              deleting ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
            )}
            onClick={onConfirm}
            disabled={
              deleting ||
              !confirmed ||
              (typed || "").trim() !== (target?.name || "").trim()
            }
          >
            {deleting ? "Deleting…" : "Permanently delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
function TemplateCampaignList() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null); // for card/table spinner
  const [q, setQ] = useState("");
  const [onlyWithRecipients, setOnlyWithRecipients] = useState(false);
  const [sort, setSort] = useState("recent"); // recent | recipients | name
  const [activeType, setActiveType] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // grid | table
  const [inspector, setInspector] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pagination state (MUST be defined before loadCampaigns)
  const [, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  const loadCampaigns = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Reverted to original endpoint that works
      const res = await axiosClient.get("/campaign/get-image-campaign");
      
      // Handle potential response formats (array vs object)
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setRaw(items);
      
      // Update total for pagination (client-side or server-side count)
      const total = Array.isArray(res.data) ? res.data.length : (res.data?.totalCount || 0);
      setPagination(prev => ({ ...prev, total }));
    } catch (err) {
      console.error(err);
      if (!silent) toast.error("Failed to load campaigns");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Auto-refresh polling for processing campaigns
  useEffect(() => {
    const hasProcessing = raw.some(
      c =>
        c.status === "Processing" ||
        c.status === "Sending" ||
        c.status === "InFlight"
    );

    if (hasProcessing) {
      const interval = setInterval(() => {
        loadCampaigns(true); // silent reload
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [raw]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSend = async campaignId => {
    setSendingId(campaignId);
    try {
      await axiosClient.post(`/campaign/send-campaign/${campaignId}`);
      toast.success("🚀 Campaign sent successfully!");
      loadCampaigns();
    } catch (err) {
      console.error("❌ Sending failed:", err);
      toast.error("❌ Failed to send campaign");
    } finally {
      setSendingId(null);
    }
  };

  // Open delete modal: fetch usage
  const openDelete = async item => {
    setDeleteTarget(item);
    setUsage(null);
    setUsageLoading(true);
    try {
      const res = await axiosClient.get(`/campaign/${item.id}/usage`);
      setUsage(res.data);
    } catch (err) {
      console.error("Usage fetch failed", err);
      toast.error("❌ Could not load campaign usage");
    } finally {
      setUsageLoading(false);
    }
  };

  // Confirm delete: call DELETE ?force=true
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeletingId(deleteTarget.id);
    try {
      const res = await axiosClient.delete(`/campaign/${deleteTarget.id}`, {
        params: { force: true },
      });
      toast.success(res?.data?.message || "🗑️ Campaign deleted permanently.");
      // Close modal + refresh
      setDeleteTarget(null);
      setUsage(null);
      await loadCampaigns();
    } catch (err) {
      console.error("Delete failed", err);
      const msg =
        err?.response?.data?.message || "❌ Failed to delete campaign.";
      if (err?.response?.status === 409) {
        toast.error(
          msg || "❌ Cannot delete while campaign is sending. Cancel or wait."
        );
      } else if (err?.response?.status === 400) {
        toast.error(
          msg ||
            "❌ Delete failed — only draft campaigns can be deleted without force."
        );
      } else if (err?.response?.status === 404) {
        toast.error("❌ Campaign not found.");
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setUsage(null);
    setUsageLoading(false);
    setDeleting(false);
  };

  const data = useMemo(() => raw.map(normalizeCampaign), [raw]);

  const view = useMemo(() => {
    let list = data;

    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(needle) ||
          c.body.toLowerCase().includes(needle)
      );
    }

    if (onlyWithRecipients) list = list.filter(c => c.recipients > 0);

    if (activeType !== "all") {
      list = list.filter(c => {
        if (activeType === "image_header") return c.kind === "image_header";
        if (activeType === "text_only") return c.kind === "text_only";
        if (activeType === "with_buttons") return c.hasButtons;
        if (activeType === "no_buttons") return !c.hasButtons;
        return true;
      });
    }

    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recipients") return b.recipients - a.recipients;
      const ax = new Date(a.updatedAt || 0).getTime();
      const bx = new Date(b.updatedAt || 0).getTime();
      return bx - ax; // recent
    });

    return list;
  }, [data, q, onlyWithRecipients, activeType, sort]);

  return (
    <div className="min-h-screen bg-[#f5f6f7]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <FaList className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Template Campaigns
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage and send your WhatsApp template campaigns
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative group">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name or message…"
                  className="w-full lg:w-72 rounded-xl border border-gray-200 pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyWithRecipients}
                    onChange={e => setOnlyWithRecipients(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Has recipients
                </label>

                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm cursor-pointer"
                >
                  <option value="recent">Sort: Recent</option>
                  <option value="recipients">Sort: Recipients</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Segmented filters */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {TYPE_FILTERS.map(f => {
              const Icon = f.icon;
              const isActive = activeType === f.id;
              return (
                <button
                  key={f.id}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "bg-white text-gray-600 border border-transparent hover:bg-emerald-50 hover:text-emerald-700"
                  )}
                  onClick={() => setActiveType(f.id)}
                >
                  <Icon className={cx("w-3.5 h-3.5", isActive ? "text-white" : "text-gray-400")} />
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                className={cx(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md transition-all",
                  viewMode === "grid"
                    ? "bg-emerald-50 text-emerald-700 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <FaThLarge className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={cx(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md transition-all",
                  viewMode === "table"
                    ? "bg-emerald-50 text-emerald-700 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
                onClick={() => setViewMode("table")}
                title="Table view"
              >
                <FaTable className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={loadCampaigns}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm transition-all bg-white/50"
              title="Refresh"
            >
              <FaSyncAlt className={cx(loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse"
              >
                <div className="h-40 w-full rounded-xl bg-gray-100" />
                <div className="mt-4 h-6 w-2/3 rounded bg-gray-100" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-100" />
                <div className="mt-4 h-20 w-full rounded bg-gray-100" />
                <div className="mt-6 flex gap-2">
                  <div className="h-10 w-24 rounded bg-gray-100" />
                  <div className="h-10 w-24 rounded bg-gray-100" />
                  <div className="h-10 w-24 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && view.length === 0 && (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="rounded-3xl border border-gray-200 p-12 shadow-sm bg-white max-w-lg">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-100 to-emerald-50">
                <FaListUl className="text-emerald-600 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No template campaigns found
              </h3>
              <p className="text-gray-600 mb-8">
                Try adjusting your filters or create a new campaign to get started.
              </p>
              <button
                onClick={loadCampaigns}
                className="rounded-xl border border-gray-200 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Refresh List
              </button>
            </div>
          </div>
        )}

        {/* GRID VIEW */}
        {!loading && view.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {view.map(t => {
              const sending = sendingId === t.id;
              const deletingThis = deletingId === t.id;
              return (
                <TemplateCard
                  key={t.id}
                  t={t}
                  sending={sending}
                  deleting={deletingThis}
                  onPreview={() => setInspector(t)}
                  onSend={() => handleSend(t.id)}
                  onAssign={() =>
                    navigate(
                      `/app/campaigns/image-campaigns/assign-contacts/${t.id}`
                    )
                  }
                  onViewRecipients={() =>
                    navigate(
                      `/app/campaigns/image-campaigns/assigned-contacts/${t.id}`
                    )
                  }
                  onDelete={() => openDelete(t)}
                />
              );
            })}
          </div>
        )}

        {/* TABLE VIEW (compact) */}
        {!loading && view.length > 0 && viewMode === "table" && (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm text-slate-900">
                <thead className="sticky top-0 z-10 bg-gray-100 backdrop-blur text-left text-xs font-semibold tracking-wider text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-4"></th>
                    <th className="px-4 py-3">Campaign Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-center">Recipients</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Sent At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {view.map(t => {
                     const hasRecipients = t.recipients > 0;
                     const statusRaw = (t?.status || "").toString().toLowerCase();
                     const isSent =
                       Boolean(t?.sentAt) ||
                       ["sent", "delivered", "dispatched", "completed"].includes(
                         statusRaw
                       );
                     const canDelete = hasRecipients && !isSent;
                      
                     return (
                      <tr
                        key={t.id}
                        className={cx(
                          "group hover:bg-gray-200 transition-colors",
                          view.indexOf(t) % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        )}
                      >
                        {/* Status Indicator Bar */}
                        <td className="px-4 py-3 align-middle">
                           <div className={cx(
                             "w-1.5 h-8 rounded-full",
                             hasRecipients ? "bg-emerald-500" : "bg-gray-200"
                           )} title={hasRecipients ? "Ready to send" : "No recipients assigned"}/>
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-900 group-hover:text-indigo-800 align-middle">
                          <span className="truncate max-w-[200px] xl:max-w-[300px]" title={t.name}>
                            {t.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 align-middle">
                          <span className={cx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                            t.kind === "image_header" 
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          )}>
                            {t.kind === "image_header" ? <FaEye className="opacity-70" /> : <FaEdit className="opacity-70" />}
                            {t.kind === "image_header" ? "Image Header" : "Text Only"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <button
                            disabled={!hasRecipients}
                            onClick={() =>
                              navigate(
                                `/app/campaigns/image-campaigns/assigned-contacts/${t.id}`
                              )
                            }
                            className={cx(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                              hasRecipients
                                ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                                : "bg-gray-100 text-gray-600 cursor-default"
                            )}
                            title={hasRecipients ? "View assigned recipients" : ""}
                          >
                            {t.recipients}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <span
                            className={cx(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                              isSent
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : statusRaw === "failed" 
                                ? "bg-red-50 text-red-700 border-red-100"
                                : statusRaw === "sending" || statusRaw === "processing"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            )}
                            title={t?.status ? `Status: ${t.status}` : undefined}
                          >
                            <FaPaperPlane className="opacity-70" />
                            {isSent ? "Sent" : t?.status || "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 group-hover:text-gray-800 text-xs align-middle">
                          <div
                            className="flex items-center gap-1.5"
                            title={t.sentAt ? new Date(t.sentAt).toLocaleString() : ""}
                          >
                            <FaRegClock className="text-gray-400 group-hover:text-gray-600" />
                            {t.sentAt ? dayjs(t.sentAt).fromNow() : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            {/* Context-Aware Actions */}
                            {isSent ? (
                                <>
                                  <button
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                                    onClick={() => navigate(`/app/campaigns/logs/${t.id}`)}
                                  >
                                    <FaHistory className="text-emerald-600" />
                                    View Logs
                                  </button>
                                  <button
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3.5 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                                    onClick={() => navigate(`/app/campaigns/${t.id}/reports/logs`)}
                                  >
                                    <FaChartBar className="text-indigo-600" />
                                    Log Report
                                  </button>
                                </>
                            ) : hasRecipients ? (
                              // READY STATE: Show "Send" as primary
                              <>
                                <button
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-md transition-colors"
                                  onClick={() =>
                                    navigate(
                                      `/app/campaigns/image-campaigns/assign-contacts/${t.id}`
                                    )
                                  }
                                >
                                  Assign
                                </button>
                                <button
                                  className="ml-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all"
                                  onClick={() => handleSend(t.id)}
                                >
                                  Send
                                </button>
                              </>
                            ) : (
                              // EMPTY STATE: Show "Assign" as primary
                                <button
                                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all"
                                  onClick={() =>
                                    navigate(
                                      `/app/campaigns/image-campaigns/assign-contacts/${t.id}`
                                    )
                                  }
                                >
                                  Assign Contacts
                                </button>
                            )}

                            {/* More Dropdown */}
                            <CampaignRowMoreMenu
                              hasRecipients={hasRecipients}
                              canDelete={canDelete}
                              onPreview={() => setInspector(t)}
                              onViewRecipients={() =>
                                navigate(
                                  `/app/campaigns/image-campaigns/assigned-contacts/${t.id}`
                                )
                              }
                              onViewLogs={() => navigate(`/app/campaigns/logs/${t.id}`)}
                              onLogReport={() =>
                                navigate(`/app/campaigns/${t.id}/reports/logs`)
                              }
                              onDelete={() => openDelete(t)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-4 text-sm text-slate-600 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-slate-700">
                  {view.length > 0 ? (
                    <>
                      Showing{' '}
                      <span className="font-semibold text-emerald-700">
                        1-{view.length}
                      </span>
                      {' '}of{' '}
                      <span className="font-semibold text-slate-900">{view.length}</span>
                      {' '}campaigns
                    </>
                  ) : (
                    'No campaigns'
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        <InspectorModal item={inspector} onClose={() => setInspector(null)} />

        <DangerDeleteModal
          key={deleteTarget?.id || 'closed'}
          open={!!deleteTarget}
          target={deleteTarget}
          usage={usage}
          loading={usageLoading}
          deleting={deleting}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
export default TemplateCampaignList;
