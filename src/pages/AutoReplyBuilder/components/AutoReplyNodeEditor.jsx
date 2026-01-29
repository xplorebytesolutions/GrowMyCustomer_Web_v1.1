// 📄 src/pages/AutoReplyBuilder/components/AutoReplyNodeEditor.jsx

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Dialog, Combobox } from "@headlessui/react";
import { Button } from "../../../components/ui/button";
import WhatsAppTemplatePreview from "./WhatsAppTemplatePreview";
import axiosClient from "../../../api/axiosClient";
import { useAuth } from "../../../app/providers/AuthProvider";

const isValidHttpsUrl = value => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:";
  } catch {
    return false;
  }
};

const countBodyPlaceholders = body => {
  if (!body) return 0;
  const s = String(body);
  const positional = s.match(/\{\{\s*\d+\s*\}\}/g) || [];
  const named = s.match(/\{\{\s*\}\}/g) || [];
  return positional.length + named.length;
};

export default function AutoReplyNodeEditor({ node, onClose, onSave }) {
  const { businessId: ctxBusinessId } = useAuth();
  const [form, setForm] = useState({
    text: "",
    templateName: "",
    tags: [],
    seconds: 10, // 🔁 default wait = 10s
    body: "",
    multiButtons: [],
    // Template dynamic values (CTA-like)
    headerMediaUrl: "",
    bodyParams: [],
    urlButtonParams: ["", "", ""],
    useProfileName: false,
    profileNameSlot: 1,
    // 🆕 CTA flow fields
    ctaFlowConfigId: "",
    ctaFlowName: "",
  });

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateQuery, setTemplateQuery] = useState("");

  // 🆕 CTA flow list for dropdown
  const [ctaFlows, setCtaFlows] = useState([]);

  const isTemplateNode = node?.type === "template";
  const isMessageNode = node?.type === "message";
  const isTagNode = node?.type === "tag";
  const isWaitNode = node?.type === "wait";
  const isCtaNode = node?.type === "cta_flow";

  const headerKind = useMemo(() => {
    const hk = selectedTemplate?.headerKind ?? selectedTemplate?.HeaderKind ?? "none";
    return String(hk || "none").trim().toLowerCase();
  }, [selectedTemplate]);

  const needsHeaderUrl =
    headerKind === "image" || headerKind === "video" || headerKind === "document";

  const headerKindLabel =
    headerKind === "image"
      ? "Image"
      : headerKind === "video"
      ? "Video"
      : headerKind === "document"
      ? "Document"
      : "Media";

  const bodyPlaceholderCount = useMemo(
    () => countBodyPlaceholders(form.body),
    [form.body]
  );

  const canUseProfile = bodyPlaceholderCount > 0;

  const dynamicUrlButtons = useMemo(() => {
    const btns =
      selectedTemplate?.buttonParams ||
      selectedTemplate?.ButtonParams ||
      selectedTemplate?.multiButtons ||
      form.multiButtons ||
      [];

    return (Array.isArray(btns) ? btns : [])
      .map(b => ({
        type: String(b?.type || b?.Type || "").trim().toUpperCase(),
        subType: String(b?.subType || b?.SubType || "").trim().toLowerCase(),
        text: String(b?.text || b?.Text || "").trim(),
        index:
          typeof b?.index === "number"
            ? b.index
            : typeof b?.Index === "number"
            ? b.Index
            : 0,
        parameterValue: String(b?.parameterValue || b?.ParameterValue || "").trim(),
      }))
      .filter(b => {
        const isUrl = b.type === "URL" || b.subType === "url";
        const isDynamic = b.parameterValue.includes("{{");
        return isUrl && isDynamic;
      })
      .filter(b => b.index >= 0 && b.index <= 2)
      .sort((a, b) => a.index - b.index);
  }, [selectedTemplate, form.multiButtons]);

  // ---- API calls ----

  const businessId = useCallback(() => {
    return (
      ctxBusinessId ||
      localStorage.getItem("businessId") ||
      localStorage.getItem("sa_selectedBusinessId") ||
      null
    );
  }, [ctxBusinessId]);

  const fetchFullTemplate = useCallback(
    async templateName => {
      const bizId = businessId();
      if (!bizId || !templateName) return;

    try {
      const { data } = await axiosClient.get(
        `WhatsAppTemplateFetcher/get-by-name/${bizId}/${encodeURIComponent(
          templateName
        )}`,
        {
          params: { includeButtons: true },
        }
      );

      if (data?.success) {
        const tpl = data.template;
        setSelectedTemplate(tpl);

        // Store body + buttons into config
        setForm(prev => ({
          ...prev,
          templateName: tpl.name,
          body: tpl.body || tpl.bodyText || "",
          multiButtons: tpl.multiButtons || tpl.buttonParams || [],
        }));
      } else {
        setSelectedTemplate(null);
        console.warn("⚠️ No template found");
      }
    } catch (err) {
      console.error("❌ Failed to fetch full template", err);
      setSelectedTemplate(null);
    }
    },
    [businessId]
  );

  const fetchTemplates = useCallback(
    async (preselectedName = "") => {
      const bizId = businessId();
      if (!bizId) return;

      try {
        const { data } = await axiosClient.get(
          `WhatsAppTemplateFetcher/get-template/${bizId}`
        );

        if (data?.success) {
          const raw = Array.isArray(data.templates) ? data.templates : [];
          const normalized = raw
            .map(t => (typeof t === "string" ? { name: t, language: "" } : t))
            .filter(t => t && t.name);
          setTemplates(normalized);
          if (preselectedName) {
            await fetchFullTemplate(preselectedName);
          }
        }
      } catch (err) {
        console.error("❌ Failed to fetch templates", err);
      }
    },
    [businessId, fetchFullTemplate]
  );

  // 🆕 Load all published CTA flows for this business
  const fetchCtaFlows = useCallback(async () => {
    try {
      const { data } = await axiosClient.get("cta-flow/all-published");
      // data is List<VisualFlowSummaryDto> from API
      // { id, flowName, isPublished, createdAt }
      setCtaFlows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to fetch CTA flows", err);
      setCtaFlows([]);
    }
  }, []);

  // ---- Initialize form from node.data.config ----

  useEffect(() => {
    if (!node) return;

    const { config } = node.data || {};

    // 🔢 Safely normalize seconds (can be number or string in config)
    const rawSeconds = config?.seconds;
    let normalizedSeconds = 10; // default

    if (typeof rawSeconds === "number") {
      normalizedSeconds = rawSeconds > 0 ? rawSeconds : 10;
    } else if (typeof rawSeconds === "string" && rawSeconds.trim() !== "") {
      const parsed = Number(rawSeconds);
      normalizedSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
    }

    const next = {
      text: config?.text || "",
      templateName: config?.templateName || "",
      tags: config?.tags || [],
      seconds: normalizedSeconds,
      body: config?.body || "",
      multiButtons: config?.multiButtons || [],
      headerMediaUrl: config?.headerMediaUrl || "",
      bodyParams: config?.bodyParams || config?.placeholders || [],
      urlButtonParams: config?.urlButtonParams || ["", "", ""],
      useProfileName: !!(config?.useProfileName || false),
      profileNameSlot: config?.profileNameSlot || 1,
      // 🆕 hydrate CTA fields if present
      ctaFlowConfigId: config?.ctaFlowConfigId || config?.CtaFlowConfigId || "",
      ctaFlowName: config?.ctaFlowName || config?.CtaFlowName || "",
    };
    setForm(next);
    setTemplateQuery("");

    if (node.type === "template") {
      fetchTemplates(config?.templateName);
      setSelectedTemplate(null); // will be set in fetchFullTemplate
    } else {
      setSelectedTemplate(null);
    }

    if (node.type === "cta_flow") {
      fetchCtaFlows();
    }
  }, [node, fetchTemplates, fetchCtaFlows]);

  // Keep bodyParams aligned to placeholder count (index 0 => {{1}})
  useEffect(() => {
    if (!isTemplateNode) return;
    const count = bodyPlaceholderCount;
    setForm(prev => {
      const current = Array.isArray(prev.bodyParams) ? prev.bodyParams : [];
      if (current.length === count) return prev;
      const next = Array.from({ length: count }, (_, i) =>
        String(current[i] ?? "")
      );
      return { ...prev, bodyParams: next };
    });
  }, [isTemplateNode, bodyPlaceholderCount]);

  // Ensure urlButtonParams always has stable length 3 (index 0 => button 1)
  useEffect(() => {
    if (!isTemplateNode) return;
    setForm(prev => {
      const current = Array.isArray(prev.urlButtonParams)
        ? prev.urlButtonParams
        : [];
      if (current.length === 3) return prev;
      const next = Array.from({ length: 3 }, (_, i) => String(current[i] ?? ""));
      return { ...prev, urlButtonParams: next };
    });
  }, [isTemplateNode]);

  // Clamp profileNameSlot when placeholder count changes
  useEffect(() => {
    if (!isTemplateNode) return;
    if (!form.useProfileName || !canUseProfile) {
      if (form.useProfileName) {
        setForm(prev => ({ ...prev, useProfileName: false }));
      }
      return;
    }

    const clamped = Math.max(
      1,
      Math.min(form.profileNameSlot || 1, bodyPlaceholderCount)
    );
    if (clamped !== form.profileNameSlot) {
      setForm(prev => ({ ...prev, profileNameSlot: clamped }));
    }
  }, [
    isTemplateNode,
    canUseProfile,
    bodyPlaceholderCount,
    form.useProfileName,
    form.profileNameSlot,
  ]);

  const filteredTemplates = useMemo(() => {
    const q = String(templateQuery || "").trim().toLowerCase();
    const list = Array.isArray(templates) ? templates : [];
    if (!q) return list;
    return list.filter(t => {
      const name = String(t?.name || "").toLowerCase();
      const lang = String(t?.language || "").toLowerCase();
      return name.includes(q) || lang.includes(q);
    });
  }, [templates, templateQuery]);

  const selectedTemplateOption = useMemo(() => {
    const name = String(form.templateName || "").trim();
    if (!name) return null;
    return (
      templates.find(t => String(t?.name || "").trim() === name) || {
        name,
        language: "",
      }
    );
  }, [templates, form.templateName]);

  // ---- Handlers ----

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTagsChange = e => {
    const raw = e.target.value;
    const tags = raw
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
    setForm(prev => ({ ...prev, tags }));
  };

  // 🆕 CTA Flow dropdown change
  const handleCtaFlowChange = e => {
    const value = e.target.value;
    const selected = ctaFlows.find(f => f.id === value);

    setForm(prev => ({
      ...prev,
      ctaFlowConfigId: value || "",
      ctaFlowName: selected?.flowName || "",
    }));
  };

  const handleSave = () => {
    if (!node) return;

    // 🔢 Ensure `seconds` is always a number for wait nodes
    let configSeconds = form.seconds;
    if (isWaitNode) {
      const parsed = Number(form.seconds);
      if (!parsed || !Number.isFinite(parsed) || parsed <= 0) {
        configSeconds = 10; // fallback default
      } else {
        configSeconds = parsed;
      }
    }

    const config = {
      ...form,
      ...(isWaitNode ? { seconds: configSeconds } : {}),
    };

    const updated = {
      ...node,
      data: {
        ...(node.data || {}),
        config,
      },
    };

    onSave?.(updated);
    onClose?.();
  };

  const closeWithoutSave = () => {
    setSelectedTemplate(null);
    onClose?.();
  };

  if (!node) return null;

  const title =
    node.type === "message"
      ? "Edit Message Node"
      : node.type === "template"
      ? "Edit Template Node"
      : node.type === "tag"
      ? "Edit Tag Node"
      : node.type === "wait"
      ? "Edit Wait Node"
      : node.type === "cta_flow"
      ? "Edit CTA Flow Node"
      : "Edit Node";

  return (
    <Dialog open={!!node} onClose={closeWithoutSave} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white shadow-lg p-5 space-y-4">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </Dialog.Title>
          <p className="text-xs text-gray-500 mb-3">
            Node ID: <span className="font-mono">{node.id}</span>
          </p>

          {/* Message node fields */}
          {isMessageNode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Reply text
              </label>
              <textarea
                name="text"
                value={form.text}
                onChange={handleChange}
                rows={4}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Type the auto-reply message..."
              />
            </div>
          )}

          {/* Template node fields */}
          {isTemplateNode && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select WhatsApp template
                </label>
                <Combobox
                  value={selectedTemplateOption}
                  onChange={tpl => {
                    const name = String(tpl?.name || "").trim();
                    setForm(prev => ({ ...prev, templateName: name }));
                    if (name) fetchFullTemplate(name);
                    else setSelectedTemplate(null);
                  }}
                  nullable
                >
                  <div className="relative">
                    <Combobox.Input
                      className="w-full border rounded-md px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Search & select template..."
                      displayValue={tpl => String(tpl?.name || "")}
                      onChange={e => setTemplateQuery(e.target.value)}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      ▾
                    </Combobox.Button>

                    <Combobox.Options className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white py-1 text-sm shadow-lg">
                      {filteredTemplates.length === 0 ? (
                        <div className="px-3 py-2 text-slate-500">
                          No templates found
                        </div>
                      ) : (
                        filteredTemplates.map(tpl => {
                          const key = `${tpl.name}||${tpl.language || ""}`;
                          return (
                            <Combobox.Option
                              key={key}
                              value={tpl}
                              className={({ active }) =>
                                `cursor-pointer select-none px-3 py-2 ${
                                  active
                                    ? "bg-emerald-50 text-emerald-900"
                                    : "text-slate-700"
                                }`
                              }
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate">{tpl.name}</span>
                                <span className="shrink-0 text-xs text-slate-400">
                                  {(tpl.language || "").toString()}
                                </span>
                              </div>
                            </Combobox.Option>
                          );
                        })
                      )}
                    </Combobox.Options>
                  </div>
                </Combobox>
                <p className="text-[11px] text-gray-500 mt-1">
                  Templates are loaded from Meta and cached by your backend.
                </p>
              </div>

              {/* Preview of template with buttons */}
              <WhatsAppTemplatePreview
                template={selectedTemplate}
                headerMediaUrl={form.headerMediaUrl}
                bodyParams={form.bodyParams}
                urlButtonParams={form.urlButtonParams}
                useProfileName={form.useProfileName}
                profileNameSlot={form.profileNameSlot}
              />

              {needsHeaderUrl && (
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-slate-800">
                      {headerKindLabel} URL (https)
                    </label>
                    <span
                      className={`text-[11px] font-medium ${
                        !form.headerMediaUrl || isValidHttpsUrl(form.headerMediaUrl)
                          ? "text-slate-500"
                          : "text-red-600"
                      }`}
                    >
                      {form.headerMediaUrl && !isValidHttpsUrl(form.headerMediaUrl)
                        ? "Invalid URL"
                        : "Required"}
                    </span>
                  </div>
                  <input
                    type="url"
                    inputMode="url"
                    value={form.headerMediaUrl}
                    onChange={e =>
                      setForm(prev => ({ ...prev, headerMediaUrl: e.target.value }))
                    }
                    className={`w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                      !form.headerMediaUrl || isValidHttpsUrl(form.headerMediaUrl)
                        ? "border-slate-200 focus:ring-emerald-500"
                        : "border-red-400 focus:ring-red-500"
                    }`}
                    placeholder="https://..."
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {headerKindLabel} templates require a publicly accessible HTTPS
                    URL.
                  </p>
                </div>
              )}

              {bodyPlaceholderCount > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-slate-800">
                      Body variables
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500">
                        {bodyPlaceholderCount} var
                        {bodyPlaceholderCount === 1 ? "" : "s"}
                      </span>
                      {canUseProfile && (
                        <label className="flex items-center gap-2 text-[11px] text-slate-600 select-none">
                          <input
                            type="checkbox"
                            checked={!!form.useProfileName}
                            onChange={e => {
                              const checked = e.target.checked;
                              if (!checked) {
                                setForm(prev => ({ ...prev, useProfileName: false }));
                              } else {
                                const clamped = Math.max(
                                  1,
                                  Math.min(form.profileNameSlot || 1, bodyPlaceholderCount)
                                );
                                setForm(prev => ({
                                  ...prev,
                                  useProfileName: true,
                                  profileNameSlot: clamped,
                                }));
                              }
                            }}
                          />
                          Use contact name
                        </label>
                      )}
                    </div>
                  </div>

                  {form.useProfileName && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 text-[11px] text-slate-500 shrink-0">
                        Slot
                      </div>
                      <select
                        className="w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.profileNameSlot || 1}
                        onChange={e => {
                          const n = parseInt(e.target.value, 10) || 1;
                          setForm(prev => ({
                            ...prev,
                            profileNameSlot: Math.max(
                              1,
                              Math.min(n, bodyPlaceholderCount)
                            ),
                          }));
                        }}
                      >
                        {Array.from(
                          { length: Math.max(bodyPlaceholderCount, 1) },
                          (_, i) => i + 1
                        ).map(n => (
                          <option key={n} value={n}>
                            {`{{${n}}}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    {Array.from({ length: bodyPlaceholderCount }, (_, i) => {
                      const slot = i + 1;
                      const isProfileSlot =
                        !!form.useProfileName && (form.profileNameSlot || 1) === slot;
                      const value = Array.isArray(form.bodyParams)
                        ? form.bodyParams[i]
                        : "";

                      return (
                        <div key={slot} className="flex items-center gap-2">
                          <div className="w-10 text-[11px] text-slate-500 shrink-0">
                            {`{{${slot}}}`}
                          </div>
                          <input
                            className={`w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                              isProfileSlot
                                ? "border-slate-200 bg-slate-50 text-slate-600"
                                : "border-slate-200 focus:ring-emerald-500"
                            }`}
                            disabled={isProfileSlot}
                            value={
                              isProfileSlot ? "Contact name (auto)" : String(value || "")
                            }
                            placeholder={isProfileSlot ? "" : "Enter value"}
                            onChange={e => {
                              const next = Array.isArray(form.bodyParams)
                                ? [...form.bodyParams]
                                : Array.from(
                                    { length: bodyPlaceholderCount },
                                    () => ""
                                  );
                              next[i] = e.target.value;
                              setForm(prev => ({ ...prev, bodyParams: next }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] leading-tight text-slate-500">
                    Fill values for template placeholders. You can auto-fill one
                    slot with the contact name.
                  </div>
                </div>
              )}

              {dynamicUrlButtons.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-800">
                      URL button values
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {dynamicUrlButtons.length} dynamic
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dynamicUrlButtons.map(b => {
                      const idx = b.index;
                      const value = Array.isArray(form.urlButtonParams)
                        ? form.urlButtonParams[idx] || ""
                        : "";
                      const ok = String(value || "").trim().length > 0;
                      const label = b.text?.trim() || `Button ${idx + 1}`;

                      return (
                        <div key={`${idx}-${label}`} className="flex items-center gap-2">
                          <div className="w-16 text-[11px] text-slate-500 shrink-0">
                            {`Btn ${idx + 1}`}
                          </div>
                          <input
                            className={`w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                              ok
                                ? "border-slate-200 focus:ring-emerald-500"
                                : "border-red-400 focus:ring-red-500"
                            }`}
                            value={value}
                            placeholder={label}
                            onChange={e => {
                              const next = Array.isArray(form.urlButtonParams)
                                ? [...form.urlButtonParams]
                                : ["", "", ""];
                              next[idx] = e.target.value;
                              setForm(prev => ({ ...prev, urlButtonParams: next }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] leading-tight text-slate-500">
                    Required only for templates with dynamic URL buttons (URL
                    contains {"{{1}}"}). Provide the placeholder value.
                  </div>
                </div>
              )}

              {false && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-800">
                      Use contact name
                    </label>
                    <input
                      type="checkbox"
                      checked={!!form.useProfileName}
                      onChange={e => {
                        const checked = e.target.checked;
                        if (!checked) {
                          setForm(prev => ({
                            ...prev,
                            useProfileName: false,
                          }));
                        } else {
                          const clamped = Math.max(
                            1,
                            Math.min(form.profileNameSlot || 1, bodyPlaceholderCount)
                          );
                          setForm(prev => ({
                            ...prev,
                            useProfileName: true,
                            profileNameSlot: clamped,
                          }));
                        }
                      }}
                    />
                  </div>

                  {form.useProfileName && (
                    <div className="mt-2">
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Slot ({"{{n}}"})
                      </label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.profileNameSlot || 1}
                        onChange={e => {
                          const n = parseInt(e.target.value, 10) || 1;
                          setForm(prev => ({
                            ...prev,
                            profileNameSlot: Math.max(
                              1,
                              Math.min(n, bodyPlaceholderCount)
                            ),
                          }));
                        }}
                      >
                        {Array.from(
                          { length: Math.max(bodyPlaceholderCount, 1) },
                          (_, i) => i + 1
                        ).map(n => (
                          <option key={n} value={n}>
                            {`{{${n}}}`}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Fills the selected placeholder with the contactâ€™s WhatsApp
                        profile name (if available), otherwise the saved contact
                        name.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🆕 CTA Flow node fields */}
          {isCtaNode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Attach CTA Flow
              </label>
              <select
                value={form.ctaFlowConfigId}
                onChange={handleCtaFlowChange}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose published CTA flow --</option>
                {ctaFlows.map(flow => (
                  <option key={flow.id} value={flow.id}>
                    {flow.flowName}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                This CTA flow is built in the CTA Flow Builder. When this
                auto-reply fires and the user enters that journey, this flow
                will run and log steps into CTA analytics.
              </p>

              {form.ctaFlowName && (
                <p className="text-[11px] text-emerald-700 mt-1">
                  Selected flow: <b>{form.ctaFlowName}</b>
                </p>
              )}
            </div>
          )}

          {/* Tag node fields */}
          {isTagNode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={form.tags.join(", ")}
                onChange={handleTagsChange}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. new_lead, hot, whatsapp_inbound"
              />
            </div>
          )}

          {/* Wait node fields */}
          {isWaitNode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Wait time (seconds)
              </label>
              <input
                type="number"
                name="seconds"
                min={1}
                value={form.seconds}
                onChange={handleChange}
                className="w-32 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-gray-500">
                The flow will pause for this duration before moving to the next
                node.
              </p>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-3 border-t mt-2">
            <Button
              variant="outline"
              type="button"
              onClick={closeWithoutSave}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} className="text-sm">
              Save
            </Button>
          </div>
        </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
