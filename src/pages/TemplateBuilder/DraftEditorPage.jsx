import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Bold,
  Italic,
  Smile,
  Code,
  Info,
  Type,
  LayoutTemplate,
  File,
  Video,
  Image as ImageIconIcon,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  MessageSquare,
  ExternalLink,
  Phone,
  CornerUpLeft,
  ChevronDown,
} from "lucide-react";

import axiosClient from "../../api/axiosClient";
import { deleteDraft } from "./drafts";
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
import { Card } from "../../components/ui/card";

import DraftStatusBadge from "./components/DraftStatusBadge";
import HeaderMediaUploader from "./components/HeaderMediaUploader";
import WhatsAppTemplatePreview from "./components/WhatsAppTemplatePreview";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal";

const DEFAULT_LANG = "en_US";

const PortalMenu = ({ anchorRef, children, onClose }) => {
  const [coords, setCoords] = useState(null);

  React.useLayoutEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const menuHeight = 180;
      const showUp = rect.bottom + menuHeight > window.innerHeight;
      setCoords({
        top: showUp ? rect.top : rect.bottom,
        left: rect.left,
        showUp
      });
    }
  }, [anchorRef]);

  if (!coords) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0" onClick={onClose} />
      <div 
        className="absolute z-[101] w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1"
        style={{ 
          top: coords.showUp ? 'auto' : coords.top + 2,
          bottom: coords.showUp ? (window.innerHeight - coords.top) + 2 : 'auto',
          left: coords.left
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default function DraftEditorPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { isLoading, can, hasAllAccess } = useAuth();
  const [params, setParams] = useSearchParams();

  const hasLanguageParam = params.has("language");
  const language = params.get("language") || DEFAULT_LANG;
  const canEdit = hasAllAccess || can(FK.TEMPLATE_BUILDER_CREATE_DRAFT);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaHandle, setHeaderMediaHandle] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState(null); // For live preview
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null); // 'ADD' or row index 0, 1, 2...
  const addButtonRef = useRef(null);
  const rowRefs = useRef([]);
  const [examples, setExamples] = useState([""]); // Start with one example field

  // Page state
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(!!draftId);
  const [status, setStatus] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  const textareaRef = useRef(null);

  const cacheKey = useCallback(
    () => `tpl:draft-editor:${draftId || "none"}:${language || DEFAULT_LANG}`,
    [draftId, language]
  );

  const clearCache = useCallback(() => {
    try {
      sessionStorage.removeItem(cacheKey());
    } catch {
      // ignore
    }
  }, [cacheKey]);

  const restoreFromCache = useCallback(() => {
    try {
      if (!draftId) return false;
      const raw = sessionStorage.getItem(cacheKey());
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.draftId !== draftId) return false;

      if (typeof data.name === "string") setName(data.name);
      if (typeof data.category === "string") setCategory(data.category);
      if (typeof data.headerType === "string") setHeaderType(data.headerType);
      if (typeof data.headerText === "string") setHeaderText(data.headerText);
      if (typeof data.headerMediaHandle === "string")
        setHeaderMediaHandle(data.headerMediaHandle);
      if (typeof data.bodyText === "string") setBodyText(data.bodyText);
      if (typeof data.footerText === "string") setFooterText(data.footerText);
      if (Array.isArray(data.buttons)) setButtons(data.buttons.slice(0, 3));
      if (Array.isArray(data.examples)) setExamples(data.examples);
      return true;
    } catch {
      return false;
    }
  }, [cacheKey, draftId]);

  // Persist draft in sessionStorage so user doesn't lose work on errors/reloads.
  useEffect(() => {
    if (!draftId || loadingInitial) return;

    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(
          cacheKey(),
          JSON.stringify({
            v: 1,
            draftId,
            language,
            at: new Date().toISOString(),
            name,
            category,
            headerType,
            headerText,
            headerMediaHandle,
            bodyText,
            footerText,
            buttons,
            examples,
          })
        );
      } catch {
        // ignore
      }
    }, 400);

    return () => clearTimeout(t);
  }, [
    bodyText,
    buttons,
    cacheKey,
    category,
    draftId,
    examples,
    footerText,
    headerMediaHandle,
    headerText,
    headerType,
    language,
    loadingInitial,
    name,
  ]);

  useEffect(() => {
    if (!draftId) navigate("/app/template-builder/drafts", { replace: true });
  }, [draftId, navigate]);


  const onLanguageChange = useCallback(next => {
    setParams(p => {
      const clone = new URLSearchParams(p);
      clone.set("language", next);
      return clone;
    });
  }, [setParams]);

  const extractPlaceholderMax = text => {
    const s = String(text || "");
    const re = /\{\{\s*(\d+)\s*\}\}/g;
    let max = 0;
    let m;
    while ((m = re.exec(s))) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max;
  };

  const buildExamplesMap = (text, list) => {
    const max = extractPlaceholderMax(text);
    const arr = Array.isArray(list) ? list : [];
    const map = {};
    for (let i = 1; i <= max; i++) {
      const v = String(arr[i - 1] ?? "").trim();
      if (v) map[String(i)] = v;
    }
    return { max, map };
  };

  const normalizeHeaderHandle = handle => {
    const h = String(handle || "").trim();
    if (!h) return "";
    return h.startsWith("handle:") ? h : `handle:${h}`;
  };

  const normalizeButtonsForApi = list => {
    const btns = Array.isArray(list) ? list : [];
    return btns
      .map(b => {
        const type = String(b?.type || "").toUpperCase();
        const text = String(b?.text || "").trim();
        
        // If text is empty, we consider the button "not added" / to be ignored.
        if (!type || !text) return null;

        if (type === "QUICK_REPLY") {
          return { type: "QUICK_REPLY", text };
        }

        if (type === "URL") {
          return { type: "URL", text, url: String(b?.url || "") };
        }

        // UI uses Meta's type label; API expects PHONE.
        if (type === "PHONE_NUMBER" || type === "PHONE") {
          return {
            type: "PHONE",
            text,
            phone: String(b?.phone || b?.phone_number || ""),
          };
        }

        return null;
      })
      .filter(Boolean)
      .slice(0, 3);
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
    } catch {
      // non-fatal
    }
  }, [draftId]);

  const loadBackendData = useCallback(async () => {
    if (!draftId) {
      setLoadingInitial(false);
      return;
    }

    setLoadingInitial(true);
    try {
      await loadStatus();

      // Draft (key/category/defaultLanguage)
      try {
        const { data: draftResp } = await axiosClient.get(
          `/template-builder/drafts/${draftId}`
        );
        const draft = draftResp?.draft || draftResp?.data?.draft || null;
        const draftKey = String(draft?.key || "");
        const isLibraryStubKey = draftKey.startsWith("__lib__");
        const isUntitled = draftKey.startsWith("untitled_");
        const forceBlankName =
          params.get("blankName") === "1" || params.get("blankName") === "true";

        if (isLibraryStubKey || isUntitled || forceBlankName) {
          setName("");
          if (forceBlankName) {
            setParams(p => {
              const next = new URLSearchParams(p);
              next.delete("blankName");
              return next;
            }, { replace: true });
          }
        } else if (draftKey) {
          setName(draftKey);
        }
        if (draft?.category) setCategory(String(draft.category).toUpperCase());
        if (!hasLanguageParam && draft?.defaultLanguage) {
          onLanguageChange(String(draft.defaultLanguage));
        }
      } catch {
        // non-fatal
      }

      let payload = null;
      try {
        const { data } = await axiosClient.get(
          `/template-builder/drafts/${draftId}/preview`,
          { params: { language }, __silentToast: true }
        );
        payload = data?.preview ?? data?.data?.preview ?? data;
      } catch (err) {
        const status = err?.response?.status;
        // A brand-new draft can have no language variant yet; treat as empty editor.
        if (status && status !== 404) {
          toast.error(err?.response?.data?.message || "Failed to load preview.");
        }
      }

      if (!payload) {
        restoreFromCache();
        return;
      }

      const comps =
        payload?.components ||
        payload?.componentsPayload ||
        payload?.ComponentsPayload ||
        [];
      const compsArr = Array.isArray(comps) ? comps : [];

      if (compsArr.length > 0) {
        const header = compsArr.find(c => c?.type === "HEADER");
        const body = compsArr.find(c => c?.type === "BODY");
        const footer = compsArr.find(c => c?.type === "FOOTER");
        const btns = compsArr.find(c => c?.type === "BUTTONS");

        if (header) {
          const kind = header.format || header.text ? header.format || "TEXT" : "NONE";
          setHeaderType(kind);
          if (kind === "TEXT") setHeaderText(header.text || "");
          if (header?.example?.header_handle?.[0]) {
            setHeaderMediaHandle(String(header.example.header_handle[0]));
          }
        } else {
          setHeaderType("NONE");
          setHeaderText("");
          setHeaderMediaHandle("");
          setHeaderMediaUrl(null);
        }

        if (body?.text) setBodyText(body.text);
        if (footer?.text) setFooterText(footer.text);
        if (btns?.buttons) setButtons((btns.buttons || []).slice(0, 3));

        // Prefer examples from BODY component if present; else from examplesPayload.body_text.
        const bodyExample =
          body?.example?.body_text?.[0] ||
          payload?.examplesPayload?.body_text?.[0] ||
          payload?.ExamplesPayload?.body_text?.[0] ||
          null;
        if (Array.isArray(bodyExample)) {
          setExamples(bodyExample.map(v => String(v ?? "")));
        }
      }
    } catch (err) {
      console.error("Failed to load draft data", err);
    } finally {
      setLoadingInitial(false);
    }
  }, [
    draftId,
    hasLanguageParam,
    language,
    loadStatus,
    onLanguageChange,
    params,
    restoreFromCache,
    setParams,
  ]);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // -----------------------------
  // Actions
  // -----------------------------
  const validateDraftInputs = ({ requireHeaderMedia = true } = {}) => {
    if (!canEdit) return "Insufficient permissions.";
    if (!name?.trim()) return "Template name is required.";
    if (name.trim().toLowerCase().startsWith("untitled_")) {
      return "Please rename the template before saving.";
    }
    if (!bodyText?.trim()) return "Body is required.";
    if (headerType === "TEXT" && !headerText?.trim()) {
      return "Header text is required when header type is TEXT.";
    }
    if (
      requireHeaderMedia &&
      ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) &&
      !headerMediaHandle
    ) {
      return "Upload/attach header media first.";
    }

    // Validate Examples
    const { max, map: examplesMap } = buildExamplesMap(bodyText, examples);
    const missing = [];
    for (let i = 1; i <= max; i++) {
      if (!examplesMap[String(i)]) missing.push(`{{${i}}}`);
    }
    if (missing.length > 0) {
      return `Examples required for placeholders: ${missing.join(", ")}`;
    }

    const effectiveButtons = normalizeButtonsForApi(buttons);

    // Template button constraints (safe caps):
    // - Total buttons max 3
    // - Call-to-Action (URL/Phone) max 2, with at most 1 URL and 1 Phone
    if (effectiveButtons.length > 0) {
      const urlCount = effectiveButtons.filter(b => b.type === "URL").length;
      const phoneCount = effectiveButtons.filter(b => b.type === "PHONE").length;

      if (urlCount > 1) return "Only one URL button is allowed.";
      if (phoneCount > 1) return "Only one Phone button is allowed.";
      if (urlCount + phoneCount > 2)
        return "Call-to-Action buttons allow a maximum of 2 (URL + Phone).";
    }

    // Validate Buttons (only if text is present)
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const hasText = !!b.text?.trim();

      // If text is empty, we will ignore this button (filter it out), so no validation needed.
      if (!hasText) continue;

      // If text provided, ensure other fields are valid
      if (b.type === "URL" && !b.url?.trim())
        return `Button "${b.text}" requires a valid URL.`;
      if (
        (b.type === "PHONE" || b.type === "PHONE_NUMBER") &&
        !b.phone_number?.trim() &&
        !b.phone?.trim()
      )
        return `Button "${b.text}" requires a phone number.`;
    }

    return null;
  };

  const saveDraftAndVariant = async () => {
    const err = validateDraftInputs();
    if (err) {
      toast.warn(err);
      return false;
    }

    const { map: examplesMap } = buildExamplesMap(bodyText, examples);

    const dto = {
      language,
      headerType,
      headerText: headerType === "TEXT" ? headerText : "",
      bodyText,
      footerText,
      buttons: normalizeButtonsForApi(buttons),
      examples: examplesMap,
    };
    if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) {
      dto.headerMediaLocalUrl = normalizeHeaderHandle(headerMediaHandle);
    }

    const draftPatch = {
      key: name.trim(),
      category: String(category || "UTILITY").toUpperCase(),
    };

    try {
      // 1. Update Draft Details (Key/Category)
      // This must succeed so the server draft.Key matches the user's chosen name.
      try {
        await axiosClient.patch(
          `/template-builder/drafts/${draftId}`,
          draftPatch,
          { __silentToast: true }
        );
      } catch (patchErr) {
        const msg =
          patchErr?.response?.data?.message ||
          patchErr?.response?.data?.Message ||
          patchErr?.message ||
          "Failed to save template name.";
        toast.error(msg);
        return false;
      }

      // 2. Upsert Variant
      try {
        await axiosClient.post(`/template-builder/drafts/${draftId}/variants`, dto, { __silentToast: true });
      } catch (variantErr) {
        console.error("POST variant failed:", variantErr);
         throw new Error(`Variant save failed: ${variantErr?.response?.status} ${variantErr?.response?.data?.message || variantErr.message}`);
      }

      await loadStatus();
      clearCache();
      return true;
    } catch (e) {
      console.error("Save Draft Sequence Failed:", e);
      toast.error(e.message); 
      return false;
    }
  };

  const handleBack = async () => {
    // Check if empty: 
    // 1. Name is "untitled_..." or empty (clean)
    // 2. Body is empty
    const isUntitled = !name || name.trim().toLowerCase().startsWith("untitled_");
    const isBodyEmpty = !bodyText || !bodyText.trim();
    
    // If it looks like a junk draft, delete it
    if (isUntitled && isBodyEmpty && !saving && !submitting) {
       try {
         await deleteDraft(draftId);
         toast.info("Discarded empty draft.");
       } catch (e) {
         console.warn("Failed to cleanup draft", e);
       }
    }
    
    navigate("/app/template-builder/drafts");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await saveDraftAndVariant();
      if (ok) toast.success("Draft saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleNameCheck = async () => {
    setChecking(true);
    try {
      const nextName = String(name || "").trim();
      if (!nextName) {
        toast.warn("Template name is required.");
        return;
      }

      // Ensure backend draft key matches current input (name-check reads draft.Key server-side).
      try {
        await axiosClient.patch(
          `/template-builder/drafts/${draftId}`,
          { key: nextName },
          { __silentToast: true }
        );
      } catch (patchErr) {
        const msg =
          patchErr?.response?.data?.message ||
          patchErr?.response?.data?.Message ||
          patchErr?.message ||
          "Failed to save template name.";
        toast.error(msg);
        return;
      }

      const { data } = await axiosClient.get(
        `/template-builder/drafts/${draftId}/name-check`,
        { params: { language } }
      );
      if (data?.available) toast.success("Name available!");
      else toast.warn("Name unavailable. Please choose a different name.");
    } catch (err) {
      toast.error("Name check failed.");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!canEdit) return;

    setSubmitting(true);
    try {
      // Ensure the variant exists (Meta submission requires a saved draft+variant).
      const ok = await saveDraftAndVariant();
      if (!ok) return;

      await axiosClient.post(`/template-builder/drafts/${draftId}/submit`);
      await loadStatus();
      setShowSubmissionSuccess(true);
    } catch (err) {
      const data = err?.response?.data;
      const topMsg = data?.message || data?.Message;
      const variants = data?.variants || data?.Variants;
      const firstVariant =
        Array.isArray(variants) && variants.length > 0 ? variants[0] : null;
      const variantReason =
        firstVariant?.rejectionReason ||
        firstVariant?.RejectionReason ||
        firstVariant?.reason ||
        firstVariant?.Reason ||
        null;

      const msg = variantReason || topMsg || err?.message || "Submission failed.";
      const s = String(msg || "");
      const isDuplicateLang =
        s.includes("subcode 2388024") ||
        s.toLowerCase().includes("content in this language already exists");

      if (isDuplicateLang) {
        toast.error(
          "This template name already exists on Meta for this language. Please change the template name and try again."
        );
      } else if (msg.toLowerCase().includes("variables can't be at the start or end") || msg.toLowerCase().includes("leading or trailing params")) {
        // Validation error - show inline
        setSubmissionError("Variables (e.g. {{1}}) cannot be placed at the very beginning or end of your text. Please add some text before or after the variable.");
        // Scroll to body input
        document.getElementById("body-input-container")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!canEdit) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    const isNew = !draftId;
    if (isNew) {
      clearCache();
      navigate("/app/template-builder/library", { replace: true });
      return;
    }

    setDeleting(true);
    try {
      await axiosClient.delete(`/template-builder/drafts/${draftId}`);
      toast.success("Draft deleted successfully");
      clearCache();
      navigate("/app/template-builder/library", { replace: true });
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to delete draft";
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  // -----------------------------
  // Rich Text Helpers
  // -----------------------------
  const insertAtCursor = (text) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = bodyText;
    const next = current.substring(0, start) + text + current.substring(end);
    setBodyText(next);
    
    // Defer focus to allow state update
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + text.length, start + text.length);
        }
    }, 0);
  };

  const wrapSelection = (char) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = bodyText;
    const selection = current.substring(start, end);
    const next = current.substring(0, start) + char + selection + char + current.substring(end);
    setBodyText(next);
    
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(end + 2, end + 2);
        }
    }, 0);
  };

  // -----------------------------
  // Render
  // -----------------------------
  const liveDraft = {
    name, category, headerType, headerText, headerMediaUrl, bodyText, footerText, buttons, examples, language
  };

  if (isLoading || loadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading editor...
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-8">
        <Link to="/app/template-builder/library" className="text-emerald-600 hover:underline flex items-center gap-2 mb-4">
          <ChevronLeft size={18} /> Back to Library
        </Link>
        <Card className="p-6 border-red-100 bg-red-50">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-red-600 mt-1" />
            <div>
              <div className="text-lg font-semibold text-red-800 mb-1">Insufficient permissions</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      {/* Top Bar (Compressed) */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
             onClick={handleBack}
             className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
             title="Back to Drafts"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-lg font-bold text-slate-800">{name || "Untitled Template"}</h1>
               <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
               <span className="text-sm text-slate-500">{language}</span>
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
               {category} <span className="text-slate-300">•</span> Default
               <span className="text-slate-300">•</span>
               <DraftStatusBadge status={status} language={language} condensed={true} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
             type="button"
             onClick={handleDelete}
             disabled={deleting || saving || submitting}
             className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
             title={draftId ? "Delete Draft" : "Discard Changes"}
          >
             {deleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 border border-slate-200"
          >
             {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
             {submitting ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-12 py-8 grid grid-cols-1 xl:grid-cols-12 gap-0 items-start">
         {/* Left Column: Configuration */}
         <div className="xl:col-span-8 space-y-4">
            {/* Unified Template Configuration Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
               {/* Header */}
               <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <LayoutTemplate size={18} />
                     </div>
                     <h3 className="text-sm font-bold text-slate-800">Template Creation</h3>
                  </div>
                  <div className="flex items-center gap-2">
                     {name && category && bodyText ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
                           <CheckCircle2 size={12} /> Ready to Submit
                        </span>
                     ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">In Progress</span>
                     )}
                  </div>
               </div>

               <div className="p-4 space-y-4">
                  {/* Row 1: Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Template Name</label>
                        <div className="relative">
                           <input
                              value={name}
                              onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                              maxLength={25}
                              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all"
                              placeholder="e.g. order_confirmation"
                           />
                           <div className="absolute right-2 top-1.5 text-slate-300" title="Alphanumeric and underscores only">
                              <Info size={12} />
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                         <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all bg-white"
                         >
                           <option value="UTILITY">Utility</option>
                           <option value="MARKETING">Marketing</option>
                           <option value="AUTHENTICATION">Authentication</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Language</label>
                         <select
                            value={language}
                            onChange={e => onLanguageChange(e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all bg-white"
                         >
                           <option value="en_US">English (en_US)</option>
                        </select>
                     </div>
                  </div>

                  <div className="h-px bg-slate-100 mx-[-1rem] my-1"></div>
                  <p className="text-sm text-slate-500 mb-3">
                     Add a header, body, and footer for your template. Cloud API hosted by Meta will review the template variables.
                  </p>

                     <div className="space-y-4">
                        <div className="space-y-3">
                           <label className="text-sm font-semibold text-slate-700 block">Header Content <span className="text-slate-400 font-normal ml-1">Optional</span></label>
                           
                           <div className="grid grid-cols-5 gap-3">
                              {[
                                 { id: 'NONE', label: 'None', icon: <X size={14} />, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
                                 { id: 'TEXT', label: 'Text', icon: <Type size={14} />, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
                                 { id: 'IMAGE', label: 'Image', icon: <ImageIconIcon size={14} />, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
                                 { id: 'VIDEO', label: 'Video', icon: <Video size={14} />, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                                 { id: 'DOCUMENT', label: 'Document', icon: <File size={14} />, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
                              ].map((t) => (
                                 <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                       setHeaderType(t.id);
                                       if (t.id !== "TEXT") setHeaderText("");
                                       if (!["IMAGE","VIDEO","DOCUMENT"].includes(t.id)) {
                                          setHeaderMediaHandle(""); setHeaderMediaUrl(null);
                                       }
                                    }}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                                       headerType === t.id 
                                          ? `${t.border} ${t.bg} ${t.color} shadow-sm font-bold scale-[1.02]` 
                                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                 >
                                    <span className={headerType === t.id ? t.color : t.color}>{t.icon}</span>
                                    <span className="text-[10px] uppercase tracking-wide">{t.label}</span>
                                 </button>
                              ))}
                           </div>
                        </div>

                         {headerType === "TEXT" && (
                             <input
                                value={headerText}
                                onChange={e => setHeaderText(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all"
                                placeholder="Enter text header..."
                                maxLength={60}
                             />
                         )}

                        {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                           <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 border-dashed">
                              <HeaderMediaUploader
                                 draftId={draftId} language={language} mediaType={headerType}
                                 handle={headerMediaHandle}
                                 onUploaded={h => setHeaderMediaHandle(h)}
                                 onPreview={url => setHeaderMediaUrl(url)}
                              />
                           </div>
                        )}
                     </div>

                   {/* Body with Toolbar */}
                  <div className="space-y-2">
                     <label className="text-sm font-semibold text-slate-700">Body</label>
                     <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all bg-white">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 px-2 py-1.5">
                           <button type="button" onClick={() => wrapSelection('*')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Bold">
                              <Bold size={16} />
                           </button>
                           <button type="button" onClick={() => wrapSelection('_')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Italic">
                              <Italic size={16} />
                           </button>
                           <div className="w-px h-4 bg-slate-300 mx-1"></div>
                           <button type="button" onClick={() => insertAtCursor(':)')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Emoji">
                              <Smile size={16} />
                           </button>
                           <button type="button" onClick={() => insertAtCursor('{{1}}')} className="flex items-center gap-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-medium rounded transition-colors" title="Add Variable">
                              <Code size={14} /> + Add variable
                           </button>
                        </div>
                        <textarea
                           ref={textareaRef}
                           value={bodyText}
                           onChange={e => setBodyText(e.target.value)}
                           rows={8}
                           className="w-full p-3 text-sm focus:outline-none resize-y min-h-[150px]"
                           placeholder="Enter the text for your message in the language that you've selected..."
                        />
                        <div className="bg-slate-50 px-3 py-1.5 text-xs text-slate-400 flex justify-between border-t border-slate-100">
                           <span>Markdown supported</span>
                           <span>{bodyText.length}/1024</span>
                        </div>
                     </div>
                     
                     {/* Inline Submission Error */}
                     {submissionError && (
                       <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-xs font-medium border border-red-100 animate-in fade-in slide-in-from-top-1">
                         <AlertCircle size={14} className="shrink-0" />
                         <span>{submissionError}</span>
                       </div>
                     )}

                     {/* Example Values (Moved here for better visibility) */}
                     {bodyText.includes("{{") && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                           <div className="flex items-center gap-2 mb-3">
                              <Info size={14} className="text-emerald-600" />
                              <h4 className="text-sm font-bold text-slate-700">Example Values</h4>
                           </div>
                           <p className="text-xs text-slate-500 mb-4">
                              Enter values for your variables to see them in the live preview.
                           </p>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {examples.map((ex, i) => {
                                 const placeholder = `{{${i + 1}}}`;
                                 if (!bodyText.includes(placeholder)) return null;
                                 return (
                                    <div key={i} className="flex items-center gap-2">
                                       <span className="shrink-0 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 min-w-[32px] text-center">
                                          {placeholder}
                                       </span>
                                       <input
                                          value={ex}
                                          onChange={e => {
                                             const c = [...examples]; c[i] = e.target.value; setExamples(c);
                                          }}
                                          className="w-full h-9 px-3 rounded border border-slate-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                                          placeholder={`Value for ${placeholder}`}
                                       />
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Footer */}
                  <div className="space-y-2">
                     <label className="text-sm font-semibold text-slate-700">Footer <span className="text-slate-400 font-normal">Optional</span></label>
                     <input
                        value={footerText}
                        onChange={e => setFooterText(e.target.value)}
                        className="w-full h-10 px-3 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-500 placeholder:text-slate-300"
                        placeholder="Add a short line of text to the bottom of your message..."
                     />
                  </div>

                  {/* Buttons */}
                  <div className="space-y-4 pt-2">
                     <div className="flex items-center justify-start gap-4">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                           Interactive Buttons <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-bold uppercase tracking-wider">Optional</span>
                        </label>
                         {buttons.length < 10 && (
                            <div className="relative">
                               <button 
                                  ref={addButtonRef}
                                  type="button" 
                                  onClick={() => setActiveMenu(activeMenu === 'ADD' ? null : 'ADD')} 
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all border border-slate-200"
                               >
                                  <Plus size={14} /> Add Button <ChevronDown size={12} className={`transition-transform ${activeMenu === 'ADD' ? 'rotate-180' : ''}`} />
                               </button>

                               {activeMenu === 'ADD' && (
                                  <PortalMenu anchorRef={addButtonRef} onClose={() => setActiveMenu(null)}>
                                     <button
                                        type="button"
                                        onClick={() => {
                                           setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
                                           setActiveMenu(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                     >
                                        <CornerUpLeft size={16} className="text-slate-400" />
                                        <span>Quick Reply</span>
                                     </button>
                                     <button
                                        type="button"
                                        disabled={buttons.filter(b => b.type === 'URL').length >= 2}
                                        onClick={() => {
                                           setButtons([...buttons, { type: 'URL', text: '', url: '' }]);
                                           setActiveMenu(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                                     >
                                        <ExternalLink size={16} className="text-slate-400 group-hover:text-emerald-500" />
                                        <div className="flex flex-col items-start leading-tight">
                                           <span>Visit Website</span>
                                           <span className="text-[9px] text-slate-400">2 buttons maximum</span>
                                        </div>
                                     </button>
                                     <button
                                        type="button"
                                        disabled={buttons.filter(b => b.type === 'PHONE_NUMBER').length >= 1}
                                        onClick={() => {
                                           setButtons([...buttons, { type: 'PHONE_NUMBER', text: '', phone_number: '' }]);
                                           setActiveMenu(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group border-t border-slate-50"
                                     >
                                        <Phone size={16} className="text-slate-400 group-hover:text-blue-500" />
                                        <div className="flex flex-col items-start leading-tight">
                                           <span>Call Phone Number</span>
                                           <span className="text-[9px] text-slate-400">1 button maximum</span>
                                        </div>
                                     </button>
                                  </PortalMenu>
                               )}
                            </div>
                         )}
                     </div>
                        <div className={`space-y-0 rounded-xl border border-slate-200 bg-slate-50/30 overflow-hidden ${buttons.length > 0 ? 'mt-3' : ''}`}>
                           {buttons.map((b, i) => {
                             const urlCount = buttons.filter(btn => btn.type === 'URL').length;
                             const phoneCount = buttons.filter(btn => btn.type === 'PHONE_NUMBER').length;
                             
                             return (
                                <div key={i} className="group relative transition-all">
                                   {i > 0 && <div className="h-px bg-slate-200/60 mx-4" />}
                                   <div className="p-3 flex gap-2 items-center hover:bg-white transition-colors">
                                      <div className="w-1/3 relative">
                                          <button
                                             ref={el => rowRefs.current[i] = el}
                                             type="button"
                                             onClick={() => setActiveMenu(activeMenu === i ? null : i)}
                                             className="w-full h-9 px-2 flex items-center justify-between rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-all text-left"
                                          >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                               <span className="shrink-0 text-slate-400">
                                                  {b.type === 'QUICK_REPLY' && <MessageSquare size={13} />}
                                                  {b.type === 'URL' && <ExternalLink size={13} />}
                                                  {b.type === 'PHONE_NUMBER' && <Phone size={13} />}
                                               </span>
                                               <span className="text-[11px] font-bold uppercase tracking-tight text-slate-700 truncate">
                                                  {b.type === 'QUICK_REPLY' ? 'Quick Reply' : b.type === 'URL' ? 'Visit Website' : 'Call Phone Number'}
                                               </span>
                                            </div>
                                            <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform ${activeMenu === i ? 'rotate-180' : ''}`} />
                                         </button>

                                         {activeMenu === i && (
                                            <PortalMenu anchorRef={{ current: rowRefs.current[i] }} onClose={() => setActiveMenu(null)}>
                                               <button
                                                  type="button"
                                                  onClick={() => {
                                                     const c = [...buttons]; c[i] = { ...c[i], type: 'QUICK_REPLY', url: '', phone_number: '' };
                                                     setButtons(c); setActiveMenu(null);
                                                  }}
                                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-colors ${b.type === 'QUICK_REPLY' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                               >
                                                  <CornerUpLeft size={16} className={b.type === 'QUICK_REPLY' ? 'text-emerald-500' : 'text-slate-400'} />
                                                  <span>Quick Reply</span>
                                               </button>
                                               <button
                                                  type="button"
                                                  disabled={urlCount >= 2 && b.type !== 'URL'}
                                                  onClick={() => {
                                                     const c = [...buttons]; c[i] = { ...c[i], type: 'URL', url: '', phone_number: '' };
                                                     setButtons(c); setActiveMenu(null);
                                                  }}
                                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed group ${b.type === 'URL' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                               >
                                                  <ExternalLink size={16} className={b.type === 'URL' ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-500'} />
                                                  <div className="flex flex-col items-start leading-tight text-left">
                                                     <span>Visit Website</span>
                                                     <span className="text-[9px] text-slate-400">2 buttons maximum</span>
                                                  </div>
                                               </button>
                                               <button
                                                  type="button"
                                                  disabled={phoneCount >= 1 && b.type !== 'PHONE_NUMBER'}
                                                  onClick={() => {
                                                     const c = [...buttons]; c[i] = { ...c[i], type: 'PHONE_NUMBER', url: '', phone_number: '' };
                                                     setButtons(c); setActiveMenu(null);
                                                  }}
                                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium border-t border-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group ${b.type === 'PHONE_NUMBER' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                               >
                                                  <Phone size={16} className={b.type === 'PHONE_NUMBER' ? 'text-emerald-500' : 'text-slate-400 group-hover:text-blue-500'} />
                                                  <div className="flex flex-col items-start leading-tight text-left">
                                                     <span>Call Phone Number</span>
                                                     <span className="text-[9px] text-slate-400">1 button maximum</span>
                                                  </div>
                                               </button>
                                            </PortalMenu>
                                         )}
                                      </div>
                                   <div className="flex-1">
                                       <input
                                          value={b.text}
                                          onChange={e => {
                                             const c = [...buttons]; c[i].text = e.target.value; setButtons(c);
                                          }}
                                          className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                          placeholder="Button Label"
                                       />
                                   </div>
                                      {b.type !== 'QUICK_REPLY' && (
                                         <div className="flex-[1.5]">
                                             <input
                                                value={b.type === 'URL' ? b.url : b.phone_number}
                                                onChange={e => {
                                                   const c = [...buttons];
                                                   if(b.type === 'URL') c[i].url = e.target.value;
                                                   else c[i].phone_number = e.target.value;
                                                   setButtons(c);
                                                }}
                                                className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                                                placeholder={b.type === 'URL' ? "https://..." : "+1..."}
                                             />
                                         </div>
                                      )}
                                      <button 
                                         type="button" 
                                         onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))} 
                                         className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                         title="Remove Button"
                                      >
                                         <Trash2 size={14} />
                                      </button>
                                    </div>
                                 </div>
                              );
                          })}
                       </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="xl:col-span-4 xl:sticky xl:top-[88px] h-fit space-y-4 pl-12">
            <WhatsAppTemplatePreview draft={liveDraft} />
         </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={!draftId ? "Discard Changes?" : "Delete Draft?"}
        description={!draftId 
          ? "Are you sure you want to discard these changes? You will lose all unsaved progress." 
          : "Are you sure you want to delete this draft? This action cannot be undone."
        }
        confirmText={!draftId ? "Discard" : "Delete"}
      />

      {/* Submission Success Modal */}
      {/* Submission Success Modal */}
      {showSubmissionSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6 text-center transform animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-50/50">
              <CheckCircle2 size={32} />
            </div>
            
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Submitted for Review</h3>
            
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Your template has been sent to Meta. Reviews typically take <span className="font-medium text-slate-700">24 hours</span>, but can take up to 72 hours for complex templates.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSubmissionSuccess(false);
                  // Force a hard navigation to ensure data refetch if needed, or just standard nav
                  window.location.href = '/app/template-builder/pending'; 
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all shadow-sm active:scale-[0.98]"
              >
                View Pending Templates
              </button>
              
              <button
                onClick={() => setShowSubmissionSuccess(false)}
                className="w-full bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium py-2.5 px-4 rounded-lg border border-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
