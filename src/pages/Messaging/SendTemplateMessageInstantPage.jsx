import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  X,
} from "lucide-react";

import axiosClient from "../../api/axiosClient";
import PhoneWhatsAppPreview from "../../components/PhoneWhatsAppPreview";
import { useAuth } from "../../app/providers/AuthProvider";
import StandaloneMediaUploader from "../Campaigns/components/StandaloneMediaUploader";

const TEMPLATE_PAGE_SIZE = 50;
const SYNC_ENDPOINT = businessId => `templates/sync/${businessId}`;

const HK = Object.freeze({
  None: "none",
  Image: "image",
  Video: "video",
  Document: "document",
});

const isMediaHeader = headerKind =>
  headerKind === HK.Image || headerKind === HK.Video || headerKind === HK.Document;

const mediaLabel = headerKind =>
  headerKind === HK.Image
    ? "Image URL"
    : headerKind === HK.Video
      ? "Video URL"
      : "Document URL";

const digitsOnly = value => String(value || "").replace(/\D/g, "");

const normalizeRecipient = value => {
  let normalized = digitsOnly(value);
  if (/^\d{10}$/.test(normalized)) normalized = `91${normalized}`;
  return normalized;
};

const isValidRecipient = value => /^\d{10,15}$/.test(String(value || ""));
const hasSameDigits = (a, b) => digitsOnly(a) === digitsOnly(b);
const normalizeNumberList = maybeList => {
  if (!Array.isArray(maybeList)) return [];
  const normalized = maybeList
    .map(normalizeRecipient)
    .filter(isValidRecipient);
  return [...new Set(normalized)];
};

