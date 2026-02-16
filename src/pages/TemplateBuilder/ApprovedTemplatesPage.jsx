import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Eye,
  RefreshCw,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../app/providers/AuthProvider";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
} from "../../components/ui/dialog";
import WhatsAppTemplatePreview from "./components/WhatsAppTemplatePreview";
import TemplateBuilderTabs from "./components/TemplateBuilderTabs";
import { deleteApprovedTemplate } from "./drafts";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal";

const SYNC_ENDPOINT = bid => `templates/sync/${bid}`; // POST

const isGuid = v =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function normalizeLanguage(code) {
  const v = String(code || "");
  if (!v) return "—";
  if (v === "en_US") return "English (US)";
  return v;
}

function statusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "Active";
  if (s === "PENDING" || s === "PENDING_APPROVAL" || s === "IN_REVIEW" || s === "PENDING_REVIEW") return "Pending";
  if (s === "REJECTED") return "Rejected";
  if (s === "PAUSED") return "Paused";
  return s || "Unknown";
}

function statusPillClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "PENDING" || s === "PENDING_APPROVAL" || s === "IN_REVIEW" || s === "PENDING_REVIEW") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function safeIsoDate(v) {
  try {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

function extractPlaceholderMax(text) {
  const s = String(text || "");
  const re = /\{\{\s*(\d+)\s*\}\}/g;
  let max = 0;
  let m;
  while ((m = re.exec(s))) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function mapHeaderKindToType(headerKind) {
  const hk = String(headerKind || "").toLowerCase();
  if (hk === "text") return "TEXT";
  if (hk === "image") return "IMAGE";
  if (hk === "video") return "VIDEO";
  if (hk === "document") return "DOCUMENT";
  return "NONE";
}

function normalizeButtonsForPreview(buttons) {
  const list = Array.isArray(buttons) ? buttons : [];
  return list
    .map(b => {
      const type = String(b?.type || "").toUpperCase();
      const text = String(b?.text || "");
      const param = b?.parameterValue ?? b?.ParameterValue ?? null;
      if (!type) return null;
      if (type === "URL")
        return { type: "URL", text, url: String(param || "") };
      if (type === "PHONE" || type === "PHONE_NUMBER")
        return {
          type: "PHONE_NUMBER",
          text,
          phone_number: String(param || ""),
        };
      if (type === "QUICK_REPLY") return { type: "QUICK_REPLY", text };
      return { type, text };
    })
    .filter(Boolean)
    .slice(0, 3);
}


export default function ApprovedTemplatesPage({ forcedStatus }) {
  const { effectiveBusinessId, businessId: ctxBusinessId } = useAuth();

  const businessId = useMemo(
    () =>
      effectiveBusinessId ||
      ctxBusinessId ||
      localStorage.getItem("businessId") ||
      null,
    [ctxBusinessId, effectiveBusinessId]
  );
  const hasValidBusiness = isGuid(businessId);

  const [loading, setLoading] = useState(false);
  const [deletingInfo, setDeletingInfo] = useState(null); // { name, language }
  const [templates, setTemplates] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Use forcedStatus if provided; approved page defaults to APPROVED.
  const [status, setStatus] = useState(forcedStatus || "APPROVED");
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  const v = sp.get("v") || "";
  const categoryFilter = sp.get("category") || "ALL";
  const qDebounced = useDebouncedValue(q, 250);

  const [sortKey, setSortKey] = useState("approvedAt");
  const [sortDir, setSortDir] = useState("desc"); // asc | desc


  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState(null); 

  const previewCacheRef = useRef(new Map());

  // Update status when forcedStatus changes (e.g. navigation between tabs)
  useEffect(() => {
    setPage(1);
    if (forcedStatus) setStatus(forcedStatus);
    else setStatus("APPROVED");
  }, [forcedStatus]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, categoryFilter, v]);

  const loadTemplates = useCallback(async () => {
    if (!hasValidBusiness) return;
    setLoading(true);
    try {
      const res = await axiosClient.get(`templates/${businessId}`, {
        params: {
          q: qDebounced.trim() || undefined,
          status: status || undefined,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
          page,
          pageSize,
          sortKey,
          sortDir
        },
        __silentToast: true,
      });

      if (res?.data?.success) {
        setTemplates(Array.isArray(res.data.templates) ? res.data.templates : []);
        setTotalCount(res.data.totalCount || 0);
        setTotalPages(res.data.totalPages || 0);
      } else {
        toast.error("Failed to load templates.");
        setTemplates([]);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Error loading templates.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, hasValidBusiness, qDebounced, status, categoryFilter, page, pageSize, sortKey, sortDir, v]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);


  const handleDeleteClick = (name, language) => {
    setDeletingInfo({ name, language });
  };

  const confirmDeleteApproved = async () => {
    if (!deletingInfo) return;
    const { name, language } = deletingInfo;
    
    try {
      await deleteApprovedTemplate(name, language);
      toast.success("Template deleted successfully");
      setTemplates(prev => 
        prev.filter(t => !((t.name || t.Name) === name && (t.languageCode || t.LanguageCode) === language))
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete template");
    } finally {
      setDeletingInfo(null);
    }
  };

  const setSort = nextKey => {
    setPage(1);
    if (sortKey === nextKey) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("asc");
    }
  };

  // Now server-side paged, so sortedTemplates is just the current page
  const sortedTemplates = templates;

  const summary = useMemo(() => {
    return {
      count: totalCount,
    };
  }, [totalCount]);


  const loadPreview = useCallback(
    async (name, languageCode) => {
      if (!hasValidBusiness || !name) return;

      const cacheKey = `${name}::${languageCode || ""}`;
      const cached = previewCacheRef.current.get(cacheKey);
      if (cached) {
        setPreviewMeta(cached);
        setPreviewOpen(true);
        return;
      }

      try {
        const res = await axiosClient.get(
          `templates/${businessId}/${encodeURIComponent(name)}`,
          {
            params: { language: languageCode || undefined },
            __silentToast: true,
          }
        );

        const tpl = res?.data?.template || res?.data || null;
        const meta = {
          name: tpl?.name ?? tpl?.Name ?? name,
          languageCode: tpl?.languageCode ?? tpl?.LanguageCode ?? languageCode,
          category: tpl?.category ?? tpl?.Category ?? "",
          status: tpl?.status ?? tpl?.Status ?? "",
          body: tpl?.body ?? tpl?.Body ?? "",
          headerKind: tpl?.headerKind ?? tpl?.HeaderKind ?? "none",
          buttons: tpl?.buttons ?? tpl?.Buttons ?? [],
        };

        previewCacheRef.current.set(cacheKey, meta);
        setPreviewMeta(meta);
        setPreviewOpen(true);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load template preview.");
      }
    },
    [businessId, hasValidBusiness]
  );

  const previewDraft = useMemo(() => {
    if (!previewMeta) return null;
    const bodyText = String(previewMeta.body || "");
    const max = extractPlaceholderMax(bodyText);
    const examples = [];
    for (let i = 1; i <= max; i++) {
      examples.push(i === 1 ? "12345" : `Example ${i}`);
    }

    return {
      name: previewMeta.name,
      category: previewMeta.category,
      language: previewMeta.languageCode || "en_US",
      headerType: mapHeaderKindToType(previewMeta.headerKind),
      headerText: "",
      headerMediaUrl: null,
      bodyText,
      footerText: "",
      buttons: normalizeButtonsForPreview(previewMeta.buttons),
      examples,
    };
  }, [previewMeta]);

  const SortIcon = ({ columnKey }) => {
    if (sortKey !== columnKey)
      return <ArrowUpDown size={14} className="text-slate-300" />;
    return sortDir === "asc" ? (
      <ArrowUp size={14} className="text-slate-600" />
    ) : (
      <ArrowDown size={14} className="text-slate-600" />
    );
  };

  const pageTitle = forcedStatus
    ? forcedStatus === "PENDING"
      ? "Pending Approval"
      : `${forcedStatus} Templates`
    : "Approved Templates";

  return (
    <div className="space-y-4 font-sans max-h-[calc(100vh-140px)] flex flex-col">


       {/* Content Table */}
      {!hasValidBusiness ? (
        <Card className="p-6 text-slate-700">
          Select a business (top bar) and try again.
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-[14px] text-slate-900">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600 border-b border-slate-200">
                <tr>
                  <th
                    className="w-[360px] px-4 py-3 cursor-pointer select-none"
                    onClick={() => setSort("name")}
                  >
                    <div className="inline-flex items-center gap-2">
                      Template name <SortIcon columnKey="name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => setSort("category")}
                  >
                    <div className="inline-flex items-center gap-2">
                      Category <SortIcon columnKey="category" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => setSort("language")}
                  >
                    <div className="inline-flex items-center gap-2">
                      Language <SortIcon columnKey="language" />
                    </div>
                  </th>
                  <th
                    className="w-[220px] px-4 py-3 cursor-pointer select-none"
                    onClick={() => setSort("status")}
                  >
                    <div className="inline-flex items-center gap-2">
                      Status <SortIcon columnKey="status" />
                    </div>
                  </th>
                  <th
                    className="w-[160px] px-4 py-3 cursor-pointer select-none"
                    onClick={() => setSort("approvedAt")}
                  >
                    <div className="inline-flex items-center gap-2">
                      {status === "PENDING" ? "Submitted" : "Approved Date"} <SortIcon columnKey="approvedAt" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTemplates.map((t, idx) => {
                  const name = t?.name ?? t?.Name ?? "";
                  const languageCode = t?.languageCode ?? t?.LanguageCode ?? "en_US";
                  const category = t?.category ?? t?.Category ?? "—";
                  const statusVal = t?.status ?? t?.Status ?? "—";
                  const key = `${name}::${languageCode}`;
                  const bodyPreview = String(
                    t?.bodyPreview ??
                      t?.BodyPreview ??
                      t?.body ??
                      t?.Body ??
                      ""
                  ).trim();
                  const updatedAt =
                    t?.updatedAt ??
                    t?.UpdatedAt ??
                    t?.lastSyncedAt ??
                    t?.LastSyncedAt ??
                    null;
                  const approvedAt =
                    t?.approvedAt ??
                    t?.ApprovedAt ??
                    null;
                  const isPendingView = String(status || "").toUpperCase() === "PENDING";
                  const displayTimestamp = isPendingView ? updatedAt : approvedAt;

                  return (
                    <tr
                      key={key}
                      className={`group transition-colors hover:bg-slate-50/80 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="px-4 py-3 w-[360px] align-middle">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 max-w-[280px]">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 group-hover:text-emerald-700 truncate transition-colors">
                                {name || "—"}
                              </span>
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Preview"
                                  onClick={() => loadPreview(name, languageCode)}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all ml-1"
                                  title="Delete Template"
                                  onClick={() => handleDeleteClick(name, languageCode)}
                                >
                                  <Trash2 size={14} />
                                </button>
                            </div>
                            {bodyPreview ? (
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate italic">
                                {bodyPreview}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                        {category || "—"}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600">
                        {normalizeLanguage(languageCode)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={
                            "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold " +
                            statusPillClass(statusVal)
                          }
                        >
                          {statusLabel(statusVal)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600 whitespace-nowrap text-xs">
                        {displayTimestamp
                          ? dayjs(displayTimestamp).format("D MMM YYYY, h:mm A")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

              {/* Pagination Controls */}
              {totalPages > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6">
                  <div className="flex justify-between flex-1 sm:hidden">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-700">
                        Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                        <span className="font-medium">{totalCount}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        
                        <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                          Page {page} of {totalPages}
                        </span>

                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages || totalPages === 0}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Preview Modal */}
      <Dialog 
        open={previewOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setPreviewOpen(false);
            setPreviewMeta(null);
          }
        }}
      >
      <DialogContent className="max-w-[380px] p-0 overflow-hidden !border-none !bg-transparent !shadow-none [&>button]:hidden">
        {previewDraft && (
          <div className="flex flex-col items-center w-full relative">
             <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-colors focus:outline-none"
                title="Close Preview"
             >
               <X size={24} />
             </button>

             <div className="w-full">
                <WhatsAppTemplatePreview draft={previewDraft} />
             </div>
          </div>
        )}
      </DialogContent>
      </Dialog>

      <DeleteConfirmationModal
        isOpen={!!deletingInfo}
        onClose={() => setDeletingInfo(null)}
        onConfirm={confirmDeleteApproved}
        title="Delete Approved Template?"
        description="This will permanently delete the template from your account and Meta. This action cannot be undone."
      />
    </div>
  );
}
