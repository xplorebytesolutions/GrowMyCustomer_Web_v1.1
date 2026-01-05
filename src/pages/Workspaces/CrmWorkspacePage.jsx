// 📄 File: src/pages/Workspaces/CrmWorkspacePage.jsx

import {
  Archive,
  Pin,
  ArrowRightCircle,
  UserCircle2,
  Tags,
  BellRing,
  Clock4,
  StickyNote,
  MoreVertical,
  AlertTriangle,
  SlidersHorizontal, // ✅ NEW (Attribute tile icon)
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// ✅ server-authoritative AuthProvider
import { useAuth } from "../../app/providers/AuthProvider";
// 🔔 Global upgrade flow
import { requestUpgrade } from "../../utils/upgradeBus";
import { FK } from "../../capabilities/featureKeys";

/**
 * 🔐 Map CRM blocks to EXACT Permission.Code values from your back end.
 */

const PERM_BY_BLOCK = {
  contacts: [FK.CRM_CONTACT_VIEW],
  tags: [FK.CRM_TAGS_VIEW],
  reminders: [FK.CRM_REMINDERS_VIEW],
  timeline: [FK.CRM_TIMELINE_VIEW],
  notes: [FK.CRM_NOTES_VIEW],
  attributes: FK.CRM_ATTRIBUTE_VIEW, // ✅ NEW TILE
};

const crmBlocks = [
  {
    id: "contacts",
    label: "Contacts",
    description: "Central place to manage leads, customers, and their details.",
    path: "/app/crm/contacts",
    icon: <UserCircle2 size={22} />,
    action: "Open Contacts",
  },
  {
    id: "tags",
    label: "Tags",
    description: "Organize and filter contacts using color-coded tags.",
    path: "/app/crm/tags",
    icon: <Tags size={22} />,
    action: "Manage Tags",
  },

  // ✅ NEW TILE: Attribute (Custom Fields)
  {
    id: "attributes",
    label: "Attribute",
    description:
      "Create and manage custom attributes for contacts (dynamic fields).",
    path: "/app/crm/attributes", // ✅ make sure your App route exists
    icon: <SlidersHorizontal size={22} />,
    action: "Open Attributes",
  },

  {
    id: "reminders",
    label: "Reminders",
    description: "Schedule follow-ups and set alerts to never miss a lead.",
    path: "/app/crm/reminders",
    icon: <BellRing size={22} />,
    action: "View Reminders",
  },
  {
    id: "timeline",
    label: "Timeline",
    description: "Track every interaction and touchpoint with each contact.",
    path: "/app/crm/timeline",
    icon: <Clock4 size={22} />,
    action: "View Timeline",
  },
  {
    id: "notes",
    label: "Notes",
    description: "Capture notes and key details for each contact.",
    path: "/app/crm/notes",
    icon: <StickyNote size={22} />,
    action: "Open Notes",
  },
];

export default function CrmWorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, entLoading, hasAllAccess, can } = useAuth();

  const hideWorkspaceTiles =
    new URLSearchParams(location.search || "").get("flyout") === "1";

  // --- LocalStorage keys under "crm-*"
  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("crm-pinned") || "[]")
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("crm-archived") || "[]")
  );

  // Seed order with all current ids; reconcile with any saved order
  const allIds = useMemo(() => crmBlocks.map(b => b.id), []);
  const storedOrder =
    JSON.parse(localStorage.getItem("crm-order") || "null") || [];
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
    localStorage.setItem("crm-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("crm-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("crm-order", JSON.stringify(newOrder));
  };

  // Build list of blocks (show both locked + unlocked)
  const blocksWithAccess = order
    .map(id => crmBlocks.find(b => b.id === id))
    .filter(Boolean)
    .filter(b => (showArchived ? true : !archived.includes(b.id)))
    .map(block => {
      const codes = PERM_BY_BLOCK[block.id] || [];
      const codeList = Array.isArray(codes) ? codes : [codes].filter(Boolean);
      const allowed =
        hasAllAccess ||
        (codeList.length > 0 &&
          typeof can === "function" &&
          codeList.some(code => can(code)));

      return {
        ...block,
        allowed,
        primaryCode: codeList[0] || null,
      };
    });

  const anyVisible = blocksWithAccess.length > 0;
  const anyAllowed = blocksWithAccess.some(b => b.allowed);

  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading CRM features…
      </div>
    );
  }

  if (hideWorkspaceTiles) {
    return (
      <div
        className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]"
        data-test-id="crm-root"
      />
    );
  }

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]" data-test-id="crm-root">

      {/* Emerald animated border, same pattern as Automation workspace */}
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
          📇 CRM Workspace
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
        Manage contacts, tags, reminders, and interaction timelines in one
        place.
      </p>

      {/* If tiles exist but all are locked → show restricted banner */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Locked CRM tools:</strong> Your current plan doesn&apos;t
            include these CRM features.
            <div className="text-sm mt-1 text-gray-600">
              Try opening a tile to see upgrade options, or contact your
              administrator.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="crm-blocks" direction="horizontal">
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
                          source: "crm.workspace.tile",
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
                          source: "crm.workspace.action",
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
                              <p className="text-sm text-slate-600 workspace-tile-desc">
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
            <strong>No CRM tiles:</strong> All CRM tools are archived or hidden.
            <div className="text-sm mt-1 text-gray-600">
              Un-archive some tiles to see them here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// // 📄 File: src/pages/Workspaces/CrmWorkspacePage.jsx

// import {
//   Archive,
//   Pin,
//   ArrowRightCircle,
//   UserCircle2,
//   Tags,
//   BellRing,
//   Clock4,
//   MoreVertical,
//   AlertTriangle,
// } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import { useState, useMemo } from "react";
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// // ✅ server-authoritative AuthProvider
// import { useAuth } from "../../app/providers/AuthProvider";
// // 🔔 Global upgrade flow
// import { requestUpgrade } from "../../utils/upgradeBus";
// import { FK } from "../../capabilities/featureKeys";

// /**
//  * 🔐 Map CRM blocks to EXACT Permission.Code values from your back end.
//  */
// const PERM_BY_BLOCK = {
//   contacts: [FK.CRM_CONTACT_VIEW],
//   tags: [FK.CRM_TAGS_VIEW],
//   reminders: [FK.CRM_REMINDERS_VIEW],
//   timeline: [FK.CRM_TIMELINE_VIEW],
// };

// const crmBlocks = [
//   {
//     id: "contacts",
//     label: "Contacts",
//     description: "Central place to manage leads, customers, and their details.",
//     path: "/app/crm/contacts",
//     icon: <UserCircle2 size={22} />,
//     action: "Open Contacts",
//   },
//   {
//     id: "tags",
//     label: "Tags",
//     description: "Organize and filter contacts using color-coded tags.",
//     path: "/app/crm/tags",
//     icon: <Tags size={22} />,
//     action: "Manage Tags",
//   },
//   {
//     id: "reminders",
//     label: "Reminders",
//     description: "Schedule follow-ups and set alerts to never miss a lead.",
//     path: "/app/crm/reminders",
//     icon: <BellRing size={22} />,
//     action: "View Reminders",
//   },
//   {
//     id: "timeline",
//     label: "Timeline",
//     description: "Track every interaction and touchpoint with each contact.",
//     path: "/app/crm/timeline",
//     icon: <Clock4 size={22} />,
//     action: "View Timeline",
//   },
// ];

// export default function CrmWorkspacePage() {
//   const navigate = useNavigate();
//   const { isLoading, entLoading, hasAllAccess, can } = useAuth();

//   // --- LocalStorage keys under "crm-*"
//   const [pinned, setPinned] = useState(
//     JSON.parse(localStorage.getItem("crm-pinned") || "[]")
//   );
//   const [archived, setArchived] = useState(
//     JSON.parse(localStorage.getItem("crm-archived") || "[]")
//   );

//   // Seed order with all current ids; reconcile with any saved order
//   const allIds = useMemo(() => crmBlocks.map(b => b.id), []);
//   const storedOrder =
//     JSON.parse(localStorage.getItem("crm-order") || "null") || [];
//   const initialOrder = useMemo(() => {
//     if (!Array.isArray(storedOrder) || storedOrder.length === 0) return allIds;
//     const known = storedOrder.filter(id => allIds.includes(id));
//     const missing = allIds.filter(id => !known.includes(id));
//     return [...known, ...missing];
//   }, [allIds]); // eslint-disable-line react-hooks/exhaustive-deps

//   const [order, setOrder] = useState(initialOrder);
//   const [showArchived, setShowArchived] = useState(false);

//   const togglePin = (e, id) => {
//     e.stopPropagation();
//     const updated = pinned.includes(id)
//       ? pinned.filter(i => i !== id)
//       : [...pinned, id];
//     setPinned(updated);
//     localStorage.setItem("crm-pinned", JSON.stringify(updated));
//   };

//   const toggleArchive = (e, id) => {
//     e.stopPropagation();
//     const updated = archived.includes(id)
//       ? archived.filter(i => i !== id)
//       : [...archived, id];
//     setArchived(updated);
//     localStorage.setItem("crm-archived", JSON.stringify(updated));
//   };

//   const onDragEnd = result => {
//     if (!result.destination) return;
//     const newOrder = Array.from(order);
//     const [moved] = newOrder.splice(result.source.index, 1);
//     newOrder.splice(result.destination.index, 0, moved);
//     setOrder(newOrder);
//     localStorage.setItem("crm-order", JSON.stringify(newOrder));
//   };

//   // Build list of blocks (show both locked + unlocked)
//   const blocksWithAccess = order
//     .map(id => crmBlocks.find(b => b.id === id))
//     .filter(Boolean)
//     .filter(b => (showArchived ? true : !archived.includes(b.id)))
//     .map(block => {
//       const codes = PERM_BY_BLOCK[block.id] || [];
//       const allowed =
//         hasAllAccess || (Array.isArray(codes) && codes.some(code => can(code)));

//       return {
//         ...block,
//         allowed,
//         primaryCode: codes[0] || null,
//       };
//     });

//   const anyVisible = blocksWithAccess.length > 0;
//   const anyAllowed = blocksWithAccess.some(b => b.allowed);

//   if (isLoading || entLoading) {
//     return (
//       <div className="p-10 text-center text-lg text-gray-500">
//         Loading CRM features…
//       </div>
//     );
//   }

//   return (
//     <div className="p-6" data-test-id="crm-root">
//       {/* Emerald animated border, same pattern as Automation workspace */}
//       <style>{`
//         @keyframes drawRight { from { transform: scaleX(0) } to { transform: scaleX(1) } }
//         @keyframes drawDown  { from { transform: scaleY(0) } to { transform: scaleY(1) } }
//         @keyframes drawLeft  { from { transform: scaleX(0) } to { transform: scaleX(1) } }
//         @keyframes drawUp    { from { transform: scaleY(0) } to { transform: scaleY(1) } }

//         .tile:hover .topline    { animation: drawRight .9s ease forwards; }
//         .tile:hover .rightline  { animation: drawDown  .9s ease .18s forwards; }
//         .tile:hover .bottomline { animation: drawLeft  .9s ease .36s forwards; }
//         .tile:hover .leftline   { animation: drawUp    .9s ease .54s forwards; }
//       `}</style>

//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-2xl font-bold text-emerald-800">
//           📇 CRM Workspace
//         </h2>
//         <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
//           <input
//             type="checkbox"
//             checked={showArchived}
//             onChange={() => setShowArchived(!showArchived)}
//             className="accent-purple-600"
//           />
//           Show Archived
//         </label>
//       </div>

//       <p className="text-sm text-slate-600 mb-4">
//         Manage contacts, tags, reminders, and interaction timelines in one
//         place.
//       </p>

//       {/* If tiles exist but all are locked → show restricted banner */}
//       {anyVisible && !anyAllowed && (
//         <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
//           <AlertTriangle size={22} className="mt-1" />
//           <div>
//             <strong>Locked CRM tools:</strong> Your current plan doesn&apos;t
//             include these CRM features.
//             <div className="text-sm mt-1 text-gray-600">
//               Try opening a tile to see upgrade options, or contact your
//               administrator.
//             </div>
//           </div>
//         </div>
//       )}

//       {anyVisible && (
//         <DragDropContext onDragEnd={onDragEnd}>
//           <Droppable droppableId="crm-blocks" direction="horizontal">
//             {provided => (
//               <div
//                 className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
//                 ref={provided.innerRef}
//                 {...provided.droppableProps}
//               >
//                 {blocksWithAccess.map((block, index) => {
//                   const baseCardClasses =
//                     "tile group relative overflow-hidden rounded-md border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer";
//                   const lockedClasses =
//                     "opacity-70 border-dashed cursor-not-allowed hover:-translate-y-0 hover:shadow-sm";

//                   const cardClasses = block.allowed
//                     ? baseCardClasses
//                     : `${baseCardClasses} ${lockedClasses}`;

//                   const handleCardClick = () => {
//                     if (!block.allowed) {
//                       if (block.primaryCode) {
//                         requestUpgrade({
//                           reason: "feature",
//                           code: block.primaryCode,
//                           source: "crm.workspace.tile",
//                         });
//                       }
//                       return;
//                     }
//                     navigate(block.path);
//                   };

//                   const handlePrimaryActionClick = e => {
//                     e.stopPropagation();
//                     if (!block.allowed) {
//                       if (block.primaryCode) {
//                         requestUpgrade({
//                           reason: "feature",
//                           code: block.primaryCode,
//                           source: "crm.workspace.action",
//                         });
//                       }
//                       return;
//                     }
//                     navigate(block.path);
//                   };

//                   return (
//                     <Draggable
//                       key={block.id}
//                       draggableId={block.id}
//                       index={index}
//                     >
//                       {provided => (
//                         <div
//                           ref={provided.innerRef}
//                           {...provided.draggableProps}
//                           role="button"
//                           tabIndex={0}
//                           aria-label={`${block.label}: ${block.action}`}
//                           onKeyDown={e => {
//                             if (e.key === "Enter") handleCardClick();
//                           }}
//                           onClick={handleCardClick}
//                           className={cardClasses}
//                           style={{ userSelect: "none" }}
//                         >
//                           {/* 🔒 Upgrade badge for locked tiles */}
//                           {!block.allowed && (
//                             <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
//                               🔒 Upgrade
//                             </span>
//                           )}

//                           {/* Emerald animated border (top → right → bottom → left) */}
//                           <span
//                             aria-hidden
//                             className="topline pointer-events-none absolute left-0 -top-[2px] h-[2px] w-full origin-left rounded opacity-0 group-hover:opacity-100"
//                             style={{
//                               background:
//                                 "linear-gradient(90deg, #A7F3D0, #34D399, #059669)",
//                               transform: "scaleX(0)",
//                             }}
//                           />
//                           <span
//                             aria-hidden
//                             className="rightline pointer-events-none absolute right-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-top rounded opacity-0 group-hover:opacity-100"
//                             style={{
//                               background:
//                                 "linear-gradient(180deg, #A7F3D0, #34D399, #059669)",
//                               transform: "scaleY(0)",
//                             }}
//                           />
//                           <span
//                             aria-hidden
//                             className="bottomline pointer-events-none absolute left-0 -bottom-[2px] h-[2px] w-full origin-right rounded opacity-0 group-hover:opacity-100"
//                             style={{
//                               background:
//                                 "linear-gradient(270deg, #A7F3D0, #34D399, #059669)",
//                               transform: "scaleX(0)",
//                             }}
//                           />
//                           <span
//                             aria-hidden
//                             className="leftline pointer-events-none absolute left-0 -top-[2px] h-[calc(100%+4px)] w-[2px] origin-bottom rounded opacity-0 group-hover:opacity-100"
//                             style={{
//                               background:
//                                 "linear-gradient(0deg, #A7F3D0, #34D399, #059669)",
//                               transform: "scaleY(0)",
//                             }}
//                           />

//                           {/* Card body */}
//                           <div className="flex items-start gap-4 p-5">
//                             <div className="bg-emerald-50 rounded-md p-2 text-emerald-800">
//                               {block.icon}
//                             </div>
//                             <div className="flex-1 min-w-0">
//                               <h3 className="text-md font-semibold text-emerald-800 truncate group-hover:text-emerald-900">
//                                 {block.label}
//                               </h3>
//                               <p className="text-sm text-slate-600">
//                                 {block.description}
//                               </p>
//                             </div>

//                             {/* Drag handle only on kebab */}
//                             <div
//                               {...provided.dragHandleProps}
//                               title="Drag to re-order"
//                               className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
//                               onClick={e => e.stopPropagation()}
//                             >
//                               <MoreVertical size={16} />
//                             </div>
//                           </div>

//                           {/* Footer */}
//                           <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
//                             <button
//                               onClick={handlePrimaryActionClick}
//                               className="text-sm text-gray-700 font-medium flex items-center gap-1 hover:text-gray-900"
//                             >
//                               {block.allowed
//                                 ? block.action
//                                 : "Upgrade to unlock"}
//                               <ArrowRightCircle size={18} />
//                             </button>

//                             <div className="flex items-center gap-3">
//                               <button
//                                 onClick={e => togglePin(e, block.id)}
//                                 title={
//                                   pinned.includes(block.id) ? "Unpin" : "Pin"
//                                 }
//                               >
//                                 <Pin
//                                   size={18}
//                                   className={
//                                     pinned.includes(block.id)
//                                       ? "text-red-600"
//                                       : "text-gray-400 hover:text-red-500"
//                                   }
//                                 />
//                               </button>
//                               <button
//                                 onClick={e => toggleArchive(e, block.id)}
//                                 title="Archive this"
//                               >
//                                 <Archive
//                                   size={18}
//                                   className={
//                                     archived.includes(block.id)
//                                       ? "text-indigo-600"
//                                       : "text-gray-400 hover:text-indigo-500"
//                                   }
//                                 />
//                               </button>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </Draggable>
//                   );
//                 })}
//                 {provided.placeholder}
//               </div>
//             )}
//           </Droppable>
//         </DragDropContext>
//       )}

//       {!anyVisible && (
//         <div className="bg-red-100 text-red-700 p-4 border-l-4 border-red-500 rounded-md mt-4 shadow-sm flex items-start gap-3">
//           <AlertTriangle size={22} className="mt-1" />
//           <div>
//             <strong>No CRM tiles:</strong> All CRM tools are archived or hidden.
//             <div className="text-sm mt-1 text-gray-600">
//               Un-archive some tiles to see them here.
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
