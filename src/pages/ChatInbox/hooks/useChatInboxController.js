// 📄 Suggested path: src/pages/ChatInbox/hooks/useChatInboxController.js
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useInboxSignalR from "./useInboxSignalR";
import axiosClient from "../api/chatInboxApi";
import {
  inferIsInboundFromAny,
  mapHubMessageToChat,
} from "../utils/messageMapping";
import { toIsoFromDatetimeLocal } from "../utils/dateUtils";
import { formatDayLabel } from "../utils/formatters";
import { parseConversationStatus } from "../utils/parseConversationStatus";

const normalizeConversationMode = value => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "agent") return "agent";
  if (raw === "auto" || raw === "automation") return "automation";
  return "automation";
};

const normalizePagedResult = data => {
  if (Array.isArray(data)) {
    return { items: data, nextCursor: null, hasMore: false };
  }

  const items = data?.items ?? data?.Items ?? [];
  const nextCursor = data?.nextCursor ?? data?.NextCursor ?? null;
  const hasMore =
    data?.hasMore ??
    data?.HasMore ??
    (nextCursor !== null && nextCursor !== "");

  return {
    items: Array.isArray(items) ? items : [],
    nextCursor: nextCursor || null,
    hasMore: Boolean(hasMore),
  };
};

const DEFAULT_CONVERSATIONS_PAGE_SIZE = 50;
const DEFAULT_MESSAGES_PAGE_SIZE = 50;

const CHAT_INBOX_MEDIA_MAX_BYTES = 10 * 1024 * 1024; // 10MB (must match backend limit)
const CHAT_INBOX_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/3gpp",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
]);

const TEMPLATE_HEADER_NONE = "none";

const inferChatInboxMediaType = mime => {
  const base = String(mime || "")
    .split(";")[0]
    .toLowerCase()
    .trim();
  if (base === "application/pdf") return "document";
  if (base.startsWith("video/")) return "video";
  if (base.startsWith("audio/")) return "audio";
  return "image";
};

const normalizeRecipientNumber = value => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (/^\d{10}$/.test(digits)) return `91${digits}`;
  return digits;
};

