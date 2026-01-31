// 📄 src/pages/Settings/WhatsAppSettings.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import { useAuth } from "../../app/providers/AuthProvider";
import { 
  Save, 
  Trash2, 
  CheckCircle, 
  Phone, 
  Plus, 
  RefreshCw, 
  Star,
  Info,
  ShieldCheck,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Link 
} from "lucide-react";
import MetaPinActivationModal from "../../components/modals/MetaPinActivationModal";


// === Canonical providers (MUST match backend exactly) ===
const PROVIDERS = [
  { value: "PINNACLE", label: "PINNACLE" },
  { value: "META_CLOUD", label: "META_CLOUD" },
];

// --- BusinessId helper (used only as a sanity check / legacy headers) ---
const TOKEN_KEY = "xbyte_token";
const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBusinessIdFromStorage() {
  try {
    // Keep in sync with AuthProvider / axiosClient
    const keys = ["sa_selectedBusinessId", "businessId", "business_id"];
    for (const key of keys) {
      const saved = localStorage.getItem(key);
      if (saved && GUID_RE.test(saved)) return saved;
    }
    return null;
  } catch {
    return null;
  }
}

function getBusinessIdFromJwt() {
  try {
    const jwt = localStorage.getItem(TOKEN_KEY);
    if (!jwt) return null;

    const [, payloadB64] = jwt.split(".");
    if (!payloadB64) return null;

    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );

    const bid =
      payload?.BusinessId ||
      payload?.businessId ||
      payload?.biz ||
      payload?.bid ||
      null;

    return typeof bid === "string" && GUID_RE.test(bid) ? bid : null;
  } catch {
    return null;
  }
}

function resolveBusinessId(effectiveBusinessIdFromContext) {
  if (
    typeof effectiveBusinessIdFromContext === "string" &&
    GUID_RE.test(effectiveBusinessIdFromContext)
  ) {
    return effectiveBusinessIdFromContext;
  }
  return getBusinessIdFromStorage() || getBusinessIdFromJwt();
}

// Normalize provider names
const normalizeProvider = p => {
  const raw = (p ?? "").toString().trim();
  if (!raw) return "PINNACLE";
  const up = raw.toUpperCase();
  if (up === "PINNACLE") return "PINNACLE";
  if (
    up === "META_CLOUD" ||
    up === "META" ||
    up === "METACLOUD" ||
    up === "META-CLOUD"
  ) {
    return "META_CLOUD";
  }
  return "PINNACLE";
};

// UI label per provider (still binds to apiKey field)
const secretLabelFor = provider =>
  normalizeProvider(provider) === "PINNACLE" ? "API Key" : "Token";

// Initial blank global settings
const blank = {
  provider: "PINNACLE",
  apiUrl: "",
  apiKey: "",
  wabaId: "",
  senderDisplayName: "",
  webhookSecret: "",
  webhookVerifyToken: "",
  webhookCallbackUrl: "",
  isActive: true,
};

