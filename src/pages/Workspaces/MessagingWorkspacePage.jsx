// 📄 File: src/pages/Messaging/MessagingWorkspacePage.jsx

import {
  ArrowRightCircle,
  MoreVertical,
  Archive,
  Pin,
  Send,
  FileText,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// ✅ server-authoritative permissions (can/hasAllAccess)
import { useAuth } from "../../app/providers/AuthProvider";
// ✅ centralized permission codes (FK)
import { FK } from "../../capabilities/featureKeys";
// ✅ upgrade flow (global UpgradeModal trigger)
import { requestUpgrade } from "../../utils/upgradeBus";
// ✅ quota helpers from Entitlements
import { useQuota } from "../../app/providers/EntitlementsProvider";

// --- Permission map for each block (aligns with FK) ---
const PERM_BY_BLOCK = {
  "send-direct-text": [FK.MESSAGING_SEND_TEXT],
  "send-template-message": [FK.MESSAGING_SEND_TEMPLATE],
  "view-messaging-reports": [FK.MESSAGING_REPORT_VIEW],
  // "status-logs": [FK.MESSAGING_STATUS_VIEW],
};

// --- Cards (tiles) ---
const messageBlocks = [
  {
    id: "send-direct-text",
    label: "Send Non-Template Message",
    description: "Send non-template messages to one or multiple contacts.",
    path: "/app/messaging/send-direct-text",
    icon: <Send size={22} />,
    action: "Send Non-Template",
  },
  {
    id: "send-template-message",
    label: "Send Template Message",
    description:
      "Use approved WhatsApp templates for consistent, scalable messaging.",
    path: "/app/messaging/send-template-message",
    icon: <FileText size={22} />,
    action: "Send Template",
  },
  {
    id: "view-messaging-reports",
    label: "Messaging Reports & Analytics",
    description:
      "Track delivery, reads, and performance of your WhatsApp campaigns.",
    path: "/app/messaging/reports",
    icon: <BarChart3 size={22} />,
    action: "Coming Soon",
  },
];

// --- Quota summary banner for Messaging ---
function MessagingQuotaSummary() {
  const quota = useQuota("MESSAGES_PER_MONTH");

  if (!quota) return null;

  const quotaKey =
    (quota.quotaKey ||
      quota.QuotaKey ||
      quota.key ||
      quota.Key ||
      "MESSAGES_PER_MONTH") + "";

  const periodRaw = quota.period || quota.Period || "Monthly";
  const periodLabel = (periodRaw || "Monthly").toLowerCase();

  const used =
    typeof quota.consumed === "number"
      ? quota.consumed
      : typeof quota.Consumed === "number"
      ? quota.Consumed
      : 0;

  const limit =
    typeof quota.limit === "number"
      ? quota.limit
      : typeof quota.Limit === "number"
      ? quota.Limit
      : null;

  const remaining =
    typeof quota.remaining === "number"
      ? quota.remaining
      : typeof quota.Remaining === "number"
      ? quota.Remaining
      : null;

  let pct = null;
  if (limit && limit > 0) {
    pct = Math.min(100, Math.round((used / limit) * 100));
  }

  const isLimited = limit != null;
  const isLow =
    isLimited && remaining != null
      ? remaining <= Math.max(100, limit * 0.1)
      : false;

  return (
    <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-emerald-800">
          Messages – current {periodLabel}
        </div>

        {!isLimited ? (
          <div className="text-xs text-emerald-700 mt-1">
            Your current plan has{" "}
            <span className="font-semibold">no hard message limit</span>.
          </div>
        ) : (
          <>
            <div className="text-sm text-emerald-900 mt-1">
              <span className="font-semibold">
                {used.toLocaleString("en-IN")}
              </span>{" "}
              used{" "}
              <span className="text-xs text-emerald-700">
                / {limit.toLocaleString("en-IN")} total
              </span>
            </div>
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="h-2 bg-emerald-600"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
              {remaining != null && (
                <div className="mt-1 text-[11px] text-emerald-700">
                  {remaining.toLocaleString("en-IN")} messages remaining this{" "}
                  {periodLabel}.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isLimited && isLow && (
        <button
          type="button"
          className="text-xs px-3 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 shadow-sm hover:bg-emerald-50"
          onClick={() =>
            requestUpgrade({
              reason: "quota",
              quotaKey: quotaKey.toUpperCase(),
              source: "messaging.workspace.quota_banner",
            })
          }
        >
          Upgrade plan
        </button>
      )}
    </div>
  );
}

export default function MessagingWorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, can, hasAllAccess, entLoading } = useAuth();

  const hideWorkspaceTiles =
    new URLSearchParams(location.search || "").get("flyout") === "1";

  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("messaging-pinned") || "[]")
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("messaging-archived") || "[]")
  );
  const [order, setOrder] = useState(
    JSON.parse(localStorage.getItem("messaging-order")) ||
      messageBlocks.map(b => b.id)
  );

  const togglePin = (e, id) => {
    e.stopPropagation();
    const updated = pinned.includes(id)
      ? pinned.filter(i => i !== id)
      : [...pinned, id];
    setPinned(updated);
    localStorage.setItem("messaging-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("messaging-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("messaging-order", JSON.stringify(newOrder));
  };

  // Build list of blocks (we show both locked + unlocked)
  const blocksWithAccess = order
    .map(id => messageBlocks.find(b => b.id === id))
    .filter(Boolean)
    .filter(b => !archived.includes(b.id))
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

  // 🔐 Wait for both /auth/context and /entitlements
  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading messaging features…
      </div>
    );
  }

  const anyVisible = blocksWithAccess.length > 0;
  const anyAllowed = blocksWithAccess.some(b => b.allowed);

  if (hideWorkspaceTiles) {
    return (
      <div
        className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]"
        data-test-id="messaging-root"
      />
    );
  }

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]" data-test-id="messaging-root">
      {/* Emerald-themed border animation, same pattern as CRM / Catalog / Campaign */}
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

      <h2 className="text-2xl font-bold text-emerald-800 mb-1">
        💬 Messaging Workspace
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Send one-off and template messages, and analyse messaging performance.
      </p>

      {/* Quota summary banner */}
      <MessagingQuotaSummary />

      {/* If tiles exist but all are locked → show a “restricted” banner, like CRM/Catalog */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Locked messaging tools:</strong> Your current plan
            doesn&apos;t include these messaging features.
            <div className="text-sm mt-1 text-gray-600">
              Try opening a tile to see upgrade options, or contact your
              administrator.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="messaging-blocks" direction="horizontal">
            {provided => (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {blocksWithAccess.map((block, index) => {
                  const baseCardClasses =
                    "tile group relative overflow-hidden rounded-md border bg-white shadow-sm transition transform hover:-translate-y-0.5 hover:shadow-md duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer";
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
                          source: "messaging.workspace.tile",
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
                          source: "messaging.workspace.action",
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

                          {/* Emerald animated border segments */}
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

                          {/* Card content – same structure as CRM/Catalog/Campaign tiles */}
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

                            {/* MoreVertical = drag handle only */}
                            <div
                              {...provided.dragHandleProps}
                              title="Drag to re-order"
                              className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreVertical size={16} />
                            </div>
                          </div>

                          {/* Footer actions */}
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
            <strong>No messaging tiles:</strong> All messaging tools are
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