const normalizeTemplateHeaderKind = template => {
  const raw = String(template?.headerKind || template?.HeaderKind || "")
    .trim()
    .toLowerCase();
  if (raw === "image" || raw === "video" || raw === "document") return raw;
  return TEMPLATE_HEADER_NONE;
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

const hasDynamicUrlButton = buttons =>
  Array.isArray(buttons) &&
  buttons.some(button => {
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
  });

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

const toTemplateParamArray = value => {
  if (Array.isArray(value)) {
    return value.map(v => (v == null ? "" : String(v)));
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .sort((a, b) => {
        const ka = Number(a[0]);
        const kb = Number(b[0]);
        const aOk = Number.isFinite(ka);
        const bOk = Number.isFinite(kb);
        if (aOk && bOk) return ka - kb;
        if (aOk) return -1;
        if (bOk) return 1;
        return String(a[0]).localeCompare(String(b[0]));
      })
      .map(([, v]) => (v == null ? "" : String(v)));
  }

  return [];
};

const resolveTemplateParameters = (templateMeta, placeholderIndexes) => {
  const fromMeta =
    templateMeta?.parameters ??
    templateMeta?.templateParameters ??
    templateMeta?.templateParameterValues ??
    templateMeta?.bodyParameters ??
    templateMeta?.bodyParams ??
    templateMeta?.variables ??
    templateMeta?.parameterMap ??
    null;

  const values = toTemplateParamArray(fromMeta);
  if (placeholderIndexes.length === 0) return values;

  return placeholderIndexes.map((idx, pos) => {
    const oneBased = values[idx - 1];
    if (oneBased !== undefined) return oneBased;
    const byPos = values[pos];
    return byPos !== undefined ? byPos : "";
  });
};

const renderTemplateBodyPreview = (body, parameters) => {
  let resolved = String(body || "");
  if (!resolved) return "";
  const vars = Array.isArray(parameters) ? parameters : [];
  for (let i = 0; i < vars.length; i += 1) {
    const token = `{{${i + 1}}}`;
    resolved = resolved.split(token).join(String(vars[i] ?? ""));
  }
  return resolved.trim();
};

const normalizeTemplateUrlButtonParams = templateMeta => {
  const raw =
    templateMeta?.urlButtonParams ??
    templateMeta?.dynamicUrlParams ??
    templateMeta?.urlParameters ??
    [];

  return toTemplateParamArray(raw)
    .map(v => v.trim())
    .filter(Boolean);
};

const toFiniteNumberOrNull = value => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toLatitudeOrNull = value => {
  const n = toFiniteNumberOrNull(value);
  return n !== null && n >= -90 && n <= 90 ? n : null;
};

const toLongitudeOrNull = value => {
  const n = toFiniteNumberOrNull(value);
  return n !== null && n >= -180 && n <= 180 ? n : null;
};

const buildChatInboxMediaContentUrl = mediaId =>
  `/chat-inbox/media/${encodeURIComponent(String(mediaId || "").trim())}/content`;

const CHAT_INBOX_ACTIVE_TAB_KEY = businessId =>
  `chatInbox:activeTab:${businessId || "global"}`;

const VALID_CHAT_INBOX_TABS = new Set([
  "live",
  "unassigned",
  "my",
  "closed",
  "history",
]);

const readStoredActiveTab = () => {
  try {
    const businessId = localStorage.getItem("businessId");
    const raw =
      localStorage.getItem(CHAT_INBOX_ACTIVE_TAB_KEY(businessId)) ||
      localStorage.getItem(CHAT_INBOX_ACTIVE_TAB_KEY("global"));

    const tab = String(raw || "").trim();
    return VALID_CHAT_INBOX_TABS.has(tab) ? tab : null;
  } catch {
    return null;
  }
};

export function useChatInboxController() {
  const navigate = useNavigate();

  // 🔌 SignalR connection
  const { connection, isConnected } = useInboxSignalR();

  // 🔹 Filters & selection
  const [activeTab, setActiveTab] = useState(
    () => readStoredActiveTab() || "live"
  );
  const [selectedNumberId, setSelectedNumberId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    try {
      const businessId = localStorage.getItem("businessId");
      localStorage.setItem(CHAT_INBOX_ACTIVE_TAB_KEY("global"), activeTab);
      if (businessId) {
        localStorage.setItem(CHAT_INBOX_ACTIVE_TAB_KEY(businessId), activeTab);
      }
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  // 🔹 Data from backend
  const [allConversations, setAllConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationsNextCursor, setConversationsNextCursor] = useState(null);
  const [conversationsHasMore, setConversationsHasMore] = useState(false);
  const [isConversationsLoadingMore, setIsConversationsLoadingMore] =
    useState(false);

  // 🔹 Selected conversation & message input
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [newMessage, setNewMessage] = useState("");

  // 🔹 Messages for selected conversation
  const [messages, setMessages] = useState([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [messagesNextCursor, setMessagesNextCursor] = useState(null);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [isMessagesLoadingOlder, setIsMessagesLoadingOlder] = useState(false);

  // 🔹 Sending & assignment state
  const [isSending, setIsSending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [agents, setAgents] = useState([]);
  const [isAgentsLoading, setIsAgentsLoading] = useState(false);

  // 🔹 CRM summary for right panel
  const [contactSummary, setContactSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState(null);
  const [isContextLoading, setIsContextLoading] = useState(false);

  // 🔹 Quick CRM actions (notes + reminders)
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [reminderDescription, setReminderDescription] = useState("");
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // ✅ Edit state: Notes
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);

  // ✅ Edit state: Reminder
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [editReminderTitle, setEditReminderTitle] = useState("");
  const [editReminderDueAt, setEditReminderDueAt] = useState("");
  const [editReminderDescription, setEditReminderDescription] = useState("");
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);

  // ✅ Confirm dialog
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: null, // "note" | "reminder"
    id: null,
    title: "",
  });
  const [confirmBusy, setConfirmBusy] = useState(false);

  // 🔹 Tag modal state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // ✅ tag remove state (simple, MVP)
  const [removingTagId, setRemovingTagId] = useState(null);

  // Right panel toggles
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // 🔹 Persist 'showDetails' (Expand/Collapse right panel)
  const [showDetails, setShowDetails] = useState(() => {
    try {
      const stored = localStorage.getItem("chatInbox:showDetails");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("chatInbox:showDetails", String(showDetails));
    } catch {
      // ignore
    }
  }, [showDetails]);

  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [showMiniTimeline, setShowMiniTimeline] = useState(true);

  // 🔽 Auto-scroll anchor for chat messages
  const messagesEndRef = useRef(null);
  const lastMessagesMutationRef = useRef(null);
  const clearedUnreadByConversationRef = useRef(new Map());
  const clearedUnreadByContactRef = useRef(new Map());
  const messagesRequestAbortRef = useRef(null);
  const messagesRequestIdRef = useRef(0);
  const messagesLoadTimerRef = useRef(null);
  const markReadTimerRef = useRef(null);
  const mediaObjectUrlByIdRef = useRef(new Map());
  const mediaObjectUrlFetchRef = useRef(new Map());
  const mediaBlobFetchRef = useRef(new Map());
  const localObjectUrlByTempIdRef = useRef(new Map());
  const [mediaObjectUrlById, setMediaObjectUrlById] = useState({});
  const [pdfPreviewById, setPdfPreviewById] = useState({});
  const [mediaViewer, setMediaViewer] = useState({
    open: false,
    type: null,
    mediaId: null,
    url: null,
    fileName: null,
    items: null,
    index: 0,
    loading: false,
  });
  const messagesRef = useRef(messages);
  const mediaViewerRef = useRef(mediaViewer);
  const pdfPreviewFetchRef = useRef(new Map());
  const pdfJsImportRef = useRef(null);
  const pdfJsModuleRef = useRef(null);

  // Keep frequently-read paging state in refs so effects/callbacks stay stable
  const selectedConversationIdRef = useRef(selectedConversationId);
  const conversationsNextCursorRef = useRef(conversationsNextCursor);
  const conversationsHasMoreRef = useRef(conversationsHasMore);
  const isConversationsLoadingMoreRef = useRef(isConversationsLoadingMore);
  const messagesNextCursorRef = useRef(messagesNextCursor);
  const messagesHasMoreRef = useRef(messagesHasMore);
  const isMessagesLoadingOlderRef = useRef(isMessagesLoadingOlder);

  useEffect(() => {
    return () => {
      for (const url of mediaObjectUrlByIdRef.current.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      for (const url of localObjectUrlByTempIdRef.current.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      mediaObjectUrlByIdRef.current.clear();
      mediaObjectUrlFetchRef.current.clear();
      mediaBlobFetchRef.current.clear();
      localObjectUrlByTempIdRef.current.clear();
      pdfPreviewFetchRef.current.clear();
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    mediaViewerRef.current = mediaViewer;
  }, [mediaViewer]);

  const upsertMediaObjectUrl = useCallback((mediaId, objectUrl) => {
    const key = String(mediaId || "").trim();
    if (!key || !objectUrl) return;

    const existing = mediaObjectUrlByIdRef.current.get(key);
    if (existing && existing !== objectUrl) {
      try {
        URL.revokeObjectURL(existing);
      } catch {}
    }

    mediaObjectUrlByIdRef.current.set(key, objectUrl);
    setMediaObjectUrlById(prev => ({ ...prev, [key]: objectUrl }));
  }, []);

  const fetchMediaBlob = useCallback(async (mediaId, opts = {}) => {
    const key = String(mediaId || "").trim();
    if (!key) return null;

    const inflight = mediaBlobFetchRef.current.get(key);
    if (inflight) return inflight;

    const silent = Boolean(opts?.silent);

    const promise = axiosClient
      .get(buildChatInboxMediaContentUrl(key), {
        responseType: "blob",
        __silentToast: true,
      })
      .then(res => res?.data || null)
      .catch(error => {
        console.error("Failed to fetch media content:", error);
        if (!silent) {
          toast.error(
            error.response?.data?.message ||
              "Failed to load media preview. Please retry."
          );
        }
        return null;
      })
      .finally(() => {
        mediaBlobFetchRef.current.delete(key);
      });

    mediaBlobFetchRef.current.set(key, promise);
    return promise;
  }, []);

  const fetchMediaObjectUrl = useCallback(
    async (mediaId, opts = {}) => {
      const key = String(mediaId || "").trim();
      if (!key) return null;

      const cached = mediaObjectUrlByIdRef.current.get(key);
      if (cached) return cached;

      const inflight = mediaObjectUrlFetchRef.current.get(key);
      if (inflight) return inflight;

      const promise = (async () => {
        const blob = await fetchMediaBlob(key, opts);
        if (!blob) return null;

        if (
          typeof URL === "undefined" ||
          typeof URL.createObjectURL !== "function"
        ) {
          return null;
        }

        const url = URL.createObjectURL(blob);
        upsertMediaObjectUrl(key, url);
        return url;
      })()
        .catch(error => {
          console.error("Failed to fetch media content:", error);
          toast.error(
            error.response?.data?.message ||
              "Failed to load media preview. Please retry."
          );
          return null;
        })
        .finally(() => {
          mediaObjectUrlFetchRef.current.delete(key);
        });

      mediaObjectUrlFetchRef.current.set(key, promise);
      return promise;
    },
    [fetchMediaBlob, upsertMediaObjectUrl]
  );

  const buildImageViewerItems = useCallback(() => {
    const list = Array.isArray(messagesRef.current) ? messagesRef.current : [];
    const items = list
      .map(m => {
        const mt = String(m?.mediaType ?? m?.MediaType ?? "")
          .trim()
          .toLowerCase();
        if (mt !== "image") return null;

        const mediaId = String(m?.mediaId ?? m?.MediaId ?? "").trim();
        if (!mediaId) return null;

        const fileName = String(m?.fileName ?? m?.FileName ?? "").trim() || null;
        const sentAt = m?.sentAt ?? m?.sentAtUtc ?? m?.createdAt ?? null;

        return { mediaId, fileName, sentAt };
      })
      .filter(Boolean);

    items.sort((a, b) => {
      const ta = a?.sentAt ? Date.parse(a.sentAt) : 0;
      const tb = b?.sentAt ? Date.parse(b.sentAt) : 0;
      return ta - tb;
    });

    // De-dupe by mediaId (keep first occurrence)
    const seen = new Set();
    return items.filter(i => {
      if (!i?.mediaId) return false;
      if (seen.has(i.mediaId)) return false;
      seen.add(i.mediaId);
      return true;
    });
  }, []);

  const handleOpenMedia = useCallback(
    async msg => {
      const mediaId = msg?.mediaId ?? msg?.MediaId ?? null;
      const mt = String(msg?.mediaType ?? msg?.MediaType ?? "")
        .trim()
        .toLowerCase();
      if (!mediaId || (mt !== "image" && mt !== "document" && mt !== "video"))
        return;

      const url =
        msg?.localPreviewUrl ||
        (await fetchMediaObjectUrl(String(mediaId), { silent: false }));
      if (!url) return;

      const name = String(msg?.fileName ?? msg?.FileName ?? "").trim();

      if (mt === "image") {
        const items = buildImageViewerItems();
        const id = String(mediaId).trim();
        let index = items.findIndex(i => i.mediaId === id);
        if (index < 0) {
          items.push({ mediaId: id, fileName: name || null, sentAt: null });
          index = items.length - 1;
        }

        // Prefetch neighbors quietly (best-effort)
        const prev = items[index - 1]?.mediaId;
        const next = items[index + 1]?.mediaId;
        if (prev) fetchMediaObjectUrl(prev, { silent: true });
        if (next) fetchMediaObjectUrl(next, { silent: true });

        setMediaViewer({
          open: true,
          type: "image",
          mediaId: id,
          url,
          fileName: name || null,
          items,
          index,
          loading: false,
        });
        return;
      }

      if (mt === "video") {
        const id = String(mediaId).trim();
        setMediaViewer({
          open: true,
          type: "video",
          mediaId: id,
          url,
          fileName: name || null,
          items: null,
          index: 0,
          loading: false,
        });
        return;
      }

      // Documents: keep a simple new-tab open/download for now.
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noreferrer noopener";
      if (name) a.download = name;
      a.click();
    },
    [buildImageViewerItems, fetchMediaObjectUrl]
  );

  const handleCloseMediaViewer = useCallback(() => {
    setMediaViewer({
      open: false,
      type: null,
      mediaId: null,
      url: null,
      fileName: null,
      items: null,
      index: 0,
      loading: false,
    });
  }, []);

  const handleMediaViewerSelectIndex = useCallback(
    async nextIndex => {
      const v = mediaViewerRef.current;
      if (!v?.open || v.type !== "image") return;
      const items = Array.isArray(v.items) ? v.items : [];
      if (items.length === 0) return;

      const idx = Number(nextIndex);
      if (!Number.isFinite(idx) || idx < 0 || idx >= items.length) return;
      if (idx === v.index && v.url) return;

      const target = items[idx];
      if (!target?.mediaId) return;

      setMediaViewer(prev => ({ ...prev, loading: true }));
      const url = await fetchMediaObjectUrl(target.mediaId, { silent: false });
      if (!url) {
        setMediaViewer(prev => ({ ...prev, loading: false }));
        return;
      }

      const prevId = items[idx - 1]?.mediaId;
      const nextId = items[idx + 1]?.mediaId;
      if (prevId) fetchMediaObjectUrl(prevId, { silent: true });
      if (nextId) fetchMediaObjectUrl(nextId, { silent: true });

      setMediaViewer(prev => ({
        ...prev,
        open: true,
        type: "image",
        mediaId: target.mediaId,
        url,
        fileName: target.fileName || null,
        items,
        index: idx,
        loading: false,
      }));
    },
    [fetchMediaObjectUrl]
  );

  const handleMediaViewerPrev = useCallback(() => {
    const v = mediaViewerRef.current;
    if (!v?.open || v.type !== "image") return;
    if (!Array.isArray(v.items) || v.items.length <= 1) return;
    if (v.index <= 0) return;
    handleMediaViewerSelectIndex(v.index - 1);
  }, [handleMediaViewerSelectIndex]);

  const handleMediaViewerNext = useCallback(() => {
    const v = mediaViewerRef.current;
    if (!v?.open || v.type !== "image") return;
    if (!Array.isArray(v.items) || v.items.length <= 1) return;
    if (v.index >= v.items.length - 1) return;
    handleMediaViewerSelectIndex(v.index + 1);
  }, [handleMediaViewerSelectIndex]);

  const ensureImagePreview = useCallback(
    mediaId => {
      const key = String(mediaId || "").trim();
      if (!key) return;
      fetchMediaObjectUrl(key, { silent: true });
    },
    [fetchMediaObjectUrl]
  );

  const ensurePdfPreview = useCallback(
    async (mediaId, opts = {}) => {
      const key = String(mediaId || "").trim();
      if (!key) return;
      if (pdfPreviewById[key]) return;
      if (pdfPreviewFetchRef.current.has(key)) return;

      const promise = (async () => {
        const localPreviewUrl = String(opts?.localPreviewUrl || "").trim();
        const skipRemote = Boolean(opts?.skipRemote);

        const blob = await (async () => {
          if (localPreviewUrl) {
            try {
              const res = await fetch(localPreviewUrl);
              if (res?.ok) return await res.blob();
            } catch {
              // ignore local preview fetch errors
            }
          }

          if (skipRemote) return null;

          return await fetchMediaBlob(key, { silent: true });
        })();
        if (!blob) return;

        // In test/SSR environments, canvas may not exist; skip thumbnail generation.
        if (
          typeof document === "undefined" ||
          typeof URL === "undefined" ||
          typeof blob.arrayBuffer !== "function"
        ) {
          setPdfPreviewById(prev => ({
            ...prev,
            [key]: {
              pages: null,
              sizeBytes: Number(blob.size) || null,
              thumbDataUrl: null,
            },
          }));
          return;
        }

        try {
          let pdfjs = pdfJsModuleRef.current;
          if (!pdfjs) {
            if (!pdfJsImportRef.current) {
              pdfJsImportRef.current = import("pdfjs-dist/legacy/build/pdf.mjs");
            }
            pdfjs = await pdfJsImportRef.current;
            pdfJsModuleRef.current = pdfjs;
          }

          // Fix runtime error: configure pdf.js worker URL for CRA/Webpack builds.
          // (Even with disableWorker=true, some builds still try to initialize a PDFWorker.)
          try {
            const gwo = pdfjs?.GlobalWorkerOptions;
            if (gwo && !gwo.workerSrc) {
              const publicUrl =
                typeof process !== "undefined" &&
                process?.env &&
                typeof process.env.PUBLIC_URL === "string"
                  ? process.env.PUBLIC_URL
                  : "";

              // This file is copied from node_modules by `node scripts/copy-pdf-worker.js`
              // (hooked up via `postinstall`), so the dev server/build can serve it reliably.
              gwo.workerSrc = `${publicUrl}/pdf.worker.min.mjs`;
            }
          } catch {
            // If import.meta.url isn't supported by the bundler, we still try to proceed with disableWorker below.
          }

          const buffer = await blob.arrayBuffer();
          const doc = await pdfjs.getDocument({
            data: buffer,
            disableWorker: true,
          }).promise;

          const pages = Number(doc?.numPages) || null;

          let thumbDataUrl = null;
          try {
            const page = await doc.getPage(1);
            const viewport = page.getViewport({ scale: 0.35 });

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext?.("2d");
            if (ctx) {
              canvas.width = Math.max(1, Math.floor(viewport.width));
              canvas.height = Math.max(1, Math.floor(viewport.height));

              await page.render({ canvasContext: ctx, viewport }).promise;
              thumbDataUrl = canvas.toDataURL("image/png");
              page.cleanup?.();
            }
          } catch {
            thumbDataUrl = null;
          } finally {
            try {
              await doc.destroy?.();
            } catch {}
          }

          setPdfPreviewById(prev => ({
            ...prev,
            [key]: {
              pages,
              sizeBytes: Number(blob.size) || null,
              thumbDataUrl,
            },
          }));
        } catch (error) {
          console.error("Failed to generate PDF preview:", error);
          setPdfPreviewById(prev => ({
            ...prev,
            [key]: {
              pages: null,
              sizeBytes: Number(blob.size) || null,
              thumbDataUrl: null,
            },
          }));
        }
      })().finally(() => {
        pdfPreviewFetchRef.current.delete(key);
      });

      pdfPreviewFetchRef.current.set(key, promise);
      await promise;
    },
    [fetchMediaBlob, pdfPreviewById]
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);
  useEffect(() => {
    conversationsNextCursorRef.current = conversationsNextCursor;
  }, [conversationsNextCursor]);
  useEffect(() => {
    conversationsHasMoreRef.current = conversationsHasMore;
  }, [conversationsHasMore]);
  useEffect(() => {
    isConversationsLoadingMoreRef.current = isConversationsLoadingMore;
  }, [isConversationsLoadingMore]);
  useEffect(() => {
    messagesNextCursorRef.current = messagesNextCursor;
  }, [messagesNextCursor]);
  useEffect(() => {
    messagesHasMoreRef.current = messagesHasMore;
  }, [messagesHasMore]);
  useEffect(() => {
    isMessagesLoadingOlderRef.current = isMessagesLoadingOlder;
  }, [isMessagesLoadingOlder]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }
  }, []);

  const currentUserId = useMemo(() => localStorage.getItem("userId"), []);

  // 🧮 Selected conversation
  const selectedConversation = useMemo(
    () => allConversations.find(c => c.id === selectedConversationId) || null,
    [allConversations, selectedConversationId]
  );

  // ✅ Prevent stale selectedConversation inside SignalR handlers
  const selectedConversationRef = useRef(null);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // ✅ Keep latest conversations without making message-loading re-run
  const conversationsRef = useRef([]);
  useEffect(() => {
    conversationsRef.current = allConversations;
  }, [allConversations]);

  const getClearedUnreadEntry = useCallback(conversation => {
    if (!conversation) return null;
    const byConversationId = conversation.id
      ? clearedUnreadByConversationRef.current.get(conversation.id)
      : null;
    if (byConversationId) return byConversationId;
    if (!conversation.contactId) return null;
    return (
      clearedUnreadByContactRef.current.get(conversation.contactId) || null
    );
  }, []);

  const getClearedUnreadEntryByContactId = useCallback(contactId => {
    if (!contactId) return null;
    return clearedUnreadByContactRef.current.get(contactId) || null;
  }, []);

  const setLocalUnreadOverride = useCallback((conversation, nextUnread) => {
    if (!conversation) return;
    const entry = {
      localUnread: Math.max(0, Number(nextUnread) || 0),
      updatedAt: Date.now(),
    };
    if (conversation.id) {
      clearedUnreadByConversationRef.current.set(conversation.id, entry);
    }
    if (conversation.contactId) {
      clearedUnreadByContactRef.current.set(conversation.contactId, entry);
    }
  }, []);

  const getLocalUnreadOverride = useCallback(
    conversation => {
      const entry = getClearedUnreadEntry(conversation);
      if (!entry) return null;
      if (typeof entry.localUnread !== "number") return null;
      return entry.localUnread;
    },
    [getClearedUnreadEntry]
  );

  const markConversationUnreadCleared = useCallback(
    conversation => {
      if (!conversation) return;
      setLocalUnreadOverride(conversation, 0);
    },
    [setLocalUnreadOverride]
  );

  const selectedContactId = useMemo(
    () => selectedConversation?.contactId || null,
    [selectedConversation]
  );

  // 🧮 24h window + status flags
  const isWithin24h = selectedConversation?.within24h ?? false;
  const selectedConversationStatus =
    parseConversationStatus(selectedConversation?.status) ?? "Open";
  const isConversationClosed = selectedConversationStatus === "Closed";

  // 🧮 Assignment flags for header
  const headerIsAssigned = !!selectedConversation?.assignedToUserId;
  const headerIsAssignedToMe =
    !!selectedConversation?.isAssignedToMe ||
    (!!selectedConversation?.assignedToUserId &&
      currentUserId &&
      selectedConversation.assignedToUserId === currentUserId);

  const headerAssignedName = headerIsAssignedToMe
    ? "You"
    : selectedConversation?.assignedToUserName || "Agent";

  // ✅ Reset edit state when switching contact
  useEffect(() => {
    setEditingNoteId(null);
    setEditNoteContent("");
    setEditingReminderId(null);
    setEditReminderTitle("");
    setEditReminderDueAt("");
    setEditReminderDescription("");
  }, [selectedContactId]);

  // 🧮 Filter + sort conversations
  const filteredConversations = useMemo(() => {
    let list = [...allConversations];
    const tabKey = activeTab === "history" ? "older" : activeTab;

    if (selectedNumberId !== "all") {
      list = list.filter(c => c.numberId === selectedNumberId);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        c =>
          c.contactName?.toLowerCase().includes(q) ||
          c.contactPhone?.toLowerCase().includes(q) ||
          c.lastMessagePreview?.toLowerCase().includes(q)
      );
    }

    if (tabKey === "closed") {
      list = list.filter(c => parseConversationStatus(c.status) === "Closed");
    } else {
      list = list.filter(c => parseConversationStatus(c.status) !== "Closed");
    }

    if (tabKey === "live") {
      list = list.filter(c => c.within24h);
    } else if (tabKey === "older") {
      list = list.filter(c => !c.within24h);
    } else if (tabKey === "unassigned") {
      list = list.filter(c => !c.assignedToUserId);
    } else if (tabKey === "my") {
      if (currentUserId) {
        list = list.filter(c => c.assignedToUserId === currentUserId);
      }
    }

    // 🔽 Sort: unread first, then most recent lastMessageAt
    list.sort((a, b) => {
      const aUnread = a.unreadCount > 0;
      const bUnread = b.unreadCount > 0;

      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

      return bTime - aTime;
    });

    return list;
  }, [
    allConversations,
    activeTab,
    selectedNumberId,
    searchTerm,
    currentUserId,
  ]);

  // 🛰 Load conversations (supports "silent" refresh)
  const fetchConversationsPage = useCallback(
    async (options = {}) => {
      const {
        reset = false,
        append = false,
        limit = DEFAULT_CONVERSATIONS_PAGE_SIZE,
      } = options;

      if (append) {
        if (!conversationsHasMoreRef.current) return;
        if (!conversationsNextCursorRef.current) return;
        if (isConversationsLoadingMoreRef.current) return;
      }

      try {
        if (reset) {
          setIsLoading(true);
          setConversationsNextCursor(null);
          setConversationsHasMore(false);
        }
        if (append) setIsConversationsLoadingMore(true);

        const businessId = localStorage.getItem("businessId");
        if (!businessId) {
          toast.error(
            "Missing business context. Please login again to load inbox."
          );
          return;
        }

        const params = {
          businessId,
          tab: activeTab === "history" ? "older" : activeTab,
          numberId:
            selectedNumberId && selectedNumberId !== "all"
              ? selectedNumberId
              : undefined,
          search: searchTerm || undefined,
          limit,
          paged: true,
          cursor: append ? conversationsNextCursorRef.current : undefined,
        };

        const res = await axiosClient.get("/chat-inbox/conversations", {
          params,
        });

        const { items, nextCursor, hasMore } = normalizePagedResult(res.data);

        const selectedId = selectedConversationIdRef.current;
        const mapped = items.map(item => {
          const isSelected = selectedId && item.id === selectedId;
          const localUnread = getLocalUnreadOverride(item);
          return {
            id: item.id,
            contactId: item.contactId,
            contactName: item.contactName,
            contactPhone: item.contactPhone,
            lastMessagePreview: item.lastMessagePreview,
            lastMessageAt: item.lastMessageAt,

            unreadCount: isSelected
              ? 0
              : (localUnread ?? item.unreadCount ?? item.UnreadCount) || 0,
            status: parseConversationStatus(item.status) ?? "Open",
            numberId: item.numberId,
            numberLabel: item.numberLabel,
            within24h: !!item.within24h,
            assignedToUserId: item.assignedToUserId || null,
            assignedToUserName: item.assignedToUserName || null,
            isAssignedToMe: !!item.isAssignedToMe,
            sourceType: item.sourceType || "WhatsApp",
            sourceName: item.sourceName || "WhatsApp",
            mode: normalizeConversationMode(item.mode ?? item.Mode),
            firstSeenAt: item.firstSeenAt,
            lastInboundAt: item.lastInboundAt,
            lastOutboundAt: item.lastOutboundAt,
          };
        });

        const keyOf = c => String(c?.id ?? c?.contactId ?? c?.contactPhone);

        setAllConversations(prev => {
          if (reset) return mapped;
          if (!append) return prev;

          const byKey = new Map(prev.map(c => [keyOf(c), c]));
          const orderedKeys = prev.map(keyOf);

          mapped.forEach(nc => {
            const k = keyOf(nc);
            if (!k) return;
            if (!byKey.has(k)) orderedKeys.push(k);
            const existing = byKey.get(k);
            byKey.set(k, existing ? { ...existing, ...nc } : nc);
          });

          return orderedKeys.map(k => byKey.get(k)).filter(Boolean);
        });

        setConversationsNextCursor(nextCursor);
        setConversationsHasMore(hasMore);

        if (!selectedConversationIdRef.current && mapped.length > 0) {
          setSelectedConversationId(mapped[0].id);
        }
      } catch (error) {
        console.error("Failed to load inbox conversations:", error);
        toast.error(
          error.response?.data?.message || "Failed to load inbox conversations."
        );
      } finally {
        if (reset) setIsLoading(false);
        if (append) setIsConversationsLoadingMore(false);
      }
    },
    [activeTab, selectedNumberId, searchTerm, getLocalUnreadOverride]
  );

  const fetchConversations = useCallback(
    async (options = {}) => {
      const { limit, silent } = options;

      if (!silent) {
        return fetchConversationsPage({
          reset: true,
          limit: limit ?? DEFAULT_CONVERSATIONS_PAGE_SIZE,
        });
      }

      try {
        const businessId = localStorage.getItem("businessId");
        if (!businessId) {
          toast.error(
            "❌ Missing business context. Please login again to load inbox."
          );
          return;
        }

        const params = {
          businessId,
          tab: activeTab === "history" ? "older" : activeTab,
          numberId:
            selectedNumberId && selectedNumberId !== "all"
              ? selectedNumberId
              : undefined,
          search: searchTerm || undefined,
          limit: limit ?? DEFAULT_CONVERSATIONS_PAGE_SIZE,
          paged: true,
        };

        const res = await axiosClient.get("/chat-inbox/conversations", {
          params,
        });
        const { items: apiItems } = normalizePagedResult(res.data);

        const selectedId = selectedConversationIdRef.current;
        const mapped = apiItems.map(item => {
          const isSelected = selectedId && item.id === selectedId;
          const localUnread = getLocalUnreadOverride(item);
          return {
            id: item.id,
            contactId: item.contactId,
            contactName: item.contactName,
            contactPhone: item.contactPhone,
            lastMessagePreview: item.lastMessagePreview,
            lastMessageAt: item.lastMessageAt,
            unreadCount: isSelected
              ? 0
              : (localUnread ?? item.unreadCount ?? item.UnreadCount) || 0,
            status: parseConversationStatus(item.status) ?? "Open",
            numberId: item.numberId,
            numberLabel: item.numberLabel,
            within24h: !!item.within24h,
            assignedToUserId: item.assignedToUserId || null,
            assignedToUserName: item.assignedToUserName || null,
            isAssignedToMe: !!item.isAssignedToMe,
            sourceType: item.sourceType || "WhatsApp",
            sourceName: item.sourceName || "WhatsApp",
            mode: normalizeConversationMode(item.mode ?? item.Mode),
            firstSeenAt: item.firstSeenAt,
            lastInboundAt: item.lastInboundAt,
            lastOutboundAt: item.lastOutboundAt,
          };
        });

        // ✅ Silent refresh should not "erase" unread counts you already have in UI
        setAllConversations(prev => {
          const prevMap = new Map(prev.map(c => [c.id, c]));
          const selectedId = selectedConversationIdRef.current;

          const mergedTop = mapped.map(nc => {
            const old = prevMap.get(nc.id);
            if (!old) return nc;
            const localUnread = getLocalUnreadOverride(nc);

            // Never preserve unread for the currently open chat
            if (selectedId && nc.id === selectedId) {
              return { ...old, ...nc, unreadCount: 0 };
            }

            // Preserve unread if server temporarily returns 0
            if (
              (nc.unreadCount ?? 0) === 0 &&
              (old.unreadCount ?? 0) > 0 &&
              typeof localUnread !== "number"
            ) {
              return { ...old, ...nc, unreadCount: old.unreadCount };
            }

            return { ...old, ...nc };
          });

          const mergedIds = new Set(mergedTop.map(c => c.id));
          const tail = prev.filter(c => !mergedIds.has(c.id));

          return [...mergedTop, ...tail];
        });

        if (!selectedConversationIdRef.current && mapped.length > 0) {
          setSelectedConversationId(mapped[0].id);
        }
      } catch (error) {
        console.error("❌ Failed to load inbox conversations:", error);
        toast.error(
          error.response?.data?.message || "Failed to load inbox conversations."
        );
      } finally {
        if (!options.silent) setIsLoading(false);
      }
    },
    [
      activeTab,
      selectedNumberId,
      searchTerm,
      fetchConversationsPage,
      getLocalUnreadOverride,
    ]
  );

  useEffect(() => {
    fetchConversationsPage({
      reset: true,
      limit: DEFAULT_CONVERSATIONS_PAGE_SIZE,
    });
  }, [activeTab, selectedNumberId, searchTerm, fetchConversationsPage]);

  const fetchAgents = useCallback(async () => {
    const businessId = localStorage.getItem("businessId");
    if (!businessId) return;

    setIsAgentsLoading(true);
    try {
      const res = await axiosClient.get("/chat-inbox/agents", {
        params: { businessId },
      });

      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items
        .map(a => ({
          userId: a.userId ?? a.id ?? null,
          name: a.name ?? a.fullName ?? a.displayName ?? a.email ?? "Agent",
          email: a.email ?? null,
          roleName: a.roleName ?? a.role ?? null,
        }))
        .filter(a => a.userId);

      setAgents(mapped);
    } catch (error) {
      setAgents([]);
    } finally {
      setIsAgentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // 🔁 Auto-refresh conversations every 25 seconds (silent, no flicker)
  const fetchMessagesPage = useCallback(async (options = {}) => {
    const {
      reset = false,
      prepend = false,
      limit = DEFAULT_MESSAGES_PAGE_SIZE,
    } = options;

    const selectedId = selectedConversationIdRef.current;

    if (!selectedId) {
      if (reset) {
        setMessages([]);
        setMessagesNextCursor(null);
        setMessagesHasMore(false);
      }
      return;
    }

    if (prepend) {
      if (!messagesHasMoreRef.current) return;
      if (!messagesNextCursorRef.current) return;
      if (isMessagesLoadingOlderRef.current) return;
    }

    const conv = conversationsRef.current.find(c => c.id === selectedId);
    if (!conv) {
      if (reset) {
        setMessages([]);
        setMessagesNextCursor(null);
        setMessagesHasMore(false);
      }
      return;
    }

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error(
        "Missing business context. Please login again to load messages."
      );
      return;
    }

    const requestId = messagesRequestIdRef.current + 1;
    messagesRequestIdRef.current = requestId;
    if (messagesRequestAbortRef.current) {
      messagesRequestAbortRef.current.abort();
    }
    const controller = new AbortController();
    messagesRequestAbortRef.current = controller;

    try {
      if (reset) {
        setIsMessagesLoading(true);
        setMessages([]);
        setMessagesNextCursor(null);
        setMessagesHasMore(false);
        lastMessagesMutationRef.current = "reset";
      }

      if (prepend) {
        setIsMessagesLoadingOlder(true);
        lastMessagesMutationRef.current = "prepend";
      }

      const params = {
        businessId,
        limit,
        paged: true,
        cursor: prepend ? messagesNextCursorRef.current : undefined,
        contactId: conv.contactId || undefined,
        contactPhone: conv.contactPhone || undefined,
      };

      const res = await axiosClient.get("/chat-inbox/messages", {
        params,
        signal: controller.signal,
      });
      const { items, nextCursor, hasMore } = normalizePagedResult(res.data);

      if (messagesRequestIdRef.current !== requestId) return;

      const mappedPage = items
        .map(m => {
          const isInbound = inferIsInboundFromAny(m);

          const directionRaw =
            m.direction ?? m.Direction ?? m.dir ?? m.messageDirection ?? "";
          const statusRaw = m.status ?? "";

          const providerMessageId =
            m.providerMessageId ?? m.ProviderMessageId ?? null;
          const messageLogId =
            m.messageLogId ?? m.MessageLogId ?? m.messageLogID ?? null;

          const messageId =
            m.messageId ??
            m.MessageId ??
            m.wamid ??
            m.Wamid ??
            m.waMessageId ??
            m.WaMessageId ??
            providerMessageId ??
            null;

          const clientMessageId =
            m.clientMessageId ?? m.ClientMessageId ?? null;

          return {
            id: m.id ?? messageLogId ?? messageId,
            serverId: messageLogId ?? m.id ?? null,
            messageLogId: messageLogId ?? m.id ?? null,
            messageId,
            providerMessageId,
            clientMessageId,
            direction: directionRaw || (isInbound ? "in" : "out"),
            isInbound,
            text:
              m.text ||
              m.message ||
              m.body ||
              m.content ||
              m.messageText ||
              m.MessageText ||
              m.messageContent ||
              m.MessageContent ||
              m.renderedBody ||
              m.RenderedBody ||
              "",
            mediaId: m.mediaId ?? m.MediaId ?? null,
            mediaType: m.mediaType ?? m.MediaType ?? null,
            fileName: m.fileName ?? m.FileName ?? null,
            mimeType: m.mimeType ?? m.MimeType ?? null,
            locationLatitude:
              m.locationLatitude ?? m.LocationLatitude ?? m.latitude ?? null,
            locationLongitude:
              m.locationLongitude ?? m.LocationLongitude ?? m.longitude ?? null,
            locationName: m.locationName ?? m.LocationName ?? m.name ?? null,
            locationAddress:
              m.locationAddress ?? m.LocationAddress ?? m.address ?? null,
            sentAt: m.sentAtUtc || m.sentAt || m.createdAt || m.timestamp,
            status: statusRaw,
            errorMessage: m.errorMessage,
          };
        })
        .reverse();

      const keyOf = msg =>
        String(
          msg.messageLogId ??
            msg.serverId ??
            msg.messageId ??
            msg.providerMessageId ??
            msg.clientMessageId ??
            msg.id
        );

      if (reset) {
        setMessages(mappedPage);
      } else if (prepend) {
        setMessages(prev => {
          const existing = new Set(prev.map(keyOf));
          const older = mappedPage.filter(m => !existing.has(keyOf(m)));
          return [...older, ...prev];
        });
      }

      setMessagesNextCursor(nextCursor);
      setMessagesHasMore(hasMore);
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return;
      }
      if (messagesRequestIdRef.current !== requestId) return;
      console.error("Failed to load messages:", error);
      toast.error(error.response?.data?.message || "Failed to load messages.");
      if (reset) setMessages([]);
    } finally {
      if (messagesRequestIdRef.current !== requestId) return;
      if (reset) setIsMessagesLoading(false);
      if (prepend) setIsMessagesLoadingOlder(false);
      if (messagesRequestAbortRef.current === controller) {
        messagesRequestAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchConversations({ silent: true, limit: 100 });
    }, 25000);

    return () => clearInterval(intervalId);
  }, [fetchConversations]);

  // 🛰 Load messages for selected conversation
  useEffect(() => {
    if (messagesRequestAbortRef.current) {
      messagesRequestAbortRef.current.abort();
    }

    if (messagesLoadTimerRef.current) {
      clearTimeout(messagesLoadTimerRef.current);
    }

    if (!selectedConversationId) {
      setMessages([]);
      setMessagesNextCursor(null);
      setMessagesHasMore(false);
      setIsMessagesLoading(false);
      return;
    }

    setMessages([]);
    setMessagesNextCursor(null);
    setMessagesHasMore(false);
    setIsMessagesLoading(true);
    lastMessagesMutationRef.current = "reset";

    const loadMessages = async () => {
      await fetchMessagesPage({
        reset: true,
        limit: DEFAULT_MESSAGES_PAGE_SIZE,
      });
      return;

      /*
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }

      const conv = conversationsRef.current.find(
        c => c.id === selectedConversationId
      );
      if (!conv) {
        setMessages([]);
        return;
      }

      const businessId = localStorage.getItem("businessId");
      if (!businessId) {
        toast.error(
          "❌ Missing business context. Please login again to load messages."
        );
        return;
      }

      try {
        setIsMessagesLoading(true);

        const res = await axiosClient.get("/chat-inbox/messages", {
          params: {
            businessId,
            contactPhone: conv.contactPhone,
            limit: 100,
          },
        });

        const apiItems = Array.isArray(res.data) ? res.data : [];

        const mapped = apiItems
          .map(m => {
            const isInbound = inferIsInboundFromAny(m);

            const directionRaw =
              m.direction ?? m.Direction ?? m.dir ?? m.messageDirection ?? "";
            const statusRaw = m.status ?? "";

            const providerMessageId =
              m.providerMessageId ?? m.ProviderMessageId ?? null;
            const messageLogId =
              m.messageLogId ?? m.MessageLogId ?? m.messageLogID ?? null;

            const messageId =
              m.messageId ??
              m.MessageId ??
              m.wamid ??
              m.Wamid ??
              m.waMessageId ??
              m.WaMessageId ??
              providerMessageId ??
              null;

            const clientMessageId =
              m.clientMessageId ?? m.ClientMessageId ?? null;

            return {
              id: m.id ?? messageLogId ?? messageId,
              serverId: messageLogId ?? m.id ?? null,
              messageLogId: messageLogId ?? m.id ?? null,
              messageId,
              providerMessageId,
              clientMessageId,
              direction: directionRaw || (isInbound ? "in" : "out"),
              isInbound,
              text: m.text || m.message || m.body || m.content || "",
              sentAt: m.sentAtUtc || m.sentAt || m.createdAt || m.timestamp,
              status: statusRaw,
              errorMessage: m.errorMessage,
            };
          })
          .reverse();

        setMessages(mapped);
      } catch (error) {
        console.error("❌ Failed to load messages:", error);
        toast.error(
          error.response?.data?.message || "Failed to load messages."
        );
        setMessages([]);
      } finally {
        setIsMessagesLoading(false);
      }
      */
    };

    messagesLoadTimerRef.current = setTimeout(() => {
      loadMessages();
    }, 200);

    return () => {
      if (messagesLoadTimerRef.current) {
        clearTimeout(messagesLoadTimerRef.current);
      }
    };
  }, [selectedConversationId, fetchMessagesPage]);

  // 🔔 Mark as read when opening a conversation (HTTP + SignalR)
  // 🔔 Mark as read when opening a conversation (HTTP + SignalR)
  useEffect(() => {
    if (!selectedConversationId) return;

    // 1️⃣ Immediate UI clear (optimistic)
    setAllConversations(prev =>
      prev.map(c =>
        c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c
      )
    );

    if (selectedConversation) {
      markConversationUnreadCleared(selectedConversation);
    }

    if (markReadTimerRef.current) {
      clearTimeout(markReadTimerRef.current);
    }

    markReadTimerRef.current = setTimeout(() => {
      const businessId = localStorage.getItem("businessId");
      const contactId = selectedConversation?.contactId;

      // ✅ userId REMOVED — backend uses JWT claims
      if (!businessId || !contactId) return;

      const payload = {
        businessId,
        contactId,
        lastReadAtUtc: new Date().toISOString(),
      };

      axiosClient.post("/chat-inbox/mark-read", payload).catch(err => {
        console.error("Failed to mark conversation as read:", err);
      });

      // SignalR sync (best-effort)
      if (connection && isConnected) {
        connection.invoke("MarkAsRead", contactId).catch(err => {
          console.warn("SignalR MarkAsRead failed:", err);
        });
      }
    }, 200);

    return () => {
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current);
      }
    };
  }, [
    selectedConversationId,
    selectedConversation?.contactId,
    connection,
    isConnected,
    markConversationUnreadCleared,
  ]);

  // 🔁 Helper to (re)load CRM contact summary
  const refreshContactSummary = useCallback(async () => {
    if (!selectedContactId) {
      setContactSummary(null);
      return;
    }

    try {
      setIsSummaryLoading(true);
      const res = await axiosClient.get(
        `/crm/contact-summary/${selectedContactId}`
      );
      const payload = res.data?.data ?? res.data;
      setContactSummary(payload || null);
    } catch (error) {
      console.error("❌ Failed to load contact summary:", error);
      setContactSummary(null);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [selectedContactId]);

  const refreshConversationContext = useCallback(async () => {
    if (!selectedContactId) {
      setConversationContext(null);
      return;
    }

    try {
      setIsContextLoading(true);
      const res = await axiosClient.get(
        `/chat-inbox/context?contactId=${encodeURIComponent(selectedContactId)}`
      );
      const payload = res.data?.data ?? res.data;
      setConversationContext(payload || null);
    } catch {
      setConversationContext(null);
    } finally {
      setIsContextLoading(false);
    }
  }, [selectedContactId]);

  useEffect(() => {
    if (!selectedContactId) {
      setContactSummary(null);
      return;
    }
    refreshContactSummary();
  }, [selectedContactId, refreshContactSummary]);

  useEffect(() => {
    if (!selectedContactId) {
      setConversationContext(null);
      return;
    }
    refreshConversationContext();
  }, [selectedContactId, refreshConversationContext]);

  // ✅ Remove/unassign tag from contact (MVP)
  const handleRemoveTag = useCallback(
    async tag => {
      if (!selectedContactId) {
        toast.warn("No contact selected.");
        return;
      }

      const tagId = tag?.id || tag?.tagId;
      const tagName = tag?.tagName || tag?.name || "tag";

      if (!tagId) {
        toast.error("Cannot remove this tag (missing tagId).");
        return;
      }

      if (removingTagId) return;

      // Optimistic UI: remove it from contactSummary immediately
      setContactSummary(prev => {
        if (!prev) return prev;
        const removeFrom = arr =>
          Array.isArray(arr)
            ? arr.filter(t => (t?.id || t?.tagId) !== tagId)
            : arr;

        return {
          ...prev,
          tags: removeFrom(prev.tags),
          contactTags: removeFrom(prev.contactTags),
          contactTagsDto: removeFrom(prev.contactTagsDto),
        };
      });

      setRemovingTagId(tagId);

      try {
        const body = {
          contactIds: [selectedContactId],
          tagId,
        };

        // Try DELETE first, fallback to POST (some APIs enforce POST-only)
        try {
          await axiosClient.request({
            url: "/contacts/bulk-unassign-tag",
            method: "DELETE",
            data: body,
          });
        } catch (err) {
          const status = err?.response?.status;
          if (status === 404 || status === 405) {
            await axiosClient.post("/contacts/bulk-unassign-tag", body);
          } else {
            throw err;
          }
        }

        toast.success(`Removed "${tagName}"`);
        await refreshContactSummary();
      } catch (error) {
        console.error("Failed to remove tag:", error);
        toast.error(
          error?.response?.data?.message || `Failed to remove "${tagName}".`
        );
        await refreshContactSummary();
      } finally {
        setRemovingTagId(null);
      }
    },
    [selectedContactId, removingTagId, refreshContactSummary]
  );

  // Auto-scroll when messages change
  useEffect(() => {
    if (!selectedConversationId) return;
    if (isMessagesLoading) return;
    if (messages.length === 0) return;

    const lastMutation = lastMessagesMutationRef.current;
    if (lastMutation === "prepend") {
      lastMessagesMutationRef.current = null;
      return;
    }
    lastMessagesMutationRef.current = null;

    scrollToBottom();
  }, [messages, isMessagesLoading, selectedConversationId, scrollToBottom]);

  // 🧮 Messages + date separators
  const messagesWithSeparators = useMemo(() => {
    const result = [];
    let lastDateKey = null;

    messages.forEach(m => {
      const dateObj = m.sentAt ? new Date(m.sentAt) : null;
      const key = dateObj ? dateObj.toDateString() : "unknown";

      if (key !== lastDateKey) {
        if (dateObj) {
          result.push({
            type: "separator",
            id: `sep-${key}`,
            label: formatDayLabel(dateObj),
          });
        }
        lastDateKey = key;
      }

      result.push({ type: "message", ...m });
    });

    return result;
  }, [messages]);

  // 🔔 SignalR: ReceiveInboxMessage handler
  const handleReceiveInboxMessage = useCallback(
    payload => {
      if (!payload) return;

      const contactId = payload.contactId ?? payload.ContactId ?? null;
      const conversationId =
        payload.conversationId ?? payload.ConversationId ?? null;

      const mappedMsg = mapHubMessageToChat(payload);
      if (!mappedMsg) return;
      const mappedMediaType = String(mappedMsg.mediaType || "")
        .trim()
        .toLowerCase();
      const mappedHasMedia =
        Boolean(mappedMsg.mediaId) &&
        (mappedMediaType === "image" ||
          mappedMediaType === "document" ||
          mappedMediaType === "video" ||
          mappedMediaType === "audio");
      const mappedLat = toLatitudeOrNull(mappedMsg.locationLatitude);
      const mappedLon = toLongitudeOrNull(mappedMsg.locationLongitude);
      const mappedHasLocation =
        mappedMediaType === "location" &&
        mappedLat !== null &&
        mappedLon !== null;

      // 1) Update messages if this conversation is open
      setMessages(prev => {
        const openConv = selectedConversationRef.current;
        if (!openConv) return prev;

        const matchesOpenConversation =
          (conversationId && openConv.id && openConv.id === conversationId) ||
          (contactId &&
            openConv.contactId &&
            openConv.contactId === contactId) ||
          (payload.contactPhone &&
            openConv.contactPhone &&
            openConv.contactPhone === payload.contactPhone);

        if (!matchesOpenConversation) return prev;

        // ✅ Merge-by-identity: update existing bubble when a status update arrives
        const sameMessage = (existing, incoming, raw) => {
          const incMessageId =
            incoming?.messageId ||
            raw?.messageId ||
            raw?.MessageId ||
            raw?.wamid ||
            raw?.Wamid ||
            null;

          const incClientId =
            incoming?.clientMessageId ||
            raw?.clientMessageId ||
            raw?.ClientMessageId ||
            raw?.clientId ||
            null;

          if (
            existing?.messageId &&
            incMessageId &&
            existing.messageId === incMessageId
          )
            return true;

          if (
            existing?.clientMessageId &&
            incClientId &&
            existing.clientMessageId === incClientId
          )
            return true;

          if (existing?.id && incoming?.id && existing.id === incoming.id)
            return true;

          if (existing?.id && incMessageId && existing.id === incMessageId)
            return true;

          if (
            existing?.serverId &&
            incoming?.id &&
            existing.serverId === incoming.id
          )
            return true;

          return false;
        };

        const idx = prev.findIndex(m => sameMessage(m, mappedMsg, payload));

        // ✅ If already exists, update status/time/error instead of adding duplicate
        if (idx >= 0) {
          const existing = prev[idx];

          const merged = {
            ...existing,
            ...mappedMsg,
            text: mappedMsg.text || existing.text,
            sentAt: mappedMsg.sentAt || existing.sentAt,
            status: mappedMsg.status || existing.status,
            messageId: mappedMsg.messageId || existing.messageId || null,
            clientMessageId:
              mappedMsg.clientMessageId || existing.clientMessageId || null,
            serverId: existing.serverId ?? null,
            errorMessage:
              mappedMsg.errorMessage ?? existing.errorMessage ?? null,
          };

          const next = [...prev];
          next[idx] = merged;
          return next;
        }

        // If this hub payload has no real message text, it's very likely a status-only event.
        // Don't create a new bubble for it.
        const isEmptyText =
          !mappedMsg.text || String(mappedMsg.text).trim().length === 0;

        // Media-only inbound messages can have empty text (no caption). We still want to show the bubble.
        if (isEmptyText && !mappedHasMedia && !mappedHasLocation) {
          return prev; // <-- prevents "-" ghost bubbles
        }
        return [...prev, mappedMsg];
      });

      // 2) Update conversations list
      let matched = false;

      setAllConversations(prev => {
        const openConv = selectedConversationRef.current;

        const next = prev.map(c => {
          const isMatch =
            (conversationId && c.id === conversationId) ||
            (contactId && c.contactId === contactId) ||
            (payload.contactPhone && c.contactPhone === payload.contactPhone);

          if (!isMatch) return c;

          matched = true;

          const isOpen =
            !!openConv &&
            ((openConv.id && c.id === openConv.id) ||
              (openConv.contactId && c.contactId === openConv.contactId));

          const localUnread = getLocalUnreadOverride(c);
          const baseUnread =
            typeof localUnread === "number" ? localUnread : c.unreadCount ?? 0;
          const nextUnread =
            mappedMsg.isInbound && !isOpen ? baseUnread + 1 : baseUnread;

          if (
            typeof localUnread === "number" &&
            mappedMsg.isInbound &&
            !isOpen
          ) {
            setLocalUnreadOverride(c, nextUnread);
          }

          const trimmedText = String(mappedMsg.text || "").trim();
          const fallbackPreview = mappedHasMedia
            ? mappedMediaType === "image"
              ? "Photo"
              : mappedMediaType === "document"
              ? String(mappedMsg.fileName || "").trim() || "PDF"
              : mappedMediaType === "video"
              ? String(mappedMsg.fileName || "").trim() || "Video"
              : String(mappedMsg.fileName || "").trim() || "Audio"
            : mappedHasLocation
            ? String(mappedMsg.locationName || "").trim() || "Location"
            : null;

          return {
            ...c,
            lastMessagePreview:
              trimmedText || fallbackPreview || c.lastMessagePreview,
            lastMessageAt: mappedMsg.sentAt || c.lastMessageAt,
            lastInboundAt: mappedMsg.isInbound
              ? mappedMsg.sentAt || c.lastInboundAt
              : c.lastInboundAt,
            lastOutboundAt: !mappedMsg.isInbound
              ? mappedMsg.sentAt || c.lastOutboundAt
              : c.lastOutboundAt,
            within24h: mappedMsg.isInbound ? true : c.within24h,
            status:
              mappedMsg.isInbound &&
              parseConversationStatus(c.status) === "Closed"
                ? "Open"
                : c.status,
            unreadCount: isOpen ? 0 : nextUnread,
          };
        });

        return next;
      });

      if (!matched) {
        fetchConversations({ silent: true, limit: 100 });
      }
    },
    [fetchConversations, getLocalUnreadOverride, setLocalUnreadOverride]
  );

  // 🔔 SignalR: UnreadCountChanged handler
  const handleUnreadCountChanged = useCallback(
    payload => {
      if (!payload) return;

      if (payload.refresh) {
        fetchConversations({ silent: true, limit: 100 });
        return;
      }

      // if (payload.contactId) {
      //   const hasUnread =
      //     typeof payload.unreadCount === "number" &&
      //     !Number.isNaN(payload.unreadCount);

      //   if (!hasUnread) return;

      //   setAllConversations(prev =>
      //     prev.map(c =>
      //       c.contactId === payload.contactId
      //         ? { ...c, unreadCount: payload.unreadCount }
      //         : c
      //     )
      //   );
      //   return;
      // }
      if (payload.contactId) {
        const hasUnread =
          typeof payload.unreadCount === "number" &&
          !Number.isNaN(payload.unreadCount);

        if (!hasUnread) return;

        const open = selectedConversationRef.current;
        const localEntry = getClearedUnreadEntryByContactId(payload.contactId);
        const localUnread =
          typeof localEntry?.localUnread === "number"
            ? localEntry.localUnread
            : null;

        setAllConversations(prev =>
          prev.map(c => {
            if (c.contactId !== payload.contactId) return c;

            const isOpen =
              !!open &&
              ((open.id && c.id === open.id) ||
                (open.contactId && c.contactId === open.contactId) ||
                (open.contactPhone && c.contactPhone === open.contactPhone));

            if (typeof localUnread === "number") {
              const nextUnread =
                payload.unreadCount > 0 ? Math.max(localUnread, 1) : 0;
              if (!isOpen && nextUnread !== localUnread) {
                setLocalUnreadOverride(c, nextUnread);
              }
              return { ...c, unreadCount: isOpen ? 0 : nextUnread };
            }

            return { ...c, unreadCount: isOpen ? 0 : payload.unreadCount };
          })
        );
        return;
      }

      // if (Array.isArray(payload.items)) {
      //   const map = new Map();
      //   payload.items.forEach(item => {
      //     if (!item?.contactId) return;
      //     if (typeof item.unreadCount !== "number") return;
      //     map.set(item.contactId, item.unreadCount);
      //   });

      //   if (map.size === 0) return;

      //   setAllConversations(prev =>
      //     prev.map(c =>
      //       map.has(c.contactId)
      //         ? { ...c, unreadCount: map.get(c.contactId) }
      //         : c
      //     )
      //   );
      // }
      if (Array.isArray(payload.items)) {
        const map = new Map();
        payload.items.forEach(item => {
          if (!item?.contactId) return;
          if (typeof item.unreadCount !== "number") return;
          map.set(item.contactId, item.unreadCount);
        });

        if (map.size === 0) return;

        const open = selectedConversationRef.current;

        setAllConversations(prev =>
          prev.map(c => {
            if (!map.has(c.contactId)) return c;

            const nextUnread = map.get(c.contactId);
            const localUnread = getLocalUnreadOverride(c);

            const isOpen =
              !!open &&
              ((open.id && c.id === open.id) ||
                (open.contactId && c.contactId === open.contactId) ||
                (open.contactPhone && c.contactPhone === open.contactPhone));

            if (typeof localUnread === "number") {
              const mergedUnread =
                nextUnread > 0 ? Math.max(localUnread, 1) : 0;
              if (!isOpen && mergedUnread !== localUnread) {
                setLocalUnreadOverride(c, mergedUnread);
              }
              return { ...c, unreadCount: isOpen ? 0 : mergedUnread };
            }

            return { ...c, unreadCount: isOpen ? 0 : nextUnread };
          })
        );
      }
    },
    [
      fetchConversations,
      getClearedUnreadEntryByContactId,
      getLocalUnreadOverride,
      setLocalUnreadOverride,
    ]
  );

  // 🔔 SignalR: MessageStatusChanged handler (outbound delivery/read ticks)
  const handleMessageStatusChanged = useCallback(payload => {
    if (!payload) return;

    const openConv = selectedConversationRef.current;
    if (!openConv) return;

    const contactId = payload.contactId ?? payload.ContactId ?? null;
    if (contactId && openConv.contactId && openConv.contactId !== contactId)
      return;

    const messageLogId = payload.messageLogId ?? payload.MessageLogId ?? null;
    const providerMessageId =
      payload.providerMessageId ?? payload.ProviderMessageId ?? null;
    const messageId = payload.messageId ?? payload.MessageId ?? null;
    const nextStatus = payload.status ?? payload.Status ?? null;
    if (!nextStatus) return;

    const rank = s => {
      const v = String(s || "")
        .trim()
        .toLowerCase();
      if (!v) return 0;
      if (v === "failed" || v === "error" || v.includes("fail")) return 99;
      if (v === "read" || v === "seen" || v === "viewed" || v.includes("read"))
        return 4;
      if (v === "delivered" || v.includes("deliver")) return 3;
      if (v === "sent") return 2;
      if (
        v === "queued" ||
        v === "sending" ||
        v === "pending" ||
        v.includes("queue") ||
        v.includes("send") ||
        v.includes("progress")
      )
        return 1;
      return 0;
    };

    setMessages(prev =>
      prev.map(m => {
        const matchesByLogId =
          !!messageLogId &&
          (m.id === messageLogId || m.serverId === messageLogId);

        const matchesByProviderId =
          !!providerMessageId &&
          (m.providerMessageId === providerMessageId ||
            m.messageId === providerMessageId ||
            m.id === providerMessageId);

        const matchesByMessageId =
          !!messageId && (m.messageId === messageId || m.id === messageId);

        const matches =
          matchesByLogId || matchesByProviderId || matchesByMessageId;
        if (!matches) return m;

        const currentRank = rank(m.status);
        const nextRank = rank(nextStatus);
        if (nextRank < currentRank) return m;

        return { ...m, status: nextStatus };
      })
    );
  }, []);

  // 🔌 Subscribe to SignalR events
  useEffect(() => {
    if (!connection || !isConnected) return;

    connection.on("ReceiveInboxMessage", handleReceiveInboxMessage);
    connection.on("UnreadCountChanged", handleUnreadCountChanged);
    connection.on("MessageStatusChanged", handleMessageStatusChanged);

    return () => {
      connection.off("ReceiveInboxMessage", handleReceiveInboxMessage);
      connection.off("UnreadCountChanged", handleUnreadCountChanged);
      connection.off("MessageStatusChanged", handleMessageStatusChanged);
    };
  }, [
    connection,
    isConnected,
    handleReceiveInboxMessage,
    handleUnreadCountChanged,
    handleMessageStatusChanged,
  ]);

  // 📨 Send message (HTTP is source of truth)
  const handleSendMessage = async outbound => {
    if (!selectedConversation) {
      toast.warn("Please select a conversation first.");
      return;
    }

    if (isConversationClosed) {
      toast.warn("This conversation is closed. Reopen it to reply.");
      return;
    }

    if (!isWithin24h) {
      toast.warn(
        "This chat is outside the 24-hour WhatsApp window. Use a template or campaign to re-engage."
      );
      return;
    }

    const mediaId = outbound?.mediaId ?? outbound?.MediaId ?? null;
    const mediaTypeRaw = outbound?.mediaType ?? outbound?.MediaType ?? null;
    const fileName = outbound?.fileName ?? outbound?.FileName ?? null;
    const mimeType = outbound?.mimeType ?? outbound?.MimeType ?? null;
    const localPreviewUrl = outbound?.localPreviewUrl ?? null;
    const locationLatitude =
      outbound?.locationLatitude ?? outbound?.LocationLatitude ?? null;
    const locationLongitude =
      outbound?.locationLongitude ?? outbound?.LocationLongitude ?? null;
    const locationName = outbound?.locationName ?? outbound?.LocationName ?? null;
    const locationAddress =
      outbound?.locationAddress ?? outbound?.LocationAddress ?? null;

    const caption =
      typeof outbound?.text === "string"
        ? outbound.text
        : typeof outbound?.Text === "string"
        ? outbound.Text
        : newMessage;

    const trimmedCaption = String(caption || "").trim();
    const hasMedia = Boolean(String(mediaId || "").trim());
    const latNum = toLatitudeOrNull(locationLatitude);
    const lonNum = toLongitudeOrNull(locationLongitude);
    const hasLocation =
      latNum !== null && lonNum !== null;

    if (hasLocation && (hasMedia || trimmedCaption)) {
      toast.error("Location message cannot include text or an attachment.");
      return;
    }

    if (!hasMedia && !trimmedCaption && !hasLocation) {
      toast.warn("Type a message before sending.");
      return;
    }

    const mediaType = hasLocation
      ? "location"
      : String(mediaTypeRaw || "")
          .trim()
          .toLowerCase() ||
        (hasMedia ? inferChatInboxMediaType(mimeType) : "");

    if (hasMedia && mediaType === "audio" && trimmedCaption) {
      toast.error("Audio messages do not support captions.");
      return;
    }

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error("Missing business context. Please login again.");
      return;
    }

    if (isSending) return;

    const normalizeStatus = raw => {
      const s = String(raw || "")
        .trim()
        .toLowerCase();
      if (!s) return null;

      if (s.includes("fail") || s.includes("error") || s.includes("reject"))
        return "Failed";
      if (s.includes("read") || s === "seen" || s === "viewed") return "Read";
      if (s.includes("deliver")) return "Delivered";
      if (s === "sent") return "Sent";

      if (
        s.includes("queue") ||
        s === "queued" ||
        s.includes("send") ||
        s === "sending" ||
        s === "pending" ||
        s.includes("accept") ||
        s.includes("submit") ||
        s.includes("process") ||
        s.includes("progress")
      ) {
        return "Queued";
      }

      return "Queued";
    };

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (localPreviewUrl) {
      localObjectUrlByTempIdRef.current.set(tempId, localPreviewUrl);
    }

    const optimisticMsg = {
      id: tempId,
      clientMessageId: tempId,
      direction: "out",
      isInbound: false,
      text: trimmedCaption,
      mediaId: hasMedia ? String(mediaId).trim() : null,
      mediaType: hasLocation ? "location" : hasMedia ? mediaType : null,
      fileName: hasMedia ? fileName : null,
      mimeType: hasMedia ? mimeType : null,
      localPreviewUrl: hasMedia ? localPreviewUrl : null,
      locationLatitude: hasLocation ? latNum : null,
      locationLongitude: hasLocation ? lonNum : null,
      locationName: hasLocation ? locationName : null,
      locationAddress: hasLocation ? locationAddress : null,
      sentAt: nowIso,
      status: "Queued",
      errorMessage: null,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");
    setIsSending(true);

    try {
      const payload = {
        businessId,
        conversationId: selectedConversation.id,
        contactId: selectedConversation.contactId,
        to: selectedConversation.contactPhone,
        text: hasLocation ? null : trimmedCaption || null,
        mediaId: hasMedia ? String(mediaId).trim() : null,
        mediaType: hasLocation ? "location" : hasMedia ? mediaType : null,
        fileName: hasMedia ? fileName : null,
        mimeType: hasMedia ? mimeType : null,
        locationLatitude: hasLocation ? latNum : null,
        locationLongitude: hasLocation ? lonNum : null,
        locationName: hasLocation ? locationName : null,
        locationAddress: hasLocation ? locationAddress : null,
        numberId: selectedConversation.numberId,
        clientMessageId: tempId,
      };

      const res = await axiosClient.post("/chat-inbox/send-message", payload);
      const saved = res.data || {};

      const finalSentAt =
        saved.sentAtUtc || saved.sentAt || optimisticMsg.sentAt;
      const finalSentAtIso =
        finalSentAt instanceof Date ? finalSentAt.toISOString() : finalSentAt;

      const serverStatus = normalizeStatus(saved.status) || "Queued";

      const savedMediaId = saved.mediaId ?? saved.MediaId ?? null;
      const savedMediaType = saved.mediaType ?? saved.MediaType ?? null;
      const savedFileName = saved.fileName ?? saved.FileName ?? null;
      const savedMimeType = saved.mimeType ?? saved.MimeType ?? null;
      const savedLocationLatitude =
        saved.locationLatitude ?? saved.LocationLatitude ?? null;
      const savedLocationLongitude =
        saved.locationLongitude ?? saved.LocationLongitude ?? null;
      const savedLocationName = saved.locationName ?? saved.LocationName ?? null;
      const savedLocationAddress =
        saved.locationAddress ?? saved.LocationAddress ?? null;

      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? {
                ...m,
                id: m.id,
                serverId: saved.id ?? null,
                messageId:
                  saved.messageId ??
                  saved.wamid ??
                  saved.waMessageId ??
                  saved.providerMessageId ??
                  null,
                sentAt: finalSentAtIso,
                status: serverStatus,
                errorMessage: saved.errorMessage || null,
                mediaId: savedMediaId ?? m.mediaId ?? null,
                mediaType: savedMediaType ?? m.mediaType ?? null,
                fileName: savedFileName ?? m.fileName ?? null,
                mimeType: savedMimeType ?? m.mimeType ?? null,
                locationLatitude:
                  savedLocationLatitude ?? m.locationLatitude ?? null,
                locationLongitude:
                  savedLocationLongitude ?? m.locationLongitude ?? null,
                locationName: savedLocationName ?? m.locationName ?? null,
                locationAddress:
                  savedLocationAddress ?? m.locationAddress ?? null,
              }
            : m
        )
      );

      const preview =
        trimmedCaption ||
        (hasLocation
          ? String(locationName || "").trim() || "Location"
          : hasMedia
          ? mediaType === "document"
            ? `PDF sent${fileName ? `: ${fileName}` : ""}`
            : mediaType === "video"
            ? `Video sent${fileName ? `: ${fileName}` : ""}`
            : mediaType === "audio"
            ? `Audio sent${fileName ? `: ${fileName}` : ""}`
            : `Image sent${fileName ? `: ${fileName}` : ""}`
          : "");

      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessagePreview: preview,
                lastMessageAt: finalSentAtIso,
                lastOutboundAt: finalSentAtIso,
              }
            : c
        )
      );
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      toast.error(
        error.response?.data?.message || "Failed to send message. Please retry."
      );

      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? { ...m, status: "Failed", errorMessage: "Not delivered" }
            : m
        )
      );
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleSendTemplateMessage = async templateMeta => {
    if (!selectedConversation) {
      toast.warn("Please select a conversation first.");
      return false;
    }

    if (isConversationClosed) {
      toast.warn("This conversation is closed. Reopen it to reply.");
      return false;
    }

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error("Missing business context. Please login again.");
      return false;
    }

    if (isSending) return false;

    const templateName = String(
      templateMeta?.name ?? templateMeta?.Name ?? ""
    ).trim();
    const languageCode = String(
      templateMeta?.languageCode ??
        templateMeta?.LanguageCode ??
        templateMeta?.language ??
        templateMeta?.Language ??
        "en_US"
    ).trim();
    if (!templateName) {
      toast.error("Select a valid template.");
      return false;
    }

    const recipientNumber =
      normalizeRecipientNumber(selectedConversation?.contactPhone) ||
      String(selectedConversation?.contactPhone || "").trim();
    if (!recipientNumber) {
      toast.error("Missing recipient number for this conversation.");
      return false;
    }

    setIsSending(true);
    let tempId = null;

    try {
      const normalizeStatus = raw => {
        const s = String(raw || "")
          .trim()
          .toLowerCase();
        if (!s) return null;
        if (s.includes("fail") || s.includes("error") || s.includes("reject"))
          return "Failed";
        if (s.includes("read") || s === "seen" || s === "viewed") return "Read";
        if (s.includes("deliver")) return "Delivered";
        if (s === "sent") return "Sent";
        if (
          s.includes("queue") ||
          s.includes("send") ||
          s === "pending" ||
          s.includes("accept") ||
          s.includes("submit") ||
          s.includes("process")
        ) {
          return "Queued";
        }
        return "Queued";
      };

      const languagePart = languageCode
        ? `?language=${encodeURIComponent(languageCode)}`
        : "";
      const detailsRes = await axiosClient.get(
        `templates/${businessId}/${encodeURIComponent(templateName)}${languagePart}`
      );
      const details = detailsRes?.data?.template || detailsRes?.data || {};

      const body = String(details?.body ?? details?.Body ?? "").trim();
      const placeholderIndexes = extractTemplatePlaceholderIndexes(body);
      const headerKind = normalizeTemplateHeaderKind(
        templateMeta?.headerKind ??
          templateMeta?.HeaderKind ??
          details?.headerKind ??
          details?.HeaderKind
      );
      const headerMediaUrl = String(
        templateMeta?.headerMediaUrl ??
          templateMeta?.HeaderMediaUrl ??
          templateMeta?.mediaUrl ??
          templateMeta?.MediaUrl ??
          ""
      ).trim();
      const parameters = resolveTemplateParameters(
        templateMeta,
        placeholderIndexes
      );
      const buttonParams = parseTemplateButtons(details);
      const dynamicUrlParams = normalizeTemplateUrlButtonParams(templateMeta);

      if (
        placeholderIndexes.length > 0 &&
        (parameters.length < placeholderIndexes.length ||
          parameters.slice(0, placeholderIndexes.length).some(v => !v.trim()))
      ) {
        toast.warn("Fill all template variables before sending.");
        return false;
      }

      if (
        headerKind !== TEMPLATE_HEADER_NONE &&
        headerKind !== "text" &&
        !headerMediaUrl
      ) {
        toast.warn("This template header requires media. Attach header media.");
        return false;
      }

      if (hasDynamicUrlButton(buttonParams) && dynamicUrlParams.length === 0) {
        toast.warn("Fill dynamic URL button parameters before sending.");
        return false;
      }

      tempId = `temp-template-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const previewText =
        renderTemplateBodyPreview(body, parameters) ||
        body ||
        `Template: ${templateName}`;

      const optimisticMsg = {
        id: tempId,
        clientMessageId: tempId,
        direction: "out",
        isInbound: false,
        text: previewText,
        mediaId: null,
        mediaType: null,
        fileName: null,
        mimeType: null,
        sentAt: nowIso,
        status: "Queued",
        errorMessage: null,
        messageKind: "Template",
        templateName,
        templateLanguage: languageCode || "en_US",
      };

      setMessages(prev => [...prev, optimisticMsg]);

      const payload = {
        businessId,
        conversationId: selectedConversation.id,
        contactId: selectedConversation.contactId,
        to: recipientNumber,
        numberId: selectedConversation.numberId,
        sendMode: "template",
        templateName,
        templateLanguage: languageCode || "en_US",
        parameters,
        templateHeaderKind: headerKind,
        headerMediaUrl: headerMediaUrl || null,
        urlButtonParams: hasDynamicUrlButton(buttonParams)
          ? dynamicUrlParams
          : [],
        templateBody: body || "",
        clientMessageId: tempId,
      };

      const res = await axiosClient.post("/chat-inbox/send-message", payload);
      const saved = res?.data || {};
      const normalizedStatus = normalizeStatus(saved.status) || "Queued";
      const sentAtIso =
        saved.sentAtUtc || saved.sentAt || saved.createdAt || nowIso;
      const savedText = String(saved.text ?? saved.Text ?? previewText).trim();

      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? {
                ...m,
                serverId: saved.id ?? null,
                messageId:
                  saved.messageId ??
                  saved.wamid ??
                  saved.waMessageId ??
                  saved.providerMessageId ??
                  null,
                sentAt: sentAtIso,
                status: normalizedStatus,
                text: savedText || m.text,
                errorMessage: saved.errorMessage || null,
                messageKind: saved.messageKind ?? saved.MessageKind ?? "Template",
                templateName:
                  saved.templateName ?? saved.TemplateName ?? templateName,
                templateLanguage:
                  saved.templateLanguage ??
                  saved.TemplateLanguage ??
                  (languageCode || "en_US"),
                templateSnapshotJson:
                  saved.templateSnapshotJson ?? saved.TemplateSnapshotJson ?? null,
              }
            : m
        )
      );

      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessagePreview: savedText || previewText,
                lastMessageAt: sentAtIso,
                lastOutboundAt: sentAtIso,
              }
            : c
        )
      );

      scrollToBottom();
      toast.success("Template sent.");
      return true;
    } catch (error) {
      console.error("Failed to send template message:", error);
      toast.error(
        error.response?.data?.message || "Failed to send template message."
      );
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? { ...m, status: "Failed", errorMessage: "Not delivered" }
            : m
        )
      );
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadAndSendMedia = async file => {
    if (!file) return;

    if (!selectedConversation) {
      toast.warn("Please select a conversation first.");
      return;
    }

    if (isConversationClosed) {
      toast.warn("This conversation is closed. Reopen it to reply.");
      return;
    }

    if (!isWithin24h) {
      toast.warn(
        "This chat is outside the 24-hour WhatsApp window. Use a template or campaign to re-engage."
      );
      return;
    }

    if (isUploadingMedia || isSending) return;

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error("Missing business context. Please login again.");
      return;
    }

    const sizeBytes = Number(file.size) || 0;
    if (!sizeBytes) {
      toast.error("Selected file is empty.");
      return;
    }

    if (sizeBytes > CHAT_INBOX_MEDIA_MAX_BYTES) {
      toast.error("File is too large. Max allowed is 10MB.");
      return;
    }

    const inferredMime = (() => {
      const raw = String(file.type || "").split(";")[0].trim();
      if (raw) return raw;

      const name = String(file.name || "").toLowerCase().trim();
      if (name.endsWith(".pdf")) return "application/pdf";
      if (name.endsWith(".mp4")) return "video/mp4";
      if (name.endsWith(".3gp") || name.endsWith(".3gpp")) return "video/3gpp";
      if (name.endsWith(".mp3")) return "audio/mpeg";
      if (name.endsWith(".m4a")) return "audio/mp4";
      if (name.endsWith(".aac")) return "audio/aac";
      if (name.endsWith(".ogg")) return "audio/ogg";
      return "";
    })();

    if (!CHAT_INBOX_ALLOWED_MIME_TYPES.has(inferredMime)) {
      toast.error(
        "Unsupported file type. Allowed: images (jpg/png/webp), PDF, MP4 video, and audio (mp3/m4a/aac/ogg)."
      );
      return;
    }

    setIsUploadingMedia(true);

    let localPreviewUrl = null;
    let keepLocalPreviewUrl = false;

    try {
      try {
        if (
          typeof URL !== "undefined" &&
          typeof URL.createObjectURL === "function"
        ) {
          localPreviewUrl = URL.createObjectURL(file);
        }
      } catch {
        localPreviewUrl = null;
      }

      const form = new FormData();
      form.append("file", file);

      const res = await axiosClient.post("/chat-inbox/media/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res?.data || {};
      const uploadedMediaId = data.mediaId ?? data.MediaId ?? null;
      const uploadedMediaType = data.mediaType ?? data.MediaType ?? null;

      if (!uploadedMediaId) {
        toast.error("Upload succeeded but mediaId was missing.");
        return;
      }

      const mt =
        String(uploadedMediaType || "").trim().toLowerCase() ||
        inferChatInboxMediaType(inferredMime);

      keepLocalPreviewUrl = true;
      await handleSendMessage({
        text: newMessage,
        mediaId: uploadedMediaId,
        mediaType: mt,
        fileName: data.fileName ?? data.FileName ?? file.name ?? null,
        mimeType: data.mimeType ?? data.MimeType ?? inferredMime,
        localPreviewUrl,
      });
    } catch (error) {
      console.error("❌ Failed to upload media:", error);
      toast.error(
        error.response?.data?.message || "Failed to upload file. Please retry."
      );
    } finally {
      if (localPreviewUrl && !keepLocalPreviewUrl) {
        try {
          URL.revokeObjectURL(localPreviewUrl);
        } catch {}
      }
      setIsUploadingMedia(false);
    }
  };

  const handleSendLocation = async () => {
    if (!selectedConversation) {
      toast.warn("Please select a conversation first.");
      return;
    }

    if (isConversationClosed) {
      toast.warn("This conversation is closed. Reopen it to reply.");
      return;
    }

    if (!isWithin24h) {
      toast.warn(
        "This chat is outside the 24-hour WhatsApp window. Use a template or campaign to re-engage."
      );
      return;
    }

    if (isUploadingMedia || isSending) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not available in this browser.");
      return;
    }

    toast.info("Fetching your current location…");

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });

      const lat = pos?.coords?.latitude;
      const lon = pos?.coords?.longitude;

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        toast.error("Failed to read your coordinates.");
        return;
      }

      await handleSendMessage({
        locationLatitude: lat,
        locationLongitude: lon,
        locationName: null,
        locationAddress: null,
      });
    } catch (error) {
      const code = error?.code;
      if (code === 1) {
        toast.error("Location permission denied.");
      } else if (code === 2) {
        toast.error("Location unavailable.");
      } else if (code === 3) {
        toast.error("Location request timed out.");
      } else {
        toast.error("Failed to fetch location.");
      }
    }
  };

  // Prefetch last few outbound image previews so the sender sees what was sent.
  useEffect(() => {
    const slice = Array.isArray(messages) ? messages.slice(-8) : [];
    for (const m of slice) {
      const mediaId = String(m?.mediaId || "").trim();
      if (!mediaId) continue;
      const mt = String(m?.mediaType || "")
        .trim()
        .toLowerCase();
      if (mt !== "image" && mt !== "video" && mt !== "audio") continue;
      if (m?.localPreviewUrl) continue;
      if (mediaObjectUrlByIdRef.current.has(mediaId)) continue;
      fetchMediaObjectUrl(mediaId, { silent: true });
    }
  }, [messages, fetchMediaObjectUrl]);

  useEffect(() => {
    const slice = Array.isArray(messages) ? messages.slice(-4) : [];
    for (const m of slice) {
      const mediaId = String(m?.mediaId || "").trim();
      if (!mediaId) continue;
      const mt = String(m?.mediaType || "")
        .trim()
        .toLowerCase();
      if (mt !== "document") continue;
      const localPreviewUrl = m?.localPreviewUrl || null;
      const isTemp =
        typeof m?.id === "string" && String(m.id).startsWith("temp-");

      ensurePdfPreview(mediaId, {
        localPreviewUrl,
        skipRemote: isTemp && !localPreviewUrl,
      });
    }
  }, [messages, ensurePdfPreview]);

  const handleComposerKeyDown = event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && newMessage.trim()) handleSendMessage();
    }
  };

  // 👤 Assign conversation to me
  const handleAssignToMe = async () => {
    if (!selectedConversation || !selectedConversation.contactId) {
      toast.warn("Select a conversation before assigning.");
      return;
    }

    const businessId = localStorage.getItem("businessId");
    const userId = localStorage.getItem("userId");

    if (!businessId || !userId) {
      toast.error("Missing business or user context. Please login again.");
      return;
    }

    if (isAssigning) return;

    setIsAssigning(true);
    try {
      const payload = {
        businessId,
        contactId: selectedConversation.contactId,
        userId,
      };
      await axiosClient.post("/chat-inbox/assign", payload);

      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                assignedToUserId: userId,
                assignedToUserName: "You",
                isAssignedToMe: true,
              }
            : c
        )
      );

      await fetchConversations({ silent: true, limit: 100 });
      toast.success("Conversation assigned to you.");
    } catch (error) {
      console.error("Failed to assign conversation:", error);
      toast.error(
        error.response?.data?.message || "Failed to assign conversation."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  // 👤 Assign conversation to specific agent
  const handleAssignToAgent = async assigneeUserId => {
    if (!selectedConversation || !selectedConversation.contactId) {
      toast.warn("Select a conversation before assigning.");
      return;
    }

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error("Missing business context. Please login again.");
      return;
    }

    const userId = String(assigneeUserId ?? "").trim();
    if (!userId) {
      toast.error("Select a valid agent to assign.");
      return;
    }

    if (isAssigning) return;

    setIsAssigning(true);
    try {
      const payload = {
        businessId,
        contactId: selectedConversation.contactId,
        userId,
      };
      await axiosClient.post("/chat-inbox/assign", payload);

      const myUserId = localStorage.getItem("userId");
      const agentName =
        agents.find(a => String(a.userId) === String(userId))?.name ?? "Agent";

      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                assignedToUserId: userId,
                assignedToUserName:
                  myUserId && String(myUserId) === String(userId)
                    ? "You"
                    : agentName,
                isAssignedToMe: myUserId && String(myUserId) === String(userId),
              }
            : c
        )
      );

      await fetchConversations({ silent: true, limit: 100 });

      const tabKey = activeTab === "history" ? "older" : activeTab;
      if (tabKey === "unassigned" || tabKey === "my") {
        setSelectedConversationId(null);
      }

      toast.success("Conversation assigned.");
    } catch (error) {
      console.error("Failed to assign conversation:", error);
      toast.error(
        error.response?.data?.message || "Failed to assign conversation."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!selectedConversation || !selectedConversation.contactId) {
      toast.warn("Select a conversation before unassigning.");
      return;
    }

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error("Missing business context. Please login again.");
      return;
    }

    if (isAssigning) return;

    setIsAssigning(true);
    try {
      const payload = { businessId, contactId: selectedConversation.contactId };
      await axiosClient.post("/chat-inbox/unassign", payload);

      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                assignedToUserId: null,
                assignedToUserName: null,
                isAssignedToMe: false,
              }
            : c
        )
      );

      await fetchConversations({ silent: true, limit: 100 });

      const tabKey = activeTab === "history" ? "older" : activeTab;
      if (tabKey === "my") setSelectedConversationId(null);

      toast.info("Conversation unassigned.");
    } catch (error) {
      console.error("Failed to unassign conversation:", error);
      toast.error(
        error.response?.data?.message || "Failed to unassign conversation."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateConversationStatus = async newStatus => {
    if (!selectedConversation || !selectedConversation.contactId) {
      toast.warn("Select a conversation before updating status.");
      return;
    }

    if (!headerIsAssignedToMe) {
      toast.error("Not allowed to update this conversation.");
      return;
    }

    const businessId = localStorage.getItem("businessId");
    if (!businessId) {
      toast.error("Missing business context. Please login again.");
      return;
    }

    const normalized = parseConversationStatus(newStatus);
    if (!normalized) {
      toast.error("Invalid status. Use Open, Pending, or Closed.");
      return;
    }

    if (isUpdatingStatus) return;

    const tabKey = activeTab === "history" ? "older" : activeTab;

    setIsUpdatingStatus(true);
    try {
      const payload = {
        businessId,
        contactId: selectedConversation.contactId,
        status: normalized,
      };

      try {
        await axiosClient.post("/chat-inbox/set-status", payload);
      } catch (e) {
        const statusCode = e?.response?.status;
        if (statusCode === 404) {
          await axiosClient.post("/chat-inbox/status", payload);
        } else {
          throw e;
        }
      }

      setAllConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id ? { ...c, status: normalized } : c
        )
      );

      if (
        (tabKey === "closed" && normalized !== "Closed") ||
        (tabKey !== "closed" && normalized === "Closed")
      ) {
        setSelectedConversationId(null);
      }

      await fetchConversations({ silent: true, limit: 100 });
      toast.success("Status updated.");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(error.response?.data?.message || "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenFullCrm = () => {
    if (!selectedConversation) {
      toast.info("Select a conversation first to open full CRM.");
      return;
    }
    if (!selectedContactId) {
      toast.info("No contact is linked to this conversation yet.");
      return;
    }
    navigate(`/app/crm/contacts/${selectedContactId}`);
  };

  const handleAddNote = async () => {
    if (!selectedConversation || !selectedContactId) {
      toast.warn("Select a conversation with a linked contact to add notes.");
      return;
    }

    const content = noteDraft.trim();
    if (!content) {
      toast.warn("Type something for the note before saving.");
      return;
    }

    if (isSavingNote) return;

    const title =
      content.length > 50 ? `${content.substring(0, 50)}…` : content;

    const dto = {
      contactId: selectedContactId,
      title,
      content,
      source: "Inbox",
      createdBy:
        localStorage.getItem("userName") ||
        localStorage.getItem("email") ||
        "Agent",
      isPinned: false,
      isInternal: true,
    };

    setIsSavingNote(true);
    try {
      await axiosClient.post("/notes", dto);
      toast.success("Note added.");
      setNoteDraft("");
      await refreshContactSummary();
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.title ||
          "Failed to add note from inbox."
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAddReminder = async () => {
    if (!selectedConversation || !selectedContactId) {
      toast.warn(
        "Select a conversation with a linked contact to add reminders."
      );
      return;
    }

    const title = reminderTitle.trim();
    if (!title) {
      toast.warn("Enter a reminder title.");
      return;
    }
    if (!reminderDueAt) {
      toast.warn("Choose a due date/time for the reminder.");
      return;
    }

    const dueIso = toIsoFromDatetimeLocal(reminderDueAt);
    if (!dueIso) {
      toast.error("Invalid reminder date/time.");
      return;
    }

    if (isSavingReminder) return;

    const dto = {
      contactId: selectedContactId,
      title,
      description: reminderDescription || "",
      dueAt: dueIso,
      reminderType: "FollowUp",
      priority: 2,
      isRecurring: false,
      recurrencePattern: "",
      sendWhatsappNotification: false,
      linkedCampaign: "",
      status: "Pending",
      createdBy:
        localStorage.getItem("userName") ||
        localStorage.getItem("email") ||
        "Agent",
    };

    setIsSavingReminder(true);
    try {
      await axiosClient.post("/reminders", dto);
      toast.success("Reminder added.");
      setReminderTitle("");
      setReminderDueAt("");
      setReminderDescription("");
      await refreshContactSummary();
    } catch (error) {
      console.error("Failed to add reminder:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.title ||
          "Failed to add reminder from inbox."
      );
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleUpdateNote = async note => {
    if (!note?.id) return;
    const content = editNoteContent.trim();
    if (!content) {
      toast.warn("Note content cannot be empty.");
      return;
    }
    if (!selectedContactId) return;
    if (isUpdatingNote) return;

    const title =
      content.length > 50 ? `${content.substring(0, 50)}…` : content;

    const dto = {
      contactId: selectedContactId,
      title,
      content,
      source: note.source || "Inbox",
      createdBy:
        localStorage.getItem("userName") ||
        localStorage.getItem("email") ||
        "Agent",
      isPinned: !!note.isPinned,
      isInternal: note.isInternal ?? true,
    };

    setIsUpdatingNote(true);
    try {
      await axiosClient.put(`/notes/${note.id}`, dto);
      toast.success("Note updated.");
      setEditingNoteId(null);
      setEditNoteContent("");
      await refreshContactSummary();
    } catch (error) {
      console.error("Failed to update note:", error);
      toast.error(error.response?.data?.message || "Failed to update note.");
    } finally {
      setIsUpdatingNote(false);
    }
  };

  const handleUpdateReminder = async reminder => {
    if (!reminder?.id) return;
    if (!selectedContactId) return;

    const title = editReminderTitle.trim();
    if (!title) {
      toast.warn("Reminder title cannot be empty.");
      return;
    }

    const dueIso = toIsoFromDatetimeLocal(editReminderDueAt);
    if (!dueIso) {
      toast.warn("Pick a valid due date/time.");
      return;
    }

    if (isUpdatingReminder) return;

    const dto = {
      contactId: selectedContactId,
      title,
      description: editReminderDescription || "",
      dueAt: dueIso,
      status: reminder.status || "Pending",
      reminderType: reminder.reminderType || "FollowUp",
      priority: reminder.priority ?? 2,
      isRecurring: !!reminder.isRecurring,
      recurrencePattern: reminder.recurrencePattern || "",
      sendWhatsappNotification: !!reminder.sendWhatsappNotification,
      linkedCampaign: reminder.linkedCampaign || "",
      createdBy:
        localStorage.getItem("userName") ||
        localStorage.getItem("email") ||
        "Agent",
    };

    setIsUpdatingReminder(true);
    try {
      await axiosClient.put(`/reminders/${reminder.id}`, dto);
      toast.success("Reminder updated.");
      setEditingReminderId(null);
      setEditReminderTitle("");
      setEditReminderDueAt("");
      setEditReminderDescription("");
      await refreshContactSummary();
    } catch (error) {
      console.error("Failed to update reminder:", error);
      toast.error(
        error.response?.data?.message || "Failed to update reminder."
      );
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  const openDeleteConfirm = (type, item) => {
    setConfirmState({
      open: true,
      type,
      id: item?.id || null,
      title: type === "note" ? "Delete note?" : "Delete reminder?",
    });
  };

  const closeConfirm = () => {
    if (confirmBusy) return;
    setConfirmState({ open: false, type: null, id: null, title: "" });
  };

  const executeDelete = async () => {
    if (!confirmState?.id || !confirmState?.type) return;
    setConfirmBusy(true);

    try {
      if (confirmState.type === "note") {
        await axiosClient.delete(`/notes/${confirmState.id}`);
        toast.info("Note deleted.");
      } else if (confirmState.type === "reminder") {
        await axiosClient.delete(`/reminders/${confirmState.id}`);
        toast.info("Reminder deleted.");
      }
      await refreshContactSummary();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(error.response?.data?.message || "Delete failed.");
    } finally {
      setConfirmBusy(false);
      closeConfirm();
    }
  };

  const tagsList =
    (contactSummary?.tags ??
      contactSummary?.contactTags ??
      contactSummary?.contactTagsDto ??
      []) ||
    [];

  const recentNotes = contactSummary?.recentNotes ?? [];
  const nextReminder = contactSummary?.nextReminder ?? null;
  const recentTimeline = contactSummary?.recentTimeline ?? [];

  return {
    activeTab,
    allConversations,
    closeConfirm,
    confirmBusy,
    confirmState,
    connection,
    contactSummary,
    conversationContext,
    conversationsHasMore,
    conversationsNextCursor,
    conversationsRef,
    currentUserId,
    editNoteContent,
    editReminderDescription,
    editReminderDueAt,
    editReminderTitle,
    editingNoteId,
    editingReminderId,
    executeDelete,
    fetchConversations,
    fetchConversationsPage,
    filteredConversations,
    agents,
    isAgentsLoading,
    handleAddNote,
    handleAddReminder,
    handleAssignToMe,
    handleAssignToAgent,
    handleComposerKeyDown,
    handleOpenFullCrm,
    handleReceiveInboxMessage,
    handleRemoveTag,
    handleSendMessage,
    handleSendTemplateMessage,
    handleUploadAndSendMedia,
    handleSendLocation,
    handleOpenMedia,
    handleCloseMediaViewer,
    ensureImagePreview,
    ensurePdfPreview,
    handleUnassign,
    handleUnreadCountChanged,
    handleUpdateConversationStatus,
    handleUpdateNote,
    handleUpdateReminder,
    headerAssignedName,
    headerIsAssigned,
    headerIsAssignedToMe,
    isAssigning,
    isConnected,
    isContextLoading,
    isLoading,
    isConversationsLoadingMore,
    isMessagesLoading,
    isMessagesLoadingOlder,
    isSavingNote,
    isSavingReminder,
    isSending,
    isUploadingMedia,
    isSummaryLoading,
    isTagModalOpen,
    isUpdatingStatus,
    isUpdatingNote,
    isUpdatingReminder,
    isWithin24h,
    isConversationClosed,
    messages,
    messagesEndRef,
    messagesHasMore,
    messagesNextCursor,
    fetchMessagesPage,
    messagesWithSeparators,
    navigate,
    newMessage,
    nextReminder,
    noteDraft,
    openDeleteConfirm,
    recentNotes,
    recentTimeline,
    refreshContactSummary,
    refreshConversationContext,
    reminderDescription,
    reminderDueAt,
    reminderTitle,
    removingTagId,
    scrollToBottom,
    searchTerm,
    selectedContactId,
    selectedConversation,
    selectedConversationId,
    selectedConversationRef,
    selectedNumberId,
    setActiveTab,
    setAllConversations,
    setConfirmBusy,
    setConfirmState,
    setContactSummary,
    setConversationContext,
    setEditNoteContent,
    setEditReminderDescription,
    setEditReminderDueAt,
    setEditReminderTitle,
    setEditingNoteId,
    setEditingReminderId,
    setIsAssigning,
    setIsLoading,
    setIsMessagesLoading,
    setIsSavingNote,
    setIsSavingReminder,
    setIsSending,
    setIsUploadingMedia,
    setIsContextLoading,
    setIsSummaryLoading,
    setIsTagModalOpen,
    setIsUpdatingNote,
    setIsUpdatingReminder,
    setMessages,
    setNewMessage,
    setNoteDraft,
    setReminderDescription,
    setReminderDueAt,
    setReminderTitle,
    setRemovingTagId,
    setSearchTerm,
    setSelectedConversationId,
    setSelectedNumberId,
    setShowCrmPanel,
    setShowDetails,
    setShowMiniTimeline,
    setShowRightPanel,
    showCrmPanel,
    showDetails,
    showMiniTimeline,
    showRightPanel,
    tagsList,
    mediaObjectUrlById,
    pdfPreviewById,
    mediaViewer,
    handleMediaViewerPrev,
    handleMediaViewerNext,
    handleMediaViewerSelectIndex,
  };
}

// import { useState, useMemo, useCallback, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { toast } from "react-toastify";
// import useInboxSignalR from "./useInboxSignalR";
// import axiosClient from "../api/chatInboxApi";
// import {
//   inferIsInboundFromAny,
//   mapHubMessageToChat,
// } from "../utils/messageMapping";
// import { toIsoFromDatetimeLocal } from "../utils/dateUtils";
// import { formatDayLabel } from "../utils/formatters";

// const parseConversationStatus = status => {
//   const raw = String(status ?? "").trim().toLowerCase();
//   if (raw === "open") return "Open";
//   if (raw === "pending") return "Pending";
//   if (raw === "closed") return "Closed";
//   return null;
// };

// export function useChatInboxController() {
//   const navigate = useNavigate();

//   // 🔌 SignalR connection
//   const { connection, isConnected } = useInboxSignalR();

//   // 🔹 Filters & selection
//   const [activeTab, setActiveTab] = useState("live");
//   const [selectedNumberId, setSelectedNumberId] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");

//   // 🔹 Data from backend
//   const [allConversations, setAllConversations] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   // 🔹 Selected conversation & message input
//   const [selectedConversationId, setSelectedConversationId] = useState(null);
//   const [newMessage, setNewMessage] = useState("");

//   // 🔹 Messages for selected conversation
//   const [messages, setMessages] = useState([]);
//   const [isMessagesLoading, setIsMessagesLoading] = useState(false);

//   // 🔹 Sending & assignment state
//   const [isSending, setIsSending] = useState(false);
//   const [isAssigning, setIsAssigning] = useState(false);
//   const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

//   const [agents, setAgents] = useState([]);
//   const [isAgentsLoading, setIsAgentsLoading] = useState(false);

//   // 🔹 CRM summary for right panel
//   const [contactSummary, setContactSummary] = useState(null);
//   const [isSummaryLoading, setIsSummaryLoading] = useState(false);

//   // 🔹 Quick CRM actions (notes + reminders)
//   const [noteDraft, setNoteDraft] = useState("");
//   const [isSavingNote, setIsSavingNote] = useState(false);

//   const [reminderTitle, setReminderTitle] = useState("");
//   const [reminderDueAt, setReminderDueAt] = useState("");
//   const [reminderDescription, setReminderDescription] = useState("");
//   const [isSavingReminder, setIsSavingReminder] = useState(false);

//   // ✅ Edit state: Notes
//   const [editingNoteId, setEditingNoteId] = useState(null);
//   const [editNoteContent, setEditNoteContent] = useState("");
//   const [isUpdatingNote, setIsUpdatingNote] = useState(false);

//   // ✅ Edit state: Reminder
//   const [editingReminderId, setEditingReminderId] = useState(null);
//   const [editReminderTitle, setEditReminderTitle] = useState("");
//   const [editReminderDueAt, setEditReminderDueAt] = useState("");
//   const [editReminderDescription, setEditReminderDescription] = useState("");
//   const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);

//   // ✅ Confirm dialog
//   const [confirmState, setConfirmState] = useState({
//     open: false,
//     type: null, // "note" | "reminder"
//     id: null,
//     title: "",
//   });
//   const [confirmBusy, setConfirmBusy] = useState(false);

//   // 🔹 Tag modal state
//   const [isTagModalOpen, setIsTagModalOpen] = useState(false);

//   // ✅ NEW: tag remove state (simple, MVP)
//   const [removingTagId, setRemovingTagId] = useState(null);

//   // Right panel toggles
//   const [showRightPanel, setShowRightPanel] = useState(true);
//   const [showDetails, setShowDetails] = useState(true);
//   const [showCrmPanel, setShowCrmPanel] = useState(true);
//   const [showMiniTimeline, setShowMiniTimeline] = useState(true); // (kept as-is)

//   // 🔽 Auto-scroll anchor for chat messages
//   const messagesEndRef = useRef(null);

//   // ✅ Patch: stop the "refresh scroll" feeling
//   const scrollToBottom = useCallback(() => {
//     if (messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({
//         behavior: "auto",
//         block: "end",
//       });
//     }
//   }, []);

//   const currentUserId = useMemo(() => localStorage.getItem("userId"), []);

//   // 🧮 Selected conversation
//   const selectedConversation = useMemo(
//     () => allConversations.find(c => c.id === selectedConversationId) || null,
//     [allConversations, selectedConversationId]
//   );

//   // ✅ Fix #3: prevent stale selectedConversation inside SignalR handlers
//   const selectedConversationRef = useRef(null);
//   useEffect(() => {
//     selectedConversationRef.current = selectedConversation;
//   }, [selectedConversation]);

//   // ✅ Patch: keep latest conversations without making message-loading re-run
//   const conversationsRef = useRef([]);
//   useEffect(() => {
//     conversationsRef.current = allConversations;
//   }, [allConversations]);

//   // Stable contactId for effects
//   const selectedContactId = useMemo(
//     () => selectedConversation?.contactId || null,
//     [selectedConversation]
//   );

//   // 🧮 24h window flag
//   const isWithin24h = selectedConversation?.within24h ?? false;
//   const selectedConversationStatus =
//     parseConversationStatus(selectedConversation?.status) ?? "Open";
//   const isConversationClosed = selectedConversationStatus === "Closed";

//   // 🧮 Assignment flags for header
//   const headerIsAssigned = !!selectedConversation?.assignedToUserId;
//   const headerIsAssignedToMe =
//     !!selectedConversation?.isAssignedToMe ||
//     (!!selectedConversation?.assignedToUserId &&
//       currentUserId &&
//       selectedConversation.assignedToUserId === currentUserId);
//   const headerAssignedName = headerIsAssignedToMe
//     ? "You"
//     : selectedConversation?.assignedToUserName || "Agent";

//   // ✅ Reset edit state when switching contact
//   useEffect(() => {
//     setEditingNoteId(null);
//     setEditNoteContent("");
//     setEditingReminderId(null);
//     setEditReminderTitle("");
//     setEditReminderDueAt("");
//     setEditReminderDescription("");
//   }, [selectedContactId]);

//   // 🧮 Filter + sort conversations
//   const filteredConversations = useMemo(() => {
//     let list = [...allConversations];
//     const tabKey = activeTab === "history" ? "older" : activeTab;

//     if (selectedNumberId !== "all") {
//       list = list.filter(c => c.numberId === selectedNumberId);
//     }

//     if (searchTerm.trim()) {
//       const q = searchTerm.trim().toLowerCase();
//       list = list.filter(
//         c =>
//           c.contactName?.toLowerCase().includes(q) ||
//           c.contactPhone?.toLowerCase().includes(q) ||
//           c.lastMessagePreview?.toLowerCase().includes(q)
//       );
//     }

//     if (tabKey === "closed") {
//       list = list.filter(c => parseConversationStatus(c.status) === "Closed");
//     } else {
//       list = list.filter(c => parseConversationStatus(c.status) !== "Closed");
//     }

//     if (tabKey === "live") {
//       list = list.filter(c => c.within24h);
//     } else if (tabKey === "older") {
//       list = list.filter(c => !c.within24h);
//     } else if (tabKey === "unassigned") {
//       list = list.filter(c => !c.assignedToUserId);
//     } else if (tabKey === "my") {
//       if (currentUserId) {
//         list = list.filter(c => c.assignedToUserId === currentUserId);
//       }
//     }

//     // 🔽 Sort: unread first, then most recent lastMessageAt
//     list.sort((a, b) => {
//       const aUnread = a.unreadCount > 0;
//       const bUnread = b.unreadCount > 0;

//       if (aUnread && !bUnread) return -1;
//       if (!aUnread && bUnread) return 1;

//       const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
//       const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

//       return bTime - aTime; // newest first
//     });

//     return list;
//   }, [
//     allConversations,
//     activeTab,
//     selectedNumberId,
//     searchTerm,
//     currentUserId,
//   ]);

//   // 🛰 Load conversations (supports "silent" refresh)
//   const fetchConversations = useCallback(
//     async (options = {}) => {
//       const { limit, silent } = options;

//       try {
//         if (!silent) setIsLoading(true);

//         const businessId = localStorage.getItem("businessId");

//         if (!businessId) {
//           toast.error(
//             "❌ Missing business context. Please login again to load inbox."
//           );
//           if (!silent) setIsLoading(false);
//           return;
//         }

//         const params = {
//           businessId,
//           currentUserId,
//           tab: activeTab === "history" ? "older" : activeTab,
//           numberId:
//             selectedNumberId && selectedNumberId !== "all"
//               ? selectedNumberId
//               : undefined,
//           search: searchTerm || undefined,
//           limit: limit ?? 100,
//         };

//         const res = await axiosClient.get("/chat-inbox/conversations", {
//           params,
//         });

//         const apiItems = Array.isArray(res.data) ? res.data : [];

//         const mapped = apiItems.map(item => ({
//           id: item.id,
//           contactId: item.contactId,
//           contactName: item.contactName,
//           contactPhone: item.contactPhone,
//           lastMessagePreview: item.lastMessagePreview,
//           lastMessageAt: item.lastMessageAt,
//           unreadCount: item.unreadCount || 0,
//           status: parseConversationStatus(item.status) ?? "Open",
//           numberId: item.numberId,
//           numberLabel: item.numberLabel,
//           within24h: !!item.within24h,
//           assignedToUserId: item.assignedToUserId || null,
//           assignedToUserName: item.assignedToUserName || null,
//           isAssignedToMe: !!item.isAssignedToMe,
//           sourceType: item.sourceType || "WhatsApp",
//           sourceName: item.sourceName || "WhatsApp",
//           mode: item.mode || "Live",
//           firstSeenAt: item.firstSeenAt,
//           lastInboundAt: item.lastInboundAt,
//           lastOutboundAt: item.lastOutboundAt,
//         }));

//         // ✅ Fix: silent refresh should not "erase" unread counts you already have in UI
//         setAllConversations(prev => {
//           if (!silent) return mapped;

//           const prevMap = new Map(prev.map(c => [c.id, c]));

//           return mapped.map(nc => {
//             const old = prevMap.get(nc.id);
//             if (!old) return nc;

//             // Never preserve unread for the currently open chat
//             if (selectedConversationId && nc.id === selectedConversationId)
//               return nc;

//             // Preserve unread if server temporarily returns 0
//             if ((nc.unreadCount ?? 0) === 0 && (old.unreadCount ?? 0) > 0) {
//               return { ...nc, unreadCount: old.unreadCount };
//             }

//             return nc;
//           });
//         });

//         if (!selectedConversationId && mapped.length > 0) {
//           setSelectedConversationId(mapped[0].id);
//         }
//       } catch (error) {
//         console.error("❌ Failed to load inbox conversations:", error);
//         const message =
//           error.response?.data?.message ||
//           "Failed to load inbox conversations.";
//         toast.error(message);
//       } finally {
//         if (!options.silent) setIsLoading(false);
//       }
//     },
//     [
//       activeTab,
//       selectedNumberId,
//       searchTerm,
//       selectedConversationId,
//       currentUserId,
//     ]
//   );

//   // Initial + filter-based load
//   useEffect(() => {
//     fetchConversations();
//   }, [activeTab, selectedNumberId, searchTerm, fetchConversations]);

//   const fetchAgents = useCallback(async () => {
//     const businessId = localStorage.getItem("businessId");
//     if (!businessId) return;

//     setIsAgentsLoading(true);
//     try {
//       const res = await axiosClient.get("/chat-inbox/agents", {
//         params: { businessId },
//       });

//       const items = Array.isArray(res.data) ? res.data : [];
//       const mapped = items
//         .map(a => ({
//           userId: a.userId ?? a.id ?? null,
//           name: a.name ?? a.fullName ?? a.displayName ?? a.email ?? "Agent",
//           email: a.email ?? null,
//           roleName: a.roleName ?? a.role ?? null,
//         }))
//         .filter(a => a.userId);

//       setAgents(mapped);
//     } catch (error) {
//       setAgents([]);
//     } finally {
//       setIsAgentsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchAgents();
//   }, [fetchAgents]);

//   // 🔁 Auto-refresh conversations every 25 seconds (silent, no flicker)
//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       fetchConversations({ silent: true, limit: 100 });
//     }, 25000);

//     return () => clearInterval(intervalId);
//   }, [fetchConversations]);

//   // 🛰 Load messages for selected conversation
//   useEffect(() => {
//     const loadMessages = async () => {
//       if (!selectedConversationId) {
//         setMessages([]);
//         return;
//       }

//       const conv = conversationsRef.current.find(
//         c => c.id === selectedConversationId
//       );

//       if (!conv) {
//         setMessages([]);
//         return;
//       }

//       const businessId = localStorage.getItem("businessId");
//       if (!businessId) {
//         toast.error(
//           "❌ Missing business context. Please login again to load messages."
//         );
//         return;
//       }

//       try {
//         setIsMessagesLoading(true);

//         const res = await axiosClient.get("/chat-inbox/messages", {
//           params: {
//             businessId,
//             contactPhone: conv.contactPhone,
//             limit: 100,
//           },
//         });

//         const apiItems = Array.isArray(res.data) ? res.data : [];

//         const mapped = apiItems
//           .map(m => {
//             const isInbound = inferIsInboundFromAny(m);

//             const directionRaw =
//               m.direction ?? m.Direction ?? m.dir ?? m.messageDirection ?? "";
//             const statusRaw = m.status ?? "";

//             const providerMessageId =
//               m.providerMessageId ?? m.ProviderMessageId ?? null;
//             const messageLogId =
//               m.messageLogId ?? m.MessageLogId ?? m.messageLogID ?? null;
//             const messageId =
//               m.messageId ??
//               m.MessageId ??
//               m.wamid ??
//               m.Wamid ??
//               m.waMessageId ??
//               m.WaMessageId ??
//               providerMessageId ??
//               null;
//             const clientMessageId =
//               m.clientMessageId ?? m.ClientMessageId ?? null;

//             return {
//               id: m.id ?? messageLogId ?? messageId,
//               serverId: messageLogId ?? m.id ?? null,
//               messageLogId: messageLogId ?? m.id ?? null,
//               messageId,
//               providerMessageId,
//               clientMessageId,
//               direction: directionRaw || (isInbound ? "in" : "out"),
//               isInbound,
//               text: m.text || m.message || m.body || m.content || "",
//               sentAt: m.sentAtUtc || m.sentAt || m.createdAt || m.timestamp,
//               status: statusRaw,
//               errorMessage: m.errorMessage,
//             };
//           })
//           .reverse();

//         setMessages(mapped);
//       } catch (error) {
//         console.error("❌ Failed to load messages:", error);
//         const message =
//           error.response?.data?.message || "Failed to load messages.";
//         toast.error(message);
//         setMessages([]);
//       } finally {
//         setIsMessagesLoading(false);
//       }
//     };

//     loadMessages();
//   }, [selectedConversationId]);

//   // 🔔 Mark as read when opening a conversation (HTTP + SignalR)
//   useEffect(() => {
//     if (!selectedConversationId) return;
//     if (!selectedConversation?.contactId) return;

//     const businessId = localStorage.getItem("businessId");
//     const userId = localStorage.getItem("userId");

//     if (!businessId || !userId) return;

//     const payload = {
//       businessId,
//       contactId: selectedConversation.contactId,
//       userId,
//     };

//     axiosClient.post("/chat-inbox/mark-read", payload).catch(err => {
//       console.error("Failed to mark conversation as read:", err);
//     });

//     if (connection && isConnected) {
//       connection
//         .invoke("MarkAsRead", selectedConversation.contactId)
//         .catch(err => {
//           console.warn("SignalR MarkAsRead failed (non-fatal):", err);
//         });
//     }

//     setAllConversations(prev =>
//       prev.map(c =>
//         c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c
//       )
//     );
//   }, [
//     selectedConversationId,
//     selectedConversation?.contactId,
//     connection,
//     isConnected,
//   ]);

//   // 🔁 Helper to (re)load CRM contact summary
//   const refreshContactSummary = useCallback(async () => {
//     if (!selectedContactId) {
//       setContactSummary(null);
//       return;
//     }

//     try {
//       setIsSummaryLoading(true);
//       const res = await axiosClient.get(
//         `/crm/contact-summary/${selectedContactId}`
//       );
//       const payload = res.data?.data ?? res.data;
//       setContactSummary(payload || null);
//     } catch (error) {
//       console.error("❌ Failed to load contact summary:", error);
//       setContactSummary(null);
//     } finally {
//       setIsSummaryLoading(false);
//     }
//   }, [selectedContactId]);

//   // 🛰 Load CRM contact summary for right panel
//   useEffect(() => {
//     if (!selectedContactId) {
//       setContactSummary(null);
//       return;
//     }
//     refreshContactSummary();
//   }, [selectedContactId, refreshContactSummary]);

//   // ✅ NEW: remove/unassign tag from contact (MVP)
//   const handleRemoveTag = useCallback(
//     async tag => {
//       if (!selectedContactId) {
//         toast.warn("No contact selected.");
//         return;
//       }

//       const tagId = tag?.id || tag?.tagId;
//       const tagName = tag?.tagName || tag?.name || "tag";

//       if (!tagId) {
//         toast.error("Cannot remove this tag (missing tagId).");
//         return;
//       }

//       if (removingTagId) return;

//       // Optimistic UI: remove it from contactSummary immediately
//       setContactSummary(prev => {
//         if (!prev) return prev;
//         const removeFrom = arr =>
//           Array.isArray(arr)
//             ? arr.filter(t => (t?.id || t?.tagId) !== tagId)
//             : arr;

//         return {
//           ...prev,
//           tags: removeFrom(prev.tags),
//           contactTags: removeFrom(prev.contactTags),
//           contactTagsDto: removeFrom(prev.contactTagsDto),
//         };
//       });

//       setRemovingTagId(tagId);

//       try {
//         const body = {
//           contactIds: [selectedContactId],
//           tagId,
//         };

//         // ✅ Your console showed POST got 405.
//         // So we try DELETE first, then fallback to POST if needed.
//         try {
//           await axiosClient.request({
//             url: "/contacts/bulk-unassign-tag",
//             method: "DELETE",
//             data: body, // axios supports sending body with DELETE via request()
//           });
//         } catch (err) {
//           const status = err?.response?.status;

//           // fallback to POST if backend expects POST
//           if (status === 404 || status === 405) {
//             await axiosClient.post("/contacts/bulk-unassign-tag", body);
//           } else {
//             throw err;
//           }
//         }

//         toast.success(`Removed "${tagName}"`);
//         await refreshContactSummary();
//       } catch (error) {
//         console.error("Failed to remove tag:", error);
//         toast.error(
//           error?.response?.data?.message || `Failed to remove "${tagName}".`
//         );
//         // revert by reloading from server
//         await refreshContactSummary();
//       } finally {
//         setRemovingTagId(null);
//       }
//     },
//     [selectedContactId, removingTagId, refreshContactSummary]
//   );

//   // Auto-scroll when messages change
//   useEffect(() => {
//     if (!selectedConversationId) return;
//     if (isMessagesLoading) return;
//     if (messages.length === 0) return;

//     scrollToBottom();
//   }, [messages, isMessagesLoading, selectedConversationId, scrollToBottom]);

//   // 🧮 Messages + date separators
//   const messagesWithSeparators = useMemo(() => {
//     const result = [];
//     let lastDateKey = null;

//     messages.forEach(m => {
//       const dateObj = m.sentAt ? new Date(m.sentAt) : null;
//       const key = dateObj ? dateObj.toDateString() : "unknown";

//       if (key !== lastDateKey) {
//         if (dateObj) {
//           result.push({
//             type: "separator",
//             id: `sep-${key}`,
//             label: formatDayLabel(dateObj),
//           });
//         }
//         lastDateKey = key;
//       }

//       result.push({ type: "message", ...m });
//     });

//     return result;
//   }, [messages]);

//   // 🔔 SignalR: ReceiveInboxMessage handler
//   const handleReceiveInboxMessage = useCallback(
//     payload => {
//       if (!payload) return;

//       const contactId = payload.contactId ?? payload.ContactId ?? null;
//       const conversationId =
//         payload.conversationId ?? payload.ConversationId ?? null;

//       const mappedMsg = mapHubMessageToChat(payload);
//       if (!mappedMsg) return;

//       // 1) Update messages if this conversation is open
//       // 1) Update messages if this conversation is open
//       setMessages(prev => {
//         const openConv = selectedConversationRef.current;
//         if (!openConv) return prev;

//         const matchesOpenConversation =
//           (conversationId && openConv.id && openConv.id === conversationId) ||
//           (contactId &&
//             openConv.contactId &&
//             openConv.contactId === contactId) ||
//           (payload.contactPhone &&
//             openConv.contactPhone &&
//             openConv.contactPhone === payload.contactPhone);

//         if (!matchesOpenConversation) return prev;

//         // ✅ Merge-by-identity: update existing bubble when a status update arrives
//         const sameMessage = (existing, incoming, raw) => {
//           const incMessageId =
//             incoming?.messageId ||
//             raw?.messageId ||
//             raw?.MessageId ||
//             raw?.wamid ||
//             raw?.Wamid ||
//             null;

//           const incClientId =
//             incoming?.clientMessageId ||
//             raw?.clientMessageId ||
//             raw?.ClientMessageId ||
//             raw?.clientId ||
//             null;

//           // Priority: WAMID → clientMessageId → id/serverId
//           if (
//             existing?.messageId &&
//             incMessageId &&
//             existing.messageId === incMessageId
//           )
//             return true;

//           if (
//             existing?.clientMessageId &&
//             incClientId &&
//             existing.clientMessageId === incClientId
//           )
//             return true;

//           if (existing?.id && incoming?.id && existing.id === incoming.id)
//             return true;

//           // Sometimes the hub uses wamid as id
//           if (existing?.id && incMessageId && existing.id === incMessageId)
//             return true;

//           // If you store serverId on messages (you do), match against it
//           if (
//             existing?.serverId &&
//             incoming?.id &&
//             existing.serverId === incoming.id
//           )
//             return true;

//           return false;
//         };

//         const idx = prev.findIndex(m => sameMessage(m, mappedMsg, payload));

//         // ✅ If we already have it, UPDATE status/time/error instead of adding duplicate
//         if (idx >= 0) {
//           const existing = prev[idx];

//           const merged = {
//             ...existing,
//             ...mappedMsg,

//             // keep old text if hub sends status-only event
//             text: mappedMsg.text || existing.text,

//             // keep old time if hub sends weird/empty
//             sentAt: mappedMsg.sentAt || existing.sentAt,

//             // status should move forward (prefer incoming)
//             status: mappedMsg.status || existing.status,

//             // preserve ids if incoming is missing them
//             messageId: mappedMsg.messageId || existing.messageId || null,
//             clientMessageId:
//               mappedMsg.clientMessageId || existing.clientMessageId || null,
//             serverId: existing.serverId ?? null,

//             errorMessage:
//               mappedMsg.errorMessage ?? existing.errorMessage ?? null,
//           };

//           const next = [...prev];
//           next[idx] = merged;
//           return next;
//         }

//         // ✅ Otherwise append as new bubble
//         return [...prev, mappedMsg];
//       });

//       // 2) Update conversations list
//       let matched = false;

//       setAllConversations(prev => {
//         const openConv = selectedConversationRef.current;

//         const next = prev.map(c => {
//           const isMatch =
//             (conversationId && c.id === conversationId) ||
//             (contactId && c.contactId === contactId) ||
//             (payload.contactPhone && c.contactPhone === payload.contactPhone);

//           if (!isMatch) return c;

//           matched = true;

//           const isOpen =
//             !!openConv &&
//             ((openConv.id && c.id === openConv.id) ||
//               (openConv.contactId && c.contactId === openConv.contactId));

//           const nextUnread =
//             mappedMsg.isInbound && !isOpen
//               ? (c.unreadCount ?? 0) + 1
//               : c.unreadCount ?? 0;

//           return {
//             ...c,
//             lastMessagePreview: mappedMsg.text || c.lastMessagePreview,
//             lastMessageAt: mappedMsg.sentAt || c.lastMessageAt,
//             lastInboundAt: mappedMsg.isInbound
//               ? mappedMsg.sentAt || c.lastInboundAt
//               : c.lastInboundAt,
//             lastOutboundAt: !mappedMsg.isInbound
//               ? mappedMsg.sentAt || c.lastOutboundAt
//               : c.lastOutboundAt,
//             within24h: mappedMsg.isInbound ? true : c.within24h,
//             status:
//               mappedMsg.isInbound &&
//               parseConversationStatus(c.status) === "Closed"
//                 ? "Open"
//                 : c.status,
//             unreadCount: isOpen ? 0 : nextUnread,
//           };
//         });

//         return next;
//       });

//       if (!matched) {
//         fetchConversations({ silent: true, limit: 100 });
//       }
//     },
//     [fetchConversations]
//   );

//   // 🔔 SignalR: UnreadCountChanged handler
//   const handleUnreadCountChanged = useCallback(
//     payload => {
//       if (!payload) return;

//       if (payload.refresh) {
//         fetchConversations({ silent: true, limit: 100 });
//         return;
//       }

//       if (payload.contactId) {
//         const hasUnread =
//           typeof payload.unreadCount === "number" &&
//           !Number.isNaN(payload.unreadCount);

//         if (!hasUnread) return;

//         setAllConversations(prev =>
//           prev.map(c =>
//             c.contactId === payload.contactId
//               ? { ...c, unreadCount: payload.unreadCount }
//               : c
//           )
//         );
//         return;
//       }

//       if (Array.isArray(payload.items)) {
//         const map = new Map();
//         payload.items.forEach(item => {
//           if (!item?.contactId) return;
//           if (typeof item.unreadCount !== "number") return;
//           map.set(item.contactId, item.unreadCount);
//         });

//         if (map.size === 0) return;

//         setAllConversations(prev =>
//           prev.map(c =>
//             map.has(c.contactId)
//               ? { ...c, unreadCount: map.get(c.contactId) }
//               : c
//           )
//         );
//       }
//     },
//     [fetchConversations]
//   );

//   // 🔔 SignalR: MessageStatusChanged handler (outbound delivery/read ticks)
//   const handleMessageStatusChanged = useCallback(payload => {
//     if (!payload) return;

//     const openConv = selectedConversationRef.current;
//     if (!openConv) return;

//     const contactId = payload.contactId ?? payload.ContactId ?? null;
//     if (contactId && openConv.contactId && openConv.contactId !== contactId) {
//       return;
//     }

//     const messageLogId = payload.messageLogId ?? payload.MessageLogId ?? null;
//     const providerMessageId =
//       payload.providerMessageId ?? payload.ProviderMessageId ?? null;
//     const messageId = payload.messageId ?? payload.MessageId ?? null;
//     const nextStatus = payload.status ?? payload.Status ?? null;
//     if (!nextStatus) return;

//     const rank = s => {
//       const v = String(s || "")
//         .trim()
//         .toLowerCase();

//       if (!v) return 0;
//       if (v === "failed" || v === "error" || v.includes("fail")) return 99;
//       if (v === "read" || v === "seen" || v === "viewed" || v.includes("read"))
//         return 4;
//       if (v === "delivered" || v.includes("deliver")) return 3;
//       if (v === "sent") return 2;
//       if (
//         v === "queued" ||
//         v === "sending" ||
//         v === "pending" ||
//         v.includes("queue") ||
//         v.includes("send") ||
//         v.includes("progress")
//       )
//         return 1;

//       return 0;
//     };

//     setMessages(prev =>
//       prev.map(m => {
//         const matchesByLogId =
//           !!messageLogId && (m.id === messageLogId || m.serverId === messageLogId);

//         const matchesByProviderId =
//           !!providerMessageId &&
//           (m.providerMessageId === providerMessageId ||
//             m.messageId === providerMessageId ||
//             m.id === providerMessageId);

//         const matchesByMessageId =
//           !!messageId && (m.messageId === messageId || m.id === messageId);

//         const matches = matchesByLogId || matchesByProviderId || matchesByMessageId;
//         if (!matches) return m;

//         const currentRank = rank(m.status);
//         const nextRank = rank(nextStatus);
//         if (nextRank < currentRank) return m;

//         return { ...m, status: nextStatus };
//       })
//     );
//   }, []);

//   // 🔌 Subscribe to SignalR events
//   useEffect(() => {
//     if (!connection || !isConnected) return;

//     connection.on("ReceiveInboxMessage", handleReceiveInboxMessage);
//     connection.on("UnreadCountChanged", handleUnreadCountChanged);
//     connection.on("MessageStatusChanged", handleMessageStatusChanged);

//     return () => {
//       connection.off("ReceiveInboxMessage", handleReceiveInboxMessage);
//       connection.off("UnreadCountChanged", handleUnreadCountChanged);
//       connection.off("MessageStatusChanged", handleMessageStatusChanged);
//     };
//   }, [
//     connection,
//     isConnected,
//     handleReceiveInboxMessage,
//     handleUnreadCountChanged,
//     handleMessageStatusChanged,
//   ]);

//   // 📨 Send message (HTTP is source of truth)
//   // 📨 Send message (HTTP is source of truth)
//   const handleSendMessage = async () => {
//     if (!selectedConversation) {
//       toast.warn("Please select a conversation first.");
//       return;
//     }

//     if (isConversationClosed) {
//       toast.warn("This conversation is closed. Reopen it to reply.");
//       return;
//     }

//     if (!isWithin24h) {
//       toast.warn(
//         "This chat is outside the 24-hour WhatsApp window. Use a template or campaign to re-engage."
//       );
//       return;
//     }

//     const trimmed = newMessage.trim();
//     if (!trimmed) {
//       toast.warn("Type a message before sending.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     if (!businessId) {
//       toast.error("❌ Missing business context. Please login again.");
//       return;
//     }

//     if (isSending) return;

//     // Normalize statuses so StatusIcon mapping stays consistent
//     const normalizeStatus = raw => {
//       const s = String(raw || "")
//         .trim()
//         .toLowerCase();

//       if (!s) return null;

//       if (s.includes("fail") || s.includes("error") || s.includes("reject"))
//         return "Failed";

//       if (s.includes("read") || s === "seen" || s === "viewed") return "Read";
//       if (s.includes("deliver")) return "Delivered";

//       if (s === "sent") return "Sent";

//       // Anything "in-flight" should be Clock (not ✓)
//       if (
//         s.includes("queue") ||
//         s === "queued" ||
//         s.includes("send") ||
//         s === "sending" ||
//         s === "pending" ||
//         s.includes("accept") ||
//         s.includes("submit") ||
//         s.includes("process") ||
//         s.includes("progress")
//       ) {
//         return "Queued";
//       }

//       // safest default: still in-flight
//       return "Queued";
//     };

//     const tempId = `temp-${Date.now()}`;
//     const nowIso = new Date().toISOString();

//     const optimisticMsg = {
//       id: tempId,
//       clientMessageId: tempId, // ✅ lets SignalR/webhook reconcile later
//       direction: "out",
//       isInbound: false,
//       text: trimmed,
//       sentAt: nowIso,
//       status: "Queued", // ✅ IMPORTANT: never show ✓ optimistically
//       errorMessage: null,
//     };

//     setMessages(prev => [...prev, optimisticMsg]);

//     setNewMessage("");
//     setIsSending(true);

//     try {
//       const payload = {
//         businessId,
//         conversationId: selectedConversation.id,
//         contactId: selectedConversation.contactId,
//         to: selectedConversation.contactPhone,
//         text: trimmed,
//         numberId: selectedConversation.numberId,

//         // ✅ harmless if backend ignores it, super useful if backend stores/echoes it
//         clientMessageId: tempId,
//       };

//       const res = await axiosClient.post("/chat-inbox/send-message", payload);
//       const saved = res.data || {};

//       const finalSentAt =
//         saved.sentAtUtc || saved.sentAt || optimisticMsg.sentAt;

//       const finalSentAtIso =
//         finalSentAt instanceof Date ? finalSentAt.toISOString() : finalSentAt;

//       // ✅ Use backend status if present; otherwise stay "Queued"
//       const serverStatus = normalizeStatus(saved.status) || "Queued";

//       setMessages(prev =>
//         prev.map(m =>
//           m.id === tempId
//             ? {
//                 ...m,
//                 // Keep client id stable so we don’t create duplicates
//                 id: m.id,
//                 serverId: saved.id ?? null,
//                 messageId:
//                   saved.messageId ??
//                   saved.wamid ??
//                   saved.waMessageId ??
//                   saved.providerMessageId ??
//                   null,
//                 sentAt: finalSentAtIso,
//                 status: serverStatus,
//                 errorMessage: saved.errorMessage || null,
//               }
//             : m
//         )
//       );

//       // Update conversation preview/timestamps (don’t force within24h true on outbound)
//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 lastMessagePreview: trimmed,
//                 lastMessageAt: finalSentAtIso,
//                 lastOutboundAt: finalSentAtIso,
//               }
//             : c
//         )
//       );
//     } catch (error) {
//       console.error("❌ Failed to send message:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to send message. Please retry."
//       );

//       setMessages(prev =>
//         prev.map(m =>
//           m.id === tempId
//             ? { ...m, status: "Failed", errorMessage: "Not delivered" }
//             : m
//         )
//       );
//     } finally {
//       setIsSending(false);
//       scrollToBottom();
//     }
//   };

//   const handleComposerKeyDown = event => {
//     if (event.key === "Enter" && !event.shiftKey) {
//       event.preventDefault();
//       if (!isSending && newMessage.trim()) {
//         handleSendMessage();
//       }
//     }
//   };

//   // 👤 Assign conversation to me
//   const handleAssignToMe = async () => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before assigning.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     const userId = localStorage.getItem("userId");

//     if (!businessId || !userId) {
//       toast.error("Missing business or user context. Please login again.");
//       return;
//     }

//     if (isAssigning) return;

//     setIsAssigning(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//         userId,
//       };

//       await axiosClient.post("/chat-inbox/assign", payload);

//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 assignedToUserId: userId,
//                 assignedToUserName: "You",
//                 isAssignedToMe: true,
//               }
//             : c
//         )
//       );

//       await fetchConversations({ silent: true, limit: 100 });
//       toast.success("Conversation assigned to you.");
//     } catch (error) {
//       console.error("Failed to assign conversation:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to assign conversation."
//       );
//     } finally {
//       setIsAssigning(false);
//     }
//   };

//   // 🚫 Unassign conversation
//   const handleAssignToAgent = async assigneeUserId => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before assigning.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     if (!businessId) {
//       toast.error("Missing business context. Please login again.");
//       return;
//     }

//     const userId = String(assigneeUserId ?? "").trim();
//     if (!userId) {
//       toast.error("Select a valid agent to assign.");
//       return;
//     }

//     if (isAssigning) return;

//     setIsAssigning(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//         userId,
//       };

//       await axiosClient.post("/chat-inbox/assign", payload);

//       const myUserId = localStorage.getItem("userId");
//       const agentName =
//         agents.find(a => String(a.userId) === String(userId))?.name ?? "Agent";

//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 assignedToUserId: userId,
//                 assignedToUserName:
//                   myUserId && String(myUserId) === String(userId)
//                     ? "You"
//                     : agentName,
//                 isAssignedToMe:
//                   myUserId && String(myUserId) === String(userId),
//               }
//             : c
//         )
//       );

//       await fetchConversations({ silent: true, limit: 100 });

//       const tabKey = activeTab === "history" ? "older" : activeTab;
//       if (tabKey === "unassigned" || tabKey === "my") {
//         setSelectedConversationId(null);
//       }

//       toast.success("Conversation assigned.");
//     } catch (error) {
//       console.error("Failed to assign conversation:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to assign conversation."
//       );
//     } finally {
//       setIsAssigning(false);
//     }
//   };

//   const handleUnassign = async () => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before unassigning.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");

//     if (!businessId) {
//       toast.error("Missing business context. Please login again.");
//       return;
//     }

//     if (isAssigning) return;

//     setIsAssigning(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//       };

//       await axiosClient.post("/chat-inbox/unassign", payload);

//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id
//             ? {
//                 ...c,
//                 assignedToUserId: null,
//                 assignedToUserName: null,
//                 isAssignedToMe: false,
//               }
//             : c
//         )
//       );

//       await fetchConversations({ silent: true, limit: 100 });

//       const tabKey = activeTab === "history" ? "older" : activeTab;
//       if (tabKey === "my") {
//         setSelectedConversationId(null);
//       }

//       toast.info("Conversation unassigned.");
//     } catch (error) {
//       console.error("Failed to unassign conversation:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to unassign conversation."
//       );
//     } finally {
//       setIsAssigning(false);
//     }
//   };

//   // 🔗 Open full CRM (Contact 360 workspace)
//   const handleUpdateConversationStatus = async newStatus => {
//     if (!selectedConversation || !selectedConversation.contactId) {
//       toast.warn("Select a conversation before updating status.");
//       return;
//     }

//     if (!headerIsAssignedToMe) {
//       toast.error("Not allowed to update this conversation.");
//       return;
//     }

//     const businessId = localStorage.getItem("businessId");
//     if (!businessId) {
//       toast.error("Missing business context. Please login again.");
//       return;
//     }

//     const normalized = parseConversationStatus(newStatus);
//     if (!normalized) {
//       toast.error("Invalid status. Use Open, Pending, or Closed.");
//       return;
//     }

//     if (isUpdatingStatus) return;

//     const tabKey = activeTab === "history" ? "older" : activeTab;

//     setIsUpdatingStatus(true);
//     try {
//       const payload = {
//         businessId,
//         contactId: selectedConversation.contactId,
//         status: normalized,
//       };

//       try {
//         await axiosClient.post("/chat-inbox/set-status", payload);
//       } catch (e) {
//         const statusCode = e?.response?.status;
//         if (statusCode === 404) {
//           await axiosClient.post("/chat-inbox/status", payload);
//         } else {
//           throw e;
//         }
//       }

//       setAllConversations(prev =>
//         prev.map(c =>
//           c.id === selectedConversation.id ? { ...c, status: normalized } : c
//         )
//       );

//       if (
//         (tabKey === "closed" && normalized !== "Closed") ||
//         (tabKey !== "closed" && normalized === "Closed")
//       ) {
//         setSelectedConversationId(null);
//       }

//       await fetchConversations({ silent: true, limit: 100 });
//       toast.success("Status updated.");
//     } catch (error) {
//       console.error("Failed to update status:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to update status."
//       );
//     } finally {
//       setIsUpdatingStatus(false);
//     }
//   };

//   const handleOpenFullCrm = () => {
//     if (!selectedConversation) {
//       toast.info("Select a conversation first to open full CRM.");
//       return;
//     }
//     if (!selectedContactId) {
//       toast.info("No contact is linked to this conversation yet.");
//       return;
//     }
//     navigate(`/app/crm/contacts/${selectedContactId}`);
//   };

//   // 📝 Quick add note from Inbox
//   const handleAddNote = async () => {
//     if (!selectedConversation || !selectedContactId) {
//       toast.warn("Select a conversation with a linked contact to add notes.");
//       return;
//     }

//     const content = noteDraft.trim();
//     if (!content) {
//       toast.warn("Type something for the note before saving.");
//       return;
//     }

//     if (isSavingNote) return;

//     const title =
//       content.length > 50 ? `${content.substring(0, 50)}…` : content;

//     const dto = {
//       contactId: selectedContactId,
//       title,
//       content,
//       source: "Inbox",
//       createdBy:
//         localStorage.getItem("userName") ||
//         localStorage.getItem("email") ||
//         "Agent",
//       isPinned: false,
//       isInternal: true,
//     };

//     setIsSavingNote(true);
//     try {
//       await axiosClient.post("/notes", dto);

//       toast.success("Note added.");
//       setNoteDraft("");

//       await refreshContactSummary();
//     } catch (error) {
//       console.error("Failed to add note:", error);
//       toast.error(
//         error.response?.data?.message ||
//           error.response?.data?.title ||
//           "Failed to add note from inbox."
//       );
//     } finally {
//       setIsSavingNote(false);
//     }
//   };

//   // ⏰ Quick add reminder from Inbox
//   const handleAddReminder = async () => {
//     if (!selectedConversation || !selectedContactId) {
//       toast.warn(
//         "Select a conversation with a linked contact to add reminders."
//       );
//       return;
//     }

//     const title = reminderTitle.trim();
//     if (!title) {
//       toast.warn("Enter a reminder title.");
//       return;
//     }
//     if (!reminderDueAt) {
//       toast.warn("Choose a due date/time for the reminder.");
//       return;
//     }

//     const dueIso = toIsoFromDatetimeLocal(reminderDueAt);
//     if (!dueIso) {
//       toast.error("Invalid reminder date/time.");
//       return;
//     }

//     if (isSavingReminder) return;

//     const dto = {
//       contactId: selectedContactId,
//       title,
//       description: reminderDescription || "",
//       dueAt: dueIso,

//       reminderType: "FollowUp",
//       priority: 2,
//       isRecurring: false,
//       recurrencePattern: "",
//       sendWhatsappNotification: false,
//       linkedCampaign: "",
//       status: "Pending",

//       // ✅ add CreatedBy so your backend timeline logging never breaks
//       createdBy:
//         localStorage.getItem("userName") ||
//         localStorage.getItem("email") ||
//         "Agent",
//     };

//     setIsSavingReminder(true);
//     try {
//       await axiosClient.post("/reminders", dto);

//       toast.success("Reminder added.");
//       setReminderTitle("");
//       setReminderDueAt("");
//       setReminderDescription("");

//       await refreshContactSummary();
//     } catch (error) {
//       console.error("Failed to add reminder:", error);
//       toast.error(
//         error.response?.data?.message ||
//           error.response?.data?.title ||
//           "Failed to add reminder from inbox."
//       );
//     } finally {
//       setIsSavingReminder(false);
//     }
//   };

//   // ✅ Update note (inline edit)
//   const handleUpdateNote = async note => {
//     if (!note?.id) return;
//     const content = editNoteContent.trim();
//     if (!content) {
//       toast.warn("Note content cannot be empty.");
//       return;
//     }
//     if (!selectedContactId) return;

//     if (isUpdatingNote) return;

//     const title =
//       content.length > 50 ? `${content.substring(0, 50)}…` : content;

//     const dto = {
//       contactId: selectedContactId,
//       title,
//       content,
//       source: note.source || "Inbox",
//       createdBy:
//         localStorage.getItem("userName") ||
//         localStorage.getItem("email") ||
//         "Agent",
//       isPinned: !!note.isPinned,
//       isInternal: note.isInternal ?? true,
//     };

//     setIsUpdatingNote(true);
//     try {
//       await axiosClient.put(`/notes/${note.id}`, dto);
//       toast.success("Note updated.");
//       setEditingNoteId(null);
//       setEditNoteContent("");
//       await refreshContactSummary();
//     } catch (error) {
//       console.error("Failed to update note:", error);
//       toast.error(error.response?.data?.message || "Failed to update note.");
//     } finally {
//       setIsUpdatingNote(false);
//     }
//   };

//   // ✅ Update reminder (inline edit)
//   const handleUpdateReminder = async reminder => {
//     if (!reminder?.id) return;
//     if (!selectedContactId) return;

//     const title = editReminderTitle.trim();
//     if (!title) {
//       toast.warn("Reminder title cannot be empty.");
//       return;
//     }

//     const dueIso = toIsoFromDatetimeLocal(editReminderDueAt);
//     if (!dueIso) {
//       toast.warn("Pick a valid due date/time.");
//       return;
//     }

//     if (isUpdatingReminder) return;

//     const dto = {
//       contactId: selectedContactId,
//       title,
//       description: editReminderDescription || "",
//       dueAt: dueIso,
//       status: reminder.status || "Pending",
//       reminderType: reminder.reminderType || "FollowUp",
//       priority: reminder.priority ?? 2,
//       isRecurring: !!reminder.isRecurring,
//       recurrencePattern: reminder.recurrencePattern || "",
//       sendWhatsappNotification: !!reminder.sendWhatsappNotification,
//       linkedCampaign: reminder.linkedCampaign || "",
//       createdBy:
//         localStorage.getItem("userName") ||
//         localStorage.getItem("email") ||
//         "Agent",
//     };

//     setIsUpdatingReminder(true);
//     try {
//       await axiosClient.put(`/reminders/${reminder.id}`, dto);
//       toast.success("Reminder updated.");
//       setEditingReminderId(null);
//       setEditReminderTitle("");
//       setEditReminderDueAt("");
//       setEditReminderDescription("");
//       await refreshContactSummary();
//     } catch (error) {
//       console.error("Failed to update reminder:", error);
//       toast.error(
//         error.response?.data?.message || "Failed to update reminder."
//       );
//     } finally {
//       setIsUpdatingReminder(false);
//     }
//   };

//   // ✅ Confirm delete flow
//   const openDeleteConfirm = (type, item) => {
//     setConfirmState({
//       open: true,
//       type,
//       id: item?.id || null,
//       title: type === "note" ? "Delete note?" : "Delete reminder?",
//     });
//   };

//   const closeConfirm = () => {
//     if (confirmBusy) return;
//     setConfirmState({ open: false, type: null, id: null, title: "" });
//   };

//   const executeDelete = async () => {
//     if (!confirmState?.id || !confirmState?.type) return;
//     setConfirmBusy(true);

//     try {
//       if (confirmState.type === "note") {
//         await axiosClient.delete(`/notes/${confirmState.id}`);
//         toast.info("Note deleted.");
//       } else if (confirmState.type === "reminder") {
//         await axiosClient.delete(`/reminders/${confirmState.id}`);
//         toast.info("Reminder deleted.");
//       }
//       await refreshContactSummary();
//     } catch (error) {
//       console.error("Delete failed:", error);
//       toast.error(error.response?.data?.message || "Delete failed.");
//     } finally {
//       setConfirmBusy(false);
//       closeConfirm();
//     }
//   };

//   // Small helpers for CRM panel
//   const tagsList =
//     (contactSummary?.tags ??
//       contactSummary?.contactTags ??
//       contactSummary?.contactTagsDto ??
//       []) ||
//     [];

//   const recentNotes = contactSummary?.recentNotes ?? [];
//   const nextReminder = contactSummary?.nextReminder ?? null;
//   const recentTimeline = contactSummary?.recentTimeline ?? [];

//   return {
//     activeTab,
//     allConversations,
//     closeConfirm,
//     confirmBusy,
//     confirmState,
//     connection,
//     contactSummary,
//     conversationsRef,
//     currentUserId,
//     editNoteContent,
//     editReminderDescription,
//     editReminderDueAt,
//     editReminderTitle,
//     editingNoteId,
//     editingReminderId,
//     executeDelete,
//     fetchConversations,
//     filteredConversations,
//     agents,
//     isAgentsLoading,
//     handleAddNote,
//     handleAddReminder,
//     handleAssignToMe,
//     handleAssignToAgent,
//     handleComposerKeyDown,
//     handleOpenFullCrm,
//     handleReceiveInboxMessage,
//     handleRemoveTag,
//     handleSendMessage,
//     handleUnassign,
//     handleUnreadCountChanged,
//     handleUpdateConversationStatus,
//     handleUpdateNote,
//     handleUpdateReminder,
//     headerAssignedName,
//     headerIsAssigned,
//     headerIsAssignedToMe,
//     isAssigning,
//     isConnected,
//     isLoading,
//     isMessagesLoading,
//     isSavingNote,
//     isSavingReminder,
//     isSending,
//     isSummaryLoading,
//     isTagModalOpen,
//     isUpdatingStatus,
//     isUpdatingNote,
//     isUpdatingReminder,
//     isWithin24h,
//     isConversationClosed,
//     messages,
//     messagesEndRef,
//     messagesWithSeparators,
//     navigate,
//     newMessage,
//     nextReminder,
//     noteDraft,
//     openDeleteConfirm,
//     recentNotes,
//     recentTimeline,
//     refreshContactSummary,
//     reminderDescription,
//     reminderDueAt,
//     reminderTitle,
//     removingTagId,
//     scrollToBottom,
//     searchTerm,
//     selectedContactId,
//     selectedConversation,
//     selectedConversationId,
//     selectedConversationRef,
//     selectedNumberId,
//     setActiveTab,
//     setAllConversations,
//     setConfirmBusy,
//     setConfirmState,
//     setContactSummary,
//     setEditNoteContent,
//     setEditReminderDescription,
//     setEditReminderDueAt,
//     setEditReminderTitle,
//     setEditingNoteId,
//     setEditingReminderId,
//     setIsAssigning,
//     setIsLoading,
//     setIsMessagesLoading,
//     setIsSavingNote,
//     setIsSavingReminder,
//     setIsSending,
//     setIsSummaryLoading,
//     setIsTagModalOpen,
//     setIsUpdatingNote,
//     setIsUpdatingReminder,
//     setMessages,
//     setNewMessage,
//     setNoteDraft,
//     setReminderDescription,
//     setReminderDueAt,
//     setReminderTitle,
//     setRemovingTagId,
//     setSearchTerm,
//     setSelectedConversationId,
//     setSelectedNumberId,
//     setShowCrmPanel,
//     setShowDetails,
//     setShowMiniTimeline,
//     setShowRightPanel,
//     showCrmPanel,
//     showDetails,
//     showMiniTimeline,
//     showRightPanel,
//     tagsList,
//   };
// }
