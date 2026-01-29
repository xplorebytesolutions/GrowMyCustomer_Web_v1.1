// 📄 src/pages/Workspaces/MyAccountWorkspace.jsx

import {
  MoreVertical,
  Archive,
  Pin,
  ArrowRightCircle,
  Phone,
  Lock,
  Globe,
  UserCog,
  AlertTriangle,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
// 🔔 Global upgrade flow
import { requestUpgrade } from "../../utils/upgradeBus";

// Map tiles → required permission(s)
const PERM_BY_BLOCK = {
  "whatsapp-settings": [FK.SETTINGS_WHATSAPP_SETTINGS_VIEW],
  "role-permission-mapping": [FK.SETTINGS_ROLE_PERMISSIONS_MAPPING],
  "team-management": [FK.SETTINGS_STAFF_MANAGEMENT],
  // Password change should be available to all authenticated users.
  "password-update": [],
  "meta-account": [FK.SETTINGS_META_ACCOUNT_MANAGEMENT],
  "billing-subscription": [FK.SETTINGS_BILLING_VIEW],
  "profile-update": [FK.SETTINGS_PROFILE_UPDATE],
};

// Workspace tiles
const accountBlocks = [
  {
    id: "profile-update",
    label: "Profile Update",
    description: "Update your business profile and contact details.",
    path: "/app/settings/profile-completion",
    icon: <UserCog size={22} />,
    action: "Edit Profile",
  },
  {
    id: "password-update",
    label: "Change Password",
    description: "Update your account password.",
    path: "/app/settings/password",
    icon: <Lock size={22} />,
    action: "Update Password",
  },
  {
    id: "team-management",
    label: "User & Staff Management",
    description: "Create staff users, assign roles, and control access status.",
    path: "/app/settings/team-management",
    icon: <UsersRound size={22} />,
    action: "Manage Staff",
  },
  {
    id: "role-permission-mapping",
    label: "Role Permission Mapping",
    description: "Create roles and assign permissions to staff users.",
    path: "/app/settings/role-permission-mapping",
    icon: <Lock size={22} />,
    action: "Permissions Mapping",
  },
  {
    id: "meta-account",
    label: "WhatsApp Api Integration",
    description: "Disconnect WhatsApp or handle Meta data deletion.",
    path: "/app/settings/meta-account",
    icon: <Globe size={22} />,
    action: "Manage Meta",
  },
  {
    id: "whatsapp-settings",
    label: "Manual Api Setup",
    description: "Configure WhatsApp credentials and integration.",
    path: "/app/settings/whatsapp",
    icon: <Phone size={22} />,
    action: "Open Settings",
  },
  {
    id: "billing-subscription",
    label: "Billing & Subscription",
    description: "View your current plan, invoices, and manage payments.",
    path: "/app/settings/billing",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
        <path d="M3 9h18" />
        <path d="M8 14h2" />
      </svg>
    ),
    action: "View Billing",
  },
];

