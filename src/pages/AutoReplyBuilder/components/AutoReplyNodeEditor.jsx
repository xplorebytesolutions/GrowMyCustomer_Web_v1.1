// 📄 src/pages/AutoReplyBuilder/components/AutoReplyNodeEditor.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import { Button } from "../../../components/ui/button";
import WhatsAppTemplatePreview from "./WhatsAppTemplatePreview";
import axiosClient from "../../../api/axiosClient";

export default function AutoReplyNodeEditor({ node, onClose, onSave }) {
  const [form, setForm] = useState({
    text: "",
    templateName: "",
    placeholders: [],
    tags: [],
    seconds: 10, // 🔁 default wait = 10s
    body: "",
    multiButtons: [],
    // 🆕 CTA flow fields
    ctaFlowConfigId: "",
    ctaFlowName: "",
  });

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // 🆕 CTA flow list for dropdown
  const [ctaFlows, setCtaFlows] = useState([]);

  const isTemplateNode = node?.type === "template";
  const isMessageNode = node?.type === "message";
  const isTagNode = node?.type === "tag";
  const isWaitNode = node?.type === "wait";
  const isCtaNode = node?.type === "cta_flow";

  // ---- API calls ----

  const fetchFullTemplate = useCallback(async templateName => {
    const businessId = localStorage.getItem("businessId");
    if (!businessId || !templateName) return;

    try {
      const { data } = await axiosClient.get(
        `WhatsAppTemplateFetcher/get-by-name/${businessId}/${encodeURIComponent(
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
  }, []);

  const fetchTemplates = useCallback(
    async (preselectedName = "") => {
      const businessId = localStorage.getItem("businessId");
      if (!businessId) return;

      try {
        const { data } = await axiosClient.get(
          `WhatsAppTemplateFetcher/get-template/${businessId}`
        );

        if (data?.success) {
          setTemplates(data.templates || []);
          if (preselectedName) {
            await fetchFullTemplate(preselectedName);
          }
        }
      } catch (err) {
        console.error("❌ Failed to fetch templates", err);
      }
    },
    [fetchFullTemplate]
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
      placeholders: config?.placeholders || [],
      tags: config?.tags || [],
      seconds: normalizedSeconds,
      body: config?.body || "",
      multiButtons: config?.multiButtons || [],
      // 🆕 hydrate CTA fields if present
      ctaFlowConfigId: config?.ctaFlowConfigId || config?.CtaFlowConfigId || "",
      ctaFlowName: config?.ctaFlowName || config?.CtaFlowName || "",
    };
    setForm(next);

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

  const handleTemplateChange = e => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, templateName: value }));
    if (value) {
      fetchFullTemplate(value);
    } else {
      setSelectedTemplate(null);
    }
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
      <div className="fixed inset-0 flex items-center justify-center p-4">
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
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select WhatsApp template
                </label>
                <select
                  value={form.templateName}
                  onChange={handleTemplateChange}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose template --</option>
                  {templates.map(tpl => (
                    <option key={tpl.name} value={tpl.name}>
                      {tpl.name} ({tpl.language})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Templates are loaded from Meta and cached by your backend.
                </p>
              </div>

              {/* Preview of template with buttons */}
              <WhatsAppTemplatePreview template={selectedTemplate} />
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
    </Dialog>
  );
}
