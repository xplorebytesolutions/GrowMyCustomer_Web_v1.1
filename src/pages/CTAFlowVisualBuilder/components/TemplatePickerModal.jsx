// 📄 File: TemplatePickerModal.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import { useAuth } from "../../../app/providers/AuthProvider";

const isGuid = v =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

const normalizeHeaderKind = v => String(v || "").trim().toLowerCase();

const templateTypeForHeaderKind = hk => {
  const kind = normalizeHeaderKind(hk);
  if (kind === "image") return "image_template";
  if (kind === "video") return "video_template";
  if (kind === "document") return "document_template";
  return "text_template";
};

const normalizeMedia = m => {
  const raw = String(m || "").trim().toLowerCase();
  if (!raw || raw === "all") return "all";
  if (raw === "pdf") return "document";
  if (raw === "text") return "text";
  if (raw === "image") return "image";
  if (raw === "video") return "video";
  if (raw === "document") return "document";
  return "all";
};

export default function TemplatePickerModal({
  open,
  onClose,
  onSelect,
  onSelectMany,
}) {
  const { businessId: ctxBusinessId } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [templateQuery, setTemplateQuery] = useState("");
  const [templateMedia, setTemplateMedia] = useState("all"); // all|text|image|video|document
  const [templateSort, setTemplateSort] = useState("updated_desc"); // updated_desc|created_desc|created_asc|name_asc|name_desc
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [adding, setAdding] = useState(false);

  const fetchSeqRef = useRef(0);
  const queryDebounceRef = useRef(null);
  const prevQueryRef = useRef("");
  const prevOpenRef = useRef(false);
  const prevBusinessIdRef = useRef(null);
  const prevHasValidBusinessRef = useRef(false);
  const listRef = useRef(null);

  const businessId = useMemo(() => {
    return (
      ctxBusinessId ||
      localStorage.getItem("businessId") ||
      localStorage.getItem("sa_selectedBusinessId") ||
      null
    );
  }, [ctxBusinessId]);
  const hasValidBusiness = isGuid(businessId);

  const selectionStorageKey = useMemo(() => {
    if (!hasValidBusiness) return null;
    return `ctaFlow.templatePicker.selected.${businessId}`;
  }, [businessId, hasValidBusiness]);

  const sortParams = useMemo(() => {
    switch (templateSort) {
      case "name_asc":
        return { sortKey: "name", sortDir: "asc" };
      case "name_desc":
        return { sortKey: "name", sortDir: "desc" };
      case "created_asc":
        return { sortKey: "createdAt", sortDir: "asc" };
      case "created_desc":
        return { sortKey: "createdAt", sortDir: "desc" };
      case "updated_desc":
      default:
        return { sortKey: "updatedAt", sortDir: "desc" };
    }
  }, [templateSort]);

  const fetchTemplates = useCallback(
    async ({ pageToLoad = 1, append = false } = {}) => {
      if (!open) return;
      if (!hasValidBusiness) return;

      const seq = ++fetchSeqRef.current;
      const q = (templateQuery || "").trim();
      const m = normalizeMedia(templateMedia);

      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const res = await axiosClient.get(`templates/${businessId}`, {
          params: {
            status: "APPROVED",
            q: q.length ? q : undefined,
            media: m === "all" ? undefined : m,
            page: pageToLoad,
            pageSize: 100,
            ...sortParams,
          },
        });

        if (seq !== fetchSeqRef.current) return;

        if (res?.data?.success) {
          const items = Array.isArray(res.data.templates)
            ? res.data.templates
            : [];

          const normalized = items
            .map(t => ({
              name: t.name ?? t.Name ?? "",
              languageCode: t.languageCode ?? t.LanguageCode ?? "en_US",
              category: t.category ?? t.Category ?? "",
              headerKind: t.headerKind ?? t.HeaderKind ?? "none",
              bodyPreview: t.bodyPreview ?? t.BodyPreview ?? "",
              bodyVarCount: t.bodyVarCount ?? t.BodyVarCount ?? 0,
              createdAt: t.createdAt ?? t.CreatedAt ?? null,
              updatedAt: t.updatedAt ?? t.UpdatedAt ?? null,
            }))
            .filter(t => !!t.name);

          setTemplates(prev => (append ? [...prev, ...normalized] : normalized));
          setPage(res.data.page || pageToLoad);
          setTotalPages(res.data.totalPages || 0);
        } else if (!append) {
          setTemplates([]);
          setPage(1);
          setTotalPages(0);
        }
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        console.error("Error fetching templates:", err);
        if (!append) {
          setTemplates([]);
          setPage(1);
          setTotalPages(0);
        }
      } finally {
        if (seq !== fetchSeqRef.current) return;
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [
      open,
      hasValidBusiness,
      businessId,
      templateQuery,
      templateMedia,
      sortParams,
    ]
  );

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const bizChanged = open && prevBusinessIdRef.current !== businessId;
    const becameValid =
      open && hasValidBusiness && !prevHasValidBusinessRef.current;

    prevOpenRef.current = open;
    prevBusinessIdRef.current = businessId;
    prevHasValidBusinessRef.current = hasValidBusiness;

    if (!open) {
      prevQueryRef.current = "";
      return;
    }

    // Important: do NOT clear selection when the user searches or changes filters/sort while the modal is open.
    // Selection should only reset on open/close, business switch, or when business context becomes valid.
    if (!justOpened && !bizChanged && !becameValid) return;

    prevQueryRef.current = "";

    if (!hasValidBusiness) {
      setSelectedOptions([]);
      setTemplates([]);
      setPage(1);
      setTotalPages(0);
      setLoading(false);
      toast.error("Business context missing. Please re-login/select business.");
      return;
    }

    // Restore any persisted selection from previous modal open.
    if (selectionStorageKey) {
      try {
        const raw = sessionStorage.getItem(selectionStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            setSelectedOptions(
              parsed
                .map(x => ({
                  name: x?.name || "",
                  languageCode: x?.languageCode || "en_US",
                  category: x?.category || "",
                  headerKind: x?.headerKind || "none",
                  bodyPreview: x?.bodyPreview || "",
                  bodyVarCount: typeof x?.bodyVarCount === "number" ? x.bodyVarCount : 0,
                  createdAt: x?.createdAt ?? null,
                  updatedAt: x?.updatedAt ?? null,
                }))
                .filter(t => !!t.name)
            );
          } else {
            setSelectedOptions([]);
          }
        } else {
          setSelectedOptions([]);
        }
      } catch {
        setSelectedOptions([]);
      }
    } else {
      setSelectedOptions([]);
    }

    fetchTemplates({ pageToLoad: 1, append: false });
  }, [open, hasValidBusiness, businessId, fetchTemplates, selectionStorageKey]);

  // Debounced search (server-side)
  useEffect(() => {
    if (!open) return;
    if (!hasValidBusiness) return;

    const q = (templateQuery || "").trim();
    const prev = prevQueryRef.current;
    prevQueryRef.current = q;

    // When clearing search, refresh immediately (avoid a duplicate on initial open)
    if (!q) {
      if (prev) fetchTemplates({ pageToLoad: 1, append: false });
      return;
    }

    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    queryDebounceRef.current = setTimeout(() => {
      fetchTemplates({ pageToLoad: 1, append: false });
    }, 250);

    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
  }, [templateQuery, open, hasValidBusiness, fetchTemplates]);

  // Media/sort changes (immediate)
  useEffect(() => {
    if (!open) return;
    if (!hasValidBusiness) return;
    fetchTemplates({ pageToLoad: 1, append: false });
  }, [templateMedia, templateSort, open, hasValidBusiness, fetchTemplates]);

  // Persist selection across tab switches / modal close-open so users don't lose progress.
  useEffect(() => {
    if (!open) return;
    if (!selectionStorageKey) return;
    try {
      const payload = Array.isArray(selectedOptions)
        ? selectedOptions.map(t => ({
            name: t.name,
            languageCode: t.languageCode || "en_US",
            category: t.category || "",
            headerKind: t.headerKind || "none",
            bodyPreview: t.bodyPreview || "",
            bodyVarCount:
              typeof t.bodyVarCount === "number" ? t.bodyVarCount : 0,
            createdAt: t.createdAt ?? null,
            updatedAt: t.updatedAt ?? null,
          }))
        : [];
      sessionStorage.setItem(selectionStorageKey, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }, [open, selectedOptions, selectionStorageKey]);

  if (!open) return null;

  const sortOptions = [
    { value: "updated_desc", label: "Recently updated" },
    { value: "created_desc", label: "Newest" },
    { value: "created_asc", label: "Oldest" },
    { value: "name_asc", label: "A–Z" },
    { value: "name_desc", label: "Z–A" },
  ];

  const mediaOptions = [
    { value: "all", label: "All Media" },
    { value: "text", label: "Text" },
    { value: "image", label: "Image" },
    { value: "video", label: "Video" },
    { value: "document", label: "Document (PDF)" },
  ];

  const keyOf = tpl => `${tpl.name}::${tpl.languageCode || "en_US"}`;
  const selectedKeySet = new Set(
    (selectedOptions || []).map(t => keyOf(t))
  );

  const toggleSelected = tpl => {
    const k = keyOf(tpl);
    setSelectedOptions(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const exists = arr.some(x => keyOf(x) === k);
      return exists ? arr.filter(x => keyOf(x) !== k) : [...arr, tpl];
    });
  };

  const mapWithConcurrency = async (items, limit, mapper) => {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) break;
        results[i] = await mapper(items[i], i);
      }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
      worker()
    );
    await Promise.all(workers);
    return results;
  };

  const handleAddSelected = async () => {
    if (!hasValidBusiness) return;
    const selected = Array.isArray(selectedOptions) ? selectedOptions : [];
    if (!selected.length) return;

    const unsupported = selected.filter(t => {
      const hk = normalizeHeaderKind(t.headerKind);
      return hk === "location";
    });
    const supported = selected.filter(t => !unsupported.includes(t));

    if (!supported.length) {
      toast.warn("Selected templates are not supported in CTA flows yet.");
      return;
    }
    if (unsupported.length) {
      toast.warn(
        `Skipping ${unsupported.length} unsupported template(s) (location).`
      );
    }

    setAdding(true);
    try {
      const payloads = await mapWithConcurrency(supported, 4, async tpl => {
        const hk = normalizeHeaderKind(tpl.headerKind);
        const templateType = templateTypeForHeaderKind(hk);
        const lang = (tpl.languageCode || "").trim();
        const langParam = lang ? `?language=${encodeURIComponent(lang)}` : "";
        const detailRes = await axiosClient.get(
          `templates/${businessId}/${encodeURIComponent(tpl.name)}${langParam}`
        );
        const detail = detailRes?.data?.template || detailRes?.data || null;
        const rawButtons = detail?.buttons ?? detail?.Buttons ?? [];
        const buttons = Array.isArray(rawButtons) ? rawButtons : [];

        return {
          name: tpl.name,
          type: templateType,
          body: detail?.Body ?? detail?.body ?? tpl.bodyPreview ?? "",
          buttons,
        };
      });

      const clean = payloads.filter(Boolean);
      if (typeof onSelectMany === "function") {
        onSelectMany(clean);
      } else if (typeof onSelect === "function") {
        clean.forEach(p => onSelect(p));
      }

      // Clear persisted selection after a successful add so next open starts clean.
      if (selectionStorageKey) {
        try {
          sessionStorage.removeItem(selectionStorageKey);
        } catch {
          // no-op
        }
      }

      onClose?.();
    } catch (err) {
      console.error("Failed adding selected templates:", err);
      toast.error("Failed to add selected templates.");
    } finally {
      setAdding(false);
    }
  };

  const loadMoreIfNeeded = async () => {
    if (loading || loadingMore || adding) return;
    if (!totalPages || page >= totalPages) return;
    await fetchTemplates({ pageToLoad: page + 1, append: true });
  };

  const formatShortDate = dt => {
    if (!dt) return null;
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-xl font-semibold text-emerald-700">
            Select WhatsApp Templates
          </h2>
          {selectedOptions.length ? (
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              {selectedOptions.length} selected
            </div>
          ) : null}
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Search, filter, and select multiple templates to add them as steps.
        </p>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Media
            </label>
            <select
              value={templateMedia}
              onChange={e => setTemplateMedia(e.target.value)}
              className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            >
              {mediaOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sort
            </label>
            <select
              value={templateSort}
              onChange={e => setTemplateSort(e.target.value)}
              className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            >
              {sortOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Search
            </label>
            <input
              value={templateQuery}
              onChange={e => setTemplateQuery(e.target.value)}
              placeholder="Search approved templates..."
              className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <p>Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-gray-500">No templates available</p>
        ) : (
          <div
            ref={listRef}
            onScroll={e => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
                loadMoreIfNeeded();
              }
            }}
            className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white"
          >
            <div className="divide-y divide-slate-100">
              {templates.map(tpl => {
                const hk = normalizeHeaderKind(tpl.headerKind);
                const unsupported = hk === "location";
                const selected = selectedKeySet.has(keyOf(tpl));
                const created = formatShortDate(tpl.createdAt);
 
                return (
                <button
                  key={keyOf(tpl)}
                  className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${
                    unsupported
                      ? "opacity-60 cursor-not-allowed"
                      : selected
                        ? "bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                        : "hover:bg-slate-50 cursor-pointer"
                  }`}
                  type="button"
                  onClick={() => {
                    if (!unsupported) toggleSelected(tpl);
                  }}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        if (!unsupported) toggleSelected(tpl);
                      }}
                      onClick={e => e.stopPropagation()}
                      disabled={unsupported}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {tpl.name}
                      </div>
                      {unsupported ? (
                        <span className="text-[11px] text-amber-700 whitespace-nowrap">
                          Unsupported
                        </span>
                      ) : null}
                    </div>
                      <div className="text-[11px] leading-tight text-slate-500 mt-0.5 truncate">
                    {String(tpl.languageCode || "en_US").toUpperCase()}
                    {tpl.category ? ` • ${String(tpl.category).toUpperCase()}` : ""}
                    {hk && hk !== "none" ? ` • ${hk.toUpperCase()}` : ""}
                    {typeof tpl.bodyVarCount === "number" ? ` • ${tpl.bodyVarCount} vars` : ""}
                    {created ? ` • Created ${created}` : ""}
                  </div>
                  {tpl.bodyPreview ? (
                        <div className="mt-1 text-sm text-slate-700 line-clamp-2 whitespace-pre-wrap">
                      {tpl.bodyPreview}
                    </div>
                  ) : null}
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Supported in CTA flows: Text, Image, Video, and Document templates.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={adding || selectedOptions.length === 0}
              className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                selectedOptions.length === 0
                  ? "Select one or more templates"
                  : "Add selected templates as steps"
              }
            >
              {adding ? "Adding…" : `Add Selected (${selectedOptions.length || 0})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
