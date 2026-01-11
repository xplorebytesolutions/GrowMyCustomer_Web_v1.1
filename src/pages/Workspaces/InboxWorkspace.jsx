// 📄 src/pages/Workspaces/InboxWorkspace.jsx

import {
  MessageSquareText,
  MoreVertical,
  Archive,
  Pin,
  ArrowRightCircle,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
// 🔔 Global upgrade flow
import { requestUpgrade } from "../../utils/upgradeBus";

// Map tiles → required permission(s)
const PERM_BY_BLOCK = {
  "inbox-view": [FK.INBOX_VIEW],
  "chat-inbox-view": [FK.INBOX_CHAT_VIEW],
};

// Workspace tiles
const inboxBlocks = [

  {
    id: "chat-inbox-view",
    label: "Chat Inbox",
    description:
      "Adance live chat inbox to manage and respond to conversations instantly.",
    path: "/app/inbox/chatinbox",
    icon: <MessageSquareText size={22} />,
    action: "Chat inbox",
  },
];

export default function InboxWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, entLoading, can, hasAllAccess } = useAuth();

  const hideWorkspaceTiles =
    new URLSearchParams(location.search || "").get("flyout") === "1";

  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("inbox-pinned") || "[]")
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("inbox-archived") || "[]")
  );

  // Reconcile saved order with current block ids
  const allIds = useMemo(() => inboxBlocks.map(b => b.id), []);
  const storedOrder =
    JSON.parse(localStorage.getItem("inbox-order") || "null") || [];
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
    localStorage.setItem("inbox-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("inbox-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("inbox-order", JSON.stringify(newOrder));
  };

  // Build list of blocks (keep locked tiles visible; use allowed flag)
  const blocksWithAccess = order
    .map(id => inboxBlocks.find(b => b.id === id))
    .filter(Boolean)
    .filter(b => (showArchived ? true : !archived.includes(b.id)))
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
        Loading inbox…
      </div>
    );
  }

  if (hideWorkspaceTiles) {
    return <div className="p-6" data-test-id="inbox-root" />;
  }

  return (
    <div className="p-6" data-test-id="inbox-root">
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

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-emerald-800">
          📨 Inbox Workspace
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
        Switch to a live WhatsApp-style inbox to handle ongoing conversations,
        respond faster, and maintain context across chats.
      </p>

      {/* If tiles exist but all are locked → restricted banner */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Inbox locked:</strong> Your current plan doesn&apos;t
            include the live chat inbox.
            <div className="text-sm mt-1 text-gray-600">
              Try opening the tile to see upgrade options, or contact your
              administrator.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="inbox-blocks" direction="horizontal">
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
                          source: "inbox.workspace.tile",
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
                          source: "inbox.workspace.action",
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
            <strong>No inbox tiles:</strong> All inbox tools are archived or
            hidden.
            <div className="text-sm mt-1 text-gray-600">
              Un-archive the Live Chat tile to see it here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
