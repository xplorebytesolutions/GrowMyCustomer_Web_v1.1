// 📄 src/pages/campaigns/CampaignBuilderPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import PhoneWhatsAppPreview from "../../components/PhoneWhatsAppPreview";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  LayoutTemplate,
  RefreshCw,
  Zap,
  Calendar,
  Send,
  Info,
  Smartphone,
} from "lucide-react";

// === Your axios baseURL already ends with /api. Keep all calls RELATIVE (no leading slash).
const SYNC_ENDPOINT = bid => `templates/sync/${bid}`; // POST

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

  const createdBy = localStorage.getItem("userId");
  const navigate = useNavigate();

  // ---------- Helpers ----------
  const checkNameAvailability = async name => {
    setNameError("");
    if (!name?.trim() || !hasValidBusiness) return;
    try {
      setCheckingName(true);
      const { data } = await axiosClient.get(`campaign/check-name`, {
        params: { name },
      });
      if (data?.available === false) {
        setNameError("Name already exists.");
      } else {
        setNameError("");
      }
    } catch {
      setNameError("");
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
  // Load approved templates
  useEffect(() => {
    const load = async () => {
      if (!hasValidBusiness) return;
      setLoadingTemplates(true);
      try {
        const res = await axiosClient.get(
          `templates/${businessId}?status=APPROVED`
        );
        if (res.data?.success) setTemplates(res.data.templates || []);
        else toast.error("❌ Failed to load templates.");
      } catch {
        toast.error("❌ Error loading templates.");
      } finally {
        setLoadingTemplates(false);
      }
    };
    load();
  }, [businessId, hasValidBusiness]);

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
        const r2 = await axiosClient.get(
          `templates/${businessId}?status=APPROVED`
        );
        if (r2.data?.success) setTemplates(r2.data.templates || []);
      } else {
        toast.error("Sync failed.");
      }
    } catch {
      toast.error("Error syncing templates.");
    } finally {
      setSyncing(false);
    }
  };

  const handleTemplateSelect = async name => {
    if (!name) {
      setSelectedTemplate(null);
      setTemplateParams([]);
      setButtonParams([]);
      setHeaderMediaUrl("");
      return;
    }
    try {
      const res = await axiosClient.get(
        `templates/${businessId}/${encodeURIComponent(name)}`
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
        language: rawTemplate.language ?? rawTemplate.Language ?? "en_US",
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
      await checkNameAvailability(campaignName);
      if (nameError) {
        setSubmitting(false);
        return;
      }

      const res = await axiosClient.post(
        `campaign/create-text-campaign`,
        payload
      );
      if (res.data?.success && res.data?.campaignId) {
        toast.success("Campaign created successfully.");
        navigate(
          `/app/campaigns/image-campaigns/assign-contacts/${res.data.campaignId}`
        );
      } else {
        toast.error("Failed to create campaign.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to create campaign."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const templateOptions = useMemo(
    () =>
      templates.map(tpl => {
        const lang = tpl.language || tpl.Language || "en_US";
        return {
          key: `${tpl.name}-${lang}`,
          label: `${tpl.name} (${lang})`,
          value: tpl.name,
          params: tpl.placeholderCount ?? 0,
        };
      }),
    [templates]
  );

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
                            {s.whatsAppNumber} ({s.provider})
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
                        <select
                          disabled={loadingTemplates}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-1 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                          onChange={e => handleTemplateSelect(e.target.value)}
                          value={selectedTemplate?.name || ""}
                        >
                          <option value="" disabled>
                            {loadingTemplates
                              ? "Loading..."
                              : "-- Select Approved Template --"}
                          </option>
                          {templateOptions.map(o => (
                            <option key={o.key} value={o.value}>
                              {o.label} — {o.params} params
                            </option>
                          ))}
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
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Header Media URL{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="url"
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                placeholder={`https://example.com/item.jpg`}
                                value={headerMediaUrl}
                                onChange={e =>
                                  setHeaderMediaUrl(e.target.value)
                                }
                              />
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
