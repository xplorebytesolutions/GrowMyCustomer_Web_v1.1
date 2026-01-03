// 📄 src/pages/Workspaces/CatalogWorkspacePage.jsx

import {
  Archive,
  Pin,
  ArrowRightCircle,
  MoreVertical,
  ShoppingCart,
  PlusCircle,
  BarChart2,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// ✅ auth + entitlements
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
// 🔔 Global upgrade flow
import { requestUpgrade } from "../../utils/upgradeBus";

const PERM_BY_BLOCK = {
  "product-catalog": [FK.CATALOG_VIEW], // view products
  "product-form": [FK.CATALOG_CREATE], // create products
  "catalog-dashboard": [FK.CATALOG_VIEW],
  "catalog-automation": [FK.CATALOG_AUTOMATION], // plan-gated only for now
};

const catalogBlocks = [
  {
    id: "product-catalog",
    label: "Product Catalog",
    description: "Browse, manage, and organize all your products in one place.",
    path: "/app/catalog/products",
    icon: <ShoppingCart size={22} />,
    action: "Manage Products",
  },
  {
    id: "product-form",
    label: "Add New Product",
    description: "Create and publish new items to your WhatsApp catalog.",
    path: "/app/catalog/form",
    icon: <PlusCircle size={22} />,
    action: "Add Product",
  },
  {
    id: "catalog-dashboard",
    label: "Catalog Dashboard",
    description: "Get insights into catalog performance and user interactions.",
    path: "/app/catalog/insights",
    icon: <BarChart2 size={22} />,
    action: "View Insights",
  },
  {
    id: "catalog-automation",
    label: "Auto-Responders",
    description: "Set up auto-replies triggered by catalog engagement events.",
    path: "/app/catalog/automation",
    icon: <Zap size={22} />,
    action: "Configure Bots",
    requiredPlan: "advanced",
  },
];

export default function CatalogWorkspacePage() {
  const navigate = useNavigate();
  const { isLoading, entLoading, can, hasAllAccess, planId } = useAuth();

  const [pinned, setPinned] = useState(
    JSON.parse(localStorage.getItem("catalog-pinned") || "[]")
  );
  const [archived, setArchived] = useState(
    JSON.parse(localStorage.getItem("catalog-archived") || "[]")
  );
  const [order, setOrder] = useState(
    JSON.parse(localStorage.getItem("catalog-order")) ||
      catalogBlocks.map(b => b.id)
  );

  const togglePin = (e, id) => {
    e.stopPropagation();
    const updated = pinned.includes(id)
      ? pinned.filter(i => i !== id)
      : [...pinned, id];
    setPinned(updated);
    localStorage.setItem("catalog-pinned", JSON.stringify(updated));
  };

  const toggleArchive = (e, id) => {
    e.stopPropagation();
    const updated = archived.includes(id)
      ? archived.filter(i => i !== id)
      : [...archived, id];
    setArchived(updated);
    localStorage.setItem("catalog-archived", JSON.stringify(updated));
  };

  const onDragEnd = result => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrder(newOrder);
    localStorage.setItem("catalog-order", JSON.stringify(newOrder));
  };

  // ---- plan helper (same logic, just used for allowed flag now) ----
  const hasPlan = requiredPlan => {
    if (!requiredPlan) return true;
    const tiers = ["trial", "basic", "smart", "advanced"];
    const current = String(planId || "basic").toLowerCase();
    return tiers.indexOf(current) >= tiers.indexOf(requiredPlan.toLowerCase());
  };

  const blocksWithAccess = order
    .map(id => catalogBlocks.find(b => b.id === id))
    .filter(Boolean)
    .filter(b => !archived.includes(b.id))
    .map(block => {
      const codes = PERM_BY_BLOCK[block.id] || [];
      const canPerm =
        hasAllAccess || (Array.isArray(codes) && codes.some(code => can(code)));
      const hasPlanAccess = hasPlan(block.requiredPlan);
      const allowed = canPerm && hasPlanAccess;

      // Figure out why it’s blocked (for nicer upgrade flows)
      const blockedReason = !canPerm
        ? "feature"
        : !hasPlanAccess
        ? "plan"
        : null;

      return {
        ...block,
        allowed,
        primaryCode: codes[0] || null,
        blockedReason,
      };
    });

  if (isLoading || entLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading catalog features…
      </div>
    );
  }

  const anyVisible = blocksWithAccess.length > 0;
  const anyAllowed = blocksWithAccess.some(b => b.allowed);

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]" data-test-id="catalog-root">
      {/* sequential border animation (top→right→bottom→left) – emerald themed, same as CRM/Campaign */}
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
        🛍️ Catalog Workspace
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Manage your WhatsApp catalog, add products, and track how customers
        interact with your items.
      </p>

      {/* If tiles exist but all are locked → show a “restricted” banner, like CRM/Campaign */}
      {anyVisible && !anyAllowed && (
        <div className="bg-amber-50 text-amber-800 p-4 border-l-4 border-amber-500 rounded-md mb-6 shadow-sm flex items-start gap-3">
          <AlertTriangle size={22} className="mt-1" />
          <div>
            <strong>Locked catalog tools:</strong> Your current plan
            doesn&apos;t include these catalog features.
            <div className="text-sm mt-1 text-gray-600">
              Try opening a tile to see upgrade options, or contact your
              administrator.
            </div>
          </div>
        </div>
      )}

      {anyVisible && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="catalog-blocks" direction="horizontal">
            {provided => (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {blocksWithAccess.map((block, index) => {
                  const cardBase =
                    "tile group relative overflow-hidden cursor-pointer bg-white rounded-md border shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300";
                  const lockedClasses =
                    "opacity-70 border-dashed cursor-not-allowed hover:-translate-y-0 hover:shadow-sm";

                  const cardClasses = block.allowed
                    ? cardBase
                    : `${cardBase} ${lockedClasses}`;

                  const handleCardClick = () => {
                    if (!block.allowed) {
                      if (block.blockedReason === "plan") {
                        requestUpgrade({
                          reason: "plan",
                          planTier: block.requiredPlan,
                          source: "catalog.workspace.tile",
                        });
                      } else if (block.primaryCode) {
                        requestUpgrade({
                          reason: "feature",
                          code: block.primaryCode,
                          source: "catalog.workspace.tile",
                        });
                      }
                      return;
                    }
                    navigate(block.path);
                  };

                  const handlePrimaryActionClick = e => {
                    e.stopPropagation();
                    if (!block.allowed) {
                      if (block.blockedReason === "plan") {
                        requestUpgrade({
                          reason: "plan",
                          planTier: block.requiredPlan,
                          source: "catalog.workspace.action",
                        });
                      } else if (block.primaryCode) {
                        requestUpgrade({
                          reason: "feature",
                          code: block.primaryCode,
                          source: "catalog.workspace.action",
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

                          {/* animated border segments – EMERALD gradient, same as CRM/Campaign */}
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
            <strong>No catalog tiles:</strong> All catalog tools are archived or
            hidden.
            <div className="text-sm mt-1 text-gray-600">
              Un-archive some tiles to see them here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
