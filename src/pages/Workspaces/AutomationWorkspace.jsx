// 📄 src/pages/Workspaces/AutomationWorkspace.jsx

import {
  MessageCircleHeart,
  RefreshCcw,
  MessageSquareText,
  ArrowRightCircle,
  MoreVertical,
  Archive,
  Pin,
  FileBarChart,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// ✅ server-authoritative perms
import { useAuth } from "../../app/providers/AuthProvider";
// ✅ centralized capability keys
import { FK } from "../../capabilities/featureKeys";
// ✅ upgrade flow (global UpgradeModal trigger)
import { requestUpgrade } from "../../utils/upgradeBus";

/* ---------- Permissions map (per-tile) ---------- */
const PERM_BY_BLOCK = {
  "create-template-flow": [FK.AUTOMATION_CREATE_TEMPLATE_FLOW],
  "create-auto-reply-bot": [FK.AUTOMATION_CREATE_BOT],
  "flow-manager": [FK.AUTOMATION_VIEW_FLOW_MANAGE],
  "flow-analytics": [FK.AUTOMATION_VIEW_FLOW_ANALYTICS],
};

/* ---------- Tiles ---------- */
const automationBlocks = [
  {
    id: "create-template-flow",
    label: "Create Template Flow",
    description: "Visually design the flow using a drag-and-drop builder.",
    path: "/app/cta-flow/visual-builder",
    icon: <RefreshCcw size={22} />,
    action: "Create Template Flow",
  },
  {
    id: "create-auto-reply-bot",
    label: "Create Auto Reply Bot",
    description:
      "Design an automated bot to reply to specific keywords, triggers or contacts.",
    path: "/app/automation/auto-reply-builder",
    icon: <MessageCircleHeart size={22} />,
    action: "Create Bot",
  },
  {
    id: "flow-manager",
    label: "Flow Manager",
    description: "Organize and manage all auto-reply flows.",
    path: "/app/cta-flow/flow-manager",
    icon: <MessageSquareText size={22} />,
    action: "Flow Manager",
  },
  {
    id: "flow-analytics",
    label: "Flow Analytics",
    description: "Analyze visual flows and CTA button performance.",
    path: "/app/campaigns/FlowAnalyticsDashboard",
    icon: <FileBarChart size={22} />,
    action: "Open Dashboard",
  },
];

export default function AutomationWorkspace() {
  const navigate = useNavigate();
  const { isLoading, can, hasAllAccess, entLoading } = useAuth();

  // --- LocalStorage keys under "automation-*"
  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("automation-pinned") || "[]")
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("automation-archived") || "[]")
  );

  // Seed order with all current ids; reconcile with any saved order
  const allIds = useMemo(() => automationBlocks.map(b => b.id), []);
  const storedOrder =
    JSON.parse(localStorage.getItem("automation-order") || "null") || [];
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
    localStorage.setItem("automation-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("automation-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("automation-order", JSON.stringify(newOrder));
  };

  // Build list of blocks (show both locked + unlocked)
  const blocksWithAccess = order
    .map(id => automationBlocks.find(b => b.id === id))
    .filter(Boolean)
    .filter(b => (showArchived ? true : !archived.includes(b.id)))
    .map(block => {
      const codes = PERM_BY_BLOCK[block.id] || [];
      const allowed =
        hasAllAccess || (Array.isArray(codes) && codes.some(code => can(code)));

      return {
        ...block,
        allowed,
        primaryCode: codes[0] || null,
      };
    });

  const anyVisible = blocksWithAccess.length > 0;
  const anyAllowed = blocksWithAccess.some(b => b.allowed);

  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading automation features…
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]" data-test-id="automation-root">
      {/* Emerald animated border, same pattern as other workspaces */}
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

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-emerald-800">
          🤖 Automation Workspace
        </h2>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={() => setShowArchived(!showArchived)}
            className="accent-emerald-600"
          />
          Show Archived
        </label>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Build template flows, auto-reply bots, manage automations, and analyze
        performance of your WhatsApp journeys.
      </p>

      {/* If tiles exist but all are locked → show restricted banner */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Locked automation tools:</strong> Your current plan
            doesn&apos;t include these automation features.
            <div className="text-sm mt-1 text-gray-600">
              Try opening a tile to see upgrade options, or contact your
              administrator.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="automation-blocks" direction="horizontal">
            {provided => (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {blocksWithAccess.map((block, index) => {
                  const baseCardClasses =
                    "tile group relative overflow-hidden rounded-md border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer";
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
                          source: "automation.workspace.tile",
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
                          source: "automation.workspace.action",
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

                          {/* Emerald animated border (top → right → bottom → left) */}
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

                          {/* Card body */}
                          <div className="flex items-start gap-4 p-5">
                            <div className="bg-emerald-50 rounded-md p-2 text-emerald-800">
                              {block.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-md font-semibold text-emerald-800 truncate group-hover:text-emerald-900">
                                {block.label}
                              </h3>
                              <p className="text-sm text-slate-600">
                                {block.description}
                              </p>
                            </div>

                            {/* Drag handle only on kebab */}
                            <div
                              {...provided.dragHandleProps}
                              title="Drag to re-order"
                              className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreVertical size={16} />
                            </div>
                          </div>

                          {/* Footer */}
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
            <strong>No automation tiles:</strong> All automation tools are
            archived or hidden.
            <div className="text-sm mt-1 text-gray-600">
              Un-archive some tiles to see them here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
