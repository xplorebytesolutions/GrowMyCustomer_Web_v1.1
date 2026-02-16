import React from "react";
import { RefreshCw, Search, Send, SlidersHorizontal, Smartphone, X } from "lucide-react";
import axiosClient from "../../api/chatInboxApi";
import CompactTemplatePreviewCard from "../../../../components/CompactTemplatePreviewCard";
import StandaloneMediaUploader from "../../../Campaigns/components/StandaloneMediaUploader";

const TEMPLATE_HEADER_NONE = "none";

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
];

const MEDIA_OPTIONS = [
  { value: "all", label: "All media" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
];

const normalizeTemplateHeaderKind = template => {
  const raw = String(template?.headerKind || template?.HeaderKind || "")
    .trim()
    .toLowerCase();
  if (raw === "image" || raw === "video" || raw === "document" || raw === "text") {
    return raw;
  }
  return TEMPLATE_HEADER_NONE;
};

const isMediaHeader = headerKind =>
  headerKind === "image" || headerKind === "video" || headerKind === "document";

const mediaTypeLabel = headerKind => {
  if (headerKind === "image") return "image";
  if (headerKind === "video") return "video";
  if (headerKind === "document") return "document";
  if (headerKind === "text") return "text";
  return "none";
};

const parseTemplateButtons = template => {
  const rawButtons =
    template?.buttonsJson ?? template?.buttons ?? template?.urlButtons ?? null;

  if (Array.isArray(rawButtons)) return rawButtons;
  if (typeof rawButtons === "string" && rawButtons.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawButtons);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const isDynamicUrlButton = button => {
  const subtype = String(button?.SubType || button?.subType || "")
    .trim()
    .toLowerCase();
  const originalUrl = String(
    button?.ParameterValue ||
      button?.parameterValue ||
      button?.Url ||
      button?.url ||
      ""
  );
  return subtype === "url" || /\{\{\d+\}\}/.test(originalUrl);
};

const toDynamicUrlSlots = buttons =>
  (Array.isArray(buttons) ? buttons : [])
    .map((button, idx) => {
      if (!isDynamicUrlButton(button)) return null;
      const label = String(
        button?.Text || button?.text || `URL button ${idx + 1}`
      ).trim();
      return { idx, label: label || `URL button ${idx + 1}` };
    })
    .filter(Boolean);

const extractTemplatePlaceholderIndexes = body => {
  const source = String(body || "");
  const matches = [...source.matchAll(/\{\{(\d+)\}\}/g)];
  const unique = new Set();
  for (const m of matches) {
    const idx = Number(m?.[1] || 0);
    if (Number.isFinite(idx) && idx > 0) unique.add(idx);
  }
  return [...unique].sort((a, b) => a - b);
};

const toTemplateId = (name, languageCode) => `${name}::${languageCode}`;

const pickTemplateDate = template =>
  template?.approvedAt ??
  template?.ApprovedAt ??
  template?.createdAt ??
  template?.CreatedAt ??
  null;

const formatTemplateDate = value => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

const normalizeListTemplate = template => {
  const name = String(template?.name ?? template?.Name ?? "").trim();
  const languageCode = String(
    template?.languageCode ??
      template?.LanguageCode ??
      template?.language ??
      template?.Language ??
      "en_US"
  ).trim();
  const category = String(template?.category ?? template?.Category ?? "").trim();
  const headerKind = normalizeTemplateHeaderKind(template);
  const bodyPreview = String(
    template?.bodyPreview ?? template?.BodyPreview ?? template?.body ?? template?.Body ?? ""
  ).trim();
  const createdOrApprovedAt = pickTemplateDate(template);
  const createdOrApprovedAtLabel = formatTemplateDate(createdOrApprovedAt);
  return {
    id: toTemplateId(name, languageCode || "en_US"),
    name,
    languageCode: languageCode || "en_US",
    category,
    headerKind,
    bodyPreview,
    createdOrApprovedAtLabel,
  };
};

const normalizeMediaFilter = value => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all") return "all";
  if (raw === "pdf" || raw === "doc") return "document";
  if (raw === "text" || raw === "image" || raw === "video" || raw === "document") {
    return raw;
  }
  return "all";
};

const resolveSortParams = value => {
  switch (value) {
    case "name_desc":
      return { sortKey: "name", sortDir: "desc" };
    case "created_asc":
      return { sortKey: "createdAt", sortDir: "asc" };
    case "created_desc":
      return { sortKey: "createdAt", sortDir: "desc" };
    case "name_asc":
    default:
      return { sortKey: "name", sortDir: "asc" };
  }
};

const resizeArray = (values, count) => {
  const next = Array.isArray(values) ? [...values] : [];
  if (next.length > count) return next.slice(0, count);
  while (next.length < count) next.push("");
  return next;
};

export function TemplateSendModal({
  open,
  onClose,
  selectedConversation,
  isTemplateSendDisabled,
  isTemplateSending,
  onSendTemplate,
}) {
  const [query, setQuery] = React.useState("");
  const [sortValue, setSortValue] = React.useState("name_asc");
  const [mediaFilter, setMediaFilter] = React.useState("all");
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [loadingList, setLoadingList] = React.useState(false);
  const [syncingTemplates, setSyncingTemplates] = React.useState(false);
  const [listError, setListError] = React.useState("");
  const [templates, setTemplates] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [reloadSeq, setReloadSeq] = React.useState(0);

  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [detailError, setDetailError] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);

  const [templateParameters, setTemplateParameters] = React.useState([]);
  const [urlButtonParams, setUrlButtonParams] = React.useState([]);
  const [headerMediaUrl, setHeaderMediaUrl] = React.useState("");
  const [headerMediaPreviewUrl, setHeaderMediaPreviewUrl] = React.useState("");
  const [validationError, setValidationError] = React.useState("");

  const selectedTemplateRef = React.useRef("");
  const lastBlobPreviewRef = React.useRef("");
  const filterPanelRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = e => {
      if (e.key === "Escape") onClose?.();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    setValidationError("");
    setShowFilterPanel(false);
  }, [open, selectedId]);

  React.useEffect(() => {
    if (!showFilterPanel) return undefined;
    const onMouseDown = event => {
      const root = filterPanelRef.current;
      if (!root) return;
      if (root.contains(event.target)) return;
      setShowFilterPanel(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showFilterPanel]);

  React.useEffect(() => {
    const prev = lastBlobPreviewRef.current;
    if (prev && prev !== headerMediaPreviewUrl && prev.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        // no-op
      }
    }
    lastBlobPreviewRef.current = headerMediaPreviewUrl;
  }, [headerMediaPreviewUrl]);

  React.useEffect(() => {
    return () => {
      const prev = lastBlobPreviewRef.current;
      if (prev && prev.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev);
        } catch {
          // no-op
        }
      }
    };
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      setListError("Missing business context.");
      setTemplates([]);
      return undefined;
    }

    let ignore = false;
    const timer = setTimeout(async () => {
      setLoadingList(true);
      setListError("");
      try {
        const sort = resolveSortParams(sortValue);
        const params = {
          status: "APPROVED",
          page: 1,
          pageSize: 100,
          q: query.trim() || undefined,
          media:
            normalizeMediaFilter(mediaFilter) === "all"
              ? undefined
              : normalizeMediaFilter(mediaFilter),
          sortKey: sort.sortKey,
          sortDir: sort.sortDir,
        };

        const res = await axiosClient.get(`templates/${businessId}`, { params });
        const rawList = Array.isArray(res?.data?.templates)
          ? res.data.templates
          : Array.isArray(res?.data)
          ? res.data
          : [];

        const normalized = rawList
          .map(normalizeListTemplate)
          .filter(item => item?.name);

        if (ignore) return;
        setTemplates(normalized);
        setSelectedId(prev => {
          if (prev && normalized.some(item => item.id === prev)) return prev;
          return normalized[0]?.id || "";
        });
      } catch {
        if (ignore) return;
        setTemplates([]);
        setSelectedId("");
        setListError("Failed to load approved templates.");
      } finally {
        if (!ignore) setLoadingList(false);
      }
    }, 220);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [open, query, sortValue, mediaFilter, reloadSeq]);

  React.useEffect(() => {
    if (!open) return undefined;
    if (!selectedId) {
      setSelectedTemplate(null);
      return undefined;
    }

    const businessId = localStorage.getItem("businessId");
    const selectedListItem = templates.find(item => item.id === selectedId);
    if (!businessId || !selectedListItem) return undefined;

    let ignore = false;
    (async () => {
      setLoadingDetails(true);
      setDetailError("");
      try {
        const languagePart = selectedListItem.languageCode
          ? `?language=${encodeURIComponent(selectedListItem.languageCode)}`
          : "";
        const detailRes = await axiosClient.get(
          `templates/${businessId}/${encodeURIComponent(selectedListItem.name)}${languagePart}`
        );
        const detail = detailRes?.data?.template || detailRes?.data || {};

        const body = String(detail?.body ?? detail?.Body ?? "").trim();
        const headerKind = normalizeTemplateHeaderKind({
          ...selectedListItem,
          ...detail,
        });
        const buttons = parseTemplateButtons(detail);
        const placeholderIndexes = extractTemplatePlaceholderIndexes(body);
        const dynamicUrlSlots = toDynamicUrlSlots(buttons);

        const merged = {
          id: selectedId,
          name: String(detail?.name ?? detail?.Name ?? selectedListItem.name).trim(),
          languageCode: String(
            detail?.languageCode ??
              detail?.LanguageCode ??
              detail?.language ??
              detail?.Language ??
              selectedListItem.languageCode ??
              "en_US"
          ).trim(),
          category: selectedListItem.category,
          headerKind,
          body,
          bodyPreview: selectedListItem.bodyPreview,
          buttons,
          placeholderIndexes,
          dynamicUrlSlots,
        };

        if (ignore) return;
        setSelectedTemplate(merged);
      } catch {
        if (ignore) return;
        setSelectedTemplate(null);
        setDetailError("Failed to load template details.");
      } finally {
        if (!ignore) setLoadingDetails(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [open, selectedId, templates]);

  React.useEffect(() => {
    if (!selectedTemplate) return;

    const changedTemplate = selectedTemplateRef.current !== selectedTemplate.id;
    const nextParamCount = selectedTemplate.placeholderIndexes.length;
    const nextUrlCount = selectedTemplate.dynamicUrlSlots.length;

    setTemplateParameters(prev =>
      changedTemplate ? Array(nextParamCount).fill("") : resizeArray(prev, nextParamCount)
    );
    setUrlButtonParams(prev =>
      changedTemplate ? Array(nextUrlCount).fill("") : resizeArray(prev, nextUrlCount)
    );

    if (changedTemplate) {
      setHeaderMediaUrl("");
      setHeaderMediaPreviewUrl("");
      setValidationError("");
    }

    selectedTemplateRef.current = selectedTemplate.id;
  }, [selectedTemplate]);

  const bodyMissing = React.useMemo(() => {
    if (!selectedTemplate) return false;
    if (!selectedTemplate.placeholderIndexes.length) return false;
    return selectedTemplate.placeholderIndexes.some((_, i) => {
      const v = String(templateParameters[i] || "").trim();
      return !v;
    });
  }, [selectedTemplate, templateParameters]);

  const dynamicMissing = React.useMemo(() => {
    if (!selectedTemplate) return false;
    if (!selectedTemplate.dynamicUrlSlots.length) return false;
    return selectedTemplate.dynamicUrlSlots.some((_, i) => {
      const v = String(urlButtonParams[i] || "").trim();
      return !v;
    });
  }, [selectedTemplate, urlButtonParams]);

  const headerMissing = React.useMemo(() => {
    if (!selectedTemplate) return false;
    if (!isMediaHeader(selectedTemplate.headerKind)) return false;
    return !String(headerMediaUrl || "").trim();
  }, [selectedTemplate, headerMediaUrl]);

  const canSend =
    !!selectedConversation &&
    !!selectedTemplate &&
    !isTemplateSendDisabled &&
    !isTemplateSending &&
    !loadingDetails &&
    !bodyMissing &&
    !dynamicMissing &&
    !headerMissing;

  const selectedTemplateMediaType = mediaTypeLabel(selectedTemplate?.headerKind);
  const previewHeaderMediaUrl = React.useMemo(() => {
    if (!selectedTemplate || !isMediaHeader(selectedTemplate.headerKind)) return "";
    const value = String(headerMediaUrl || "").trim();
    const preview = String(headerMediaPreviewUrl || "").trim();
    if (preview) return preview;
    if (!value || value.startsWith("handle:")) return "";
    return value;
  }, [selectedTemplate, headerMediaUrl, headerMediaPreviewUrl]);

  const previewButtons = React.useMemo(() => {
    if (!selectedTemplate?.buttons?.length) return [];
    return selectedTemplate.buttons.map((button, idx) => {
      const text = String(button?.Text || button?.text || `Button ${idx + 1}`).trim();
      const subType = String(button?.SubType || button?.subType || "").toLowerCase();
      const originalUrl = String(
        button?.ParameterValue || button?.parameterValue || button?.Url || button?.url || ""
      );
      return {
        text: text || `Button ${idx + 1}`,
        subType: subType || (/\{\{\d+\}\}/.test(originalUrl) ? "url" : ""),
      };
    });
  }, [selectedTemplate]);

  const handleSyncTemplates = React.useCallback(async () => {
    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      setListError("Missing business context.");
      return;
    }

    setSyncingTemplates(true);
    setListError("");
    try {
      await axiosClient.post(`templates/sync/${businessId}`);
      setReloadSeq(v => v + 1);
    } catch {
      setListError("Template sync failed. Please try again.");
    } finally {
      setSyncingTemplates(false);
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/40 px-4 py-6 sm:py-10"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1280px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Send Approved Template
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Search, filter, configure required values, and send with live preview.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close template modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
          <div className="min-h-0 border-b border-slate-200 lg:col-span-4 lg:border-b-0 lg:border-r">
            <div className="h-full flex flex-col bg-white">
              <div className="z-30 border-b border-slate-200 bg-white px-3 pt-1 pb-2 shadow-[0_1px_0_0_rgba(226,232,240,1)] sm:px-4 sm:pt-1 sm:pb-2">
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search approved templates..."
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncTemplates}
                    disabled={syncingTemplates || loadingList}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Sync approved templates"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${syncingTemplates ? "animate-spin" : ""}`}
                    />
                    {syncingTemplates ? "Syncing" : "Sync"}
                  </button>

                  <div className="relative" ref={filterPanelRef}>
                    <button
                      type="button"
                      onClick={() => setShowFilterPanel(prev => !prev)}
                      className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-2 transition ${
                        showFilterPanel
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                      title="Sort and filter templates"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>

                    {showFilterPanel ? (
                      <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                        <div className="space-y-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-500">
                              Sort
                            </label>
                            <select
                              value={sortValue}
                              onChange={e => setSortValue(e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            >
                              {SORT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-500">
                              Media
                            </label>
                            <select
                              value={mediaFilter}
                              onChange={e => setMediaFilter(e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            >
                              {MEDIA_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
              {loadingList ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                  Loading templates...
                </div>
              ) : listError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {listError}
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                  No templates found for the selected filters.
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(item => {
                    const active = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                          active
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="truncate text-[13px] font-semibold text-slate-900">
                          {item.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">
                            {(item.languageCode || "en_US").toUpperCase()}
                          </span>
                          {item.category ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5">
                              {item.category}
                            </span>
                          ) : null}
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">
                            {mediaTypeLabel(item.headerKind)}
                          </span>
                          {item.createdOrApprovedAtLabel ? (
                            <span className="ml-auto text-[10px] text-slate-400 whitespace-nowrap">
                              {item.createdOrApprovedAtLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                          {item.bodyPreview || "No body preview available."}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          </div>

          <div className="min-h-0 border-b border-slate-200 lg:col-span-4 lg:border-b-0 lg:border-r">
            <div className="h-full overflow-y-auto bg-white p-3 sm:p-4">
              {loadingDetails ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                  Loading template details...
                </div>
              ) : detailError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {detailError}
                </div>
              ) : !selectedTemplate ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                  Select a template to configure required values.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 tracking-tight">
                      {selectedTemplate.name}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                        {(selectedTemplate.languageCode || "en_US").toUpperCase()}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600 capitalize">
                        {selectedTemplateMediaType}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                        {selectedTemplate.placeholderIndexes.length} body params
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                        {selectedTemplate.dynamicUrlSlots.length} url params
                      </span>
                    </div>
                  </div>

                  {selectedTemplate.placeholderIndexes.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-700">
                        Body Parameters (required)
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {selectedTemplate.placeholderIndexes.map((idx, i) => (
                          <input
                            key={`body-param-${idx}`}
                            type="text"
                            value={templateParameters[i] || ""}
                            onChange={e =>
                              setTemplateParameters(prev => {
                                const next = resizeArray(
                                  prev,
                                  selectedTemplate.placeholderIndexes.length
                                );
                                next[i] = e.target.value;
                                return next;
                              })
                            }
                            placeholder={`Body {{${idx}}}`}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {isMediaHeader(selectedTemplate.headerKind) ? (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-700">
                        Header {selectedTemplateMediaType} URL (required)
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={headerMediaUrl.startsWith("handle:") ? "" : headerMediaUrl}
                          onChange={e => {
                            const next = e.target.value;
                            setHeaderMediaUrl(next);
                            setHeaderMediaPreviewUrl(next);
                            setValidationError("");
                          }}
                          placeholder={
                            selectedTemplate.headerKind === "video"
                              ? "Enter HTTPS video URL or upload below..."
                              : "Enter HTTPS URL or upload below..."
                          }
                          disabled={headerMediaUrl.startsWith("handle:")}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
                        />

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                          </div>
                          <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-white px-2 text-slate-400 font-medium tracking-wider">
                              Or Upload File
                            </span>
                          </div>
                        </div>

                        <StandaloneMediaUploader
                          mediaType={selectedTemplate.headerKind.toUpperCase()}
                          handle={headerMediaUrl}
                          onUploaded={handle => {
                            setHeaderMediaUrl(handle);
                            setValidationError("");
                          }}
                          onPreview={previewUrl => {
                            setHeaderMediaPreviewUrl(previewUrl || "");
                            setValidationError("");
                          }}
                        />

                        {headerMediaUrl.startsWith("handle:") ? (
                          <button
                            type="button"
                            onClick={() => {
                              setHeaderMediaUrl("");
                              setHeaderMediaPreviewUrl("");
                              setValidationError("");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove uploaded media
                          </button>
                        ) : null}

                        <p className="text-[11px] text-slate-500">
                          Use HTTPS media URL, or upload and send via media handle.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {selectedTemplate.dynamicUrlSlots.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-700">
                        Dynamic URL Parameters (required)
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedTemplate.dynamicUrlSlots.map((slot, i) => (
                          <input
                            key={`url-param-${slot.idx}`}
                            type="text"
                            value={urlButtonParams[i] || ""}
                            onChange={e =>
                              setUrlButtonParams(prev => {
                                const next = resizeArray(
                                  prev,
                                  selectedTemplate.dynamicUrlSlots.length
                                );
                                next[i] = e.target.value;
                                return next;
                              })
                            }
                            placeholder={`${slot.label} value`}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {validationError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                      {validationError}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 lg:col-span-4">
            <div className="h-full overflow-y-auto bg-slate-50/70 p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Smartphone className="h-3.5 w-3.5" />
                Live WhatsApp Preview
              </div>
              {selectedTemplate ? (
                <CompactTemplatePreviewCard
                  templateBody={selectedTemplate.body || ""}
                  parameters={templateParameters}
                  headerMediaUrl={headerMediaUrl}
                  headerMediaPreviewUrl={previewHeaderMediaUrl}
                  headerKind={selectedTemplate.headerKind}
                  buttons={previewButtons}
                  templateName={selectedTemplate.name}
                />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                  Select a template to see a live preview.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="mr-auto text-xs text-slate-500">
            {templates.length} template{templates.length === 1 ? "" : "s"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={async () => {
              if (!selectedTemplate) return;

              const trimmedParams = templateParameters.map(v =>
                String(v || "").trim()
              );
              const trimmedUrlParams = urlButtonParams.map(v =>
                String(v || "").trim()
              );
              const trimmedHeaderMediaUrl = String(headerMediaUrl || "").trim();

              if (bodyMissing) {
                setValidationError("Fill all required body parameter values.");
                return;
              }
              if (headerMissing) {
                setValidationError("Header media URL is required for this template.");
                return;
              }
              if (dynamicMissing) {
                setValidationError(
                  "Fill all dynamic URL button parameter values."
                );
                return;
              }

              setValidationError("");
              const ok = await onSendTemplate?.({
                id: selectedTemplate.id,
                name: selectedTemplate.name,
                languageCode: selectedTemplate.languageCode || "en_US",
                headerKind: selectedTemplate.headerKind || TEMPLATE_HEADER_NONE,
                headerMediaUrl: trimmedHeaderMediaUrl || null,
                parameters: trimmedParams,
                templateParameters: trimmedParams,
                urlButtonParams: trimmedUrlParams,
                body: selectedTemplate.body || "",
              });

              if (ok) onClose?.();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              canSend
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            {isTemplateSending ? "Sending..." : "Send template"}
          </button>
        </div>
      </div>
    </div>
  );
}
