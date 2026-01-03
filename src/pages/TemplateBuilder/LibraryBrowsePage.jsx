import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { browseLibrary, activateLibraryItem } from "./api";
import { toast } from "react-toastify";

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function LibraryBrowsePage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);

  const [industry, setIndustry] = React.useState(sp.get("industry") || "");
  const [q, setQ] = React.useState(sp.get("q") || "");
  const [sort, setSort] = React.useState(sp.get("sort") || "featured");
  const [page, setPage] = React.useState(Number(sp.get("page")) || 1);
  const [pageSize, setPageSize] = React.useState(20);

  const qDebounced = useDebouncedValue(q, 300);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await browseLibrary({
        industry: industry || undefined,
        q: qDebounced || undefined,
        sort,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
      // sync URL
      const next = new URLSearchParams();
      if (industry) next.set("industry", industry);
      if (q) next.set("q", q);
      if (sort && sort !== "featured") next.set("sort", sort);
      if (page > 1) next.set("page", String(page));
      setSp(next, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [industry, qDebounced, q, sort, page, pageSize, setSp]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleActivate(itemId) {
    try {
      setLoading(true);
      const res = await activateLibraryItem(itemId, { languages: ["en_US"] });
      toast.success("Template added to your drafts");
      navigate(`/app/template-builder/drafts/${res.draftId}`); // Step 30 page
    } catch (e) {
      /* axios interceptor toasts errors */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <header className="flex items-center justify-between gap-3">
        <div className="text-xl font-semibold">Template Library</div>
        <div className="text-gray-500 text-sm">
          Pick a template → Activate → Edit & Submit
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={industry}
          onChange={e => {
            setPage(1);
            setIndustry(e.target.value);
          }}
        >
          <option value="">All segments</option>
          <option value="SALON">Salon</option>
          <option value="GYM">Gym</option>
          <option value="DOCTOR">Doctor</option>
          <option value="RETAILER">Retailer</option>
          <option value="MEDICAL">Medical</option>
          <option value="HOSPITAL">Hospital</option>
          <option value="REAL_ESTATE">Real Estate</option>
        </select>

        <input
          className="border rounded-lg px-3 py-2 text-sm w-64"
          placeholder="Search by keyword…"
          value={q}
          onChange={e => {
            setPage(1);
            setQ(e.target.value);
          }}
        />

        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={sort}
          onChange={e => {
            setPage(1);
            setSort(e.target.value);
          }}
        >
          <option value="featured">Featured first</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(it => (
          <Card key={it.id} className="flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{it.key}</div>
                {it.isFeatured && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {it.industry} • {it.category} • {it.language}
              </div>
              <div className="text-sm text-gray-700 line-clamp-3">
                {it.bodyPreview}
              </div>
              <div className="text-xs text-gray-500">
                {it.placeholders > 0
                  ? `Placeholders: ${it.placeholders}`
                  : "No placeholders"}
                {it.buttonsSummary ? ` • Buttons: ${it.buttonsSummary}` : ""}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Header: {it.headerType}
              </span>
              <button
                className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
                onClick={() => handleActivate(it.id)}
                disabled={loading}
                aria-label={`Use template ${it.key}`}
              >
                Use this template
              </button>
            </div>
          </Card>
        ))}
      </section>

      <footer className="flex items-center justify-between pt-2">
        <div className="text-sm text-gray-500">
          Total: {total.toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded-md border disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Prev
          </button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1.5 text-sm rounded-md border disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </footer>

      {loading && (
        <div
          className="fixed inset-0 bg-black/5 pointer-events-none animate-pulse"
          aria-hidden
        />
      )}
    </div>
  );
}
