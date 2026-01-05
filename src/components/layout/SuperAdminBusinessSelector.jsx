import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { ChevronDown, X } from "lucide-react";
import { toast } from "react-toastify";

// Minimal UI: click -> dropdown list + search
export default function SuperAdminBusinessSelector({
  selectedId,
  selectedName,
  onSelect,
  onClear,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      x =>
        String(x?.name || x?.businessName || "")
          .toLowerCase()
          .includes(s) ||
        String(x?.id || "")
          .toLowerCase()
          .includes(s)
    );
  }, [q, items]);

  async function loadBusinesses() {
    setLoading(true);
    try {
      // Endpoint: GET /api/Businesses/approved
      const { data } = await axiosClient.get("/Businesses/approved", {
        __silentToast: true,
        __silent401: true,
        __silent403: true,
      });

      const list = Array.isArray(data) ? data : data?.items || [];
      const normalized = list.map(b => ({
        id: b.id || b.businessId || b.BusinessId,
        name: b.name || b.businessName || b.BusinessName || "Unnamed Business",
      }));

      setItems(normalized.filter(x => !!x.id));
    } catch (err) {
      toast.error("Failed to load businesses for selection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && items.length === 0 && !loading) {
      loadBusinesses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target)) return;
      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm"
        title="Select business context"
      >
        <span className="max-w-[220px] truncate">
          {selectedId ? selectedName || "Selected Business" : "Select Business"}
        </span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search business..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    onClear?.();
                    setOpen(false);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  title="Clear selection"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {selectedId
                ? "You are viewing business-scoped modules in this selected context."
                : "No business selected. You are in platform scope."}
            </div>
          </div>

          <div className="max-h-[340px] overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-600">
                Loading businesses…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">
                No businesses found.
              </div>
            ) : (
              filtered.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onSelect?.(b);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-emerald-50 transition ${
                    b.id === selectedId ? "bg-emerald-50" : ""
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {b.name}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
