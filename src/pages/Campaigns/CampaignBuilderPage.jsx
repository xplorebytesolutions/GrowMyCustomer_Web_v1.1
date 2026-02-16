// 📄 src/pages/campaigns/CampaignBuilderPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import PhoneWhatsAppPreview from "../../components/PhoneWhatsAppPreview";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import Select from "react-select";
import {
  LayoutTemplate,
  RefreshCw,
  Zap,
  Calendar,
  Send,
  Info,
  Smartphone,
  X,
} from "lucide-react";
import StandaloneMediaUploader from "./components/StandaloneMediaUploader";

// === Your axios baseURL already ends with /api. Keep all calls RELATIVE (no leading slash).
const SYNC_ENDPOINT = bid => `templates/sync/${bid}`; // POST
const TEMPLATE_PAGE_SIZE = 20;
const TEMPLATE_PREFETCH_PAGE_SIZE = 200;

const isGuid = v =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

// Header kind helpers (frontend-only)
const HK = Object.freeze({
  None: "none",
  Text: "text",
  Image: "image",
  Video: "video",
  Document: "document",
});
const isMediaHeader = hk =>
  hk === HK.Image || hk === HK.Video || hk === HK.Document;
const mediaLabel = hk =>
  hk === HK.Image
    ? "Image URL"
    : hk === HK.Video
    ? "Video URL"
    : "Document URL";