export default function MyAccountWorkspace() {
  const navigate = useNavigate();
  const { isLoading, entLoading, can, hasAllAccess } = useAuth();

  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("myaccount-pinned") || "[]"),
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("myaccount-archived") || "[]"),
  );

  // Reconcile saved order with current block ids
  const allIds = useMemo(() => accountBlocks.map(b => b.id), []);
  const storedOrder =
    JSON.parse(localStorage.getItem("myaccount-order") || "null") || [];
  const initialOrder = useMemo(() => {
    if (!Array.isArray(storedOrder) || storedOrder.length === 0) return allIds;
    const known = storedOrder.filter(id => allIds.includes(id));
    const missing = allIds.filter(id => !known.includes(id));
    return [...known, ...missing];
  }, [allIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const [order, setOrder] = useState(initialOrder);
  const [showArchived, setShowArchived] = useState(false);

  const togglePin = (e, id) => {
    e.stopPropagation();
    const updated = pinned.includes(id)
      ? pinned.filter(i => i !== id)
      : [...pinned, id];
    setPinned(updated);
    localStorage.setItem("myaccount-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("myaccount-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("myaccount-order", JSON.stringify(newOrder));
  };

  // Build list of blocks (keep locked tiles visible; use allowed flag)
  const blocksWithAccess = order
    .map(id => accountBlocks.find(b => b.id === id))
    .filter(Boolean)
    .filter(b => (showArchived ? true : !archived.includes(b.id)))
    .map(block => {
      const codes = PERM_BY_BLOCK[block.id];
      const required = Array.isArray(codes) ? codes.filter(Boolean) : [];
      const allowed =
        hasAllAccess ||
        required.length === 0 ||
        required.some(code => can(code));

      return {
        ...block,
        allowed,
        primaryCode: (required && required[0]) || null,
      };
    });

  const anyVisible = blocksWithAccess.length > 0;
  const anyAllowed = blocksWithAccess.some(b => b.allowed);

  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading account workspace…
      </div>
    );
  }

  return (
    <div
      className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]"
      data-test-id="myaccount-root"
    >
      {/* Emerald sequential border animation (top→right→bottom→left) */}
      <style>{`
        @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

        .tile:hover .topline    { animation: drawRight .9s ease forwards; }
        .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
        .tile:hover .bottomline { animation: drawLeft  .9s ease .36s forwards; }
        .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }
      `}</style>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-emerald-800">
          ⚙️ My Account & Settings
        </h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={() => setShowArchived(!showArchived)}
            className="accent-emerald-600"
          />
          Show Archived Tools
        </label>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Manage your WhatsApp configuration, profile, security, and billing from
        a single place.
      </p>

      {/* If tiles exist but all are locked → restricted banner */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Account tools locked:</strong> Your current plan
            doesn&apos;t include these settings.
            <div className="text-sm mt-1 text-gray-600">
              Try opening a tile to see upgrade options, or contact your
              administrator.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="myaccount-blocks" direction="horizontal">
            {provided => (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {blocksWithAccess.map((block, index) => {
                  const baseCardClasses =
                    "tile group relative overflow-hidden cursor-pointer bg-white rounded-md border shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300";
                  const lockedClasses =
                    "opacity-70 border-dashed cursor-not-allowed hover:-translate-y-0 hover:shadow-sm";

                  const cardClasses = block.allowed
                    ? baseCardClasses
                    : `${baseCardClasses} ${lockedClasses}`;

                  const handleCardClick = () => {
                    if (!block.allowed) {
                      if (block.primaryCode) {
                        requestUpgrade({
                          reason: "feature",
                          code: block.primaryCode,
                          source: "myaccount.workspace.tile",
                        });
                      }
                      return;
                    }
                    navigate(block.path);
                  };

                  const handlePrimaryActionClick = e => {
                    e.stopPropagation();
                    if (!block.allowed) {
                      if (block.primaryCode) {
                        requestUpgrade({
                          reason: "feature",
                          code: block.primaryCode,
                          source: "myaccount.workspace.action",
                        });
                      }
                      return;
                    }
                    navigate(block.path);
                  };

                  return (
                    <Draggable
                      key={block.id}
                      draggableId={block.id}
                      index={index}
                    >
                      {provided => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          role="button"
                          tabIndex={0}
                          aria-label={`${block.label}: ${block.action}`}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleCardClick();
                          }}
                          onClick={handleCardClick}
                          className={cardClasses}
                          style={{ userSelect: "none" }}
                        >
                          {/* 🔒 Upgrade badge for locked tiles */}
                          {!block.allowed && (
                            <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              🔒 Upgrade
                            </span>
                          )}

                          {/* Emerald animated borders */}
                          <span
                            aria-hidden
                            className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(90deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleX(0)",
                            }}
                          />
                          <span
                            aria-hidden
                            className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(180deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleY(0)",
                            }}
                          />
                          <span
                            aria-hidden
                            className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(270deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleX(0)",
                            }}
                          />
                          <span
                            aria-hidden
                            className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
                            style={{
                              background:
                                "linear-gradient(0deg, #A7F3D0, #34D399, #059669)",
                              transform: "scaleY(0)",
                            }}
                          />

                          {/* Card content */}
                          <div className="flex items-start gap-4 p-5">
                            <div className="bg-emerald-50 rounded-md p-2 text-emerald-800">
                              {block.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-md font-semibold text-emerald-800 group-hover:text-emerald-900">
                                {block.label}
                              </h3>
                              <p className="text-sm text-slate-600 workspace-tile-desc">
                                {block.description}
                              </p>
                            </div>

                            {/* Kebab = drag handle (doesn't navigate) */}
                            <div
                              {...provided.dragHandleProps}
                              title="Drag to re-order"
                              className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreVertical size={16} />
                            </div>
                          </div>

                          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <button
                              onClick={handlePrimaryActionClick}
                              className="text-sm text-gray-700 font-medium flex items-center gap-1 hover:text-gray-900"
                            >
                              {block.allowed
                                ? block.action
                                : "Upgrade to unlock"}
                              <ArrowRightCircle size={18} />
                            </button>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={e => togglePin(e, block.id)}
                                title={
                                  pinned.includes(block.id) ? "Unpin" : "Pin"
                                }
                              >
                                <Pin
                                  size={18}
                                  className={
                                    pinned.includes(block.id)
                                      ? "text-red-600"
                                      : "text-gray-400 hover:text-red-500"
                                  }
                                />
                              </button>
                              <button
                                onClick={e => toggleArchive(e, block.id)}
                                title="Archive this"
                              >
                                <Archive
                                  size={18}
                                  className={
                                    archived.includes(block.id)
                                      ? "text-indigo-600"
                                      : "text-gray-400 hover:text-indigo-500"
                                  }
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {!anyVisible && (
        <div className="bg-red-100 text-red-700 p-4 border-l-4 border-red-500 rounded-md mt-4 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>No account tiles:</strong> All account tools are archived or
            hidden.
            <div className="text-sm mt-1 text-gray-600">
              Un-archive some tiles to see them here again.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
