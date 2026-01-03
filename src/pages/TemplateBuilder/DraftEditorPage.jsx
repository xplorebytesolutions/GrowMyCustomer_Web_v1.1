import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Eye,
  Send,
  ShieldCheck,
  Save,
  ChevronLeft,
  Loader2,
} from "lucide-react";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
import { Card } from "../../components/ui/card";

import DraftStatusBadge from "./components/DraftStatusBadge";
import HeaderMediaUploader from "./components/HeaderMediaUploader";

const DEFAULT_LANG = "en_US";

export default function DraftEditorPage() {
  const { draftId } = useParams();
  const { isLoading, can, hasAllAccess } = useAuth();
  const [params, setParams] = useSearchParams();

  const language = params.get("language") || DEFAULT_LANG;

  // ✅ Template Builder permission (NOT campaign)
  const canEdit = hasAllAccess || can(FK.TEMPLATE_BUILDER_CREATE_DRAFT);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaHandle, setHeaderMediaHandle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState([]); // max 3
  const [examples, setExamples] = useState([""]);

  // Page state
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [preview, setPreview] = useState(null); // { human, components, category? }
  const [status, setStatus] = useState(null); // { name, items: [{ language, status, reason }] }

  const onLanguageChange = next => {
    setParams(p => {
      const clone = new URLSearchParams(p);
      clone.set("language", next);
      return clone;
    });
  };

  // -----------------------------
  // Backend loaders
  // -----------------------------
  const loadStatus = useCallback(async () => {
    if (!draftId) return;
    try {
      const { data } = await axiosClient.get(
        `/template-builder/drafts/${draftId}/status`
      );
      setStatus(data || null);
      if (data?.name) setName(prev => prev || data.name);
    } catch {
      // non-fatal (might not exist yet)
    }
  }, [draftId]);

  const loadPreview = useCallback(async () => {
    if (!draftId) return;

    setPreviewLoading(true);
    try {
      const { data } = await axiosClient.get(
        `/template-builder/drafts/${draftId}/preview`,
        { params: { language } }
      );

      // backend might return { success, preview } OR just preview
      const payload = data?.preview ?? data;
      setPreview(payload || null);

      // Seed editor state from preview (best-effort)
      if (payload?.components) {
        const comps = payload.components || [];

        const header = comps.find(c => c.type === "HEADER");
        const body = comps.find(c => c.type === "BODY");
        const footer = comps.find(c => c.type === "FOOTER");
        const btns = comps.find(c => c.type === "BUTTONS");

        if (header) {
          const kind =
            header.format || header.text ? header.format || "TEXT" : "NONE";
          setHeaderType(kind);
          if (kind === "TEXT") setHeaderText(header.text || "");
        } else {
          setHeaderType("NONE");
          setHeaderText("");
          setHeaderMediaHandle("");
        }

        if (body?.text) setBodyText(body.text);
        if (footer?.text) setFooterText(footer.text);

        if (btns?.buttons) setButtons(btns.buttons.slice(0, 3));
      }

      if (payload?.category) setCategory(payload.category);
    } catch (err) {
      // On first load, preview may not exist (OK)
    } finally {
      setPreviewLoading(false);
    }
  }, [draftId, language]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // -----------------------------
  // Actions
  // -----------------------------
  const handleSave = async () => {
    if (!canEdit) return;

    if (!name?.trim()) return toast.warn("Template name is required.");
    if (!bodyText?.trim()) return toast.warn("Body is required.");

    if (headerType === "TEXT" && !headerText?.trim()) {
      return toast.warn("Header text is required when header type is TEXT.");
    }

    if (
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) &&
      !headerMediaHandle
    ) {
      return toast.warn("Upload/attach header media first.");
    }

    const dto = {
      name: name.trim(),
      language,
      category,
      headerType,
      headerText: headerType === "TEXT" ? headerText : "",
      headerMediaHandle: ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)
        ? headerMediaHandle
        : "",
      bodyText,
      footerText,
      buttons: (buttons || []).slice(0, 3),
      examples,
    };

    setSaving(true);
    try {
      // ✅ Backend: POST /drafts/{draftId}/variants
      await axiosClient.post(
        `/template-builder/drafts/${draftId}/variants`,
        dto
      );
      toast.success("Draft saved.");
      await loadPreview();
      await loadStatus();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleNameCheck = async () => {
    setChecking(true);
    try {
      const { data } = await axiosClient.get(
        `/template-builder/drafts/${draftId}/name-check`,
        { params: { language } }
      );

      if (data?.available) toast.success("Name is available in this language.");
      else
        toast.warn(
          data?.suggestion ? `Try: ${data.suggestion}` : "Name not available."
        );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Name check failed.");
    } finally {
      setChecking(false);
    }
  };

  const handlePreview = async () => {
    await loadPreview();
  };

  const handleSubmit = async () => {
    if (!canEdit) return;

    setSubmitting(true);
    try {
      await axiosClient.post(`/template-builder/drafts/${draftId}/submit`);
      toast.success("Submitted to Meta. Status will update after review.");
      await loadStatus();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading profile…</div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-8">
        <Link
          to="/app/template-builder/library"
          className="text-purple-600 hover:underline flex items-center gap-2 mb-4"
        >
          <ChevronLeft size={18} /> Back to Library
        </Link>
        <Card className="p-6">
          <div className="text-lg font-semibold text-purple-800 mb-2">
            Insufficient permissions
          </div>
          <p className="text-gray-600">
            You don’t have access to edit/submit templates. Contact your admin.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <Link
        to="/app/template-builder/library"
        className="text-purple-600 hover:underline flex items-center gap-2 mb-4"
      >
        <ChevronLeft size={18} /> Back to Library
      </Link>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-purple-800">Draft Editor</h2>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={e => onLanguageChange(e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            <option value="en_US">English (en_US)</option>
          </select>

          <DraftStatusBadge status={status} language={language} />
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Edit your draft variant, preview with examples, check name collision,
        and submit to Meta.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4">
            {/* Name + Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Template Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., order_update_v2"
                  className="mt-1 w-full rounded border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="mt-1 w-full rounded border-gray-300"
                >
                  <option value="UTILITY">Utility</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
            </div>

            {/* Header */}
            <div>
              <label className="text-sm text-gray-600">Header</label>
              <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={headerType}
                  onChange={e => {
                    const next = e.target.value;
                    setHeaderType(next);

                    // clear incompatible state
                    if (next !== "TEXT") setHeaderText("");
                    if (!["IMAGE", "VIDEO", "DOCUMENT"].includes(next))
                      setHeaderMediaHandle("");
                  }}
                  className="rounded border-gray-300"
                >
                  <option value="NONE">None</option>
                  <option value="TEXT">Text</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                </select>

                {headerType === "TEXT" && (
                  <input
                    value={headerText}
                    onChange={e => setHeaderText(e.target.value)}
                    placeholder="Header text"
                    className="md:col-span-2 rounded border-gray-300"
                  />
                )}

                {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                  <div className="md:col-span-2">
                    <HeaderMediaUploader
                      draftId={draftId}
                      language={language}
                      mediaType={headerType}
                      handle={headerMediaHandle}
                      onUploaded={h => setHeaderMediaHandle(h)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="text-sm text-gray-600">Body</label>
              <textarea
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                rows={6}
                placeholder="Hello {{1}}, your order {{2}} is confirmed."
                className="mt-1 w-full rounded border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use placeholders like <code>{"{{1}}"}</code>,{" "}
                <code>{"{{2}}"}</code>. Max 1024 chars.
              </p>
            </div>

            {/* Footer */}
            <div>
              <label className="text-sm text-gray-600">Footer (optional)</label>
              <input
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="For queries, reply HELP"
                className="mt-1 w-full rounded border-gray-300"
              />
            </div>

            {/* Buttons (≤3) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Buttons (max 3)</label>
                <button
                  type="button"
                  onClick={() =>
                    setButtons(prev =>
                      prev.length < 3
                        ? [...prev, { type: "URL", text: "", url: "" }]
                        : prev
                    )
                  }
                  className="text-purple-600 text-sm flex items-center gap-1"
                >
                  <Save size={16} /> Add Button
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {buttons.map((b, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-3 gap-2"
                  >
                    <select
                      value={b.type}
                      onChange={e =>
                        setButtons(btns => {
                          const c = [...btns];
                          c[i] = { ...c[i], type: e.target.value };
                          return c;
                        })
                      }
                      className="rounded border-gray-300"
                    >
                      <option value="URL">URL</option>
                      <option value="PHONE_NUMBER">Phone</option>
                      <option value="QUICK_REPLY">Quick Reply</option>
                    </select>

                    <input
                      value={b.text || ""}
                      onChange={e =>
                        setButtons(btns => {
                          const c = [...btns];
                          c[i] = { ...c[i], text: e.target.value };
                          return c;
                        })
                      }
                      placeholder="Button text"
                      className="rounded border-gray-300"
                    />

                    <input
                      value={b.url || b.phone_number || ""}
                      onChange={e =>
                        setButtons(btns => {
                          const c = [...btns];
                          const key =
                            c[i].type === "PHONE_NUMBER"
                              ? "phone_number"
                              : "url";
                          c[i] = { ...c[i], [key]: e.target.value };
                          return c;
                        })
                      }
                      placeholder={
                        b.type === "PHONE_NUMBER" ? "+91..." : "https://…"
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Examples */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">
                  Example values (for preview)
                </label>
                <button
                  type="button"
                  onClick={() => setExamples(prev => [...prev, ""])}
                  className="text-purple-600 text-sm"
                >
                  + Add example
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {examples.map((ex, i) => (
                  <input
                    key={i}
                    value={ex}
                    onChange={e =>
                      setExamples(arr => {
                        const copy = [...arr];
                        copy[i] = e.target.value;
                        return copy;
                      })
                    }
                    placeholder={`Example ${i + 1}`}
                    className="w-full rounded border-gray-300"
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Save
              </button>

              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="inline-flex items-center gap-2 rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
              >
                {previewLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Eye size={18} />
                )}
                Preview
              </button>

              <button
                onClick={handleNameCheck}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ShieldCheck size={18} />
                )}
                Name Check
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="ml-auto inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                Submit to Meta
              </button>
            </div>
          </div>
        </Card>

        {/* Right: Live Preview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-purple-700 font-semibold">Preview</div>
            {previewLoading && (
              <Loader2 className="animate-spin text-gray-400" size={18} />
            )}
          </div>

          {!preview ? (
            <div className="text-gray-500 text-sm">
              No preview yet. Click <b>Preview</b> to render.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded border p-3 bg-gray-50">
                <div className="text-xs uppercase text-gray-500 mb-1">
                  Human Preview
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {preview.human || "—"}
                </pre>
              </div>

              <div className="rounded border p-3">
                <div className="text-xs uppercase text-gray-500 mb-1">
                  Meta Components
                </div>
                <pre className="overflow-auto text-xs">
                  {JSON.stringify(preview.components || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
