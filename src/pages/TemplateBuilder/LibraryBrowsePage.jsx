import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { X, Eye, Copy } from "lucide-react";

import { Card } from "../../components/ui/card";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import WhatsAppTemplatePreview from "./components/WhatsAppTemplatePreview";
import TemplateBuilderTabs from "./components/TemplateBuilderTabs";
import {
  activateLibraryItem,
  browseLibrary,
  getLibraryItem,
  listIndustries,
} from "./api";

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function titleCaseIndustry(code) {
  const v = String(code || "").trim();
  if (!v) return "All";
  return v
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, m => m.toUpperCase());
}

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function examplesArrayFromMap(examplesMap) {
  const map = examplesMap && typeof examplesMap === "object" ? examplesMap : {};
  const keys = Object.keys(map)
    .map(k => Number(k))
    .filter(n => Number.isFinite(n) && n > 0);
  const max = keys.length ? Math.max(...keys) : 0;
  const arr = [];
  for (let i = 1; i <= max; i++) arr.push(String(map[String(i)] ?? ""));
  return arr;
}

export default function LibraryBrowsePage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);

  const [industries, setIndustries] = React.useState([]);
  const [industriesLoading, setIndustriesLoading] = React.useState(false);

  const industry = sp.get("industry") || "";
  const q = sp.get("q") || "";
  const v = sp.get("v") || "";
  const sort = sp.get("sort") || "featured";
  const page = Number(sp.get("page")) || 1;
  const pageSize = 20;

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewItem, setPreviewItem] = React.useState(null);
  const [previewVariants, setPreviewVariants] = React.useState([]);
  const [previewLang, setPreviewLang] = React.useState("en_US");

  const qDebounced = useDebouncedValue(q, 300);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setIndustriesLoading(true);
      try {
        const resp = await listIndustries();
        const list = Array.isArray(resp?.industries) ? resp.industries : [];
        if (mounted) setIndustries(list);
      } catch {
        if (mounted) setIndustries([]);
      } finally {
        if (mounted) setIndustriesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);

      // No need to setSp here anymore, we read from it!
    } finally {
      setLoading(false);
    }
  }, [industry, page, pageSize, q, qDebounced, sort, v]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleActivate(itemId, lang = "en_US") {
    try {
      setLoading(true);
      const res = await activateLibraryItem(itemId, { languages: [lang] });
      const draftId = res?.draftId || res?.draft?.id || res?.draft?.Id;
      if (!draftId) {
        toast.error("Template activated, but no draftId returned.");
        return;
      }
      toast.success("Draft created. Choose a name, then submit to Meta.");
      navigate(
        `/app/template-builder/drafts/${draftId}?language=${encodeURIComponent(
          lang || "en_US"
        )}&fromLibrary=1&blankName=1`
      );
    } finally {
      setLoading(false);
    }
  }

  async function openPreview(itemId) {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await getLibraryItem(itemId);
      const it = res?.item || null;
      const vars = Array.isArray(res?.variants) ? res.variants : [];
      setPreviewItem(it);
      setPreviewVariants(vars);
      const best =
        vars.find(v => String(v?.language || "") === "en_US") || vars[0] || null;
      setPreviewLang(String(best?.language || "en_US"));
    } catch {
      toast.error("Failed to load template preview.");
      setPreviewItem(null);
      setPreviewVariants([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  const previewVariant = React.useMemo(() => {
    const v =
      previewVariants.find(x => String(x?.language || "") === previewLang) ||
      previewVariants[0] ||
      null;
    return v;
  }, [previewLang, previewVariants]);

  const previewDraft = React.useMemo(() => {
    if (!previewVariant) return null;
    const buttons = safeJsonParse(previewVariant?.buttonsJson || "[]", []);
    const examplesMap = safeJsonParse(
      previewVariant?.exampleParamsJson || "{}",
      {}
    );
    return {
      headerType: previewVariant?.headerType,
      headerText: previewVariant?.headerText,
      headerMediaUrl: null,
      bodyText: previewVariant?.bodyText,
      footerText: previewVariant?.footerText,
      buttons,
      examples: examplesArrayFromMap(examplesMap),
    };
  }, [previewVariant]);

  const industryList = industries.length
    ? industries
    : ["SALON", "GYM", "DOCTOR", "RETAILER", "MEDICAL", "HOSPITAL", "REAL_ESTATE"];

  return (
    <div className="space-y-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header removed (handled by layout) */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <Card className="lg:col-span-3 p-4 rounded-lg">
            <div className="font-semibold text-slate-800">Industries</div>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                className={[
                  "w-full text-left px-3 py-2 rounded-md text-sm font-semibold",
                  industry === ""
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "hover:bg-slate-50 text-slate-700",
                ].join(" ")}
                onClick={() => {
                  setSp(prev => {
                    const next = new URLSearchParams(prev);
                    next.delete("industry");
                    next.set("page", "1");
                    return next;
                  });
                }}
              >
                All segments
              </button>
              {industryList.map(code => (
                <button
                  key={code}
                  type="button"
                  className={[
                    "w-full text-left px-3 py-2 rounded-md text-sm font-semibold",
                    industry === code
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "hover:bg-slate-50 text-slate-700",
                  ].join(" ")}
                  disabled={industriesLoading}
                  onClick={() => {
                    setSp(prev => {
                      const next = new URLSearchParams(prev);
                      next.set("industry", code);
                      next.set("page", "1");
                      return next;
                    });
                  }}
                >
                  {titleCaseIndustry(code)}
                </button>
              ))}
            </div>
            {industriesLoading && (
              <div className="mt-2 text-xs text-slate-400">Loading…</div>
            )}
          </Card>

          <div className="lg:col-span-9 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="border rounded-lg px-3 py-2 text-sm bg-white"
                value={sort}
                onChange={e => {
                  setSp(prev => {
                    const next = new URLSearchParams(prev);
                    next.set("sort", e.target.value);
                    next.set("page", "1");
                    return next;
                  });
                }}
              >
                <option value="featured">Featured first</option>
                <option value="name">Name (A-Z)</option>
              </select>

              <button
                type="button"
                onClick={() => refresh()}
                className="inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60"
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {!loading && items.length === 0 ? (
              <Card className="p-8 text-center rounded-lg">
                <div className="text-lg font-semibold text-slate-800">
                  No templates in the library yet
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Ask an admin to import library templates, or create a draft from
                  scratch.
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/app/template-builder/drafts?create=1")}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm"
                  >
                    Create Draft
                  </button>
                </div>
              </Card>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map(it => (
                  <Card key={it.id} className="flex flex-col justify-between p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900 truncate">
                          {it.key}
                        </div>
                        {it.isFeatured && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {titleCaseIndustry(it.industry)} •{" "}
                        {String(it.category || "").toUpperCase()} • {it.language}
                      </div>
                      <div className="text-sm text-slate-700 line-clamp-3">
                        {it.bodyPreview}
                      </div>
                      <div className="text-xs text-slate-500">
                        {it.placeholders > 0
                          ? `Placeholders: ${it.placeholders}`
                          : "No placeholders"}
                        {it.buttonsSummary ? ` • Buttons: ${it.buttonsSummary}` : ""}
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => openPreview(it.id)}
                        disabled={loading}
                      >
                        <Eye size={16} />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                        onClick={() => handleActivate(it.id, it.language || "en_US")}
                        disabled={loading}
                      >
                        <Copy size={16} />
                        Use template
                      </button>
                    </div>
                  </Card>
                ))}
              </section>
            )}

            <footer className="flex items-center justify-between pt-2">
              <div className="text-sm text-slate-500">
                Page: {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border bg-white disabled:opacity-50"
                  onClick={() => {
                    setSp(prev => {
                      const next = new URLSearchParams(prev);
                      next.set("page", String(Math.max(1, page - 1)));
                      return next;
                    });
                  }}
                  disabled={page <= 1 || loading}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md border bg-white disabled:opacity-50"
                  onClick={() => {
                    setSp(prev => {
                      const next = new URLSearchParams(prev);
                      next.set("page", String(Math.min(totalPages, page + 1)));
                      return next;
                    });
                  }}
                  disabled={page >= totalPages || loading}
                >
                  Next
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <Dialog 
        open={previewOpen} 
        onOpenChange={(open) => {
          if (!open) setPreviewOpen(false);
        }}
      >
        <DialogContent className="max-w-[380px] p-0 overflow-hidden !border-none !bg-transparent !shadow-none [&>button]:hidden">
          <div className="relative flex flex-col items-center gap-6">
            {/* Floating Close Button */}
            <button 
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-all focus:outline-none"
              title="Close Preview"
            >
              <X size={24} />
            </button>

            {/* Language Selector (Floating) - only if multiple variants */}
            {previewVariants.length > 1 && (
              <div className="absolute -top-12 left-0">
                <select
                  className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-2 py-1 text-xs text-white focus:outline-none transition-colors"
                  value={previewLang}
                  onChange={e => setPreviewLang(e.target.value)}
                  disabled={previewLoading}
                >
                  {previewVariants.map(v => (
                    <option key={v.language} value={v.language} className="text-slate-900">
                      {v.language}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview Content */}
            <div className="w-full transform scale-95 origin-center">
              {previewLoading ? (
                <div className="bg-white rounded-3xl p-12 flex flex-col items-center gap-4 shadow-xl">
                   <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                   <p className="text-slate-500 font-medium text-sm">Loading preview...</p>
                </div>
              ) : previewDraft ? (
                <WhatsAppTemplatePreview draft={previewDraft} />
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center text-slate-500 text-sm shadow-xl">
                  No preview available.
                </div>
              )}
            </div>

            {/* Floating "Use Template" Action */}
            {!previewLoading && previewItem && (
              <button
                type="button"
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-1 active:scale-95"
                onClick={() => handleActivate(previewItem.id, previewLang)}
                disabled={loading}
              >
                <Copy size={20} />
                Use this template
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {loading && (
        <div
          className="fixed inset-0 bg-black/5 pointer-events-none animate-pulse"
          aria-hidden
        />
      )}
    </div>
  );
}

