// 📄 src/pages/Workspaces/AdminWorkspacePage.jsx
import {
  ShieldCheck,
  SquareStack,
  Archive,
  Pin,
  ArrowRightCircle,
  MoreVertical,
  AlertTriangle,
  BarChart3,
  LucideBotMessageSquare,
  FileCode2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
// 🔔 Global upgrade flow
import { requestUpgrade } from "../../utils/upgradeBus";

const PERM_BY_BLOCK = {
  "business-approvals": [FK.SUPER_ADMIN_NEW_BUSINESS_APPROVAL],
  "plan-manager": [FK.SUPER_ADMIN_PLAN_MANAGER_VIEW],
  "plan-permissions": [FK.SUPER_ADMIN_PLAN_MANAGER_VIEW],
  "paln-permissions-list": [FK.SUPER_ADMIN_PLAN_PERMISSIONS_LIST],
  "esu-debug": [FK.SUPER_ADMIN_ESU_DEBUG],
  "account-signup-report": [FK.SUPER_ADMIN_SIGNUP_REPORT_VIEW],
  "business-overview": [FK.SUPER_ADMIN_BUSINESS_OVERVIEW],
  "webhook-monitor": [FK.SUPER_ADMIN_WEBHOOK_MONITOR],
  "user-permissions": [FK.SUPER_ADMIN_USER_MANAGEMENT_VIEW],
  "flow-execution-explorer": [FK.SUPER_ADMIN_FLOW_EXECUTION_EXPLORER_VIEW],
  "developer-notes": [FK.SUPER_ADMIN_WORKSPACE_VIEW],
};

const allAdminBlocks = [
  {
    id: "business-approvals",
    label: "Business Approvals",
    description: "Approve or reject pending business signups.",
    path: "/app/admin/approvals",
    icon: <ShieldCheck size={22} />,
    action: "Review Requests",
    roles: ["superadmin", "partner", "reseller"],
  },
  {
    id: "plan-manager",
    label: "Plan → Feature Mapping",
    description: "Define feature limits for each plan tier.",
    path: "/app/admin/plan-management",
    icon: <SquareStack size={22} />,
    action: "Manage Plans",
    roles: ["superadmin"],
  },
  {
    id: "paln-permissions-list",
    label: "Permissions list",
    description:
      "Define and organize permissions that power plans and workspace guards.",
    path: "/app/admin/permissions",
    icon: <ShieldCheck size={22} />,
    action: "Manage Permissions",
    roles: ["superadmin"],
  },
  {
    id: "esu-debug",
    label: "FB Embedded Signup Debug",
    description:
      "Inspect ESU tokens/flags and locally deauthorize a workspace (dev / superadmin only).",
    path: "/app/admin/esu-debug",
    icon: <ShieldCheck size={22} />,
    action: "Open ESU Debug",
    roles: ["superadmin"], // only superadmins see it
  },
  {
    id: "account-signup-report",
    label: "Signup Report",
    description:
      "Track signup → activation → WhatsApp setup → paid conversion across all accounts.",
    path: "/app/admin/account-insights",
    icon: <BarChart3 size={22} />,
    action: "View Report",
    roles: ["superadmin"],
  },
  {
    id: "business-overview",
    label: "Business Overview",
    description:
      "Detailed lifecycle, trial, and risk reports with drilldowns and exports.",
    path: "/app/admin/account-insights/account-reports",
    icon: <BarChart3 size={22} />,
    action: "Open Overview",
    roles: ["superadmin"],
  },
  {
    id: "webhook-monitor",
    label: "Webhook Reliability & Cleanup",
    description:
      "Monitor failed webhook callbacks and control auto-cleanup of webhook logs.",
    path: "/app/admin/webhooks/monitor",
    icon: <AlertTriangle size={22} />,
    action: "Open Webhook Tools",
    roles: ["superadmin"],
  },
  {
    id: "user-permissions",
    label: "User Access & Permissions",
    description: "Override permissions for individual users in your account.",
    path: "/app/admin/user-permissions",
    icon: <BarChart3 className="text-emerald-800" size={22} />,
    action: "Manage Access",
    roles: ["superadmin"],
  },
  {
    id: "flow-execution-explorer",
    label: "Flow Execution Explorer",
    description: "Audit and analyze flow executions across all businesses.",
    path: "/app/admin/audit/execution-explorer",
    icon: <LucideBotMessageSquare className="text-emerald-800" size={22} />,
    action: "Open Explorer",
    roles: ["superadmin"],
  },
  {
    id: "developer-notes",
    label: "Developer Notes",
    description:
      "Internal sanity checks, SQL snippets, and engineering decisions for faster debugging.",
    path: "/app/admin/developer-notes",
    icon: <FileCode2 size={22} />,
    action: "Open Notes",
    roles: ["superadmin"],
  },
];

export default function AdminWorkspacePage() {
  const navigate = useNavigate();
  const { role, hasAllAccess, can, isLoading, entLoading } = useAuth();
  const userRole = String(role || "").toLowerCase();

  const defaultOrder = allAdminBlocks.map(b => b.id);
  const loadOrder = () => {
    try {
      const raw = localStorage.getItem("admin-order");
      if (!raw) return defaultOrder;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return defaultOrder;
      return [...parsed, ...defaultOrder.filter(id => !parsed.includes(id))];
    } catch {
      return defaultOrder;
    }
  };

  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("admin-pinned") || "[]")
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("admin-archived") || "[]")
  );
  const [order, setOrder] = useState(loadOrder());
  const [showArchived, setShowArchived] = useState(false);

  const togglePin = (e, id) => {
    e.stopPropagation();
    const updated = pinned.includes(id)
      ? pinned.filter(i => i !== id)
      : [...pinned, id];
    setPinned(updated);
    localStorage.setItem("admin-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("admin-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("admin-order", JSON.stringify(newOrder));
  };

  const roleOk = block =>
    hasAllAccess ||
    !Array.isArray(block.roles) ||
    block.roles.map(r => String(r).toLowerCase()).includes(userRole);

  // Build list of blocks:
  // - filtered by role (superadmin-only tiles hidden for others)
  // - archived controlled by toggle
  // - permission decides allowed vs locked, not visibility
  const blocksWithAccess = order
    .map(id => allAdminBlocks.find(b => b.id === id))
    .filter(Boolean)
    .filter(block => roleOk(block))
    .filter(block => (showArchived ? true : !archived.includes(block.id)))
    .map(block => {
      const codes = PERM_BY_BLOCK[block.id] || [];
      const allowed =
        hasAllAccess ||
        (Array.isArray(codes) && codes.filter(Boolean).some(code => can(code)));

      return {
        ...block,
        allowed,
        primaryCode: (codes && codes[0]) || null,
      };
    });

  const anyVisible = blocksWithAccess.length > 0;
  const anyAllowed = blocksWithAccess.some(b => b.allowed);

  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading admin tools…
      </div>
    );
  }

  return (
    <div className="p-6" data-test-id="admin-workspace-root">
      {/* sequential border animation (top→right→bottom→left) with gradient */}
      <style>{`
        @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

        .tile:hover .topline    { animation: drawRight .9s ease forwards; }
        .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
        .tile:hover .bottomline { animation: drawLeft .9s ease .36s forwards; }
        .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }
      `}</style>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-emerald-800">
          🛡 Admin Workspace
        </h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Manage plans, permissions, account health, webhooks, and ESU debugging
        across all businesses.
      </p>

      {/* No blocks visible at all (role-based restriction) */}
      {!anyVisible && (
        <div className="bg-red-100 text-red-700 p-4 border-l-4 border-red-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Restricted:</strong> You don’t have access to any admin
            tools.
            <div className="text-sm mt-1 text-gray-600">
              This usually means your role is not superadmin / admin. Contact a
              superadmin if this is unexpected.
            </div>
          </div>
        </div>
      )}

      {/* Some tiles visible but all locked by permissions */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Admin tools locked:</strong> Your current permissions do not
            include these tools.
            <div className="text-sm mt-1 text-gray-600">
              Try opening a tile to request the right access, or contact your
              platform owner.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="admin-blocks" direction="horizontal">
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
                          source: "admin.workspace.tile",
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
                          source: "admin.workspace.action",
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
                              🔒 Request Access
                            </span>
                          )}

                          {/* animated border segments (emerald-ish / neutral gradient) */}
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

                          {/* content */}
                          <div className="flex items-start gap-4 p-5">
                            <div className="bg-emerald-50 rounded-md p-2 text-emerald-800">
                              {block.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-md font-semibold text-emerald-800 group-hover:text-emerald-900">
                                {block.label}
                              </h3>
                              <p className="text-sm text-slate-600">
                                {block.description}
                              </p>
                            </div>

                            {/* kebab = the ONLY drag handle */}
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
                              {block.allowed ? block.action : "Request access"}
                              <ArrowRightCircle size={18} />
                            </button>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={e => togglePin(e, block.id)}
                                title={
                                  pinned.includes(block.id)
                                    ? "Unpin"
                                    : "Pin this"
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
    </div>
  );
}