export default function WhatsAppSettings() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const effectiveBusinessIdFromContext = auth?.effectiveBusinessId || null;

  const [formData, setFormData] = useState(blank);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [senders, setSenders] = useState([]);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const [savedProvider, setSavedProvider] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // ESU status (normalized)
  const [esuStatus, setEsuStatus] = useState({
    loading: true,
    hasEsuFlag: false,
    hasValidToken: false,
    willExpireSoon: false,
    tokenExpiresAtUtc: null,
    isConfiguredViaEsu: false,
    isTokenExpiredOrInvalid: false,
    isTokenExpiringSoon: false,
    isFullyHealthy: false,
    phoneCount: 0,
    hasWaba: false,
    debug: null,
  });

  const [showPinModal, setShowPinModal] = useState(() => {
    return sessionStorage.getItem("xb_pending_esu_pin") === "true";
  });

  const closePinModal = () => {
    setShowPinModal(false);
    sessionStorage.removeItem("xb_pending_esu_pin");
  };

  const [connectingEsu, setConnectingEsu] = useState(false);

  const businessId = useMemo(
    () => resolveBusinessId(effectiveBusinessIdFromContext),
    [effectiveBusinessIdFromContext]
  );
  const hasBusinessContext = !!businessId;

  const withBiz = useCallback(
    (cfg = {}) =>
      businessId
        ? {
            ...cfg,
            headers: { ...(cfg.headers || {}), "X-Business-Id": businessId },
          }
        : cfg,
    [businessId]
  );

  // ===== Draft persistence (prevents "fields disappear" on navigation/tab switch) =====
  const draftKey = useCallback(
    () => `xb_whatsapp_settings_draft:v1:${businessId || "no-biz"}`,
    [businessId]
  );
  const DRAFT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
  const [canPersistDraft, setCanPersistDraft] = useState(false);
  const hasUserEditedRef = useRef(false);
  const prevBizIdRef = useRef(businessId);

  const restoreFromDraft = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(draftKey());
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return false;
      if (data.businessId !== businessId) return false;
      if (data.at && Date.now() - new Date(data.at).getTime() > DRAFT_TTL_MS) {
        sessionStorage.removeItem(draftKey());
        return false;
      }

      if (data.formData && typeof data.formData === "object") {
        setFormData(p => ({ ...p, ...data.formData }));
      }
      if (typeof data.hasSavedOnce === "boolean") setHasSavedOnce(data.hasSavedOnce);
      if (typeof data.savedProvider === "string") setSavedProvider(data.savedProvider);

      return true;
    } catch {
      return false;
    }
  }, [DRAFT_TTL_MS, businessId, draftKey]);

  // ===== Numbers API helpers =====
  const listNumbers = async provider => {
    const p = normalizeProvider(provider);
    const { data } = await axiosClient.get(
      `/whatsappsettings/${p}/numbers`,
      withBiz()
    );
    return Array.isArray(data) ? data : [];
  };

  const upsertNumber = async (provider, row) => {
    const p = normalizeProvider(provider);
    const payload = {
      phoneNumberId: (row.phoneNumberId || "").trim(),
      whatsAppBusinessNumber: (row.whatsAppBusinessNumber || "").trim(),
      senderDisplayName: (row.label || row.senderDisplayName || "").trim(),
      isActive: row.isActive ?? true,
      isDefault: !!row.isDefault,
    };
    const { data } = await axiosClient.post(
      `/whatsappsettings/${p}/numbers`,
      payload,
      withBiz()
    );
    return data;
  };

  const deleteNumber = async (provider, id) => {
    const p = normalizeProvider(provider);
    await axiosClient.delete(`/whatsappsettings/${p}/numbers/${id}`, withBiz());
  };

  const setDefaultNumber = async (provider, id) => {
    const p = normalizeProvider(provider);
    await axiosClient.patch(
      `/whatsappsettings/${p}/numbers/${id}/default`,
      null,
      withBiz()
    );
  };

  const fetchNumbers = async provider => {
    try {
      const items = await listNumbers(provider);
      setSenders(
        items.map(n => ({
          id: n.id,
          label: n.senderDisplayName || "",
          phoneNumberId: n.phoneNumberId || "",
          whatsAppBusinessNumber: n.whatsAppBusinessNumber || "",
          isDefault: !!n.isDefault,
          isActive: n.isActive ?? true,
        }))
      );
    } catch {
      setSenders([]);
    }
  };

  // ===== Derived UI =====
  const providerLabel = useMemo(
    () => secretLabelFor(formData.provider),
    [formData.provider]
  );
  const selectedProvider = useMemo(
    () => normalizeProvider(formData.provider),
    [formData.provider]
  );
  const showFetchButton = hasSavedOnce;

  // Restore draft immediately on biz change (or first mount)
  useEffect(() => {
    const bizChanged =
      prevBizIdRef.current !== undefined && prevBizIdRef.current !== businessId;
    prevBizIdRef.current = businessId;

    hasUserEditedRef.current = false;
    setCanPersistDraft(false);

    const restored = restoreFromDraft();
    if (restored) {
      hasUserEditedRef.current = true; // treat restored state as user-owned
      setCanPersistDraft(true);
      return;
    }

    if (bizChanged) {
      setFormData(blank);
      setSenders([]);
      setHasSavedOnce(false);
      setSavedProvider(null);
    }
  }, [businessId, restoreFromDraft]);

  // Persist draft (debounced) so tab/menu switching doesn't wipe inputs
  useEffect(() => {
    if (!canPersistDraft) return;

    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(
          draftKey(),
          JSON.stringify({
            v: 1,
            businessId,
            at: new Date().toISOString(),
            formData,
            hasSavedOnce,
            savedProvider,
          })
        );
      } catch {
        // ignore
      }
    }, 350);

    return () => clearTimeout(t);
  }, [businessId, canPersistDraft, draftKey, formData, hasSavedOnce, savedProvider]);

  const loadStatus = useCallback(async () => {
    try {
      setEsuStatus(s => ({ ...s, loading: true }));

      // Backend: GET /api/esu/facebook/status (uses JWT for businessId)
      const res = await axiosClient.get("esu/facebook/status");
      const payload = res?.data ?? {};
      const dto = payload?.data || payload?.Data || payload || {};

      const hasEsuFlag =
        dto.hasEsuFlag ?? dto.HasEsuFlag ?? dto.facebookEsuCompleted ?? false;

      const tokenExpiresAtUtc =
        dto.tokenExpiresAtUtc ?? dto.TokenExpiresAtUtc ?? null;

      const hasValidToken =
        dto.hasValidToken ??
        dto.HasValidToken ??
        (tokenExpiresAtUtc ? true : false);

      const willExpireSoon =
        dto.willExpireSoon ??
        dto.WillExpireSoon ??
        dto.isExpiringSoon ??
        dto.IsExpiringSoon ??
        false;

      const isConfiguredViaEsu = !!hasEsuFlag;
      const isTokenExpiredOrInvalid = isConfiguredViaEsu && !hasValidToken;
      const isTokenExpiringSoon = !!hasValidToken && willExpireSoon;
      const isFullyHealthy =
        isConfiguredViaEsu && hasValidToken && !willExpireSoon;

      const phoneCount = dto.phoneCount || dto.numbersCount || 0;
      const hasWaba = !!(dto.wabaId || dto.WabaId);
      const debug = dto.debug ?? dto.Debug ?? null;

      setEsuStatus({
        loading: false,
        hasEsuFlag,
        hasValidToken,
        willExpireSoon,
        tokenExpiresAtUtc,
        isConfiguredViaEsu,
        isTokenExpiredOrInvalid,
        isTokenExpiringSoon,
        isFullyHealthy,
        phoneCount,
        hasWaba,
        debug,
      });
    } catch (err) {
      console.error("Unable to load Meta ESU status", err);
      setEsuStatus({
        loading: false,
        hasEsuFlag: false,
        hasValidToken: false,
        willExpireSoon: false,
        tokenExpiresAtUtc: null,
        isConfiguredViaEsu: false,
        isTokenExpiredOrInvalid: false,
        isTokenExpiringSoon: false,
        isFullyHealthy: false,
        phoneCount: 0,
        hasWaba: false,
        debug: "status-error",
      });
    }
  }, []);

  // ===== ESU: load connection status (JWT-based) =====
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);
  // ===== Initial load of saved settings + numbers =====
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const res = await axiosClient.get("/whatsappsettings/me", withBiz());
        if (!mounted) return;

        const body = res?.data || {};

        // Support both:
        // 1) New shape: { ok, hasSettings, data }
        // 2) Legacy shape: settings object directly
        const hasSettingsFlag =
          typeof body.hasSettings === "boolean" ? body.hasSettings : undefined;

        const settings =
          hasSettingsFlag === false
            ? null
            : body.data !== undefined
            ? body.data
            : body;

        // No settings configured yet (expected state)
        if (!settings || Object.keys(settings).length === 0) {
          // UX hint (safe even if removed later; logic below still holds)
          toast.info("No WhatsApp settings found. You can create them now.");
          setHasSavedOnce(false);
          setSavedProvider(null);
          setSenders([]);
          setCanPersistDraft(true);
          return;
        }

        const provider = normalizeProvider(settings.provider);
        const secret = settings.apiKey || settings.apiToken || "";

        setFormData(prev => ({
          ...prev,
          provider: provider || prev.provider,
          apiUrl: settings.apiUrl || prev.apiUrl || "",
          apiKey: secret || prev.apiKey || "",
          wabaId: settings.wabaId || prev.wabaId || "",
          senderDisplayName: settings.senderDisplayName || prev.senderDisplayName || "",
          webhookSecret: settings.webhookSecret || prev.webhookSecret || "",
          webhookVerifyToken:
            settings.webhookVerifyToken || prev.webhookVerifyToken || "",
          webhookCallbackUrl:
            settings.webhookCallbackUrl || prev.webhookCallbackUrl || "",
          isActive: settings.isActive ?? prev.isActive ?? true,
        }));

        setSavedProvider(provider);

        const existed =
          !!settings.provider ||
          !!settings.apiKey ||
          !!settings.apiToken ||
          !!settings.wabaId;
        setHasSavedOnce(!!existed);
        setCanPersistDraft(true);

        await fetchNumbers(provider);
      } catch (err) {
        // Real errors (network, 500, etc.) will already be surfaced
        // by the global axiosClient interceptor.
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("Failed to load WhatsApp settings", err);
        }
        setHasSavedOnce(false);
        setSavedProvider(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // // ===== Initial load of saved settings + numbers =====
  // useEffect(() => {
  //   let mounted = true;
  //   (async () => {
  //     try {
  //       setLoading(true);
  //       const res = await axiosClient.get("/whatsappsettings/me", withBiz());
  //       if (!mounted) return;
  //       const data = res?.data ?? {};

  //       const provider = normalizeProvider(data?.provider);
  //       const secret = data?.apiKey || data?.apiToken || "";

  //       setFormData(prev => ({
  //         ...prev,
  //         provider,
  //         apiUrl: data?.apiUrl || "",
  //         apiKey: secret,
  //         wabaId: data?.wabaId || "",
  //         senderDisplayName: data?.senderDisplayName || "",
  //         webhookSecret: data?.webhookSecret || "",
  //         webhookVerifyToken: data?.webhookVerifyToken || "",
  //         webhookCallbackUrl: data?.webhookCallbackUrl || "",
  //         isActive: data?.isActive ?? true,
  //       }));

  //       setSavedProvider(provider);

  //       const existed =
  //         !!data?.provider ||
  //         !!data?.apiKey ||
  //         !!data?.apiToken ||
  //         !!data?.wabaId;
  //       setHasSavedOnce(!!existed);

  //       await fetchNumbers(provider);
  //     } catch {
  //       toast.info("ℹ️ No WhatsApp settings found. You can create them now.");
  //       setHasSavedOnce(false);
  //       setSavedProvider(null);
  //     } finally {
  //       mounted && setLoading(false);
  //     }
  //   })();

  //   return () => {
  //     mounted = false;
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // Refresh numbers when dropdown provider changes
  useEffect(() => {
    fetchNumbers(formData.provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.provider]);

  // Handle ESU results from URL + sessionStorage persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawStatus = params.get("esuStatus");
    const esuStatus = rawStatus?.toLowerCase();
    const rawConnected = params.get("connected");
    const connected = rawConnected?.toLowerCase() || rawConnected;

    console.log("[WhatsAppSettings] params check:", { rawStatus, esuStatus, rawConnected, connected });

    const esuSuccess = esuStatus === "success";
    const justConnected = connected === "1" || connected === "true";

    if (esuSuccess || justConnected || sessionStorage.getItem("xb_pending_esu_pin") === "true") {
      if (esuSuccess || justConnected) {
        toast.success(justConnected ? "Meta connection completed. Numbers synced." : "✅ WhatsApp connected successfully. Please set your 6-digit PIN.");
        sessionStorage.setItem("xb_pending_esu_pin", "true");
        
        // Sync numbers if just connected
        if (justConnected) {
          handleFetchFromMeta();
        }
      }
      setShowPinModal(true);

      // Clean up URL params
      if (rawStatus || rawConnected) {
        const next = new URLSearchParams(searchParams);
        next.delete("esuStatus");
        next.delete("connected");
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const handlePinSuccess = () => {
    sessionStorage.removeItem("xb_pending_esu_pin");
    loadStatus();
  };

  const addSender = () =>
    setSenders(s => [
      ...s,
      {
        label: "",
        phoneNumberId: "",
        whatsAppBusinessNumber: "",
        isDefault: s.length === 0,
        isActive: true,
      },
    ]);

  const removeSender = idx => setSenders(s => s.filter((_, i) => i !== idx));

  const updateSender = (idx, key, value) =>
    setSenders(s =>
      s.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );

  const setDefaultSenderLocal = idx =>
    setSenders(s => s.map((row, i) => ({ ...row, isDefault: i === idx })));

  // ===== Global form handlers =====
  const handleChange = e => {
    const { name, value } = e.target;
    hasUserEditedRef.current = true;
    setCanPersistDraft(true);
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleToggle = e => {
    const { name, checked } = e.target;
    hasUserEditedRef.current = true;
    setCanPersistDraft(true);
    setFormData(p => ({ ...p, [name]: checked }));
  };

  const handleProviderChange = e => {
    const provider = normalizeProvider(e.target.value);
    hasUserEditedRef.current = true;
    setCanPersistDraft(true);
    setFormData(p => ({ ...p, provider }));
  };

  // ===== Save global settings =====
  const validateBeforeSave = () => {
    if (!formData.apiKey.trim()) {
      toast.error("API Key / Token is required.");
      return false;
    }
    return true;
  };

  const handleSaveGlobal = async () => {
    if (!validateBeforeSave()) return;
    try {
      setSaving(true);
      const payload = {
        provider: normalizeProvider(formData.provider),
        apiUrl: (formData.apiUrl || "").trim(),
        apiKey: (formData.apiKey || "").trim(),
        wabaId: (formData.wabaId || "").trim() || null,
        senderDisplayName: (formData.senderDisplayName || "").trim() || null,
        webhookSecret: (formData.webhookSecret || "").trim() || null,
        webhookVerifyToken: (formData.webhookVerifyToken || "").trim() || null,
        webhookCallbackUrl: (formData.webhookCallbackUrl || "").trim() || null,
        isActive: !!formData.isActive,
      };

      await axiosClient.put("/whatsappsettings/update", payload, withBiz());

      setHasSavedOnce(true);
      setSavedProvider(payload.provider);
      setCanPersistDraft(true);

      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // ===== Test connection using backend "current" settings =====
  const handleTest = async () => {
    setTesting(true);
    setTestResult("");
    try {
      const res = await axiosClient.post(
        "/whatsappsettings/test-connection/current",
        {},
        withBiz()
      );
      setTestResult(JSON.stringify(res?.data ?? {}, null, 2));
      toast.success(res?.data?.message || "Connection test complete.");
    } catch (err) {
      setTestResult(
        JSON.stringify(err?.response?.data ?? { error: String(err) }, null, 2)
      );
      toast.error(err?.response?.data?.message || "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  // ===== ESU: start Embedded Signup / Refresh Token from Settings page =====
  const startFacebookEsu = async () => {
    if (!hasBusinessContext) {
      toast.error("Business context missing. Please re-login.");
      return;
    }

    try {
      setConnectingEsu(true);

      const returnUrlAfterSuccess = "/app/settings/whatsapp";

      // JWT-based; no X-Business-Id here
      const res = await axiosClient.post("esu/facebook/start", {
        returnUrlAfterSuccess,
      });

      const authUrl =
        res?.data?.data?.authUrl ||
        res?.data?.authUrl ||
        res?.data?.url ||
        res?.data?.Data?.AuthUrl;

      if (!authUrl) {
        toast.error(
          res?.data?.message || "Could not get Meta Embedded Signup URL."
        );
        return;
      }

      window.location.href = authUrl;
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to start Meta Embedded Signup."
      );
    } finally {
      setConnectingEsu(false);
    }
  };

  // ===== Fetch numbers via backend sync =====
  const handleFetchFromMeta = async () => {
    if (!formData.apiKey?.trim() || !formData.wabaId?.trim()) {
      toast.warn(
        "Please provide API Key/Token and WABA ID, then Save Settings."
      );
      return;
    }
    try {
      setFetchingMeta(true);
      const res = await axiosClient.post(
        "/whatsappsettings/fetch-numbers",
        {},
        withBiz()
      );

      const serverBucket = normalizeProvider(res?.data?.provider);
      const fallbackBucket = savedProvider || selectedProvider;
      const bucket = serverBucket || fallbackBucket;

      await fetchNumbers(bucket);

      if (bucket && bucket !== selectedProvider) {
        setFormData(p => ({ ...p, provider: bucket }));
      }

      const { added = 0, updated = 0, total = 0 } = res?.data || {};
      toast.success(
        `Synced — added ${added}, updated ${updated}, total ${total} (${bucket}).`
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Fetch failed.";
      toast.error(msg);
    } finally {
      setFetchingMeta(false);
    }
  };

  // ===== Connection Status card UI (ESU-aware) =====
  const renderConnectionStatus = () => {
    const {
      loading,
      isConfiguredViaEsu,
      isTokenExpiredOrInvalid,
      isTokenExpiringSoon,
      isFullyHealthy,
      phoneCount,
      tokenExpiresAtUtc,
    } = esuStatus;

    const formattedExpiry = tokenExpiresAtUtc
      ? new Date(tokenExpiresAtUtc).toLocaleString()
      : null;

    if (loading) {
      return (
        <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          Checking Meta connection status…
        </div>
      );
    }

    // Not configured via ESU at all
    if (!isConfiguredViaEsu) {
      return (
        <div className="mb-6 rounded-xl border-l-4 border-rose-500 bg-rose-50/40 shadow-sm overflow-hidden transition-all">
          <div className="px-5 py-3.5 flex items-start gap-4">
            <div className="mt-0.5 p-1.5 bg-rose-100 rounded-lg text-rose-600">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-rose-900">Disconnected</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>
                <span className="text-xs text-rose-700/70 font-medium">
                  Connect via Facebook to start sending messages and more.
                </span>
              </div>
              <button
                type="button"
                onClick={startFacebookEsu}
                disabled={connectingEsu || !hasBusinessContext}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/10 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {connectingEsu ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Connect via Facebook
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Configured via ESU
    return (
      <div className="mb-6 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/40 shadow-sm overflow-hidden transition-all">
        <div className="px-5 py-3.5 flex items-start gap-4">
          <div className="mt-0.5 p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
            <CheckCircle size={18} />
          </div>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-900">Connected</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                {isFullyHealthy && (
                  <span className="text-xs text-emerald-700/70 font-medium">
                    WhatsApp API is fully active for this workspace
                    {phoneCount ? ` • ${phoneCount} numbers synced` : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={startFacebookEsu}
                  disabled={connectingEsu || !hasBusinessContext}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  {connectingEsu ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isTokenExpiredOrInvalid || isTokenExpiringSoon ? (
                    "Refresh Token"
                  ) : (
                    "Manage Connection"
                  )}
                </button>
                
                {formattedExpiry && (
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider whitespace-nowrap">
                    Expires: {formattedExpiry}
                  </span>
                )}
              </div>
            </div>

            {isTokenExpiredOrInvalid && (
              <div className="mt-2 text-[10px] text-rose-700 bg-white/60 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Info size={12} className="shrink-0" />
                <p><b>Token Expired:</b> Generate a new long-lived token using <b>Refresh Token</b> below.</p>
              </div>
            )}

            {isTokenExpiringSoon && (
              <div className="mt-2 text-[10px] text-amber-700 bg-white/60 border border-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Info size={12} className="shrink-0" />
                <p>Your Meta access token will expire soon. Please refresh it to avoid service gaps.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===== Render =====
  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm border border-emerald-100">
            <Phone size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Manual WhatsApp Business Api Setup
              </h1>
              {esuStatus.isFullyHealthy ? (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm transition-all hover:bg-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 shadow-sm transition-all hover:bg-rose-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Disconnected</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Configure your API credentials and manage sender identities.
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100/30 p-1 rounded-xl border border-slate-200/50 backdrop-blur-sm shadow-sm transition-all">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold transition-all border-none ${
              testing
                ? "bg-transparent text-slate-300"
                : "bg-transparent text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            {testing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Test
          </button>
          
          <div className="w-[1px] h-4 bg-slate-200/60 mx-1" />

          <button
            type="button"
            onClick={handleSaveGlobal}
            disabled={saving}
            className={`inline-flex items-center justify-center px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${
              saving
                ? "bg-slate-400 text-white cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 active:scale-95"
            }`}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {renderConnectionStatus()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* API Credentials Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-slate-300/80">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                <Lock size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">API Credentials</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Provider</label>
                  <select
                    name="provider"
                    value={normalizeProvider(formData.provider)}
                    onChange={handleProviderChange}
                    className="w-full px-3.5 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">API URL (Optional)</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-slate-400 pointer-events-none">
                      <Globe size={13} />
                    </div>
                    <input
                      type="text"
                      name="apiUrl"
                      value={formData.apiUrl}
                      onChange={handleChange}
                      placeholder="https://graph.facebook.com/v22.0"
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">{providerLabel}</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-slate-400 pointer-events-none">
                      <Lock size={13} />
                    </div>
                    <input
                      type={showApiKey ? "text" : "password"}
                      name="apiKey"
                      value={formData.apiKey}
                      onChange={handleChange}
                      placeholder={`Enter your ${providerLabel.toLowerCase()}`}
                      className="w-full pl-9 pr-12 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">WABA ID</label>
                    <input
                      type="text"
                      name="wabaId"
                      value={formData.wabaId}
                      onChange={handleChange}
                      placeholder="e.g. 7445482479..."
                      className="w-full px-3.5 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Display Name</label>
                    <input
                      type="text"
                      name="senderDisplayName"
                      value={formData.senderDisplayName}
                      onChange={handleChange}
                      placeholder="e.g. Acme Sales"
                      className="w-full px-3.5 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Configuration Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-slate-300/80">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                <Link size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Webhook Configuration</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Callback URL</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-slate-400 pointer-events-none">
                    <Link size={13} />
                  </div>
                  <input
                    type="text"
                    name="webhookCallbackUrl"
                    value={formData.webhookCallbackUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/api/webhooks/whatsapp"
                    className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Verify Token</label>
                  <input
                    type="text"
                    name="webhookVerifyToken"
                    value={formData.webhookVerifyToken}
                    onChange={handleChange}
                    placeholder="Enter verify token"
                    className="w-full px-3.5 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Webhook Secret</label>
                  <div className="relative flex items-center">
                    <input
                      type={showWebhookSecret ? "text" : "password"}
                      name="webhookSecret"
                      value={formData.webhookSecret}
                      onChange={handleChange}
                      placeholder="Enter secret"
                      className="w-full pl-3.5 pr-12 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showWebhookSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={!!formData.isActive}
                    onChange={handleToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-3 text-sm font-bold text-slate-700 select-none">Active</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-2 ml-14">
                  Enable or disable all WhatsApp services for this workspace.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Senders (phone numbers) Management */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-slate-300/80">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Senders (phone numbers)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Manage your phone identities for WhatsApp campaigns.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {showFetchButton && (
                <button
                  type="button"
                  onClick={handleFetchFromMeta}
                  disabled={fetchingMeta}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition-all shadow-sm ${
                    fetchingMeta
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 active:scale-95"
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${fetchingMeta ? "animate-spin" : ""}`} />
                  {fetchingMeta ? "Fetching..." : "Fetch from Meta"}
                </button>
              )}
              <button
                type="button"
                onClick={addSender}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="w-3 h-3" />
                Add Number
              </button>
            </div>
          </div>

          <div className="p-1">
            {senders.length === 0 ? (
              <div className="bg-slate-50/50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-100 m-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-100 shadow-sm mb-4">
                  <Phone className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-slate-900 font-bold mb-1">No senders found</h4>
                <p className="text-slate-500 text-xs max-w-xs mx-auto mb-6 leading-relaxed">
                  Connect your Meta account or add your first sender manually to start using WhatsApp.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">label</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">phone number</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">number id</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">actions & status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {senders.map((row, idx) => (
                      <tr key={idx} className={`group ${row.isDefault ? "bg-emerald-50/20" : "hover:bg-slate-50/50"} transition-colors`}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={row.label || ""}
                            onChange={e => updateSender(idx, "label", e.target.value)}
                            placeholder="e.g. Sales"
                            className="w-full bg-transparent text-xs font-medium focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={row.whatsAppBusinessNumber || ""}
                            onChange={e => updateSender(idx, "whatsAppBusinessNumber", e.target.value)}
                            placeholder="+1..."
                            className="w-full bg-transparent text-xs focus:outline-none text-slate-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={row.phoneNumberId || ""}
                            onChange={e => updateSender(idx, "phoneNumberId", e.target.value)}
                            placeholder="ID"
                            className="w-full bg-transparent text-xs focus:outline-none text-slate-400 font-mono"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {row.isDefault && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded uppercase tracking-tighter">
                                Default
                              </span>
                            )}
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const saved = await upsertNumber(formData.provider, row);
                                    setSenders(s => s.map((r, i) => i === idx ? { ...r, id: saved?.id || r.id } : r));
                                    toast.success("Saved");
                                  } catch {
                                    toast.error("Failed");
                                  }
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>

                              {!row.isDefault && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      if (!row.id) {
                                        const saved = await upsertNumber(formData.provider, row);
                                        await setDefaultNumber(formData.provider, saved?.id);
                                      } else {
                                        await setDefaultNumber(formData.provider, row.id);
                                      }
                                      setDefaultSenderLocal(idx);
                                      toast.success("Default set");
                                    } catch {
                                      toast.error("Failed");
                                    }
                                  }}
                                  className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    if (!row.id) {
                                      removeSender(idx);
                                      return;
                                    }
                                    await deleteNumber(formData.provider, row.id);
                                    removeSender(idx);
                                    toast.success("Deleted");
                                  } catch {
                                    toast.error("Failed");
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl shadow-sm">
          <div className="mt-0.5 p-1.5 bg-white rounded-lg border border-blue-100 shadow-sm text-blue-500">
            <Info size={16} />
          </div>
          <p className="text-[11px] text-blue-700/80 leading-relaxed font-medium">
            The <b className="font-bold text-blue-900">Default</b> sender is critical—it will be used for automated messages like OTPs, welcome sequences, and when no specific phone number is selected during a mass broadcast.
          </p>
        </div>

        {testResult && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-400" />
              Connection Test Result
            </h3>
            <pre className="text-xs bg-slate-900 text-emerald-400 p-6 rounded-2xl overflow-auto border border-slate-800 shadow-2xl max-h-[300px] font-mono leading-relaxed">
              {testResult}
            </pre>
          </div>
        )}
        {/* PIN Activation Modal */}
        <MetaPinActivationModal
          isOpen={showPinModal}
          onClose={closePinModal}
          businessId={businessId}
          onSuccess={handlePinSuccess}
        />
      </div>
    </div>
  </div>
);
}