const getAvatarColor = name => {
  const colors = [
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = name =>
  String(name || "")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getContactDisplayName = contact => {
  const name = String(contact?.name || "").trim();
  const profileName = String(contact?.profileName || contact?.ProfileName || "").trim();

  if (name && name !== "WhatsApp User") return name;
  if (profileName) return profileName;
  return name || "Unknown";
};

const normalizeHeaderKind = template => {
  const raw = String(template?.headerKind || template?.HeaderKind || "")
    .trim()
    .toLowerCase();
  if (raw === HK.Image || raw === HK.Video || raw === HK.Document) return raw;
  return HK.None;
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
  const subtype = String(button?.SubType || button?.subType || "").toLowerCase();
  const originalUrl = String(button?.ParameterValue || button?.parameterValue || "");
  return subtype === "url" || originalUrl.includes("{{1}}");
};

const normalizeMediaFilter = value => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all") return "all";
  if (raw === "pdf" || raw === "doc") return "document";
  if (raw === "text" || raw === "image" || raw === "video" || raw === "document")
    return raw;
  return "all";
};

const hasValidationErrors = errors =>
  !!(
    errors.sender ||
    errors.recipient ||
    errors.template ||
    errors.headerMediaUrl ||
    (Array.isArray(errors.templateParams) && errors.templateParams.some(Boolean)) ||
    (Array.isArray(errors.urlButtonParams) && errors.urlButtonParams.some(Boolean))
  );

const extractApiErrorMessage = (payload, fallback = "") => {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload || fallback;

  return (
    payload.errorMessage ||
    payload.ErrorMessage ||
    payload.message ||
    payload.Message ||
    payload.error ||
    payload.Error ||
    payload.detail ||
    payload.Detail ||
    fallback
  );
};

function PhoneNumberTokenInput({ numbers, setNumbers, clearRecipientError }) {
  const [input, setInput] = useState("");

  const tryAddPhone = raw => {
    const normalized = normalizeRecipient(raw);
    if (!isValidRecipient(normalized)) return;
    if (numbers.some(existing => hasSameDigits(existing, normalized))) return;
    setNumbers([...numbers, normalized]);
    clearRecipientError();
  };

  const handleInputChange = event => {
    const value = event.target.value;
    const lastChar = value.slice(-1);
    const isSeparator = /[\s,]/.test(lastChar);

    if (isSeparator) {
      tryAddPhone(input.trim());
      setInput("");
      return;
    }

    setInput(value);
  };

  const handleKeyDown = event => {
    if (event.key === "Enter") {
      event.preventDefault();
      tryAddPhone(input.trim());
      setInput("");
      return;
    }

    if (event.key === "Tab") {
      tryAddPhone(input.trim());
      setInput("");
      return;
    }

    if (event.key === "Backspace" && input === "" && numbers.length > 0) {
      setNumbers(numbers.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (!input.trim()) return;
    tryAddPhone(input.trim());
    setInput("");
  };

  const removeNumber = number => {
    setNumbers(numbers.filter(n => !hasSameDigits(n, number)));
  };

  return (
    <div className="w-full border border-gray-200 rounded-xl p-2 flex flex-wrap gap-2 min-h-[56px] bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all cursor-text">
      {numbers.map((num, idx) => (
        <span
          key={`${num}-${idx}`}
          className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full shadow-sm"
        >
          {num}
          <button
            type="button"
            className="text-gray-400 hover:text-red-500 transition-colors"
            onClick={() => removeNumber(num)}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-grow min-w-[120px] bg-transparent p-1 text-sm outline-none placeholder:text-gray-400"
        placeholder="Type number and press space/tab/enter"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
}

export default function SendTemplateMessageInstantPage() {
  const { businessId: contextBusinessId } = useAuth();
  const businessId = useMemo(
    () => contextBusinessId || localStorage.getItem("businessId") || null,
    [contextBusinessId]
  );

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [manualNumbers, setManualNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [senders, setSenders] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState("");

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateSort, setTemplateSort] = useState("created_desc");
  const [templateMedia, setTemplateMedia] = useState("all");
  const [selectedTemplateOption, setSelectedTemplateOption] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateParams, setTemplateParams] = useState([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [urlButtonParams, setUrlButtonParams] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const templateQueryDebounceRef = useRef(null);
  const formRestoreAttemptedRef = useRef(false);
  const skipNextPersistRef = useRef(true);
  const pendingTemplateRestoreRef = useRef(null);

  const formStateStorageKey = useMemo(() => {
    if (!businessId) return null;
    return `sendTemplateInstant.formState.${businessId}`;
  }, [businessId]);

  const clearRecipientError = () => {
    if (!errors.recipient) return;
    setErrors(prev => ({ ...prev, recipient: null }));
  };

  const recipientNumbers = useMemo(() => {
    const merged = [...manualNumbers, ...selectedNumbers]
      .map(normalizeRecipient)
      .filter(isValidRecipient);
    return [...new Set(merged)];
  }, [manualNumbers, selectedNumbers]);

  const selectedSender = useMemo(
    () => senders.find(sender => sender.id === selectedSenderId) || null,
    [senders, selectedSenderId]
  );

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;

    return contacts.filter(contact => {
      const name = getContactDisplayName(contact).toLowerCase();
      const number = String(contact?.phoneNumber || "");
      return name.includes(q) || number.includes(q);
    });
  }, [contacts, contactSearch]);

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

  const templateOptions = useMemo(
    () =>
      templates
        .map(template => {
          const name = template?.name ?? template?.Name;
          const languageCode = template?.languageCode ?? template?.LanguageCode ?? "en_US";
          if (!name) return null;
          return {
            value: `${name}::${languageCode}`,
            label: name,
            name,
            languageCode,
            category: template?.category ?? template?.Category ?? "",
          };
        })
        .filter(Boolean),
    [templates]
  );

  const templateOptionsForSelect = useMemo(() => {
    if (!selectedTemplateOption) return templateOptions;
    const deduped = templateOptions.filter(
      option => option.value !== selectedTemplateOption.value
    );
    return [selectedTemplateOption, ...deduped];
  }, [selectedTemplateOption, templateOptions]);

  const dynamicUrlButtonSlots = useMemo(() => {
    if (!selectedTemplate?.buttonParams?.length) return [];
    return selectedTemplate.buttonParams
      .map((button, index) =>
        isDynamicUrlButton(button)
          ? {
              index,
              label:
                button?.Text ||
                button?.text ||
                `Dynamic URL Button ${index + 1}`,
            }
          : null
      )
      .filter(Boolean);
  }, [selectedTemplate]);

  const fetchApprovedTemplates = useCallback(async () => {
    if (!businessId) return;
    setLoadingTemplates(true);

    try {
      const params = {
        status: "APPROVED",
        q: templateQuery.trim() || undefined,
        media: normalizeMediaFilter(templateMedia) !== "all"
          ? normalizeMediaFilter(templateMedia)
          : undefined,
        page: 1,
        pageSize: TEMPLATE_PAGE_SIZE,
        sortKey: sortParams.sortKey,
        sortDir: sortParams.sortDir,
      };
      const response = await axiosClient.get(`templates/${businessId}`, { params });
      if (response?.data?.success) {
        setTemplates(Array.isArray(response.data.templates) ? response.data.templates : []);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      setTemplates([]);
      toast.error("Failed to load approved templates.");
    } finally {
      setLoadingTemplates(false);
    }
  }, [businessId, templateQuery, templateMedia, sortParams.sortKey, sortParams.sortDir]);

  useEffect(() => {
    const loadContacts = async () => {
      setContactsLoading(true);
      try {
        const response = await axiosClient.get("/contacts/");
        setContacts(response?.data?.data?.items || []);
      } catch (error) {
        toast.error("Failed to load contacts.");
      } finally {
        setContactsLoading(false);
      }
    };

    loadContacts();
  }, []);

  useEffect(() => {
    if (!businessId) return;

    const loadSenders = async () => {
      try {
        const response = await axiosClient.get(`WhatsAppSettings/senders/${businessId}`);
        const raw = Array.isArray(response?.data)
          ? response.data
          : response?.data?.items || [];

        const normalized = raw
          .map(item => {
            const provider = String(item?.provider || item?.Provider || "")
              .trim()
              .toUpperCase();
            const phoneNumberId = String(
              item?.phoneNumberId ?? item?.PhoneNumberId ?? ""
            ).trim();
            if (!provider || !phoneNumberId) return null;

            const displayNumber =
              item?.whatsAppBusinessNumber ||
              item?.whatsappBusinessNumber ||
              item?.displayNumber ||
              item?.phoneNumber ||
              item?.WhatsAppBusinessNumber ||
              item?.PhoneNumber ||
              phoneNumberId;

            return {
              id: item?.id ?? item?.Id ?? `${provider}|${phoneNumberId}`,
              provider,
              phoneNumberId,
              displayNumber: String(displayNumber || phoneNumberId),
              isDefault: !!(item?.isDefault ?? item?.IsDefault),
            };
          })
          .filter(Boolean);

        setSenders(normalized);
        if (!normalized.length) {
          setSelectedSenderId("");
          return;
        }

        if (normalized.length === 1) {
          setSelectedSenderId(normalized[0].id);
        } else {
          setSelectedSenderId(prev => {
            if (prev && normalized.some(sender => sender.id === prev)) return prev;
            const defaultSender = normalized.find(sender => sender.isDefault);
            return defaultSender?.id || normalized[0].id;
          });
        }
      } catch {
        setSenders([]);
        setSelectedSenderId("");
      }
    };

    loadSenders();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    if (templateQueryDebounceRef.current) clearTimeout(templateQueryDebounceRef.current);

    templateQueryDebounceRef.current = setTimeout(() => {
      fetchApprovedTemplates();
    }, 250);

    return () => {
      if (templateQueryDebounceRef.current) clearTimeout(templateQueryDebounceRef.current);
    };
  }, [businessId, fetchApprovedTemplates]);

  const handleSyncTemplates = async () => {
    if (!businessId) return;
    setSyncing(true);
    try {
      const response = await axiosClient.post(SYNC_ENDPOINT(businessId));
      if (response?.data?.success || response?.status === 200) {
        toast.success("Templates synced.");
        await fetchApprovedTemplates();
      } else {
        toast.error("Template sync failed.");
      }
    } catch {
      toast.error("Error syncing templates.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTemplateSelect = useCallback(async (option, restoredState = null) => {
    if (!businessId) return;
    setSelectedTemplateOption(option || null);

    if (!option?.name) {
      setSelectedTemplate(null);
      setTemplateParams([]);
      setUrlButtonParams([]);
      setHeaderMediaUrl("");
      return;
    }

    try {
      const languagePart = option.languageCode
        ? `?language=${encodeURIComponent(option.languageCode)}`
        : "";

      const response = await axiosClient.get(
        `templates/${businessId}/${encodeURIComponent(option.name)}${languagePart}`
      );

      const rawTemplate = response?.data?.template || response?.data || null;
      const templateName = rawTemplate?.name ?? rawTemplate?.Name;
      if (!templateName) {
        toast.error("Could not load template details.");
        return;
      }

      const body = rawTemplate?.body ?? rawTemplate?.Body ?? "";
      const headerKind = normalizeHeaderKind(rawTemplate);
      const buttonParams = parseTemplateButtons(rawTemplate);
      const parametersCount = (body.match(/{{[0-9]+}}/g) || []).length;
      const requiresHeaderMediaUrl =
        rawTemplate?.requiresHeaderMediaUrl === true ||
        rawTemplate?.RequiresMediaHeader === true ||
        isMediaHeader(headerKind);

      const normalizedTemplate = {
        name: templateName,
        language:
          rawTemplate?.language ??
          rawTemplate?.Language ??
          rawTemplate?.languageCode ??
          rawTemplate?.LanguageCode ??
          "en_US",
        body,
        headerKind,
        requiresHeaderMediaUrl,
        parametersCount,
        buttonParams,
      };

      const defaultTemplateParams = Array(parametersCount).fill("");
      const defaultUrlButtonParams = buttonParams
        .filter(button => isDynamicUrlButton(button))
        .map(() => "");

      let restoredTemplateParams = defaultTemplateParams;
      let restoredUrlButtonParams = defaultUrlButtonParams;
      let restoredHeaderMediaUrl = "";

      const canRestore =
        restoredState &&
        restoredState.templateName === normalizedTemplate.name &&
        (!restoredState.templateLanguage ||
          restoredState.templateLanguage === normalizedTemplate.language);

      if (canRestore) {
        if (
          Array.isArray(restoredState.templateParams) &&
          restoredState.templateParams.length === defaultTemplateParams.length
        ) {
          restoredTemplateParams = restoredState.templateParams.map(value =>
            String(value || "")
          );
        }

        if (
          Array.isArray(restoredState.urlButtonParams) &&
          restoredState.urlButtonParams.length === defaultUrlButtonParams.length
        ) {
          restoredUrlButtonParams = restoredState.urlButtonParams.map(value =>
            String(value || "")
          );
        }

        if (typeof restoredState.headerMediaUrl === "string") {
          restoredHeaderMediaUrl = restoredState.headerMediaUrl;
        }
      }

      setSelectedTemplate(normalizedTemplate);
      setTemplateParams(restoredTemplateParams);
      setHeaderMediaUrl(restoredHeaderMediaUrl);
      setUrlButtonParams(restoredUrlButtonParams);
      setErrors({});
    } catch (error) {
      toast.error("Failed to load template details.");
    }
  }, [businessId]);

  useEffect(() => {
    if (!formStateStorageKey) return;
    if (formRestoreAttemptedRef.current) return;
    formRestoreAttemptedRef.current = true;

    try {
      const raw = sessionStorage.getItem(formStateStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (typeof parsed.contactSearch === "string") {
        setContactSearch(parsed.contactSearch);
      }
      if (typeof parsed.templateQuery === "string") {
        setTemplateQuery(parsed.templateQuery);
      }
      if (typeof parsed.templateSort === "string") {
        setTemplateSort(parsed.templateSort);
      }
      if (typeof parsed.templateMedia === "string") {
        setTemplateMedia(parsed.templateMedia);
      }

      setManualNumbers(normalizeNumberList(parsed.manualNumbers));
      setSelectedNumbers(normalizeNumberList(parsed.selectedNumbers));

      if (parsed.selectedTemplateName) {
        const languageCode = parsed.selectedTemplateLanguage || "en_US";
        setSelectedTemplateOption({
          value: `${parsed.selectedTemplateName}::${languageCode}`,
          label: parsed.selectedTemplateName,
          name: parsed.selectedTemplateName,
          languageCode,
        });

        pendingTemplateRestoreRef.current = {
          templateName: parsed.selectedTemplateName,
          templateLanguage: languageCode,
          headerMediaUrl:
            typeof parsed.headerMediaUrl === "string" ? parsed.headerMediaUrl : "",
          templateParams: Array.isArray(parsed.templateParams) ? parsed.templateParams : [],
          urlButtonParams: Array.isArray(parsed.urlButtonParams)
            ? parsed.urlButtonParams
            : [],
        };
      }
    } catch {
      // no-op
    }
  }, [formStateStorageKey]);

  useEffect(() => {
    const pending = pendingTemplateRestoreRef.current;
    if (!pending?.templateName) return;

    pendingTemplateRestoreRef.current = null;
    const option = {
      value: `${pending.templateName}::${pending.templateLanguage || "en_US"}`,
      label: pending.templateName,
      name: pending.templateName,
      languageCode: pending.templateLanguage || "en_US",
    };
    handleTemplateSelect(option, pending);
  }, [handleTemplateSelect]);

  useEffect(() => {
    if (!formStateStorageKey) return;
    if (!formRestoreAttemptedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    try {
      sessionStorage.setItem(
        formStateStorageKey,
        JSON.stringify({
          contactSearch,
          templateQuery,
          templateSort,
          templateMedia,
          manualNumbers,
          selectedNumbers,
          selectedTemplateName:
            selectedTemplateOption?.name || selectedTemplate?.name || null,
          selectedTemplateLanguage:
            selectedTemplateOption?.languageCode || selectedTemplate?.language || null,
          headerMediaUrl,
          templateParams,
          urlButtonParams,
        })
      );
    } catch {
      // no-op
    }
  }, [
    formStateStorageKey,
    contactSearch,
    templateQuery,
    templateSort,
    templateMedia,
    manualNumbers,
    selectedNumbers,
    selectedTemplateOption,
    selectedTemplate,
    headerMediaUrl,
    templateParams,
    urlButtonParams,
  ]);

  const buildValidationErrors = useCallback(() => {
    const nextErrors = {};
    if (!selectedSender) {
      nextErrors.sender = "Select a valid sender number before sending.";
    }

    if (!recipientNumbers.length) {
      nextErrors.recipient =
        "Add at least one valid recipient using manual entry or contacts.";
    }

    if (!selectedTemplate) {
      nextErrors.template = "Select an approved template.";
      return nextErrors;
    }

    if (isMediaHeader(selectedTemplate.headerKind) && !headerMediaUrl.trim()) {
      nextErrors.headerMediaUrl = `${mediaLabel(selectedTemplate.headerKind)} is required.`;
    }

    const paramErrors = templateParams.map(value => !String(value || "").trim());
    if (paramErrors.some(Boolean)) {
      nextErrors.templateParams = paramErrors;
    }

    const buttonErrors = urlButtonParams.map(value => !String(value || "").trim());
    if (buttonErrors.some(Boolean)) {
      nextErrors.urlButtonParams = buttonErrors;
    }

    return nextErrors;
  }, [
    headerMediaUrl,
    recipientNumbers.length,
    selectedSender,
    selectedTemplate,
    templateParams,
    urlButtonParams,
  ]);

  const canSend = useMemo(
    () => !submitting && !hasValidationErrors(buildValidationErrors()),
    [buildValidationErrors, submitting]
  );

  const handleSend = async () => {
    const nextErrors = buildValidationErrors();
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;
    if (!selectedTemplate) return;

    const urlParamsByButtonIndex = {};
    dynamicUrlButtonSlots.forEach((slot, slotIndex) => {
      urlParamsByButtonIndex[slot.index] = String(urlButtonParams[slotIndex] || "").trim();
    });

    const sharedPayload = {
      templateName: selectedTemplate.name,
      languageCode: selectedTemplate.language || "en_US",
      templateParameters: templateParams.map(value => String(value || "").trim()),
      headerKind: selectedTemplate.headerKind || HK.None,
      headerMediaUrl: isMediaHeader(selectedTemplate.headerKind)
        ? headerMediaUrl.trim()
        : null,
      urlButtonParams: (selectedTemplate.buttonParams || []).map((button, index) => {
        if (!isDynamicUrlButton(button)) return "";
        return urlParamsByButtonIndex[index] || "";
      }),
      templateBody: selectedTemplate.body || "",
      provider: selectedSender?.provider || "",
      phoneNumberId: selectedSender?.phoneNumberId || null,
    };

    setSubmitting(true);
    let success = 0;
    let failed = 0;
    let firstFailureMessage = "";
    try {
      for (const recipientNumber of recipientNumbers) {
        try {
          const response = await axiosClient.post("/messageengine/send-template-simple", {
            ...sharedPayload,
            recipientNumber,
          }, {
            __silentToast: true,
          });
          const isSuccess = response?.data?.success === true || response?.status === 200;
          if (isSuccess) {
            success += 1;
          } else {
            failed += 1;
            if (!firstFailureMessage) {
              firstFailureMessage = extractApiErrorMessage(
                response?.data,
                "Template send failed."
              );
            }
          }
        } catch (error) {
          failed += 1;
          if (!firstFailureMessage) {
            firstFailureMessage = extractApiErrorMessage(
              error?.response?.data,
              error?.message || "Template send failed."
            );
          }
        }
      }

      if (success > 0 && failed === 0) {
        toast.success(`Template sent to ${success} recipient${success > 1 ? "s" : ""}.`);
        setManualNumbers([]);
        setSelectedNumbers([]);
        setErrors({});
      } else if (success > 0 && failed > 0) {
        const summary = `Sent: ${success}, Failed: ${failed}`;
        toast.warn(firstFailureMessage ? `${summary}. ${firstFailureMessage}` : summary);
      } else {
        toast.error(firstFailureMessage || "Template send failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600" />
            Send Template Message
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Send approved WhatsApp templates instantly to one or more recipients.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">

              <div className="flex flex-col xl:flex-row gap-4 pt-2">
                {/* Single Row Configuration */}
                <div className="flex-grow space-y-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Select approved template
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <Select
                        inputId="templateSelect"
                        classNamePrefix="react-select"
                        isClearable
                        isLoading={loadingTemplates || syncing}
                        options={templateOptionsForSelect}
                        value={selectedTemplateOption}
                        placeholder="Search approved templates..."
                        onChange={handleTemplateSelect}
                        onInputChange={(value, meta) => {
                          if (meta.action === "input-change") setTemplateQuery(value);
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{
                          menuPortal: base => ({ ...base, zIndex: 9999 }),
                          control: (base, state) => ({
                            ...base,
                            minHeight: 40,
                            borderRadius: 10,
                            borderColor: errors.template
                              ? "#fca5a5"
                              : state.isFocused
                                ? "#10b981"
                                : "#cbd5e1",
                            boxShadow: state.isFocused
                              ? "0 0 0 3px rgba(16,185,129,0.12)"
                              : "none",
                          }),
                        }}
                      />
                    </div>

                    <div className="flex gap-1" ref={filterRef}>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsFilterOpen(!isFilterOpen)}
                          className={`h-[40px] w-[40px] shrink-0 rounded-lg border flex items-center justify-center transition-all ${
                            isFilterOpen || templateSort !== "created_desc" || templateMedia !== "all"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          title="Filter and Sort"
                        >
                          <Filter className="h-4 w-4" />
                        </button>

                        {isFilterOpen && (
                          <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-3 space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort By</label>
                              <select
                                value={templateSort}
                                onChange={event => setTemplateSort(event.target.value)}
                                className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                              >
                                <option value="created_desc">Newest First</option>
                                <option value="created_asc">Oldest First</option>
                                <option value="name_asc">Name A-Z</option>
                                <option value="name_desc">Name Z-A</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Media Type</label>
                              <select
                                value={templateMedia}
                                onChange={event => setTemplateMedia(event.target.value)}
                                className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                              >
                                <option value="all">All Media</option>
                                <option value="text">Text</option>
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                                <option value="document">Document (PDF)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSyncTemplates}
                        disabled={syncing}
                        className="h-[40px] w-[40px] shrink-0 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors disabled:opacity-50 flex items-center justify-center"
                        title="Sync templates from Meta"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                  {errors.template ? (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.template}
                    </p>
                  ) : null}
                </div>

                <div className="xl:w-1/3 xl:shrink-0 space-y-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Sender (From)
                  </label>
                  <select
                    value={selectedSenderId}
                    onChange={event => {
                      setSelectedSenderId(event.target.value);
                      if (errors.sender) setErrors(prev => ({ ...prev, sender: null }));
                    }}
                    className={`h-[40px] w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      errors.sender
                        ? "border-red-300 focus:ring-2 focus:ring-red-100"
                        : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    }`}
                  >
                    <option value="">Select sender</option>
                    {senders.map(sender => (
                      <option key={sender.id} value={sender.id}>
                        {sender.displayNumber} ({sender.provider})
                      </option>
                    ))}
                  </select>
                  {errors.sender ? (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.sender}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                {/* 50/50 split for recipients */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-slate-600">
                        Select contacts
                      </label>
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        {selectedNumbers.length} selected
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={event => setContactSearch(event.target.value)}
                        placeholder="Search name or number"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                    <div className="border border-slate-200 rounded-lg h-[240px] overflow-y-auto">
                      {contactsLoading ? (
                        <div className="p-4 text-sm text-slate-500">Loading contacts...</div>
                      ) : filteredContacts.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">No contacts found.</div>
                      ) : (
                        filteredContacts.map(contact => {
                          const phone = String(contact?.phoneNumber || "").trim();
                          const isSelected = selectedNumbers.some(n => hasSameDigits(n, phone));
                          const displayName = getContactDisplayName(contact);

                          return (
                            <label
                              key={contact.id}
                              className={`group flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border border-transparent mx-1 my-1 ${
                                isSelected
                                  ? "bg-emerald-50 border-emerald-100"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={isSelected}
                                onChange={event => {
                                  if (!phone) return;
                                  if (event.target.checked) {
                                    setSelectedNumbers(prev =>
                                      prev.some(n => hasSameDigits(n, phone))
                                        ? prev
                                        : [...prev, phone]
                                    );
                                  } else {
                                    setSelectedNumbers(prev =>
                                      prev.filter(n => !hasSameDigits(n, phone))
                                    );
                                  }
                                  clearRecipientError();
                                }}
                              />
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  isSelected
                                    ? "bg-emerald-500 text-white shadow-md scale-105"
                                    : getAvatarColor(displayName || "?")
                                }`}
                              >
                                {isSelected ? (
                                  <CheckCircle size={16} />
                                ) : (
                                  getInitials(displayName || "?")
                                )}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    isSelected ? "text-emerald-900" : "text-gray-700"
                                  }`}
                                >
                                  {displayName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{phone}</p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Manual entry
                    </label>
                    <PhoneNumberTokenInput
                      numbers={manualNumbers}
                      setNumbers={setManualNumbers}
                      clearRecipientError={clearRecipientError}
                    />
                    <p className="text-[11px] text-slate-500">
                      Numbers auto-normalize to digits; 10-digit input is prefixed with 91.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <p className="text-xs text-slate-600">
                  Selected recipients: <strong>{recipientNumbers.length}</strong>
                </p>
                {errors.recipient ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.recipient}
                  </p>
                ) : null}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm ${
                      canSend
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Template Message
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Template Parameters
              </h2>

              {!selectedTemplate ? (
                <p className="text-sm text-slate-500">
                  Select a template to configure required parameters.
                </p>
              ) : (
                <div className="space-y-4">
                  {isMediaHeader(selectedTemplate.headerKind) ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {mediaLabel(selectedTemplate.headerKind)}
                      </label>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={headerMediaUrl.startsWith("handle:") ? "" : headerMediaUrl}
                          onChange={event => {
                            setHeaderMediaUrl(event.target.value);
                            if (errors.headerMediaUrl) {
                              setErrors(prev => ({ ...prev, headerMediaUrl: null }));
                            }
                          }}
                          placeholder="Enter HTTPS URL or upload below..."
                          disabled={headerMediaUrl.startsWith("handle:")}
                          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                            errors.headerMediaUrl
                              ? "border-red-300 focus:ring-2 focus:ring-red-100"
                              : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          }`}
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
                            if (errors.headerMediaUrl) {
                              setErrors(prev => ({ ...prev, headerMediaUrl: null }));
                            }
                          }}
                        />

                        {headerMediaUrl.startsWith("handle:") ? (
                          <button
                            type="button"
                            onClick={() => setHeaderMediaUrl("")}
                            className="text-[10px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1 mt-1"
                          >
                            <X size={10} />
                            Remove uploaded media
                          </button>
                        ) : null}
                      </div>
                      {errors.headerMediaUrl ? (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.headerMediaUrl}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {templateParams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {templateParams.map((value, index) => (
                        <div key={`template-param-${index}`}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Body Parameter {"{{"}
                            {index + 1}
                            {"}}"}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={event => {
                              const next = [...templateParams];
                              next[index] = event.target.value;
                              setTemplateParams(next);
                              if (errors.templateParams?.[index]) {
                                const nextErrorFlags = [...(errors.templateParams || [])];
                                nextErrorFlags[index] = false;
                                setErrors(prev => ({ ...prev, templateParams: nextErrorFlags }));
                              }
                            }}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                              errors.templateParams?.[index]
                                ? "border-red-300 focus:ring-2 focus:ring-red-100"
                                : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            }`}
                            placeholder={`Enter value for {{${index + 1}}}`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No body parameters required.</p>
                  )}

                  {dynamicUrlButtonSlots.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-700">
                        Dynamic URL button parameters
                      </p>
                      {dynamicUrlButtonSlots.map((slot, slotIndex) => (
                        <div key={`url-button-param-${slot.index}`}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {slot.label}
                          </label>
                          <input
                            type="text"
                            value={urlButtonParams[slotIndex] || ""}
                            onChange={event => {
                              const next = [...urlButtonParams];
                              next[slotIndex] = event.target.value;
                              setUrlButtonParams(next);
                              if (errors.urlButtonParams?.[slotIndex]) {
                                const nextErrorFlags = [...(errors.urlButtonParams || [])];
                                nextErrorFlags[slotIndex] = false;
                                setErrors(prev => ({ ...prev, urlButtonParams: nextErrorFlags }));
                              }
                            }}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                              errors.urlButtonParams?.[slotIndex]
                                ? "border-red-300 focus:ring-2 focus:ring-red-100"
                                : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            }`}
                            placeholder="Enter URL placeholder value"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Preview
                </h3>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" />
                  WhatsApp View
                </span>
              </div>
              <div className="bg-slate-100 p-3 min-h-[520px] flex items-center justify-center">
                {selectedTemplate ? (
                  <div className="scale-[0.84] origin-top">
                    <PhoneWhatsAppPreview
                      templateBody={selectedTemplate.body}
                      parameters={templateParams}
                      imageUrl={headerMediaUrl}
                      buttonParams={selectedTemplate.buttonParams}
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-500 px-6">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium">No template selected</p>
                    <p className="text-xs mt-1">
                      Choose a template to render an instant preview.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
