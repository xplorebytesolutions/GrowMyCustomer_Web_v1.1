import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  MessageSquare,
  MousePointerClick,
  RefreshCcw,
  Search,
  Send,
  Users,
  Wand2,
  Filter,
  X,
  Info,
  ChevronDown,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList,
} from "recharts";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../components/ui/dialog";
import WhatsAppTemplatePreview from "../TemplateBuilder/components/WhatsAppTemplatePreview";
import { useAuth } from "../../app/providers/AuthProvider";
import { fetchTemplates } from "../../api/templateService";
import { FK } from "../../capabilities/featureKeys";
import axiosClient from "../../api/axiosClient";
import {
  getCampaignBucketContacts,
  getCampaignReportSummary,
} from "../../api/campaignReportApi";

const DEFAULT_WINDOW_DAYS = 90;
const AUDIENCE_PAGE_SIZE = 50;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

const STAT_TABS = [
  "recipients",
  "sent",
  "delivered",
  "read",
  "clicked",
  "replied",
  "failed",
];

const ALL_RECIPIENTS_SEGMENT = "ALL_RECIPIENTS";

const AUDIENCE_SEGMENTS = [
  { key: ALL_RECIPIENTS_SEGMENT, label: "All recipients" },
  { key: "DELIVERED_NOT_READ", label: "Delivered not read" },
  { key: "READ_NOT_REPLIED", label: "Read not replied" },
  { key: "CLICKED_NOT_REPLIED", label: "Clicked not replied" },
  { key: "FAILED", label: "Failed" },
  { key: "REPLIED", label: "Replied (within window)" },
];

const SEGMENT_FROM_TAB = {
  recipients: ALL_RECIPIENTS_SEGMENT,
  sent: ALL_RECIPIENTS_SEGMENT,
  delivered: "DELIVERED_NOT_READ",
  read: "READ_NOT_REPLIED",
  clicked: "CLICKED_NOT_REPLIED",
  failed: "FAILED",
  replied: "REPLIED",
};

// Header kind helpers
const HK = Object.freeze({
  None: "none",
  Text: "text",
  Image: "image",
  Video: "video",
  Document: "document",
});
const isMediaHeader = (hk) =>
  hk === HK.Image || hk === HK.Video || hk === HK.Document;
const mediaLabel = (hk) =>
  hk === HK.Image
    ? "Image URL"
    : hk === HK.Video
      ? "Video URL"
      : "Document URL";