export default function CampaignBuilderPage() {
  const { businessId: ctxBusinessId } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateSort, setTemplateSort] = useState("created_desc"); // 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'
  const [templateMedia, setTemplateMedia] = useState("all"); // all|text|image|video|document
  const [templatePage, setTemplatePage] = useState(1);
  const [templateTotalPages, setTemplateTotalPages] = useState(0);
  const [templateTotalCount, setTemplateTotalCount] = useState(0);
  const [loadingMoreTemplates, setLoadingMoreTemplates] = useState(false);
  const [selectedTemplateOption, setSelectedTemplateOption] = useState(null);
  const templateQueryDebounceRef = useRef(null);
  const templatesFetchSeqRef = useRef(0);
  const templateRestoreAttemptedRef = useRef(false);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateParams, setTemplateParams] = useState([]);
  const [buttonParams, setButtonParams] = useState([]);

  // Unified header media url (for Image/Video/Document)
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");

  const [campaignName, setCampaignName] = useState("");
  const [nameError, setNameError] = useState(""); // inline name check
  const [checkingName, setCheckingName] = useState(false);

  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Optional Flow
  const [useFlow, setUseFlow] = useState(false);
  const [flows, setFlows] = useState([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState("");

  // Sender selection (from WhatsAppPhoneNumbers)
  const [senders, setSenders] = useState([]); // [{id, provider, phoneNumberId, whatsAppNumber}]
  const [selectedSenderId, setSelectedSenderId] = useState("");

  // CSV controls all dynamic personalization (default ON)
  const [useCsvPersonalization, setUseCsvPersonalization] = useState(true);

  // Schedule Mode: 'now' | 'later'
  const [scheduleMode, setScheduleMode] = useState("now");

  const businessId = useMemo(
    () => ctxBusinessId || localStorage.getItem("businessId") || null,
    [ctxBusinessId]
  );
  const hasValidBusiness = isGuid(businessId);

  const templateSelectionStorageKey = useMemo(() => {
    if (!hasValidBusiness) return null;
    return `campaignBuilder.selectedTemplate.${businessId}`;
  }, [businessId, hasValidBusiness]);

  const formStateStorageKey = useMemo(() => {
    if (!hasValidBusiness) return null;
    return `campaignBuilder.formState.${businessId}`;
  }, [businessId, hasValidBusiness]);

  const formRestoreAttemptedRef = useRef(false);

  const createdBy = localStorage.getItem("userId");
  const navigate = useNavigate();

  // ---------- Helpers ----------
  const checkNameAvailability = async name => {
    setNameError("");
    if (!name?.trim() || !hasValidBusiness) return true;
    try {
      setCheckingName(true);
      const { data } = await axiosClient.get(`campaign/check-name`, {
        params: { name },
      });
      if (data?.available === false) {
        setNameError("Name already exists.");
        return false;
      } else {
        setNameError("");
        return true;
      }
    } catch {
      setNameError("");
      return true;
    } finally {
      setCheckingName(false);
    }
  };

  const normalizeHeaderKind = t => {
    const raw = (t.headerKind || t.HeaderKind || "").toString().toLowerCase();
    if (
      raw === HK.Image ||
      raw === HK.Video ||
      raw === HK.Document ||
      raw === HK.Text ||
      raw === HK.None
    ) {
      return raw;
    }
    return t.hasImageHeader || t.HasImageHeader ? HK.Image : HK.None;
  };

  const toArray = maybe => (Array.isArray(maybe) ? maybe : []);

  // ---------- Effects ----------
  const sortParams = useMemo(() => {
    switch (templateSort) {
      case "name_asc":
        return { sortKey: "name", sortDir: "asc" };
      case "name_desc":
        return { sortKey: "name", sortDir: "desc" };
      case "created_asc":
        return { sortKey: "createdAt", sortDir: "asc" };
      case "created_desc":
      default:
        return { sortKey: "createdAt", sortDir: "desc" };
    }
  }, [templateSort]);

  const normalizeMedia = v => {
    const raw = String(v || "").trim().toLowerCase();
    if (!raw || raw === "all") return "all";
    if (raw === "pdf") return "document";
    if (raw === "doc") return "document";
    if (raw === "image" || raw === "video" || raw === "document" || raw === "text")
      return raw;
    return "all";
  };

  const mediaLabel = hk => {
    const raw = String(hk || "").trim().toLowerCase();
    if (raw === "image") return "Image";
    if (raw === "video") return "Video";
    if (raw === "document") return "Document";
    if (raw === "location") return "Location";
    return "Text";
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

  const fetchApprovedTemplates = async ({ page = 1, append = false } = {}) => {
    if (!hasValidBusiness) return;

    const prefetchAllMode =
      normalizeMedia(templateMedia) === "all" &&
      (templateSort === "name_asc" || templateSort === "name_desc") &&
      !(templateQuery || "").trim().length;

    const q = (templateQuery || "").trim();
    const m = normalizeMedia(templateMedia);
    const effectivePageSize = prefetchAllMode
      ? TEMPLATE_PREFETCH_PAGE_SIZE
      : TEMPLATE_PAGE_SIZE;
    const params = {
      status: "APPROVED",
      q: q.length ? q : undefined,
      media: m !== "all" ? m : undefined,
      page,
      pageSize: effectivePageSize,
      sortKey: sortParams.sortKey,
      sortDir: sortParams.sortDir,
    };

    if (append) setLoadingMoreTemplates(true);
    else setLoadingTemplates(true);

    try {
      const seq = ++templatesFetchSeqRef.current;
      const res = await axiosClient.get(`templates/${businessId}`, { params });
      if (res?.data?.success) {
        const items = Array.isArray(res.data.templates) ? res.data.templates : [];
        setTemplates(prev => (append ? [...prev, ...items] : items));
        const nextPage = res.data.page || page;
        const nextTotalPages = res.data.totalPages || 0;
        const nextTotalCount = res.data.totalCount || 0;
        setTemplatePage(nextPage);
        setTemplateTotalPages(nextTotalPages);
        setTemplateTotalCount(nextTotalCount);

        // Industry-grade UX: when the user selects broad filters (All media + A–Z) and no search term,
        // prefetch remaining pages in the background so the dropdown shows the full set without relying on scrolling.
        if (!append && prefetchAllMode && nextTotalPages > 1) {
          setLoadingMoreTemplates(true);
          try {
            for (let p = 2; p <= nextTotalPages; p++) {
              if (templatesFetchSeqRef.current !== seq) break; // query/sort changed
              const r = await axiosClient.get(`templates/${businessId}`, {
                params: { ...params, page: p, pageSize: effectivePageSize },
              });
              if (templatesFetchSeqRef.current !== seq) break;
              const more = Array.isArray(r?.data?.templates) ? r.data.templates : [];
              if (more.length) setTemplates(prev => [...prev, ...more]);
            }
          } finally {
            if (templatesFetchSeqRef.current === seq) setLoadingMoreTemplates(false);
          }
        }
      } else {
        if (!append) setTemplates([]);
        toast.error(res?.data?.message || "❌ Failed to load templates.");
      }
    } catch {
      if (!append) setTemplates([]);
      toast.error("❌ Error loading templates.");
    } finally {
      if (append) setLoadingMoreTemplates(false);
      else setLoadingTemplates(false);
    }
  };

  // Load + refresh when business/sort/search changes (debounced).
  useEffect(() => {
    if (!hasValidBusiness) return;

    // Debounce search to keep UI light and avoid hammering the API
    if (templateQueryDebounceRef.current) clearTimeout(templateQueryDebounceRef.current);
    templateQueryDebounceRef.current = setTimeout(() => {
      fetchApprovedTemplates({ page: 1, append: false });
    }, 250);

    return () => {
      if (templateQueryDebounceRef.current) clearTimeout(templateQueryDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, hasValidBusiness, templateQuery, templateMedia, templateSort, sortParams.sortKey, sortParams.sortDir]);

  // Load flows when needed
  useEffect(() => {
    if (!useFlow || !hasValidBusiness) return;
    if (flows.length > 0) return; // already loaded

    const loadFlows = async () => {
      setLoadingFlows(true);
      try {
        const r = await axiosClient.get(
          `campaign/list/${businessId}?onlyPublished=true`
        );

        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        const mapped = items
          .map(f => ({
            id: f.id ?? f.Id,
            name: f.flowName ?? f.FlowName,
            isPublished: f.isPublished ?? f.IsPublished ?? true,
          }))
          .filter(x => x.id && x.name);

        setFlows(mapped);
      } catch {
        toast.error("❌ Error loading flows.");
      } finally {
        setLoadingFlows(false);
      }
    };

    loadFlows();
  }, [useFlow, hasValidBusiness, businessId]);

  // Load available senders
  useEffect(() => {
    if (!hasValidBusiness) return;
    (async () => {
      try {
        const r = await axiosClient.get(
          `WhatsAppSettings/senders/${businessId}`
        );

        const raw = Array.isArray(r.data) ? r.data : r.data?.items || [];
        const normalized = raw.map(x => {
          const provider = String(x.provider || x.Provider || "").toUpperCase();
          const phoneNumberId = x.phoneNumberId ?? x.PhoneNumberId;
          const whatsAppNumber =
            x.whatsAppBusinessNumber ??
            x.whatsappBusinessNumber ??
            x.displayNumber ??
            x.phoneNumber ??
            x.WhatsAppBusinessNumber ??
            x.PhoneNumber ??
            x.phoneNumberId ??
            x.PhoneNumberId;

          const id = x.id ?? x.Id ?? `${provider}|${phoneNumberId}`;
          return { id, provider, phoneNumberId, whatsAppNumber };
        });

        setSenders(normalized);
        if (normalized.length === 1) setSelectedSenderId(normalized[0].id);
      } catch {
        toast.error("❌ Failed to load WhatsApp senders.");
        setSenders([]);
      }
    })();
  }, [hasValidBusiness, businessId]);

  // ---------- Actions ----------
  const handleSyncTemplates = async () => {
    if (!hasValidBusiness) return;
    setSyncing(true);
    try {
      const res = await axiosClient.post(SYNC_ENDPOINT(businessId));
      if (res?.data?.success || res?.status === 200) {
        toast.success("Templates synced!");
        await fetchApprovedTemplates({ page: 1, append: false });
      } else {
        toast.error("Sync failed.");
      }
    } catch {
      toast.error("Error syncing templates.");
    } finally {
      setSyncing(false);
    }
  };

  const handleTemplateSelect = async selection => {
    const name = typeof selection === "string" ? selection : selection?.name;
    const languageCode =
      typeof selection === "string" ? null : selection?.languageCode;

    if (!name) {
      setSelectedTemplate(null);
      setSelectedTemplateOption(null);
      setTemplateParams([]);
      setButtonParams([]);
      setHeaderMediaUrl("");
      return;
    }
    try {
      const langParam =
        languageCode && String(languageCode).trim().length
          ? `?language=${encodeURIComponent(String(languageCode).trim())}`
          : "";
      const res = await axiosClient.get(
        `templates/${businessId}/${encodeURIComponent(name)}${langParam}`
      );
      const rawTemplate = res?.data?.template || res?.data || null;
      if (!rawTemplate?.name && !rawTemplate?.Name) {
        toast.error("Could not load template details.");
        return;
      }

      // Parse buttons
      const rawButtons =
        rawTemplate.buttonsJson ??
        rawTemplate.buttons ??
        rawTemplate.urlButtons ??
        null;
      let parsedButtons = [];
      if (Array.isArray(rawButtons)) {
        parsedButtons = rawButtons;
      } else if (
        typeof rawButtons === "string" &&
        rawButtons.trim().startsWith("[")
      ) {
        try {
          parsedButtons = JSON.parse(rawButtons);
        } catch {
          parsedButtons = [];
        }
      }

      const hk = normalizeHeaderKind(rawTemplate);
      const requiresHeaderMediaUrl =
        rawTemplate.requiresHeaderMediaUrl === true ||
        rawTemplate.RequiresMediaHeader === true ||
        isMediaHeader(hk);

      const normalized = {
        name: rawTemplate.name ?? rawTemplate.Name,
        language:
          rawTemplate.language ??
          rawTemplate.Language ??
          rawTemplate.languageCode ??
          rawTemplate.LanguageCode ??
          "en_US",
        body: rawTemplate.body ?? rawTemplate.Body ?? "",
        headerKind: hk,
        requiresHeaderMediaUrl,
        hasImageHeader:
          rawTemplate.hasImageHeader ?? rawTemplate.HasImageHeader ?? false,
        parametersCount:
          (
            (rawTemplate.body ?? rawTemplate.Body ?? "").match(/{{[0-9]+}}/g) ||
            []
          ).length,
        buttonParams: toArray(parsedButtons),
      };

      setSelectedTemplate(normalized);
      setTemplateParams(Array(normalized.parametersCount).fill(""));

      // Dyn slots
      const dynSlots =
        normalized.buttonParams?.map(btn => {
          const originalUrl = btn?.ParameterValue || btn?.parameterValue || "";
          const subtype = (btn?.SubType || btn?.subType || "").toLowerCase();
          const isDynamic =
            ["url", "copy_code", "flow"].includes(subtype) ||
            originalUrl.includes("{{1}}");
          return isDynamic ? "" : null;
        }) || [];
      setButtonParams(dynSlots);
      setHeaderMediaUrl("");
    } catch {
      toast.error("Error loading template details.");
    }
  };

  // Persist/restore selected template so user progress isn't lost on route changes or tab/window switches.
  // (Session storage keeps it scoped to the current browser session.)
  useEffect(() => {
    if (!templateSelectionStorageKey) return;
    try {
      if (!selectedTemplateOption) {
        sessionStorage.removeItem(templateSelectionStorageKey);
        return;
      }
      const payload = {
        name: selectedTemplateOption.name,
        languageCode: selectedTemplateOption.languageCode,
      };
      sessionStorage.setItem(templateSelectionStorageKey, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }, [selectedTemplateOption, templateSelectionStorageKey]);

  // Restore in-progress form values after refreshes (e.g., file picker / upload).
  useEffect(() => {
    if (!hasValidBusiness) return;
    if (!formStateStorageKey) return;
    if (formRestoreAttemptedRef.current) return;
    formRestoreAttemptedRef.current = true;

    try {
      const raw = sessionStorage.getItem(formStateStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (!campaignName && typeof parsed?.campaignName === "string") {
        setCampaignName(parsed.campaignName);
      }
      if (!selectedSenderId && typeof parsed?.selectedSenderId === "string") {
        setSelectedSenderId(parsed.selectedSenderId);
      }
      if (
        scheduleMode === "now" &&
        (parsed?.scheduleMode === "now" || parsed?.scheduleMode === "later")
      ) {
        setScheduleMode(parsed.scheduleMode);
      }
      if (!scheduledAt && typeof parsed?.scheduledAt === "string") {
        setScheduledAt(parsed.scheduledAt);
      }
      if (typeof parsed?.useCsvPersonalization === "boolean") {
        setUseCsvPersonalization(parsed.useCsvPersonalization);
      }
      if (typeof parsed?.useFlow === "boolean") {
        setUseFlow(parsed.useFlow);
      }
      if (!selectedFlowId && typeof parsed?.selectedFlowId === "string") {
        setSelectedFlowId(parsed.selectedFlowId);
      }
    } catch {
      // no-op
    }
  }, [
    hasValidBusiness,
    formStateStorageKey,
    campaignName,
    selectedSenderId,
    scheduleMode,
    scheduledAt,
    useCsvPersonalization,
    useFlow,
    selectedFlowId,
  ]);

  // Restore uploaded header media handle/url once the template has loaded.
  useEffect(() => {
    if (!hasValidBusiness) return;
    if (!formStateStorageKey) return;
    if (!selectedTemplate) return;
    if (headerMediaUrl) return;

    try {
      const raw = sessionStorage.getItem(formStateStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      const storedUrl = parsed?.headerMediaUrl;
      if (typeof storedUrl !== "string" || !storedUrl.trim()) return;

      const storedName = parsed?.selectedTemplateName;
      const storedLanguage = parsed?.selectedTemplateLanguage;
      if (!storedName || storedName !== selectedTemplate.name) return;
      if (storedLanguage && storedLanguage !== selectedTemplate.language) return;

      setHeaderMediaUrl(storedUrl);
    } catch {
      // no-op
    }
  }, [
    hasValidBusiness,
    formStateStorageKey,
    selectedTemplate,
    headerMediaUrl,
  ]);

  // Persist in-progress form values so accidental refreshes don't wipe the form.
  useEffect(() => {
    if (!hasValidBusiness) return;
    if (!formStateStorageKey) return;

    try {
      sessionStorage.setItem(
        formStateStorageKey,
        JSON.stringify({
          selectedTemplateName:
            selectedTemplateOption?.name || selectedTemplate?.name || null,
          selectedTemplateLanguage:
            selectedTemplateOption?.languageCode || selectedTemplate?.language || null,
          campaignName,
          selectedSenderId,
          headerMediaUrl,
          scheduleMode,
          scheduledAt,
          useCsvPersonalization,
          useFlow,
          selectedFlowId,
        })
      );
    } catch {
      // no-op
    }
  }, [
    hasValidBusiness,
    formStateStorageKey,
    selectedTemplateOption,
    selectedTemplate,
    campaignName,
    selectedSenderId,
    headerMediaUrl,
    scheduleMode,
    scheduledAt,
    useCsvPersonalization,
    useFlow,
    selectedFlowId,
  ]);

  useEffect(() => {
    if (!hasValidBusiness) return;
    if (!templateSelectionStorageKey) return;
    if (templateRestoreAttemptedRef.current) return;
    templateRestoreAttemptedRef.current = true;

    try {
      const raw = sessionStorage.getItem(templateSelectionStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const name = parsed?.name;
      const languageCode = parsed?.languageCode || "en_US";
      if (!name) return;

      // Seed the select with a minimal option; details will be fetched by handleTemplateSelect.
      const opt = {
        value: `${name}::${languageCode}`,
        label: name,
        name,
        languageCode,
      };
      setSelectedTemplateOption(opt);
      handleTemplateSelect({ name, languageCode });
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidBusiness, templateSelectionStorageKey]);

  const handleCreateCampaign = async () => {
    if (!hasValidBusiness) return;
    if (!campaignName || !selectedTemplate) {
      toast.warn("Please fill campaign name and choose a template.");
      return;
    }
    if (checkingName) return;
    if (nameError) {
      toast.warn("Please fix the campaign name.");
      return;
    }

    if (!useCsvPersonalization && templateParams.some(p => p === "")) {
      toast.warn("Please fill all template parameters or enable CSV.");
      return;
    }

    if (useFlow && !selectedFlowId) {
      toast.warn("Please select a flow or disable Flow Integration.");
      return;
    }

    const selectedSender = senders.find(s => s.id === selectedSenderId);
    if (!selectedSender || !selectedSender.phoneNumberId) {
      toast.warn("Please choose a Sender (number).");
      return;
    }

    const hk = selectedTemplate?.headerKind || HK.None;
    if (isMediaHeader(hk) && !headerMediaUrl) {
      toast.warn(`Please provide a ${mediaLabel(hk)}.`);
      return;
    }

    setSubmitting(true);

    // Build payload
    const buttonPayload =
      selectedTemplate.buttonParams?.map((btn, idx) => {
        const originalUrl = btn?.ParameterValue || btn?.parameterValue || "";
        const subtype = (btn?.SubType || btn?.subType || "").toLowerCase();
        const isDynamic =
          ["url", "copy_code", "flow"].includes(subtype) ||
          originalUrl.includes("{{1}}");

        return {
          text: btn?.Text || btn?.text || "Button",
          type: btn?.Type || btn?.type || "",
          value: isDynamic
            ? useCsvPersonalization
              ? ""
              : buttonParams[idx] || ""
            : originalUrl,
          position: idx + 1,
        };
      }) || [];

    const campaignType =
      hk === HK.Image ? "image" : hk === HK.Video ? "video" : "text";

    // Schedule logic
    const finalScheduledAt =
      scheduleMode === "later" && scheduledAt
        ? new Date(scheduledAt).toISOString()
        : null;

    const payload = {
      name: campaignName,
      messageTemplate: (selectedTemplate.body || "").trim(),
      templateId: selectedTemplate.name,
      templateLanguage: selectedTemplate.language || undefined,
      buttonParams: buttonPayload,
      campaignType,
      imageUrl: hk === HK.Image ? headerMediaUrl : null,
      videoUrl: hk === HK.Video ? headerMediaUrl : null,
      documentUrl: hk === HK.Document ? headerMediaUrl : null,
      headerMediaUrl: isMediaHeader(hk) ? headerMediaUrl : null,
      headerKind: hk,
      scheduledAt: finalScheduledAt,
      createdBy,
      businessId,
      templateParameters: useCsvPersonalization ? [] : templateParams,
      useCsvPersonalization,
      ctaFlowConfigId: useFlow ? selectedFlowId : null,
      provider: String(selectedSender.provider || "").toUpperCase(),
      phoneNumberId: selectedSender.phoneNumberId,
    };

    try {
      const isNameAvailable = await checkNameAvailability(campaignName);
      if (!isNameAvailable) {
        setSubmitting(false);
        return;
      }

      const res = await axiosClient.post(
        `campaign/create-text-campaign`,
        payload
      );
      if (res.data?.success && res.data?.campaignId) {
        toast.success("Campaign created successfully.");
        try {
          if (formStateStorageKey) sessionStorage.removeItem(formStateStorageKey);
        } catch {
          // ignore
        }
        navigate(
          `/app/campaigns/image-campaigns/assign-contacts/${res.data.campaignId}`
        );
      } else {
        toast.error("Failed to create campaign.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to create campaign."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const templateOptions = useMemo(() => {
    return templates
      .map(tpl => {
        const name = tpl.name ?? tpl.Name;
        const languageCode = tpl.languageCode ?? tpl.LanguageCode ?? "en_US";
        if (!name) return null;
        const headerKind = tpl.headerKind ?? tpl.HeaderKind ?? "none";
        const createdAt = tpl.createdAt ?? tpl.CreatedAt ?? null;
        return {
          value: `${name}::${languageCode}`,
          label: name,
          name,
          languageCode,
          category: tpl.category ?? tpl.Category ?? "",
          bodyVarCount: tpl.bodyVarCount ?? tpl.BodyVarCount ?? 0,
          headerKind,
          media: mediaLabel(headerKind),
          createdAt,
          updatedAt: tpl.updatedAt ?? tpl.UpdatedAt ?? null,
        };
      })
      .filter(Boolean);
  }, [templates]);

  // React-Select clears the visible selection if the current `value` isn't present in `options`.
  // When filters/search change, the API might return a page that doesn't include the selected template.
  // Keep the selected option pinned so it never disappears from the control.
  const templateOptionsForSelect = useMemo(() => {
    if (!selectedTemplateOption) return templateOptions;
    const pinnedValue = selectedTemplateOption.value;
    const deduped = templateOptions.filter(o => o?.value !== pinnedValue);
    return [selectedTemplateOption, ...deduped];
  }, [selectedTemplateOption, templateOptions]);

  const prefetchAllMode =
    normalizeMedia(templateMedia) === "all" &&
    (templateSort === "name_asc" || templateSort === "name_desc") &&
    !(templateQuery || "").trim().length;

  const formatTemplateOptionLabel = (opt, { context }) => {
    const createdLabel = formatShortDate(opt.createdAt);
    const meta = [
      opt.languageCode ? String(opt.languageCode).toUpperCase() : null,
      opt.category ? String(opt.category).toUpperCase() : null,
      opt.media ? String(opt.media).toUpperCase() : null,
      typeof opt.bodyVarCount === "number" ? `${opt.bodyVarCount} vars` : null,
      createdLabel ? `Created ${createdLabel}` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    if (context === "value") {
      return (
        <div className="flex items-center gap-2">
          <span className="truncate">{opt.label}</span>
          {opt.languageCode ? (
            <span className="text-xs text-slate-500">
              ({String(opt.languageCode).toUpperCase()})
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div className="py-0.5">
        <div className="text-sm font-medium">{opt.label}</div>
        {meta ? (
          <div className="text-[11px] leading-tight opacity-80">{meta}</div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f6f7] pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 shadow-sm shadow-emerald-200">
              <LayoutTemplate className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                New Campaign
              </h1>
              <p className="text-xs text-slate-500">
                Design and schedule your WhatsApp broadcast.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: UNIFIED FORM Container -- COMPACT */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              
              {/* SECTION: details */}
              <div className="p-5 space-y-5">
                <div>
                   {/* Divider / Header */}

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Campaign Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ring-offset-1 focus:ring-2 ${
                          nameError
                            ? "border-red-300 focus:ring-red-200 bg-red-50"
                            : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
                        }`}
                        placeholder="e.g. Diwali Sale"
                        value={campaignName}
                        onChange={e => {
                          setCampaignName(e.target.value);
                          setNameError("");
                        }}
                        onBlur={() => checkNameAvailability(campaignName)}
                      />
                      {nameError && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {nameError}
                        </p>
                      )}
                    </div>

                    {/* Sender */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sender (From) <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedSenderId}
                        onChange={e => setSelectedSenderId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-1 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="" disabled>
                          -- Select Number --
                        </option>
                        {senders.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.whatsAppNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION: template */}
                <div>

                  <div className="space-y-4">
                    {/* Template Selector */}
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Template <span className="text-red-500">*</span>
                      </label>
                        <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <Select
                            inputId="approvedTemplateSelect"
                            className="react-select-container"
                            classNamePrefix="react-select"
                            isClearable
                            isLoading={loadingTemplates || loadingMoreTemplates}
                            options={templateOptionsForSelect}
                            value={selectedTemplateOption}
                            getOptionValue={o => o.value}
                            getOptionLabel={o => o.label}
                            placeholder="Search approved templates…"
                            // Prevent clipping inside scroll/overflow containers
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            menuPlacement="auto"
                            maxMenuHeight={320}
                            noOptionsMessage={() =>
                              loadingTemplates
                                ? "Loading…"
                                : "No templates found. Try a different search."
                            }
                            onChange={opt => {
                              setSelectedTemplateOption(opt);
                              handleTemplateSelect(
                                opt
                                  ? { name: opt.name, languageCode: opt.languageCode }
                                  : null
                              );
                            }}
                            onInputChange={(val, meta) => {
                              if (meta.action === "input-change") setTemplateQuery(val);
                            }}
                            onMenuScrollToBottom={() => {
                              if (prefetchAllMode) return;
                              const hasMore = templatePage < templateTotalPages;
                              if (!hasMore || loadingMoreTemplates || loadingTemplates) return;
                              fetchApprovedTemplates({ page: templatePage + 1, append: true });
                            }}
                            formatOptionLabel={formatTemplateOptionLabel}
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                minHeight: 38,
                                borderRadius: 10,
                                borderColor: state.isFocused ? "#10b981" : "#cbd5e1",
                                boxShadow: state.isFocused ? "0 0 0 4px rgba(16,185,129,0.12)" : "none",
                                "&:hover": { borderColor: state.isFocused ? "#10b981" : "#cbd5e1" },
                              }),
                              valueContainer: base => ({ ...base, padding: "0 10px" }),
                              input: base => ({ ...base, margin: 0, padding: 0 }),
                              indicatorsContainer: base => ({ ...base, height: 38 }),
                              placeholder: base => ({ ...base, color: "#64748b" }), // slate-500
                              singleValue: base => ({ ...base, color: "#0f172a" }), // slate-900
                              clearIndicator: base => ({
                                ...base,
                                color: "#64748b",
                                ":hover": { color: "#0f172a" },
                              }),
                              dropdownIndicator: base => ({
                                ...base,
                                color: "#64748b",
                                ":hover": { color: "#0f172a" },
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isSelected
                                  ? "#0f766e" // teal-700 (close to sidebar tone, higher contrast)
                                  : state.isFocused
                                  ? "rgba(16,185,129,0.10)"
                                  : "white",
                                color: state.isSelected ? "white" : "#0f172a",
                                ":active": {
                                  ...base[":active"],
                                  backgroundColor: state.isSelected
                                    ? "#115e59" // teal-800
                                    : "rgba(16,185,129,0.18)",
                                },
                              }),
                              menu: base => ({ ...base, zIndex: 30 }),
                              menuPortal: base => ({ ...base, zIndex: 9999 }),
                            }}
                          />
                          <div className="mt-1 text-[11px] text-slate-500">
                            {templateTotalCount
                              ? `Showing ${Math.min(templates.length, templateTotalCount)} of ${templateTotalCount} approved templates.`
                              : "Type to search. Scroll to load more."}
                          </div>
                        </div>

                        <select
                          value={templateSort}
                          onChange={e => setTemplateSort(e.target.value)}
                          className="h-[38px] w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none hover:bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          title="Sort templates"
                        >
                          <option value="created_desc">Newest</option>
                          <option value="created_asc">Oldest</option>
                          <option value="name_asc">Name A–Z</option>
                          <option value="name_desc">Name Z–A</option>
                        </select>

                        <select
                          value={templateMedia}
                          onChange={e => setTemplateMedia(e.target.value)}
                          className="h-[38px] w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none hover:bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          title="Filter by media type"
                        >
                          <option value="all">All Media</option>
                          <option value="text">Text</option>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="document">Document (PDF)</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleSyncTemplates}
                          disabled={syncing}
                          className="flex items-center justify-center h-[38px] w-[38px] rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors disabled:opacity-50"
                          title="Sync Templates from Meta"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    {selectedTemplate && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                          {/* Header Media */}
                          {selectedTemplate.requiresHeaderMediaUrl && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  {mediaLabel(selectedTemplate.headerKind)}{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    placeholder="Enter HTTPS URL or upload below..."
                                    value={headerMediaUrl.startsWith("handle:") ? "" : headerMediaUrl}
                                    onChange={e => setHeaderMediaUrl(e.target.value)}
                                    disabled={headerMediaUrl.startsWith("handle:")}
                                  />
                                  
                                  <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                      <span className="w-full border-t border-slate-200"></span>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase">
                                      <span className="bg-white px-2 text-slate-400 font-medium tracking-wider">Or Upload File</span>
                                    </div>
                                  </div>

                                  <StandaloneMediaUploader
                                    mediaType={selectedTemplate.headerKind.toUpperCase()}
                                    handle={headerMediaUrl}
                                    onUploaded={handle => setHeaderMediaUrl(handle)}
                                  />
                                  
                                  {headerMediaUrl.startsWith("handle:") && (
                                    <button
                                      type="button"
                                      onClick={() => setHeaderMediaUrl("")}
                                      className="text-[10px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1 mt-1"
                                    >
                                      <X size={10} />
                                      Remove uploaded media
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Personalization Toggle */}
                          <div className="flex items-start gap-3">
                            <div className="flex h-5 items-center">
                              <input
                                id="useCsv"
                                type="checkbox"
                                checked={useCsvPersonalization}
                                onChange={e =>
                                  setUseCsvPersonalization(e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </div>
                            <div className="text-sm">
                              <label
                                htmlFor="useCsv"
                                className="font-medium text-slate-900"
                              >
                                Use CSV for personalization
                              </label>
                              <p className="text-slate-500 text-xs text-slate-600">
                                If checked, you'll upload a CSV in the next step to
                                fill {"{{}}"} variables.
                              </p>
                            </div>
                          </div>

                          {/* CSV Requirement Badge (User Requested Redesign) */}
                          {useCsvPersonalization && selectedTemplate && (() => {
                            const hasBody = selectedTemplate.parametersCount > 0;
                            const dynamicButtons =
                              selectedTemplate.buttonParams?.filter(btn => {
                                const type = (
                                  btn?.type ||
                                  btn?.Type ||
                                  ""
                                ).toLowerCase();
                                const url = btn?.url || btn?.Url || "";
                                return (
                                  ["url", "copy_code"].includes(type) ||
                                  url.includes("{{1}}")
                                );
                              }) || [];

                            if (!hasBody && dynamicButtons.length === 0)
                              return null;

                            return (
                              <div className="mt-2 rounded-md bg-blue-50 border border-blue-100 p-3">
                                <div className="flex gap-2">
                                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                                  <div className="text-xs text-blue-700 space-y-2">
                                    <p className="font-semibold">
                                      Required CSV Columns for this template:
                                    </p>
                                    <div className="space-y-3 mt-1">
                                      {/* Body Params Section */}
                                      {hasBody && (
                                        <div>
                                          <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-1.5">
                                            <span className="bg-blue-200 text-blue-800 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                                              1
                                            </span>
                                            Message Body
                                          </h4>
                                          <div className="ml-6 text-slate-700">
                                            Requires columns for{" "}
                                            {Array.from(
                                              {
                                                length:
                                                  selectedTemplate.parametersCount,
                                              },
                                              (_, i) => (
                                                <code
                                                  key={i}
                                                  className="bg-white border border-blue-200 px-1.5 py-0.5 rounded mx-0.5 font-mono text-blue-600 font-semibold"
                                                >
                                                  {"{{"}
                                                  {i + 1}
                                                  {"}}"}
                                                </code>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Dynamic Buttons Section */}
                                      {dynamicButtons.length > 0 && (
                                        <div>
                                          <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-1.5">
                                            <span className="bg-blue-200 text-blue-800 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                                              {hasBody ? "2" : "1"}
                                            </span>
                                            Buttons
                                          </h4>
                                          <ul className="ml-6 list-disc pl-4 space-y-1 text-slate-700">
                                            {dynamicButtons.map((btn, idx) => {
                                              // We need original index, but we filtered.
                                              // Actually, let's keep it simple: display 'Button (Label)' without strict index if possible,
                                              // or finding original index.
                                              // BUT, since we filtered, identifying "Button 1" vs "Button 3" is tricky unless we map first.
                                              // Let's refine the logic to map and THEN filter to preserve index if needed.
                                              // Or just display Label.
                                              const label =
                                                btn?.text ||
                                                btn?.Text ||
                                                "Button";
                                              const type = (
                                                btn?.type ||
                                                btn?.Type ||
                                                ""
                                              ).toLowerCase();

                                              return (
                                                <li key={idx}>
                                                  <strong>{label}</strong>:
                                                  Requires value for{" "}
                                                  {type === "url" && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                      URL
                                                    </span>
                                                  )}
                                                  {type === "copy_code" && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                      Coupon Code
                                                    </span>
                                                  )}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Manual Params */}
                          {!useCsvPersonalization &&
                            templateParams.length > 0 && (
                              <div className="grid gap-3 pt-2">
                                {templateParams.map((val, idx) => (
                                  <div key={idx}>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Body Parameter {"{{"}{idx + 1}{"}}"}
                                    </label>
                                    <input
                                      type="text"
                                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                      value={val}
                                      onChange={e => {
                                        const copy = [...templateParams];
                                        copy[idx] = e.target.value;
                                        setTemplateParams(copy);
                                      }}
                                      placeholder={`Value for {{${idx + 1}}}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION: settings */}
                <div>
                   <div className="mb-3 border-b border-slate-100 pb-2 mt-2">
{/* 3. Configuration removed */}
                   </div>
                  <div className="space-y-4">
                    {/* Flow Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white rounded-md shadow-sm border border-slate-200">
                             <Zap className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <span className="block text-sm font-semibold text-slate-700">
                                Attach Flow
                            </span>
                            <span className="text-xs text-slate-500 block">Trigger automation when user replies</span>
                          </div>
                       </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={useFlow}
                            onChange={e => {
                              setUseFlow(e.target.checked);
                              if (!e.target.checked) setSelectedFlowId("");
                            }}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                     {useFlow && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Select Flow
                          </label>
                          <select
                            value={selectedFlowId}
                            onChange={e => setSelectedFlowId(e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">-- Select Flow --</option>
                            {flows.map(f => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                     <div className="h-px bg-slate-100" />

                    {/* Schedule */}
                    <div>
                      <div className="mb-2">
                         <span className="block text-sm font-semibold text-slate-700">Schedule</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none transition-all ${
                            scheduleMode === "now"
                              ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="schedule"
                            value="now"
                            className="sr-only"
                            checked={scheduleMode === "now"}
                            onChange={() => setScheduleMode("now")}
                          />
                          <span className="flex flex-1">
                            <span className="flex flex-col">
                              <span className="block text-sm font-medium text-slate-900">
                                Send Immediately
                              </span>
                              <span className="mt-0.5 flex items-center text-[11px] text-slate-500">
                                Run as soon as assigned.
                              </span>
                            </span>
                          </span>
                          <Send
                            className={`h-4 w-4 ${
                              scheduleMode === "now"
                                ? "text-emerald-600"
                                : "text-slate-300"
                            }`}
                          />
                        </label>

                        {/* Schedule Later */}
                        <label
                          className={`relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none transition-all ${
                            scheduleMode === "later"
                              ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="schedule"
                            value="later"
                            className="sr-only"
                            checked={scheduleMode === "later"}
                            onChange={() => setScheduleMode("later")}
                          />
                          <span className="flex flex-1">
                            <span className="flex flex-col">
                              <span className="block text-sm font-medium text-slate-900">
                                Schedule for Later
                              </span>
                              <span className="mt-0.5 flex items-center text-[11px] text-slate-500">
                                Pick a date and time.
                              </span>
                            </span>
                          </span>
                          <Calendar
                            className={`h-4 w-4 ${
                              scheduleMode === "later"
                                ? "text-emerald-600"
                                : "text-slate-300"
                            }`}
                          />
                        </label>
                      </div>

                      {scheduleMode === "later" && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                          <input
                            type="datetime-local"
                            className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            value={scheduledAt}
                            onChange={e => setScheduledAt(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT: Preview (Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Preview
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile View</span>
                </div>
              </div>
              <div className="p-4 bg-slate-100 min-h-[500px] flex items-center justify-center">
                {selectedTemplate ? (
                  <div className="scale-[0.85] origin-top">
                    {/* Reuse your existing preview component */}
                    <PhoneWhatsAppPreview
                      templateBody={selectedTemplate.body || ""}
                      imageUrl={headerMediaUrl}
                      parameters={templateParams}
                      buttonParams={selectedTemplate.buttonParams}
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-400">
                    <div className="mx-auto h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                      <LayoutTemplate className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      No Template Selected
                    </p>
                    <p className="text-xs mt-1">
                      Choose a template from the left to see a preview.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer for Action */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 shadow-lg z-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6">
          <div className="text-sm text-slate-500">
            {scheduleMode === "later" && scheduledAt ? (
              <span>
                Scheduled for: <strong>{new Date(scheduledAt).toLocaleString()}</strong>
              </span>
            ) : null}
          </div>
          <div className="flex gap-3">
             <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCampaign}
              disabled={submitting}
              className="px-8 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