const normalizeHeaderKind = (t) => {
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

function normalizeButtonsForTemplatePreview(buttons, buttonParams = []) {
  const list = Array.isArray(buttons) ? buttons : [];
  return list
    .map((button, idx) => {
      const typeRaw = String(
        button?.type ||
          button?.buttonType ||
          button?.ButtonType ||
          button?.subType ||
          button?.SubType ||
          ""
      ).toUpperCase();
      const text = String(
        button?.text || button?.buttonText || button?.ButtonText || "Button"
      );
      const staticValue = String(
        button?.value ||
          button?.ParameterValue ||
          button?.parameterValue ||
          button?.targetUrl ||
          ""
      );
      const value =
        buttonParams[idx] != null && String(buttonParams[idx]).trim()
          ? String(buttonParams[idx]).trim()
          : staticValue;

      if (typeRaw.includes("URL")) return { type: "URL", text, url: value };
      if (typeRaw.includes("PHONE"))
        return { type: "PHONE_NUMBER", text, phone_number: value };
      if (typeRaw.includes("QUICK")) return { type: "QUICK_REPLY", text };
      return { type: typeRaw || "QUICK_REPLY", text };
    })
    .slice(0, 3);
}

const toArray = (maybe) => (Array.isArray(maybe) ? maybe : []);

const RETARGETABLE_SEGMENTS = new Set(
  AUDIENCE_SEGMENTS.filter((s) => s.retargetable !== false).map((s) => s.key)
);

function segmentLabel(key) {
  return AUDIENCE_SEGMENTS.find((s) => s.key === key)?.label || key;
}

function getRetargetEligibility(status) {
  const raw = String(status ?? "").trim();
  const s = raw.toUpperCase();
  if (!s) {
    return {
      ok: false,
      reason: "Campaign status is unknown, so retargeting is disabled.",
    };
  }

  const ok =
    s === "SENT" ||
    s === "COMPLETED" ||
    s === "FINISHED" ||
    s === "DONE" ||
    s.includes("SENT") ||
    s.includes("COMPLETE");

  if (ok) return { ok: true, reason: "" };
  return {
    ok: false,
    reason: `Retargeting is available only after the campaign is sent. Current status: ${raw}.`,
  };
}

function safeNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function tryParseDate(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(x) {
  const d = tryParseDate(x);
  return d ? d.toLocaleString() : "-";
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 1) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `${hours}h ${remMin}m`;
}

function parseMaybeNumber(x) {
  if (x == null) return null;
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x !== "string") return null;
  const cleaned = x.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function getPathValue(obj, path) {
  if (!obj) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function pickNumberFromPaths(obj, paths) {
  for (const p of paths) {
    const v = getPathValue(obj, p);
    const n = parseMaybeNumber(v);
    if (n != null) return n;
  }
  return null;
}

function safeJsonParse(x) {
  if (typeof x !== "string") return null;
  const t = x.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function extractTemplateBodyText(t) {
  if (!t) return "";

  const directCandidates = [
    t.body,
    t.bodyText,
    t.text,
    t.message,
    t.content,
    t.templateText,
    t.TemplateText,
  ];
  for (const c of directCandidates) {
    if (typeof c === "string" && c.trim()) return c;
  }

  const componentsRaw =
    t.components ?? t.Components ?? t.componentsJson ?? t.ComponentsJson ?? null;

  const components =
    Array.isArray(componentsRaw) ? componentsRaw : safeJsonParse(componentsRaw);

  if (Array.isArray(components)) {
    const body =
      components.find((c) => String(c?.type || c?.Type || "").toUpperCase() === "BODY") ??
      components.find((c) => typeof (c?.text ?? c?.Text) === "string") ??
      null;
    const text = body?.text ?? body?.Text;
    if (typeof text === "string" && text.trim()) return text;
  }

  return "";
}

function extractPlaceholdersFromText(text) {
  const out = new Set();
  const s = String(text ?? "");
  const re = /\{\{\s*(\d+)\s*\}\}/g;
  let m;
  while ((m = re.exec(s))) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

function isGuidLike(v) {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function getContactNameValue(c) {
  return (
    c?.name ||
    c?.contactName ||
    c?.contact?.name ||
    c?.fullName ||
    c?.displayName ||
    ""
  );
}

function getContactPhoneValue(c) {
  return (
    c?.phone ||
    c?.contactPhone ||
    c?.recipientNumber ||
    c?.to ||
    c?.recipient ||
    ""
  );
}

function pickProviderFromCampaignMeta(meta) {
  const nested =
    meta?.sender ||
    meta?.Sender ||
    meta?.whatsAppSender ||
    meta?.WhatsAppSender ||
    meta?.phoneNumber ||
    meta?.PhoneNumber ||
    null;

  const raw =
    meta?.provider ??
    meta?.Provider ??
    meta?.senderProvider ??
    meta?.SenderProvider ??
    meta?.whatsAppProvider ??
    meta?.WhatsAppProvider ??
    meta?.messagingProvider ??
    meta?.MessagingProvider ??
    nested?.provider ??
    nested?.Provider ??
    "";

  const v = String(raw || "").trim();
  return v ? v.toUpperCase() : "";
}

function pickPhoneNumberIdFromCampaignMeta(meta) {
  const nested =
    meta?.sender ||
    meta?.Sender ||
    meta?.whatsAppSender ||
    meta?.WhatsAppSender ||
    meta?.phoneNumber ||
    meta?.PhoneNumber ||
    null;

  const raw =
    meta?.phoneNumberId ??
    meta?.PhoneNumberId ??
    meta?.phoneNumberID ??
    meta?.PhoneNumberID ??
    meta?.senderPhoneNumberId ??
    meta?.SenderPhoneNumberId ??
    meta?.whatsAppPhoneNumberId ??
    meta?.WhatsAppPhoneNumberId ??
    meta?.wabaPhoneNumberId ??
    meta?.WabaPhoneNumberId ??
    nested?.phoneNumberId ??
    nested?.PhoneNumberId ??
    nested?.id ??
    nested?.Id ??
    "";

  return String(raw || "").trim();
}

function getCustomFieldValue(c, key) {
  const obj =
    c?.customFields ||
    c?.CustomFields ||
    c?.fields ||
    c?.Fields ||
    c?.meta?.customFields ||
    null;
  if (!obj || typeof obj !== "object") return "";
  return obj?.[key] ?? obj?.[String(key)] ?? "";
}

function RetargetModal({
  isOpen,
  onClose,
  campaignId,
  selectedContactIds,
  selectedContacts,
  campaignStatus,
  initialBucket,
  initialWindowDays,
  campaignMeta,
}) {
  const navigate = useNavigate();
  const { businessId } = useAuth();
  const [bucket, setBucket] = useState(initialBucket);
  const [repliedWindowDays, setRepliedWindowDays] = useState(initialWindowDays);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showTemplateSearch, setShowTemplateSearch] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateDetails, setTemplateDetails] = useState(null);
  const [templateDetailsLoading, setTemplateDetailsLoading] = useState(false);
  const [templateDetailsError, setTemplateDetailsError] = useState(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [buttonParams, setButtonParams] = useState([]);
  const [rawButtonParams, setRawButtonParams] = useState([]);
  const [headerKind, setHeaderKind] = useState(HK.None);
  const [requiresHeaderMediaUrl, setRequiresHeaderMediaUrl] = useState(false);

  const didRetargetNavigateRef = useRef(false);

  const [variableConfigs, setVariableConfigs] = useState({});

  const [senders, setSenders] = useState([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [selectedSenderId, setSelectedSenderId] = useState("");

  // New scheduling states
  const [scheduleMode, setScheduleMode] = useState("now"); // "now" or "later"
  const [scheduledAt, setScheduledAt] = useState("");
  const [isTemplatePreviewOpen, setIsTemplatePreviewOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      didRetargetNavigateRef.current = false;
      try {
        sessionStorage.removeItem("retarget_contactIds");
      } catch {}

      setBucket(initialBucket);
      setRepliedWindowDays(initialWindowDays);
      setName("");
      setTemplateQuery("");
      setShowTemplateSearch(false);
      setSelectedTemplate("");
      setSubmitAttempted(false);
      setHeaderMediaUrl("");
      setButtonParams([]);
      setRawButtonParams([]);
      setHeaderKind(HK.None);
      setRequiresHeaderMediaUrl(false);
      setScheduleMode("now");
      setScheduledAt("");
      setIsTemplatePreviewOpen(false);
      setSenders([]);
      setSelectedSenderId("");

      if (businessId) {
        setLoadingTemplates(true);
        axiosClient
          .get(`templates/${businessId}?status=APPROVED`)
          .then((res) => {
            if (res.data?.success) setTemplates(res.data.templates || []);
            else toast.error("Failed to load templates.");
          })
          .catch((err) => {
            console.error("Failed to fetch templates", err);
            toast.error("Error loading templates.");
          })
          .finally(() => setLoadingTemplates(false));

        setLoadingSenders(true);
        axiosClient
          .get(`WhatsAppSettings/senders/${businessId}`, { __silent: true })
          .then((r) => {
            const raw = Array.isArray(r.data) ? r.data : r.data?.items || [];
            const normalized = raw
              .map((x) => {
                const provider = String(x.provider || x.Provider || "").toUpperCase();
                const phoneNumberId = x.phoneNumberId ?? x.PhoneNumberId ?? "";
                const whatsAppNumber =
                  x.whatsAppBusinessNumber ??
                  x.whatsappBusinessNumber ??
                  x.displayNumber ??
                  x.phoneNumber ??
                  x.WhatsAppBusinessNumber ??
                  x.PhoneNumber ??
                  x.phoneNumberId ??
                  x.PhoneNumberId ??
                  "";

                const id = x.id ?? x.Id ?? `${provider}|${phoneNumberId}`;
                return { id, provider, phoneNumberId, whatsAppNumber };
              })
              .filter((x) => x.provider && x.phoneNumberId);

            setSenders(normalized);
            if (normalized.length === 1) setSelectedSenderId(normalized[0].id);
          })
          .catch(() => {
            setSenders([]);
          })
          .finally(() => setLoadingSenders(false));
      }
    }
  }, [isOpen, initialBucket, initialWindowDays, businessId]);

  const campaignProvider = useMemo(
    () => pickProviderFromCampaignMeta(campaignMeta),
    [campaignMeta]
  );
  const campaignPhoneNumberId = useMemo(
    () => pickPhoneNumberIdFromCampaignMeta(campaignMeta),
    [campaignMeta]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (selectedSenderId) return;
    if (!campaignProvider || !campaignPhoneNumberId) return;

    const match = (senders || []).find(
      (s) =>
        s.provider === campaignProvider && s.phoneNumberId === campaignPhoneNumberId
    );
    setSelectedSenderId(match?.id || `${campaignProvider}|${campaignPhoneNumberId}`);
  }, [
    isOpen,
    selectedSenderId,
    campaignProvider,
    campaignPhoneNumberId,
    senders,
  ]);

  const selectedSender = useMemo(() => {
    if (!selectedSenderId) return null;
    return (senders || []).find((s) => s.id === selectedSenderId) || null;
  }, [senders, selectedSenderId]);

  const effectiveProvider = selectedSender?.provider || campaignProvider;
  const effectivePhoneNumberId =
    selectedSender?.phoneNumberId || campaignPhoneNumberId;

  const senderError = useMemo(() => {
    if (effectiveProvider && effectivePhoneNumberId) return null;
    return "Provider and PhoneNumberId are required. Please select a sender.";
  }, [effectiveProvider, effectivePhoneNumberId]);

  const handleSyncTemplates = async () => {
    if (!businessId) return;
    setSyncing(true);
    try {
      const res = await axiosClient.post(`templates/sync/${businessId}`);
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

  useEffect(() => {
    if (!isOpen) return;

    if (!businessId || !selectedTemplate) {
      setTemplateDetails(null);
      setTemplateDetailsError(null);
      setTemplateDetailsLoading(false);
      return;
    }

    let alive = true;
    setTemplateDetailsLoading(true);
    setTemplateDetailsError(null);

    (async () => {
      try {
        const url = `/templates/${businessId}/${encodeURIComponent(
          selectedTemplate
        )}`;
        const res = await axiosClient.get(url, {
          __silent: true,
          params: { language: "en_US" },
        });
        const t = res?.data?.template ?? res?.data ?? null;
        if (alive && t) {
          setTemplateDetails(t);

          // Parse buttons
          const rb = t.buttonsJson ?? t.buttons ?? t.urlButtons ?? null;
          let parsed = [];
          if (Array.isArray(rb)) parsed = rb;
          else if (typeof rb === "string" && rb.trim().startsWith("[")) {
            try {
              parsed = JSON.parse(rb);
            } catch {
              parsed = [];
            }
          }
          setRawButtonParams(parsed);

          const hk = normalizeHeaderKind(t);
          setHeaderKind(hk);
          setRequiresHeaderMediaUrl(
            t.requiresHeaderMediaUrl === true ||
              t.RequiresMediaHeader === true ||
              isMediaHeader(hk)
          );

          // Dyn slots for buttons
          const dynSlots =
            parsed?.map((btn) => {
              const originalUrl =
                btn?.ParameterValue || btn?.parameterValue || "";
              const subtype = (
                btn?.SubType ||
                btn?.subType ||
                ""
              ).toLowerCase();
              const isDynamic =
                ["url", "copy_code", "flow"].includes(subtype) ||
                originalUrl.includes("{{1}}");
              return isDynamic ? "" : null;
            }) || [];
          setButtonParams(dynSlots);
        }
      } catch (err) {
        if (!alive) return;
        console.error("Failed to load template details", err);
        setTemplateDetails(null);
        setTemplateDetailsError("Failed to load template details.");
      } finally {
        if (alive) setTemplateDetailsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, businessId, selectedTemplate]);

  const filteredTemplates = useMemo(() => {
    const q = String(templateQuery || "").trim().toLowerCase();
    if (!q) return templates;
    return (templates || []).filter((t) =>
      String(t?.name || t?.templateName || t?.id || "")
        .toLowerCase()
        .includes(q)
    );
  }, [templates, templateQuery]);

  const templateBodyText = useMemo(() => {
    if (selectedTemplate) {
      const t = extractTemplateBodyText(templateDetails);
      if (t) return t;
    }
    const fromList = (templates || []).find(
      (x) =>
        String(x?.name || x?.templateName || x?.id || "") ===
        String(selectedTemplate || "")
    );
    return extractTemplateBodyText(fromList);
  }, [templateDetails, templates, selectedTemplate]);

  const placeholderNumbers = useMemo(
    () => extractPlaceholdersFromText(templateBodyText),
    [templateBodyText]
  );

  useEffect(() => {
    if (!isOpen) return;
    setVariableConfigs((prev) => {
      const next = {};
      for (const n of placeholderNumbers) {
        const k = String(n);
        next[k] = prev?.[k] ?? {
          source: "const",
          constValue: "",
          missingPolicy: "skip",
          fallbackValue: "",
        };
      }
      return next;
    });
  }, [isOpen, placeholderNumbers, setVariableConfigs]);

  async function run() {
    if (!campaignId) return;
    setLoading(true);
    try {
      const msg =
        eligibilityError ||
        selectionError ||
        nameError ||
        senderError ||
        templateError ||
        null;
      if (msg) {
        toast.warn(msg);
        return;
      }

      // Build button payload
      const buttonPayload =
        rawButtonParams?.map((btn, idx) => {
          const originalUrl = btn?.ParameterValue || btn?.parameterValue || "";
          const subtype = (btn?.SubType || btn?.subType || "").toLowerCase();
          const isDynamic =
            ["url", "copy_code", "flow"].includes(subtype) ||
            originalUrl.includes("{{1}}");

          return {
            text: btn?.Text || btn?.text || "Button",
            type: btn?.Type || btn?.type || "",
            value: isDynamic ? buttonParams[idx] || "" : originalUrl,
            position: idx + 1,
          };
        }) || [];

      // Split selected identifiers into real Contact IDs vs raw phone numbers.
      const rawSelected = Array.from(selectedContactIds || []);
      const contactIds = [];
      const recipientNumbers = [];

      const pushPhone = (v) => {
        const s = String(v || "").trim();
        if (!s) return;
        recipientNumbers.push(s);
      };

      for (const v of rawSelected) {
        if (isGuidLike(v)) contactIds.push(String(v));
        else pushPhone(v);
      }

      const selectedContactsArr = Array.isArray(selectedContacts)
        ? selectedContacts
        : [];
      for (const c of selectedContactsArr) {
        const cid = c?.contactId || c?.ContactId || c?.id || c?.Id || "";
        if (isGuidLike(cid)) contactIds.push(String(cid));
        else {
          const phone = getContactPhoneValue(c);
          pushPhone(phone || cid);
        }
      }

      const uniq = (xs) => [...new Set((xs || []).map((x) => String(x).trim()).filter(Boolean))];
      const finalContactIds = uniq(contactIds);
      const finalRecipientNumbers = uniq(recipientNumbers);

      if (!finalContactIds.length && !finalRecipientNumbers.length) {
        toast.warn("No valid contacts/phone numbers selected.");
        return;
      }

      const placeholders = extractPlaceholdersFromText(
        extractTemplateBodyText(templateDetails)
      );

      const templateVariableConfigs = {};
      for (const n of placeholders) {
        const cfg = variableConfigs?.[String(n)] || {};
        templateVariableConfigs[String(n)] = {
          source: String(cfg.source || "const"),
          constValue: String(cfg.constValue ?? ""),
          missingPolicy: String(cfg.missingPolicy || "skip"),
          fallbackValue: String(cfg.fallbackValue ?? ""),
        };
      }

      // Backend-safe: always send a concrete string list (using the first selected contact as a preview base).
      const baseContact = Array.isArray(selectedContacts)
        ? selectedContacts[0]
        : null;
      const templateParameters = placeholders.map((n) => {
        const r = resolveVariableValue(baseContact, n);
        return String(r?.value ?? "");
      });

      const templateParametersMap = {};
      placeholders.forEach((n, idx) => {
        templateParametersMap[`{{${n}}}`] = templateParameters[idx] ?? "";
      });

      const messageTemplate = extractTemplateBodyText(templateDetails);
      const templateLanguage = templateDetails?.language || "en_US";
      const scheduledAtIso =
        scheduleMode === "later" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null;
      const campaignType =
        headerKind === HK.Image ? "image" : headerKind === HK.Video ? "video" : "text";

      const providerUpper = String(effectiveProvider || "").toUpperCase();
      const phoneNumberIdValue = String(effectivePhoneNumberId || "").trim();
      const createdByValue =
        localStorage.getItem("userId") || localStorage.getItem("createdBy") || "";
      const businessIdValue =
        businessId || localStorage.getItem("businessId") || "";

      const res = await axiosClient.post("campaigns/retarget", {
        // support both newer and legacy backends
        campaignId,
        sourceCampaignId: campaignId,
        bucket,
        sourceBucket: bucket,
        repliedWindowDays,
        windowDays: repliedWindowDays,
        createMode: "DRAFT_CAMPAIGN",
        name: name?.trim() || null,
        contactIds: finalContactIds,
        recipientNumbers: finalRecipientNumbers,
        recipients: finalRecipientNumbers,
        phones: finalRecipientNumbers,
        deduplicate: true,

        // Flat campaign shape (some backends expect this)
        businessId: businessIdValue,
        createdBy: createdByValue,
        messageTemplate,
        templateId: selectedTemplate,
        templateName: selectedTemplate,
        templateLanguage,
        headerKind,
        headerMediaUrl: isMediaHeader(headerKind) ? headerMediaUrl : null,
        imageUrl: headerKind === HK.Image ? headerMediaUrl : null,
        videoUrl: headerKind === HK.Video ? headerMediaUrl : null,
        documentUrl: headerKind === HK.Document ? headerMediaUrl : null,
        buttonParams: buttonPayload,
        templateParameters,
        templateParametersMap,
        templateVariableConfigs,
        provider: providerUpper,
        phoneNumberId: phoneNumberIdValue,
        scheduledAt: scheduledAtIso,
        campaignType,
        useCsvPersonalization: false,

        // New params nested within campaign for the backend DTO
        campaign: {
          name: name?.trim() || `Retarget: ${campaignMeta?.name ?? "Campaign"}`,
          businessId: businessIdValue,
          createdBy: createdByValue,
          messageTemplate,
          templateId: selectedTemplate,
          templateName: selectedTemplate,
          templateLanguage,
          headerKind: headerKind,
          headerMediaUrl: isMediaHeader(headerKind) ? headerMediaUrl : null,
          imageUrl: headerKind === HK.Image ? headerMediaUrl : null,
          videoUrl: headerKind === HK.Video ? headerMediaUrl : null,
          documentUrl: headerKind === HK.Document ? headerMediaUrl : null,
          buttonParams: buttonPayload,
          multiButtons: buttonPayload.map(b => ({
            buttonText: b.text,
            buttonType: b.type,
            targetUrl: b.value,
            position: b.position
          })),
          templateParameters,
          templateParametersMap,
          templateVariableConfigs,
          provider: providerUpper,
          phoneNumberId: phoneNumberIdValue,
          scheduledAt: scheduledAtIso,
          campaignType,
          useCsvPersonalization: false,
        },
      }, { __silent: true });

      const data = res?.data?.data ?? res?.data ?? null;
      toast.success("Retarget wizard completed.");

      if (data?.newCampaignId) {
        didRetargetNavigateRef.current = true;
        onClose();
        navigate(`/app/campaigns/${data.newCampaignId}`, { replace: true });
        return;
      }

      if (Array.isArray(data?.contactIds)) {
        // MVP: ignore contactIds mode (backend fallback).
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            "[Retarget] Backend returned contactIds; MVP ignores this mode."
          );
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[Retarget] Response:", err?.response?.data);
      }
      const data = err?.response?.data;
      const msg =
        data?.message ||
        data?.error ||
        data?.title ||
        (typeof data === "string" ? data : null) ||
        err?.message ||
        "Failed to run retarget wizard.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = selectedContactIds?.size || 0;

  const eligibilityError = useMemo(() => {
    const r = getRetargetEligibility(campaignStatus);
    return r.ok ? null : r.reason;
  }, [campaignStatus]);

  const selectionError = useMemo(() => {
    if (selectedCount > 0) return null;
    return "Select at least one contact to retarget.";
  }, [selectedCount]);

  const nameError = useMemo(() => {
    if (name?.trim()) return null;
    return "Campaign name is required.";
  }, [name]);

  const templateError = useMemo(() => {
    if (!selectedTemplate) return "Template is required.";
    if (templateDetailsLoading) return "Loading template details...";
    if (templateDetailsError) return templateDetailsError;
    return null;
  }, [selectedTemplate, templateDetailsLoading, templateDetailsError]);

  const firstValidationError =
    eligibilityError ||
    selectionError ||
    nameError ||
    senderError ||
    templateError ||
    null;

  const canLaunch =
    !loading &&
    !eligibilityError &&
    !selectionError &&
    !nameError &&
    !senderError &&
    !templateError;

  const uiLocked = !!eligibilityError || loading;

  const selectedContactsList = useMemo(
    () => (Array.isArray(selectedContacts) ? selectedContacts : []),
    [selectedContacts]
  );

  const contactsReady =
    selectedCount > 0 && selectedContactsList.length === selectedCount;

  const customFieldKeys = useMemo(() => {
    if (!contactsReady) return [];
    const keys = new Set();
    for (const c of selectedContactsList) {
      const obj =
        c?.customFields ||
        c?.CustomFields ||
        c?.fields ||
        c?.Fields ||
        c?.meta?.customFields ||
        null;
      if (!obj || typeof obj !== "object") continue;
      Object.keys(obj).forEach((k) => keys.add(k));
      if (keys.size >= 50) break;
    }
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [contactsReady, selectedContactsList]);

  const resolveVariableValue = useCallback((contact, n) => {
    const cfg = variableConfigs?.[String(n)];
    if (!cfg) return { value: "", missing: true };

    const source = String(cfg.source || "const");
    if (source === "const") {
      const v = String(cfg.constValue ?? "");
      return { value: v, missing: !v.trim() };
    }

    let raw = "";
    if (source === "contact:name") raw = getContactNameValue(contact);
    else if (source === "contact:phone") raw = getContactPhoneValue(contact);
    else if (source.startsWith("custom:")) {
      raw = getCustomFieldValue(contact, source.slice("custom:".length));
    }

    const v = String(raw ?? "");
    if (v.trim()) return { value: v, missing: false };

    if (String(cfg.missingPolicy || "skip") === "fallback") {
      const fb = String(cfg.fallbackValue ?? "");
      if (fb.trim()) return { value: fb, missing: false };
    }

    return { value: v, missing: true };
  }, [variableConfigs]);

  const templatePreviewDraft = useMemo(() => {
    if (!selectedTemplate) return null;
    const hk = String(headerKind || HK.None).toUpperCase();
    const previewHeaderType =
      hk === "IMAGE" || hk === "VIDEO" || hk === "DOCUMENT" || hk === "TEXT"
        ? hk
        : "NONE";

    const examples = placeholderNumbers.map((n) => {
      const r = resolveVariableValue(
        Array.isArray(selectedContacts) ? selectedContacts[0] : null,
        n
      );
      const value = String(r?.value ?? "").trim();
      return value || `Value ${n}`;
    });

    return {
      name: selectedTemplate,
      language:
        templateDetails?.language ||
        templateDetails?.languageCode ||
        "en_US",
      headerType: previewHeaderType,
      headerText: String(
        templateDetails?.headerText || templateDetails?.HeaderText || ""
      ),
      headerMediaUrl: requiresHeaderMediaUrl ? headerMediaUrl : null,
      bodyText: String(templateBodyText || ""),
      footerText: String(
        templateDetails?.footerText || templateDetails?.FooterText || ""
      ),
      buttons: normalizeButtonsForTemplatePreview(rawButtonParams, buttonParams),
      examples,
    };
  }, [
    selectedTemplate,
    headerKind,
    placeholderNumbers,
    resolveVariableValue,
    selectedContacts,
    templateDetails,
    requiresHeaderMediaUrl,
    headerMediaUrl,
    templateBodyText,
    rawButtonParams,
    buttonParams,
  ]);

  function handleRunClick() {
    setSubmitAttempted(true);
    if (!canLaunch) {
      if (firstValidationError) toast.warn(firstValidationError);
      return;
    }
    run();
  }

  function handleOpenChange(nextOpen) {
    if (nextOpen) return;
    if (loading) return;
    const isDirty =
      !!name?.trim() ||
      !!selectedTemplate ||
      !!templateQuery.trim();

    if (isDirty) {
      const ok = window.confirm("Discard changes and close?");
      if (!ok) return;
    }

    if (!didRetargetNavigateRef.current) {
      try {
        sessionStorage.removeItem("retarget_contactIds");
      } catch {}
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby={undefined}
        className="!max-w-4xl p-0 border-none shadow-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white shrink-0">
          <DialogHeader className="p-0 mb-0 border-none space-y-1">
            <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
              Retarget selected contacts
            </DialogTitle>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                {segmentLabel(bucket)}
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                {selectedCount.toLocaleString()} selected
              </span>
            </div>
          </DialogHeader>
          <DialogClose asChild>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </DialogClose>
        </div>

        <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          {eligibilityError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-amber-900">
                    Retargeting is disabled
                  </div>
                  <div className="mt-1 text-xs text-amber-800">
                    {eligibilityError}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-x-5 gap-y-2">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-800">
                Campaign Name
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Identifies this retarget run.
              </p>
            </div>
            <div className="space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Retarget - Selected Contacts"
                disabled={uiLocked}
                className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {submitAttempted && nameError ? (
                <div className="text-[11px] font-semibold text-rose-600">
                  {nameError}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-x-5 gap-y-2">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-800">
                Sender <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                WhatsApp number used to send.
              </p>
            </div>
            <div className="space-y-2">
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                disabled={loadingSenders || uiLocked}
                className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer disabled:opacity-60"
              >
                <option value="">
                  {loadingSenders
                    ? "Loading..."
                    : senders.length
                    ? "Select sender"
                    : "No senders found"}
                </option>
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.whatsAppNumber || s.phoneNumberId || "Sender").toString()} (
                    {s.provider})
                  </option>
                ))}
                {!senders.find((s) => s.id === `${campaignProvider}|${campaignPhoneNumberId}`) &&
                campaignProvider &&
                campaignPhoneNumberId ? (
                  <option value={`${campaignProvider}|${campaignPhoneNumberId}`}>
                    {campaignPhoneNumberId} ({campaignProvider})
                  </option>
                ) : null}
              </select>
              {submitAttempted && senderError ? (
                <div className="text-[11px] font-semibold text-rose-600">
                  {senderError}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-x-5 gap-y-2">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-800">
                Template Name
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Approved WhatsApp template.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 min-w-0 relative">
                {showTemplateSearch && (
                  <div className="w-[180px] flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 animate-in fade-in slide-in-from-right-2 duration-300 relative z-20">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      autoFocus
                      value={templateQuery}
                      onChange={(e) => setTemplateQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full bg-transparent border-none py-0.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button
                      onClick={() => {
                        setShowTemplateSearch(false);
                        setTemplateQuery("");
                      }}
                      className="p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Auto-show Results List */}
                    {templateQuery.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30 max-h-[250px] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                        {filteredTemplates.length > 0 ? (
                          filteredTemplates.map((t) => (
                            <button
                              key={t.id || t.name}
                              type="button"
                              onClick={() => {
                                setSelectedTemplate(t.name);
                                setShowTemplateSearch(false);
                                setTemplateQuery("");
                              }}
                              className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-slate-50 last:border-none"
                            >
                              {t.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-[12px] text-slate-400 italic">
                            No templates found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 relative">
                  <select
                    value={selectedTemplate}
                    disabled={loadingTemplates || uiLocked}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="">
                      {loadingTemplates ? "Loading..." : "Select template"}
                    </option>
                    {filteredTemplates.map((t) => (
                      <option key={t.id || t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {!showTemplateSearch && (
                <button
                  type="button"
                  onClick={() => setShowTemplateSearch(true)}
                  disabled={uiLocked}
                  className="flex items-center justify-center h-[40px] w-[40px] rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-emerald-600 transition-all shadow-sm"
                  title="Search Templates"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleSyncTemplates}
                disabled={uiLocked || syncing || loadingTemplates}
                className="flex items-center justify-center h-[40px] w-[40px] rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                title="Sync Templates from Meta"
              >
                <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsTemplatePreviewOpen(true)}
                disabled={uiLocked || !selectedTemplate}
                className="flex items-center justify-center h-[40px] w-[40px] rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                title="Preview selected template"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span className="font-medium">
                {templateQuery ? `Filtered: ${filteredTemplates.length}` : `Total: ${templates.length}`}
              </span>
              {submitAttempted && templateError ? (
                <span className="font-bold text-rose-600">
                  {templateError}
                </span>
              ) : null}
            </div>

            {/* Template selector ends here */}
          </div>

          {selectedTemplate ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-800 uppercase tracking-tight">
                    Template Personalization
                  </div>
                  <div className="mt-0.5 text-[12px] text-slate-600">
                    Configure template variables, media, and button parameters.
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
            {templateDetailsLoading ? (
              <div className="mt-1 text-[12px] text-slate-600 font-medium flex items-center justify-center gap-2 py-6 bg-slate-50 rounded-xl border border-slate-100">
                <RefreshCcw className="w-4 h-4 animate-spin text-emerald-500" />
                Loading template details...
              </div>
            ) : templateDetailsError ? (
              <div className="mt-1 text-[12px] font-semibold text-rose-600 bg-rose-50 rounded-xl p-4 border border-rose-100">
                {templateDetailsError}
              </div>
            ) : (
              <div className="mt-1 space-y-5">

                {/* 1. Header Media */}
                {requiresHeaderMediaUrl && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                       <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                         Header Content
                       </h4>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
                      <label className="block text-[11px] font-bold text-slate-600 mb-2">
                        {mediaLabel(headerKind)} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={headerMediaUrl}
                        onChange={(e) => setHeaderMediaUrl(e.target.value)}
                        placeholder={`https://example.com/media.${headerKind === HK.Image ? "jpg" : headerKind === HK.Video ? "mp4" : "pdf"}`}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                      />
                      <p className="mt-1.5 text-[10px] text-slate-500 leading-normal">
                        Provide a direct public link to the {headerKind} file.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Dynamic Buttons */}
                {buttonParams.some((p) => p !== null) && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                       <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                         Interactive Buttons
                       </h4>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-4">
                      {rawButtonParams.map((btn, idx) => {
                        if (buttonParams[idx] === null) return null;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-600">
                              {btn.text || btn.Text} <span className="text-[10px] font-normal text-slate-400">({btn.type || btn.Type})</span>
                            </label>
                            <input
                              value={buttonParams[idx]}
                              onChange={(e) => {
                                const next = [...buttonParams];
                                next[idx] = e.target.value;
                                setButtonParams(next);
                              }}
                              placeholder="Enter dynamic value or URL"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Body Variables */}
                {placeholderNumbers.length > 0 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                       <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                         Message Variables
                       </h4>
                    </div>
                    
                    <div className="grid grid-cols-[120px,1fr] gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      <div>Placeholder</div>
                      <div>Mapping Configuration</div>
                    </div>

                    <div className="space-y-3">
                  {placeholderNumbers.map((n) => {
                    const cfg = variableConfigs?.[String(n)] || {};
                    const source = String(cfg.source || "const");
                    const isConst = source === "const";
                    const missingPolicy = String(cfg.missingPolicy || "skip");

                    const setCfg = (patch) =>
                      setVariableConfigs((prev) => ({
                        ...(prev || {}),
                        [String(n)]: {
                          ...(prev?.[String(n)] || {
                            source: "const",
                            constValue: "",
                            missingPolicy: "skip",
                            fallbackValue: "",
                          }),
                          ...patch,
                        },
                      }));

                    return (
                      <div
                        key={n}
                        className="grid grid-cols-[120px,1fr] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-white px-2 py-1 font-mono text-[12px] font-semibold text-slate-800 border border-slate-200">
                            {`{{${n}}}`}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <select
                              value={source}
                              onChange={(e) =>
                                setCfg({
                                  source: e.target.value,
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                              <option value="const">Constant</option>
                              {contactsReady ? (
                                <>
                                  <option value="contact:name">
                                    Contact field: Name
                                  </option>
                                  <option value="contact:phone">
                                    Contact field: Phone
                                  </option>
                                  {customFieldKeys.length ? (
                                    <optgroup label="Custom fields">
                                      {customFieldKeys.map((k) => (
                                        <option
                                          key={k}
                                          value={`custom:${k}`}
                                        >
                                          Custom field: {k}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ) : null}
                                </>
                              ) : null}
                            </select>

                            {isConst ? (
                              <input
                                value={String(cfg.constValue ?? "")}
                                onChange={(e) =>
                                  setCfg({ constValue: e.target.value })
                                }
                                placeholder="Constant value"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                            ) : (
                              <select
                                value={missingPolicy}
                                onChange={(e) =>
                                  setCfg({ missingPolicy: e.target.value })
                                }
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                              >
                                <option value="skip">Skip missing</option>
                                <option value="fallback">
                                  Use fallback constant
                                </option>
                              </select>
                            )}
                          </div>

                          {!isConst && missingPolicy === "fallback" ? (
                            <input
                              value={String(cfg.fallbackValue ?? "")}
                              onChange={(e) =>
                                setCfg({ fallbackValue: e.target.value })
                              }
                              placeholder="Fallback constant (when contact value is missing)"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </div>
                )}

              </div>
            )}
            </div>
          </div>
          ) : null}




          <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-x-5 gap-y-2">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-800">
                Scheduling
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                When should this campaign run?
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={cx(
                    "relative flex cursor-pointer rounded-xl border p-3 transition-all",
                    scheduleMode === "now"
                      ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                    uiLocked ? "pointer-events-none opacity-60" : ""
                  )}
                >
                  <input
                    type="radio"
                    name="schedule"
                    value="now"
                    className="sr-only"
                    checked={scheduleMode === "now"}
                    onChange={() => setScheduleMode("now")}
                    disabled={uiLocked}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Send Immediately
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Launch as soon as created.
                    </span>
                  </div>
                  <Send
                    className={cx(
                      "h-4 w-4",
                      scheduleMode === "now" ? "text-emerald-600" : "text-slate-300"
                    )}
                  />
                </label>

                <label
                  className={cx(
                    "relative flex cursor-pointer rounded-xl border p-3 transition-all",
                    scheduleMode === "later"
                      ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                    uiLocked ? "pointer-events-none opacity-60" : ""
                  )}
                >
                  <input
                    type="radio"
                    name="schedule"
                    value="later"
                    className="sr-only"
                    checked={scheduleMode === "later"}
                    onChange={() => setScheduleMode("later")}
                    disabled={uiLocked}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Schedule for Later
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Pick a future time.
                    </span>
                  </div>
                  <Calendar
                    className={cx(
                      "h-4 w-4",
                      scheduleMode === "later" ? "text-emerald-600" : "text-slate-300"
                    )}
                  />
                </label>
              </div>

              {scheduleMode === "later" && (
                <div className="mt-2 animate-in slide-in-from-top-1 duration-200">
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    disabled={uiLocked}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-x-5 gap-y-2 items-center pt-1">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-800">
                Test Campaign
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Send a quick test.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => toast.info("Test message is coming soon.")}
                disabled={uiLocked || !selectedTemplate}
                className="inline-flex items-center gap-2 px-6 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Send Test Message
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-100 mt-0 shrink-0">
          <div className="w-full space-y-2">

            {submitAttempted && firstValidationError ? (
              <div className="text-[12px] font-semibold text-rose-600">
                {firstValidationError}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={handleRunClick}
                disabled={loading || selectedCount === 0}
                aria-disabled={!canLaunch}
                className={cx(
                  "flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100",
                  !canLaunch && selectedCount > 0 ? "opacity-50 cursor-not-allowed" : ""
                )}
              >
                {loading ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {loading
                  ? "Processing..."
                  : scheduleMode === "now"
                  ? "Launch Campaign"
                  : "Schedule Campaign"}
              </button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      <Dialog open={isTemplatePreviewOpen} onOpenChange={setIsTemplatePreviewOpen}>
        <DialogContent className="max-w-[380px] p-0 overflow-hidden !border-none !bg-transparent !shadow-none [&>button]:hidden">
          {templatePreviewDraft ? (
            <div className="relative flex w-full flex-col items-center">
              <button
                type="button"
                onClick={() => setIsTemplatePreviewOpen(false)}
                className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors focus:outline-none"
                title="Close Preview"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-full">
                <WhatsAppTemplatePreview draft={templatePreviewDraft} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function KV({ label, value, copyable }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value || !copyable) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info("Copied to clipboard", { autoClose: 1000 });
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2 group/kv">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        onClick={handleCopy}
        className={cx(
          "text-xs font-semibold text-slate-900 text-right transition-all",
          copyable
            ? "cursor-pointer hover:text-emerald-600 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-transparent hover:border-emerald-200 hover:bg-emerald-50"
            : ""
        )}
      >
        {value ?? "-"}
        {copyable && (
          <span className="ml-1.5 opacity-0 group-hover/kv:opacity-100 transition-opacity text-[10px] text-emerald-500 font-bold uppercase">
            {copied ? "Copied!" : "Copy"}
          </span>
        )}
      </div>
    </div>
  );
}

function Skeleton({ className }) {
  return (
    <div className={cx("animate-pulse bg-slate-200 rounded-xl", className)} />
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse h-full w-full flex flex-col items-center justify-center text-center">
      <Skeleton className="h-5 w-16 mb-2" />
      <Skeleton className="h-4 w-28 mb-4" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  );
}

function MetricChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">
        {value ?? "-"}
      </div>
    </div>
  );
}

function ProgressRing({
  percentage,
  size = 32,
  strokeWidth = 3,
  colorClass = "text-emerald-500",
  children,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-slate-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cx("transition-all duration-500 ease-out", colorClass)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  totalLabel = "recipients",
  colorClass,
}) {
  const v = safeNumber(value);
  const t = safeNumber(total);
  const pct = t > 0 ? Math.min(100, (v / t) * 100) : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-slate-900">
            {v.toLocaleString()}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-100">
            {t ? `${pct.toFixed(0)}%` : "-"}
          </span>
        </div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cx(
            "h-full rounded-full transition-all duration-700 ease-out",
            colorClass
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Out of {t ? t.toLocaleString() : "-"} {totalLabel}
      </p>
    </div>
  );
}

function StatCard({
  title,
  percentage,
  count,
  icon: Icon,
  iconClassName,
  ringColor,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(active)}
      className={cx(
        "relative flex flex-col items-center justify-center text-center p-5 rounded-lg border transition-all duration-300 h-full w-full focus:outline-none group shadow-sm",
        active
          ? "border-2 border-emerald-600 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/20 shadow-xl -translate-y-1 z-10"
          : "border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* Text Data - Now at the Top */}
      <div className="space-y-1 mb-4">
        <div className="text-xl font-bold text-slate-900 tracking-tight leading-none flex items-baseline justify-center gap-1.5">
          <span>
            {percentage != null ? `${percentage.toFixed(0)}%` : "0%"}
          </span>
          <span
            className={cx(
              "text-sm font-semibold transition-colors opacity-70",
              active ? "text-emerald-900" : "text-slate-500"
            )}
          >
            ({count?.toLocaleString() || "0"})
          </span>
        </div>
        <p
          className={cx(
            "text-[11px] font-bold tracking-wider leading-tight transition-colors px-1",
            active ? "text-emerald-900" : "text-slate-700"
          )}
        >
          {title}
        </p>
      </div>
      {/* Icon + Ring Part - Now at the Bottom and Smaller */}
      <div className="transform transition-transform duration-300 group-hover:scale-110">
        {Icon ? (
          <ProgressRing
            percentage={percentage || 0}
            colorClass={ringColor}
            size={44}
            strokeWidth={3}
          >
            <div
              className={cx(
                "p-2 rounded-full transition-all duration-300",
                active
                  ? iconClassName
                  : "bg-slate-50 text-slate-400 grayscale-[0.8]"
              )}
            >
              <Icon className="w-4.5 h-4.5" />
            </div>
          </ProgressRing>
        ) : null}
      </div>
      {active && (
        <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-emerald-500 transform rotate-45 border-r border-b border-emerald-600 shadow-lg z-10" />
      )}
    </button>
  );
}

export default function CampaignLogReportPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { can, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const allowed = useMemo(() => {
    return can?.(FK.CAMPAIGN_STATUS_VIEW) || can?.(FK.CAMPAIGN_LIST_VIEW);
  }, [can]);

  const tabFromUrl = (searchParams.get("tab") || "").toLowerCase();
  const windowDaysFromUrl = (() => {
    const raw = searchParams.get("windowDays");
    const parsed = Number.parseInt(String(raw ?? DEFAULT_WINDOW_DAYS), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WINDOW_DAYS;
  })();

  const [activeTab, setActiveTab] = useState(
    STAT_TABS.includes(tabFromUrl) ? tabFromUrl : "recipients"
  );
  const [windowDays, setWindowDays] = useState(
    Number.isFinite(windowDaysFromUrl) && windowDaysFromUrl > 0
      ? windowDaysFromUrl
      : DEFAULT_WINDOW_DAYS
  );

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [campaignMeta, setCampaignMeta] = useState(null);

  const [audienceSegment, setAudienceSegment] = useState(
    () => SEGMENT_FROM_TAB[tabFromUrl] || ALL_RECIPIENTS_SEGMENT
  );
  const [audienceSearch, setAudienceSearch] = useState("");
  const [audiencePage, setAudiencePage] = useState(1);
  const [audienceItems, setAudienceItems] = useState([]);
  const [audienceTotalCount, setAudienceTotalCount] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceHasLoaded, setAudienceHasLoaded] = useState(false);
  const [audienceError, setAudienceError] = useState(null);
  const [audienceSource, setAudienceSource] = useState(null); // 'audience' | 'bucket-contacts' | 'campaign-logs' | 'recipients' | 'mock'
  const [audienceLastUpdatedAt, setAudienceLastUpdatedAt] = useState(null);
  const [audienceExporting, setAudienceExporting] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [selectedContactsById, setSelectedContactsById] = useState({});
  const [isRetargetModalOpen, setIsRetargetModalOpen] = useState(false);

  const audienceSectionRef = useRef(null);
  const audienceAppliedRef = useRef({
    segment: null,
    search: null,
    windowDays: null,
  });
  const recipientsCacheRef = useRef({ campaignId: null, items: null });
  const audienceEndpointsRef = useRef({
    audience: null,
    bucketContacts: null,
    campaignLogs: null,
  });
  const audienceTotalPages =
    audienceTotalCount != null
      ? Math.max(1, Math.ceil(Number(audienceTotalCount) / AUDIENCE_PAGE_SIZE))
      : null;

  function setUrlState(next) {
    const sp = new URLSearchParams(searchParams);
    if (next.tab) sp.set("tab", next.tab);
    if (next.windowDays) sp.set("windowDays", String(next.windowDays));
    setSearchParams(sp, { replace: true });
  }

  function selectTab(nextTab) {
    const t = STAT_TABS.includes(nextTab) ? nextTab : "recipients";
    setActiveTab(t);
    setUrlState({ tab: t, windowDays });
    const seg = SEGMENT_FROM_TAB[t];
    if (seg) {
      setAudienceSegment(seg);
      requestAnimationFrame(() => {
        audienceSectionRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  function updateWindowDays(nextDays) {
    const d = Number(nextDays);
    const safe = Number.isFinite(d) && d > 0 ? d : DEFAULT_WINDOW_DAYS;
    setWindowDays(safe);
    setUrlState({ tab: activeTab, windowDays: safe });

    // Only auto-reload audience list on the Audience/Recipients tab.
    // Reply window only matters for the REPLIED segment.
    if (activeTab === "recipients" && audienceSegment === "REPLIED") {
      setAudiencePage(1);
      setSelectedContactIds(new Set());
      setSelectedContactsById({});
      loadAudience({ resetPage: true, windowDays: safe });
    }
  }

  const counts = useMemo(() => {
    const s = summary || {};
    const recipients =
      pickNumberFromPaths(s, [
        "recipients",
        "totalRecipients",
        "audience",
        "total",
        "totalCount",
        "stats.recipients",
        "data.totalRecipients",
      ]) ?? 0;
    const sent =
      pickNumberFromPaths(s, ["sent", "stats.sent", "data.sent"]) ?? 0;
    const delivered =
      pickNumberFromPaths(s, [
        "delivered",
        "stats.delivered",
        "data.delivered",
      ]) ?? 0;
    const read =
      pickNumberFromPaths(s, ["read", "stats.read", "data.read"]) ?? 0;
    const clicked =
      pickNumberFromPaths(s, ["clicked", "stats.clicked", "data.clicked"]) ?? 0;
    const replied =
      pickNumberFromPaths(s, [
        "replied",
        "repliedWithinWindow",
        "stats.repliedWithinWindow",
        "stats.replied",
        "data.replied",
      ]) ?? 0;
    const failed =
      pickNumberFromPaths(s, ["failed", "stats.failed", "data.failed"]) ?? 0;

    const total =
      recipients ||
      Math.max(
        safeNumber(sent),
        safeNumber(delivered),
        safeNumber(read),
        safeNumber(clicked),
        safeNumber(replied),
        safeNumber(failed)
      );

    return {
      recipients: safeNumber(total),
      sent: safeNumber(sent),
      delivered: safeNumber(delivered),
      read: safeNumber(read),
      clicked: safeNumber(clicked),
      replied: safeNumber(replied),
      failed: safeNumber(failed),
    };
  }, [summary]);

  const cardMeta = useMemo(() => {
    const total = counts.recipients || 0;
    const getPct = (x) => {
      if (!total) return 0;
      const p = (safeNumber(x) / safeNumber(total)) * 100;
      if (!Number.isFinite(p)) return 0;
      return Math.max(0, Math.min(100, p));
    };

    return {
      recipients: { pct: 100, count: total },
      sent: { pct: getPct(counts.sent), count: counts.sent },
      delivered: { pct: getPct(counts.delivered), count: counts.delivered },
      read: { pct: getPct(counts.read), count: counts.read },
      clicked: { pct: getPct(counts.clicked), count: counts.clicked },
      replied: { pct: getPct(counts.replied), count: counts.replied },
      failed: { pct: getPct(counts.failed), count: counts.failed },
    };
  }, [counts]);

  async function loadSummary() {
    if (!campaignId) return;
    setSummaryLoading(true);
    try {
      const res = await getCampaignReportSummary(campaignId, {
        repliedWindowDays: windowDays,
      });
      const data = res?.data?.data ?? res?.data ?? null;
      setSummary(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load campaign report.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadCampaign() {
    if (!campaignId) return;
    try {
      const res = await axiosClient.get(`/campaign/${campaignId}`, {
        __silent: true,
      });
      const data = res?.data?.data ?? res?.data ?? null;
      setCampaignMeta(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 404 && status !== 405) console.error(err);
      setCampaignMeta(null);
    }
  }

  function cleanParams(obj) {
    const out = { ...obj };
    Object.keys(out).forEach((k) => {
      if (out[k] == null || out[k] === "") delete out[k];
    });
    return out;
  }

  function extractItems(raw) {
    if (!raw) return [];
    const list =
      raw.items ||
      raw.Items ||
      raw.contacts ||
      raw.Contacts ||
      raw.rows ||
      raw.Rows ||
      [];
    return Array.isArray(list) ? list : [];
  }

  function extractTotalCount(raw) {
    if (!raw) return null;
    const n =
      raw.totalCount ??
      raw.TotalCount ??
      raw.total ??
      raw.Total ??
      raw.count ??
      raw.Count ??
      raw?.meta?.total ??
      raw?.Meta?.Total ??
      null;
    return Number.isFinite(Number(n)) ? Number(n) : null;
  }

  function getAudienceRowText(x) {
    const name = x?.name || x?.contactName || x?.contact?.name || "";
    const phone =
      x?.phone ||
      x?.contactPhone ||
      x?.recipientNumber ||
      x?.to ||
      x?.recipient ||
      "";
    const status = x?.lastStatus || x?.status || x?.sendStatus || "";
    return `${name} ${phone} ${status}`.toLowerCase();
  }

  function applyClientSearch(items, q) {
    const needle = String(q || "")
      .trim()
      .toLowerCase();
    if (!needle) return items;
    return items.filter((x) => getAudienceRowText(x).includes(needle));
  }

  function normalizeAudienceResponse(raw, { page, pageSize }) {
    const items = extractItems(raw);
    const totalCount = extractTotalCount(raw);
    return {
      items,
      totalCount,
      page: Number.isFinite(Number(raw?.page ?? raw?.Page))
        ? Number(raw?.page ?? raw?.Page)
        : Number(page || 1),
      pageSize: Number.isFinite(Number(raw?.pageSize ?? raw?.PageSize))
        ? Number(raw?.pageSize ?? raw?.PageSize)
        : Number(pageSize || AUDIENCE_PAGE_SIZE),
    };
  }

  function formatAxiosError(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    let msg = "";
    if (typeof data === "string") msg = data;
    else if (typeof data?.message === "string") msg = data.message;
    else {
      try {
        msg = data ? JSON.stringify(data) : "";
      } catch {
        msg = "";
      }
    }
    if (msg && msg.length > 220) msg = `${msg.slice(0, 220)}...`;
    return { status, message: msg || err?.message || "" };
  }

  async function fetchAllRecipients() {
    const cached = recipientsCacheRef.current;
    if (
      cached?.campaignId === campaignId &&
      Array.isArray(cached?.items)
    ) {
      return cached.items;
    }

    const res = await axiosClient.get(`/campaigns/${campaignId}/recipients`, {
      __silent: true,
    });

    const raw = res?.data?.data ?? res?.data ?? [];
    const allItems = Array.isArray(raw) ? raw : extractItems(raw);
    recipientsCacheRef.current = { campaignId, items: allItems };
    return allItems;
  }

  function normalizeRecipientStatus(x) {
    const raw = x?.lastStatus ?? x?.status ?? x?.sendStatus ?? "";
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
  }

  function getRecipientActivityDate(x) {
    // Best-effort: use a reply timestamp if present, else lastActivityAt-like fields.
    const raw =
      x?.repliedAt ??
      x?.RepliedAt ??
      x?.replyAt ??
      x?.ReplyAt ??
      x?.lastReplyAt ??
      x?.LastReplyAt ??
      x?.lastActivityAt ??
      x?.lastUpdatedAt ??
      x?.updatedAt ??
      x?.sentAt ??
      x?.createdAt ??
      null;
    return tryParseDate(raw);
  }

  function filterRecipientsBySegment(items, segment, wd) {
    const seg = String(segment || "").toUpperCase();
    if (seg === ALL_RECIPIENTS_SEGMENT) return items;

    const now = Date.now();
    const windowMs =
      Number.isFinite(Number(wd)) && Number(wd) > 0
        ? Number(wd) * 24 * 60 * 60 * 1000
        : null;

    return (items || []).filter((x) => {
      const s = normalizeRecipientStatus(x);
      if (!s) return false;

      if (seg === "FAILED") {
        return s.includes("FAILED") || s === "FAIL" || s.includes("ERROR");
      }

      if (seg === "REPLIED") {
        if (!(s.includes("REPLIED") || s.includes("REPLY"))) return false;
        if (!windowMs) return true;
        const d = getRecipientActivityDate(x);
        if (!d) return true; // can't enforce window without a timestamp
        return now - d.getTime() <= windowMs;
      }

      if (seg === "DELIVERED_NOT_READ") {
        if (s === "DELIVERED_NOT_READ") return true;
        return (
          s.includes("DELIVERED") &&
          !s.includes("READ") &&
          !s.includes("REPLIED") &&
          !s.includes("CLICK")
        );
      }

      if (seg === "READ_NOT_REPLIED") {
        if (s === "READ_NOT_REPLIED") return true;
        return s.includes("READ") && !s.includes("REPLIED");
      }

      if (seg === "CLICKED_NOT_REPLIED") {
        if (s === "CLICKED_NOT_REPLIED") return true;
        return s.includes("CLICK") && !s.includes("REPLIED");
      }

      // Unknown segment: do not filter out everything; fallback to all.
      return true;
    });
  }

  async function fetchAudience({
    segment,
    windowDays: wd,
    q,
    page,
    pageSize,
  }) {
    const notFound = (s) => s === 404 || s === 405;
    const query = String(q || "").trim();

    const fetchFromRecipients = async (source) => {
      const allItems = await fetchAllRecipients();
      const segItems = filterRecipientsBySegment(allItems, segment, wd);
      const filtered = query ? applyClientSearch(segItems, query) : segItems;

      const p = Number(page || 1);
      const ps = Number(pageSize || AUDIENCE_PAGE_SIZE);
      const start = (p - 1) * ps;
      const items = filtered.slice(start, start + ps);

      return {
        items,
        totalCount: filtered.length,
        page: p,
        pageSize: ps,
        source,
      };
    };

    // Stable baseline: always possible to derive segments from recipients when backend audience endpoints are missing.
    if (segment === ALL_RECIPIENTS_SEGMENT) {
      return await fetchFromRecipients("recipients");
    }

    const tryEndpoint = async (source, path, params, { mapQueryTo } = {}) => {
      const finalParams = cleanParams(params);
      if (mapQueryTo && query) {
        finalParams[mapQueryTo] = query;
      }
      try {
        const res = await axiosClient.get(path, {
          __silent: true,
          params: finalParams,
        });
        const raw = res?.data?.data ?? res?.data ?? {};
        let normalized = normalizeAudienceResponse(raw, { page, pageSize });
        // If backend doesn't support query param, retry without it and filter locally
        if (query && normalized.items.length === 0) {
          // keep as-is; the server may legitimately have zero results
        }
        return { ...normalized, source };
      } catch (err) {
        const status = err?.response?.status;
        if (query && status === 400) {
          // retry without query param and filter client-side
          const retryParams = { ...params };
          if (mapQueryTo) delete retryParams[mapQueryTo];
          const res = await axiosClient.get(path, {
            __silent: true,
            params: cleanParams(retryParams),
          });
          const raw = res?.data?.data ?? res?.data ?? {};
          const normalized = normalizeAudienceResponse(raw, { page, pageSize });
          return {
            ...normalized,
            items: applyClientSearch(normalized.items, query),
            source,
            _clientFiltered: true,
          };
        }
        throw err;
      }
    };

    // Preferred A: /campaigns/{campaignId}/reports/audience?segment&windowDays&q
    if (audienceEndpointsRef.current.audience !== false) {
      try {
        return await tryEndpoint(
          "audience",
          `/campaigns/${campaignId}/reports/audience`,
          { segment, windowDays: wd, page, pageSize },
          { mapQueryTo: "q" }
        );
      } catch (err) {
        const status = err?.response?.status;
        if (notFound(status)) audienceEndpointsRef.current.audience = false;
      }
    }

    // Fallback B: /campaigntracking/campaigns/{campaignId}/bucket-contacts?bucket&windowDays&q
    if (audienceEndpointsRef.current.bucketContacts !== false) {
      try {
        return await tryEndpoint(
          "bucket-contacts",
          `/campaigntracking/campaigns/${campaignId}/bucket-contacts`,
          { bucket: segment, windowDays: wd, page, pageSize },
          { mapQueryTo: "q" }
        );
      } catch (err) {
        const status = err?.response?.status;
        if (notFound(status)) audienceEndpointsRef.current.bucketContacts = false;
      }
    }

    // Fallback C: existing campaign logs bucket contacts contract (if available)
    if (audienceEndpointsRef.current.campaignLogs !== false) {
      try {
        const res = await getCampaignBucketContacts(campaignId, segment, {
          q: query,
          page,
          pageSize,
          repliedWindowDays: wd,
        });
        const raw = res?.data?.data ?? res?.data ?? {};
        const normalized = normalizeAudienceResponse(raw, { page, pageSize });
        return { ...normalized, source: "campaign-logs" };
      } catch (err) {
        const status = err?.response?.status;
        if (notFound(status)) audienceEndpointsRef.current.campaignLogs = false;
      }
    }

    // Last-resort fallback: derive segment from recipients list.
    // This prevents the Segment dropdown from appearing "broken" when backend audience endpoints are missing.
    try {
      return await fetchFromRecipients("recipients-derived");
    } catch (err) {
      const status = err?.response?.status;
      if (notFound(status)) {
        toast.warn("Audience endpoint not found. Backend work required.", {
          toastId: "audience-endpoint-missing",
        });
        return { items: [], totalCount: 0, page, pageSize, source: "mock" };
      }
      throw err;
    }
  }

  async function loadAudience({
    nextPage,
    resetPage,
    segment,
    windowDays: windowDaysOverride,
    q,
  } = {}) {
    if (!campaignId) return;
    const page = resetPage ? 1 : nextPage ?? audiencePage;
    const segmentToUse = segment ?? audienceSegment;
    const windowDaysToUse = windowDaysOverride ?? windowDays;
    const queryToUse = q ?? audienceSearch;
    setAudienceLoading(true);
    setAudienceError(null);
    try {
      const res = await fetchAudience({
        segment: segmentToUse,
        windowDays: windowDaysToUse,
        q: queryToUse,
        page,
        pageSize: AUDIENCE_PAGE_SIZE,
      });
      setAudienceItems(res.items || []);
      setAudienceTotalCount(res.totalCount);
      setAudienceSource(res.source || null);
      setAudienceHasLoaded(true);
      setAudiencePage(page);
      setAudienceLastUpdatedAt(new Date().toISOString());
      audienceAppliedRef.current = {
        segment: segmentToUse,
        search: queryToUse,
        windowDays: windowDaysToUse,
      };
    } catch (err) {
      console.error(err);
      const { status, message } = formatAxiosError(err);
      setAudienceItems([]);
      setAudienceTotalCount(null);
      setAudienceSource(null);
      setAudienceHasLoaded(true);
      setAudienceError(message || err?.message || "Failed to load contacts.");
      toast.error(
        `Failed to load contacts${status ? ` (${status})` : ""}${
          message ? `: ${message}` : ""
        }`
      );
    } finally {
      setAudienceLoading(false);
    }
  }

  function getContactId(x) {
    return x?.contactId || x?.id || x?.phone || x?.contactPhone || x?.recipientNumber || x?.to || x?.recipient || null;
  }

  function toggleContactSelection(item) {
    const id = getContactId(item);
    if (!id) return;
    const key = String(id);
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      const willSelect = !next.has(id);
      if (willSelect) next.add(id);
      else next.delete(id);

      setSelectedContactsById((prevMap) => {
        const mapNext = { ...(prevMap || {}) };
        if (willSelect) mapNext[key] = item;
        else delete mapNext[key];
        return mapNext;
      });

      return next;
    });
  }

  function toggleSelectAll() {
    const itemsOnPage = audienceItems || [];
    const idsOnPage = itemsOnPage.map(getContactId).filter(Boolean);
    const allSelected = idsOnPage.every((id) => selectedContactIds.has(id));

    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        idsOnPage.forEach((id) => next.delete(id));
      } else {
        idsOnPage.forEach((id) => next.add(id));
      }

      setSelectedContactsById((prevMap) => {
        const mapNext = { ...(prevMap || {}) };
        if (allSelected) {
          idsOnPage.forEach((id) => delete mapNext[String(id)]);
        } else {
          itemsOnPage.forEach((item) => {
            const id = getContactId(item);
            if (!id) return;
            mapNext[String(id)] = item;
          });
        }
        return mapNext;
      });

      return next;
    });
  }

  function mapAudienceRows(items) {
    return (items || []).map((x) => {
      const name = x?.name || x?.contactName || x?.contact?.name || "";
      const phone =
        x?.phone ||
        x?.contactPhone ||
        x?.recipientNumber ||
        x?.to ||
        x?.recipient ||
        "";
      const lastActivityAt =
        x?.lastActivityAt ||
        x?.lastUpdatedAt ||
        x?.updatedAt ||
        x?.sentAt ||
        x?.createdAt ||
        "";
      return {
        Name: name,
        Phone: phone,
        Segment: x?.segment || audienceSegment,
        LastActivityAt: lastActivityAt,
      };
    });
  }

  function downloadCsv(rows, { filename }) {
    const escapeCell = (v) => {
      const s = String(v ?? "");
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = ["Name", "Phone", "Segment", "LastActivityAt"];
    const lines = [
      header.join(","),
      ...rows.map((r) => header.map((k) => escapeCell(r[k])).join(",")),
    ];
    const blob = new Blob([lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportAudienceCsv() {
    if (!campaignId) return;
    if (audienceExporting) return;
    const MAX_EXPORT_ROWS = 5000;
    const EXPORT_PAGE_SIZE = 500;
    try {
      setAudienceExporting(true);
      const total = Number.isFinite(Number(audienceTotalCount))
        ? Number(audienceTotalCount)
        : null;

      // Default: export what the user can see right now.
      let exportItems = Array.isArray(audienceItems) ? [...audienceItems] : [];

      // If we know the total and it's reasonable, export ALL filtered contacts.
      if (total != null && total > exportItems.length) {
        if (total > MAX_EXPORT_ROWS) {
          toast.warn(
            `Export limited to current page (too many results: ${total.toLocaleString()}). Narrow filters to export all.`
          );
        } else {
          const pages = Math.max(1, Math.ceil(total / EXPORT_PAGE_SIZE));
          const all = [];
          for (let p = 1; p <= pages; p += 1) {
            const res = await fetchAudience({
              segment: audienceSegment,
              windowDays,
              q: audienceSearch,
              page: p,
              pageSize: EXPORT_PAGE_SIZE,
            });
            const items = Array.isArray(res?.items) ? res.items : [];
            all.push(...items);
          }
          exportItems = all;
        }
      }

      // Dedupe by contactId/phone to avoid repeated rows when backends return joins.
      const seen = new Set();
      const deduped = [];
      for (const x of exportItems) {
        const key =
          x?.contactId ||
          x?.id ||
          x?.phone ||
          x?.contactPhone ||
          x?.recipientNumber ||
          x?.to ||
          null;
        if (!key) continue;
        const k = String(key);
        if (seen.has(k)) continue;
        seen.add(k);
        deduped.push(x);
        if (deduped.length >= MAX_EXPORT_ROWS) break;
      }

      const rows = mapAudienceRows(deduped);
      const filename = `campaign_${campaignId}_${audienceSegment}_${windowDays}d.csv`;
      downloadCsv(rows, { filename });
      toast.success(`Exported ${rows.length.toLocaleString()} contacts.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export CSV.");
    } finally {
      setAudienceExporting(false);
    }
  }

  function goToRetarget() {
    setIsRetargetModalOpen(true);
  }

  useEffect(() => {
    if (!tabFromUrl) setUrlState({ tab: activeTab, windowDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (STAT_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  useEffect(() => {
    if (
      windowDaysFromUrl !== windowDays &&
      Number.isFinite(windowDaysFromUrl) &&
      windowDaysFromUrl > 0
    ) {
      setWindowDays(windowDaysFromUrl);
    }
  }, [windowDaysFromUrl, windowDays]);

  useEffect(() => {
    if (!allowed) return;
    loadCampaign();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, campaignId, windowDays]);

  useEffect(() => {
    // Only auto-load if the user has already loaded the audience once
    if (!audienceHasLoaded) return;
    const timer = setTimeout(() => {
      if (audienceSearch !== audienceAppliedRef.current.search) {
        loadAudience({ resetPage: true });
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceSearch]);

  async function handleRefresh() {
    await Promise.all([loadCampaign(), loadSummary()]);
    if (audienceHasLoaded) {
      await loadAudience({ nextPage: audiencePage });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-96 rounded-3xl" />
            <div className="col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-64 rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Campaign Log Report
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            You don't have permission to view this report.
          </p>
        </div>
      </div>
    );
  }

  const createdAt =
    campaignMeta?.createdAt ||
    campaignMeta?.created_at ||
    campaignMeta?.createdOn;
  const completedAt =
    campaignMeta?.completedAt ||
    campaignMeta?.completed_at ||
    campaignMeta?.completedOn ||
    campaignMeta?.updatedAt;

  const durationMs = (() => {
    const a = tryParseDate(createdAt);
    const b = tryParseDate(completedAt);
    if (!a || !b) return null;
    return b.getTime() - a.getTime();
  })();

  const campaignName =
    campaignMeta?.name ||
    campaignMeta?.campaignName ||
    campaignMeta?.title ||
    "Campaign Log Report";

  const templateName =
    campaignMeta?.templateName ||
    campaignMeta?.template?.name ||
    campaignMeta?.template ||
    null;

  const campaignType =
    campaignMeta?.campaignType ||
    campaignMeta?.type ||
    campaignMeta?.kind ||
    null;

  const status = campaignMeta?.status || campaignMeta?.state || null;
  const retargetEligibility = getRetargetEligibility(status);

  const creditUsage =
    parseMaybeNumber(campaignMeta?.totalCreditUsage) ??
    parseMaybeNumber(summary?.totalCreditUsage) ??
    parseMaybeNumber(summary?.creditUsage) ??
    null;

  const audienceIsDirty =
    audienceHasLoaded &&
    (audienceAppliedRef.current.segment !== audienceSegment ||
      audienceAppliedRef.current.search !== audienceSearch ||
      audienceAppliedRef.current.windowDays !== windowDays);

  const isAudienceReload = audienceHasLoaded && !audienceIsDirty;
  const AudiencePrimaryIcon = isAudienceReload ? RefreshCcw : Filter;
  const audiencePrimaryLabel = isAudienceReload
    ? "Reload"
    : audienceIsDirty
      ? "Apply filters"
      : "Apply";

  return (
    <div className="min-h-screen bg-[#f5f6f7]">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between animate-fade-in-up">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-emerald-700 tracking-tight">
                Campaign Log Report
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={summaryLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                className={cx("h-4 w-4", summaryLoading && "animate-spin")}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4">
            {summaryLoading && !summary ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7 auto-rows-fr">
                {[...Array(7)].map((_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7 auto-rows-fr">
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "0ms" }}
                >
                  <StatCard
                    title="Total Recipients"
                    percentage={cardMeta.recipients.pct}
                    count={cardMeta.recipients.count}
                    icon={Users}
                    iconClassName="bg-emerald-50 text-emerald-700"
                    ringColor="text-emerald-500"
                    active={activeTab === "recipients"}
                    onClick={() => selectTab("recipients")}
                  />
                </div>
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "50ms" }}
                >
                  <StatCard
                    title="Sent"
                    percentage={cardMeta.sent.pct}
                    count={cardMeta.sent.count}
                    icon={Send}
                    iconClassName="bg-emerald-50 text-emerald-700"
                    ringColor="text-emerald-500"
                    active={activeTab === "sent"}
                    onClick={() => selectTab("sent")}
                  />
                </div>
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "100ms" }}
                >
                  <StatCard
                    title="Delivered"
                    percentage={cardMeta.delivered.pct}
                    count={cardMeta.delivered.count}
                    icon={CheckCircle2}
                    iconClassName="bg-emerald-50 text-emerald-700"
                    ringColor="text-emerald-500"
                    active={activeTab === "delivered"}
                    onClick={() => selectTab("delivered")}
                  />
                </div>
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "150ms" }}
                >
                  <StatCard
                    title="Read"
                    percentage={cardMeta.read.pct}
                    count={cardMeta.read.count}
                    icon={Eye}
                    iconClassName="bg-blue-50 text-blue-700"
                    ringColor="text-blue-500"
                    active={activeTab === "read"}
                    onClick={() => selectTab("read")}
                  />
                </div>
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "200ms" }}
                >
                  <StatCard
                    title="Clicked"
                    percentage={cardMeta.clicked.pct}
                    count={cardMeta.clicked.count}
                    icon={MousePointerClick}
                    iconClassName="bg-emerald-50 text-emerald-700"
                    ringColor="text-emerald-500"
                    active={activeTab === "clicked"}
                    onClick={() => selectTab("clicked")}
                  />
                </div>
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "250ms" }}
                >
                  <StatCard
                    title="Replied"
                    percentage={cardMeta.replied.pct}
                    count={cardMeta.replied.count}
                    icon={MessageSquare}
                    iconClassName="bg-emerald-50 text-emerald-700"
                    ringColor="text-emerald-500"
                    active={activeTab === "replied"}
                    onClick={() => selectTab("replied")}
                  />
                </div>
                <div
                  className="animate-fade-in-up"
                  style={{ animationDelay: "300ms" }}
                >
                  <StatCard
                    title="Failed"
                    percentage={cardMeta.failed.pct}
                    count={cardMeta.failed.count}
                    icon={AlertTriangle}
                    iconClassName="bg-red-50 text-red-700"
                    ringColor="text-red-500"
                    active={activeTab === "failed"}
                    onClick={() => selectTab("failed")}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 p-5 bg-slate-50/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Total recipients insights
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Overview of campaign health, plus an internal audience filter
                  for retargeting.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    requestAnimationFrame(() => {
                      audienceSectionRef.current?.scrollIntoView?.({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                    if (!audienceHasLoaded && !audienceLoading) {
                      loadAudience({ resetPage: true });
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <Filter className="w-4 h-4" />
                  Audience Filter & Retarget
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/app/campaigns/logs/${campaignId}`)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  View Contact Journey
                </button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-1">
                <div className="text-sm font-semibold text-slate-900">
                  Campaign details
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  <KV label="Campaign name" value={campaignName} />
                  <KV label="Campaign type" value={campaignType || "-"} />
                  <KV label="Status" value={status || "-"} />
                  <KV
                    label="Template name"
                    value={templateName || "-"}
                    copyable
                  />
                  <KV label="Created at" value={formatDateTime(createdAt)} />
                  <KV
                    label="Completed at"
                    value={formatDateTime(completedAt)}
                  />
                  <KV
                    label="Campaign duration"
                    value={formatDurationMs(durationMs)}
                  />
                </div>
              </Card>
              <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <MetricChip
                  label="Audience"
                  value={
                    counts.recipients ? counts.recipients.toLocaleString() : "-"
                  }
                />
                <MetricChip
                  label="Total credit usage"
                  value={creditUsage == null ? "-" : `â‚¹ ${creditUsage}`}
                />
                <Card className="md:col-span-2 p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-sm font-semibold text-slate-900">
                      Performance rates
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Success
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Engagement
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Failure
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Funnel Chart */}
                    <div className="h-[300px] w-full">
                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-4 tracking-wider">
                        Campaign Funnel
                      </p>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={[
                            { name: "Recipients", value: counts.recipients, fill: "#94a3b8" },
                            { name: "Sent", value: counts.sent, fill: "#10b981" },
                            { name: "Delivered", value: counts.delivered, fill: "#10b981" },
                            { name: "Read", value: counts.read, fill: "#3b82f6" },
                            { name: "Clicked", value: counts.clicked, fill: "#f59e0b" },
                            { name: "Replied", value: counts.replied, fill: "#ec4899" },
                          ]}
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fontWeight: 500, fill: "#64748b" }}
                            width={70}
                          />
                          <Tooltip
                            cursor={{ fill: "transparent" }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const pct = counts.recipients ? ((data.value / counts.recipients) * 100).toFixed(1) : 0;
                                return (
                                  <div className="bg-white border border-slate-200 p-2 shadow-lg rounded-lg text-xs">
                                    <p className="font-bold text-slate-900">{data.name}</p>
                                    <p className="text-slate-600">Count: {data.value.toLocaleString()}</p>
                                    <p className="text-emerald-600 font-semibold">{pct}% of total</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                            <LabelList
                              dataKey="value"
                              position="right"
                              formatter={(v) => v.toLocaleString()}
                              style={{ fontSize: 10, fontWeight: 600, fill: "#475569" }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Delivery & Failure Breakdown */}
                    <div className="h-[300px] w-full flex flex-col">
                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-4 tracking-wider">
                        Delivery Health
                      </p>
                      <div className="flex-1 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Delivered", value: counts.delivered, fill: "#10b981" },
                                { name: "Failed", value: counts.failed, fill: "#ef4444" },
                                { name: "Pending/Other", value: Math.max(0, counts.recipients - counts.delivered - counts.failed), fill: "#f1f5f9" },
                              ]}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell key="cell-0" fill="#10b981" />
                              <Cell key="cell-1" fill="#ef4444" />
                              <Cell key="cell-2" fill="#f1f5f9" />
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0];
                                  const total = counts.recipients || 1;
                                  return (
                                    <div className="bg-white border border-slate-200 p-2 shadow-lg rounded-lg text-xs">
                                      <p className="font-bold text-slate-900">{data.name}</p>
                                      <p className="text-slate-600">{data.value.toLocaleString()} ({((data.value / total) * 100).toFixed(1)}%)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              formatter={(value) => <span className="text-[11px] font-medium text-slate-600">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-xl font-bold text-slate-900">
                            {counts.recipients ? ((counts.delivered / counts.recipients) * 100).toFixed(0) : 0}%
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Success</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Read Rate</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg font-bold text-blue-600">
                          {counts.recipients ? ((counts.read / counts.recipients) * 100).toFixed(1) : 0}%
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">({counts.read})</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Click Rate</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg font-bold text-amber-600">
                          {counts.recipients ? ((counts.clicked / counts.recipients) * 100).toFixed(1) : 0}%
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">({counts.clicked})</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Reply Rate</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg font-bold text-pink-600">
                          {counts.recipients ? ((counts.replied / counts.recipients) * 100).toFixed(1) : 0}%
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">({counts.replied})</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Failure Rate</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg font-bold text-red-600">
                          {counts.recipients ? ((counts.failed / counts.recipients) * 100).toFixed(1) : 0}%
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">({counts.failed})</span>
                      </div>
                    </div>
                  </div>
                </Card>

              </div>
            </div>
            <div ref={audienceSectionRef} className="mt-4" />
            <Card className="p-0 overflow-hidden">
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Audience Filter & Retarget
                    </div>
                    {audienceHasLoaded ? (
                       <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium">
                          Window:{" "}
                          {audienceAppliedRef.current.windowDays || windowDays}d
                        </span>
                        {audienceAppliedRef.current.search ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium">
                            Search: {audienceAppliedRef.current.search}
                          </span>
                        ) : null}
                        {audienceLastUpdatedAt ? (
                          <span className="text-slate-400">
                            Updated {formatDateTime(audienceLastUpdatedAt)}
                          </span>
                        ) : null}
                        {audienceSource && audienceSource !== "audience" ? (
                          <span className="text-slate-400">
                            Source: {audienceSource}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {audienceSource === "mock" ? (
                      <div className="mt-2 text-xs text-amber-700">
                        Audience endpoint not available. Backend work required.
                      </div>
                    ) : null}
                    {audienceError ? (
                      <div className="mt-2 text-xs text-red-600">
                        {audienceError}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-3">
                    <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                      Segment
                    </div>
                    <select
                      value={audienceSegment}
                      onChange={(e) => {
                        const nextSeg = e.target.value;
                        setAudienceSegment(nextSeg);
                        setAudiencePage(1);
                        setSelectedContactIds(new Set());
                        setSelectedContactsById({});
                        if (activeTab === "recipients") {
                          loadAudience({ resetPage: true, segment: nextSeg });
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      {AUDIENCE_SEGMENTS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {audienceSegment === "REPLIED" && (
                    <div className="lg:col-span-2">
                      <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                        Reply window
                      </div>
                      <select
                        value={windowDays}
                        onChange={(e) => updateWindowDays(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        <option value={90}>All</option>
                        <option value={1}>24 hours</option>
                        <option value={3}>3 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                      </select>
                    </div>
                  )}
                  <div className="lg:col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                      Search
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        value={audienceSearch}
                        onChange={(e) => setAudienceSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            loadAudience({ resetPage: true });
                        }}
                        placeholder="Name or phone (press Enter)"
                        className="w-full outline-none text-sm text-slate-900"
                      />
                      {audienceSearch ? (
                        <button
                          type="button"
                          onClick={() => setAudienceSearch("")}
                          className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-100"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className={cx(
                      "flex items-end gap-2",
                      audienceSegment === "REPLIED"
                        ? "lg:col-span-3"
                        : "lg:col-span-5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        isAudienceReload
                          ? loadAudience({ nextPage: audiencePage })
                          : loadAudience({ resetPage: true })
                      }
                      disabled={audienceLoading}
                      className={cx(
                        "w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 whitespace-nowrap",
                        audienceIsDirty
                          ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-200"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      <AudiencePrimaryIcon
                        className={cx(
                          "w-4 h-4",
                          audienceLoading && "animate-spin"
                        )}
                      />
                      {audiencePrimaryLabel}
                    </button>
                    <button
                      type="button"
                      onClick={exportAudienceCsv}
                      disabled={
                        audienceExporting ||
                        !audienceHasLoaded ||
                        audienceItems.length === 0
                      }
                      className="inline-flex h-9 px-3 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
                      title={
                        !audienceHasLoaded
                          ? "Load contacts first"
                          : audienceItems.length === 0
                            ? "No contacts to export"
                            : "Export contacts as CSV"
                      }
                    >
                      <Download
                        className={cx(
                          "w-4 h-4 text-slate-500",
                          audienceExporting && "animate-pulse"
                        )}
                      />
                      {audienceExporting ? "Exportingâ€¦" : "Export"}
                    </button>
                    <button
                      type="button"
                      onClick={goToRetarget}
                      disabled={
                        !retargetEligibility.ok ||
                        !RETARGETABLE_SEGMENTS.has(audienceSegment) ||
                        selectedContactIds.size === 0
                      }
                      className="inline-flex h-9 px-3 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                      title={
                        !retargetEligibility.ok
                          ? retargetEligibility.reason
                          : !RETARGETABLE_SEGMENTS.has(audienceSegment)
                            ? "Select a retargetable segment"
                            : selectedContactIds.size === 0
                              ? "Select at least one contact to retarget"
                              : `Retarget ${selectedContactIds.size} selected contacts`
                      }
                    >
                      <Wand2 className="w-4 h-4" />
                      Retarget
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-300">
                    <tr className="bg-slate-50">
                      <th className="w-10 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={
                            audienceItems.length > 0 &&
                            audienceItems.every((x) =>
                              selectedContactIds.has(getContactId(x))
                            )
                          }
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        Phone
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        Segment
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        Last status
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        Last activity
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={cx(
                      "divide-y divide-slate-200",
                      audienceLoading && audienceItems.length > 0 && "opacity-60"
                    )}
                  >
                    {audienceLoading && audienceItems.length === 0 ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-4 py-3">
                            <div className="h-4 w-4 rounded bg-slate-100" />
                          </td>
                          {[...Array(5)].map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3 w-full max-w-[220px] rounded bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : !audienceHasLoaded ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-16 text-center"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                              <Users className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-base font-semibold text-slate-900">Get started with filters</p>
                            <p className="mt-1 text-sm text-slate-500 max-w-[280px] mx-auto">
                              Choose a segment above and click Apply to load the contact list.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : audienceItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          <>
  <div className="text-sm font-medium text-slate-700">No contacts found.</div>
  <div className="mt-1 text-xs text-slate-500">Try a different segment or clear the search.</div>
  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
    {audienceSearch ? (
      <button
        type="button"
        onClick={() => {
          setAudienceSearch("");
          loadAudience({ resetPage: true, q: "" });
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Clear search
      </button>
    ) : null}
    <button
      type="button"
      onClick={() => {
        setAudienceSegment(ALL_RECIPIENTS_SEGMENT);
        setAudienceSearch("");
        updateWindowDays(DEFAULT_WINDOW_DAYS);
        loadAudience({
          resetPage: true,
          segment: ALL_RECIPIENTS_SEGMENT,
          q: "",
          windowDays: DEFAULT_WINDOW_DAYS,
        });
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      Reset filters
    </button>
  </div>
</>
                        </td>
                      </tr>
                    ) : (
                      audienceItems.map((x, idx) => {
                        const name =
                          x?.name ||
                          x?.contactName ||
                          x?.contact?.name ||
                          "Unknown";
                        const phone =
                          x?.phone ||
                          x?.contactPhone ||
                          x?.recipientNumber ||
                          x?.to ||
                          x?.recipient ||
                          "-";
                        const seg = x?.segment || audienceSegment;
                        const lastStatus =
                          x?.lastStatus || x?.status || x?.sendStatus || "-";
                        const lastActivityAt =
                          x?.lastActivityAt ||
                          x?.lastUpdatedAt ||
                          x?.updatedAt ||
                          x?.sentAt ||
                          x?.createdAt ||
                          null;
                        return (
                          <tr
                            key={x?.contactId || x?.id || phone || idx}
                            className={cx(
                              "bg-white transition-colors hover:bg-slate-50",
                              selectedContactIds.has(getContactId(x)) && "bg-emerald-50/50"
                            )}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                checked={selectedContactIds.has(getContactId(x))}
                                onChange={() => toggleContactSelection(x)}
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-900 font-medium">{name}</td>
                            <td className="px-4 py-3 font-mono text-slate-700">
                              {phone}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {segmentLabel(seg)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {lastStatus}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {lastActivityAt
                                ? formatDateTime(lastActivityAt)
                                : "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-600">
                    {audienceTotalCount != null
                      ? (() => {
                          const total = Number(audienceTotalCount);
                          const page = Number(audiencePage) || 1;
                          const start =
                            total === 0
                              ? 0
                              : (page - 1) * AUDIENCE_PAGE_SIZE + 1;
                          const end =
                            total === 0
                              ? 0
                              : Math.min(page * AUDIENCE_PAGE_SIZE, total);
                          return `Showing ${start}-${end} of ${total.toLocaleString()} - Page ${page}${
                            audienceTotalPages ? ` of ${audienceTotalPages}` : ""
                          }`;
                        })()
                      : audienceSource
                        ? `Page ${audiencePage}`
                        : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        loadAudience({
                          nextPage: Math.max(1, audiencePage - 1),
                        })
                      }
                      disabled={audienceLoading || audiencePage <= 1}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        loadAudience({ nextPage: audiencePage + 1 })
                      }
                      disabled={
                        audienceLoading ||
                        (audienceTotalPages != null &&
                          audiencePage >= audienceTotalPages)
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            <RetargetModal
              isOpen={isRetargetModalOpen}
              onClose={() => setIsRetargetModalOpen(false)}
              campaignId={campaignId}
              selectedContactIds={selectedContactIds}
              selectedContacts={Object.values(selectedContactsById || {})}
              campaignStatus={status}
              initialBucket={audienceSegment}
              initialWindowDays={windowDays}
              campaignMeta={campaignMeta}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
