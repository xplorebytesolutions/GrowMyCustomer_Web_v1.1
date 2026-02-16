// src/pages/Campaigns/components/CsvAudienceSection.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../../../api/axiosClient";
import {
  getCampaignAudience,
  fetchCsvSchema,
  uploadCsvBatch,
  getBatchSample,
  validateBatch,
  suggestMappings,
  saveMappings,
  materialize,
  removeCampaignAudience,
  deleteCsvBatch,
} from "../api/csvApi";
import { useAuth } from "../../../app/providers/AuthProvider";

/* ---------------- Utilities ---------------- */

function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

const norm = s =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "")
    .replace(/[^a-z0-9]/g, "");

const PHONE_ALIASES = ["phone", "mobile", "whatsapp", "number", "phonee164"];

// Aliases to help auto-map
const ALIASES = {
  parameter1: ["param1", "body1"],
  parameter2: ["param2", "body2"],
  parameter3: ["param3", "body3"],
  parameter4: ["param4", "body4"],
  parameter5: ["param5", "body5"],
  headerpara1: ["header1", "headerparam1"],
  headerpara2: ["header2", "headerparam2"],
  headerpara3: ["header3", "headerparam3"],
  buttonpara1: ["btn1", "button1", "url1", "buttonparam1"],
  buttonpara2: ["btn2", "button2", "url2", "buttonparam2"],
  buttonpara3: ["btn3", "button3", "url3", "buttonparam3"],
};

// Auto-pick CSV columns for expected keys.
function autoPick(headers, wants, friendlyForKey = null) {
  const map = {};
  const used = new Set();
  const H = headers.map(h => ({ raw: h, k: norm(h) }));

  // 1) exact (case-insensitive)
  for (const key of wants) {
    const hit = headers.find(h => norm(h) === norm(key));
    if (hit) {
      map[key] = hit;
      used.add(hit);
    }
  }

  // 1b) exact match against friendly label (e.g. template button text)
  if (typeof friendlyForKey === "function") {
    for (const key of wants) {
      if (map[key]) continue;
      const friendly = friendlyForKey(key);
      if (!friendly) continue;
      const hit = headers.find(h => norm(h) === norm(friendly));
      if (hit) {
        map[key] = hit;
        used.add(hit);
      }
    }
  }

  // 2) aliases
  for (const key of wants) {
    if (map[key]) continue;
    const aliases = ALIASES[key] || [];
    const hit = H.find(
      h => aliases.some(a => h.k === norm(a)) && !used.has(h.raw)
    );
    if (hit) {
      map[key] = hit.raw;
      used.add(hit.raw);
    }
  }

  // 3) parameterN convenience
  for (const key of wants) {
    if (map[key]) continue;
    const m = key.match(/^parameter(\d+)$/i);
    if (!m) continue;
    const n = m[1];
    const hit = H.find(
      h => (h.k === `param${n}` || h.k === `body${n}`) && !used.has(h.raw)
    );
    if (hit) {
      map[key] = hit.raw;
      used.add(hit.raw);
    }
  }

  return map;
}

/* ---------------- Component ---------------- */

export default function CsvAudienceSection({
  campaignId,
  audienceName: propAudienceName,
  campaign,
  selectedCrmCount = 0,
}) {
  const { businessId: ctxBusinessId } = useAuth(); // <--- Get current business ID
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState(null);
  const [template, setTemplate] = useState(null);

  const [batch, setBatch] = useState(null);
  const [sample, setSample] = useState(null);
  const [valReq, setValReq] = useState({
    checkDuplicates: true,
  });
  const [valRes, setValRes] = useState(null);

  // {{n}} mapping UI (body placeholders)
  const [paramMappings, setParamMappings] = useState([]);
  // Explicit mapping for headerparaN / buttonparaN
  const [expectedKeys, setExpectedKeys] = useState([]); // exactly as backend returns
  const [keyToColumn, setKeyToColumn] = useState({});

  const [phoneHeader, setPhoneHeader] = useState("");

  const [persisting, setPersisting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [clearingStaged, setClearingStaged] = useState(false);
  const [confirmKind, setConfirmKind] = useState(null); // "clearStaged" | "removeAudience" | null
  const [showProceedConfirm, setShowProceedConfirm] = useState(false);

  const [showMapping, setShowMapping] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // spinner flag
  const [uploadPercent, setUploadPercent] = useState(null);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const uploadAbortRef = useRef(null);
  const topRef = useRef(null);

  const [audienceInfo, setAudienceInfo] = useState(null);
  const [audienceInfoLoading, setAudienceInfoLoading] = useState(false);

  const refreshAudienceInfo = useCallback(async () => {
    if (!campaignId) return;
    setAudienceInfoLoading(true);
    try {
      const info = await getCampaignAudience(campaignId);
      setAudienceInfo(info);
    } catch (err) {
      console.error("Failed to load campaign audience", err);
    } finally {
      setAudienceInfoLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    refreshAudienceInfo();
  }, [refreshAudienceInfo]);

  const activeAttachmentId =
    audienceInfo?.attachmentId ?? audienceInfo?.AttachmentId ?? null;
  const isAudienceLocked = !!(audienceInfo?.isLocked ?? audienceInfo?.IsLocked);

  const stagedFileName = useMemo(() => {
    if (!batch) return "";
    const name =
      batch?.fileName ??
      batch?.FileName ??
      batch?.originalFileName ??
      batch?.OriginalFileName ??
      batch?.name ??
      batch?.Name ??
      batch?.__localFileName ??
      batch?.localFileName ??
      "";
    return String(name).trim();
  }, [batch]);
  const hasExistingCsv = !!activeAttachmentId;
  const crmSelectedCount = Number.isFinite(Number(selectedCrmCount))
    ? Math.max(0, Number(selectedCrmCount))
    : 0;
  const existingCsvFileName = useMemo(
    () =>
      String(
        audienceInfo?.fileName ?? audienceInfo?.FileName ?? "Attached CSV"
      ).trim() || "Attached CSV",
    [audienceInfo]
  );

  const resetStagedCsv = useCallback(() => {
    setBatch(null);
    setSample(null);
    setValRes(null);
    setPhoneHeader("");
    setKeyToColumn({});
    setShowMapping(false);

    // Reset body placeholder mappings to defaults (based on current schema)
    const N = Number(schema?.placeholderCount || 0);
    setParamMappings(
      Array.from({ length: N }, (_, i) => ({
        index: i + 1,
        sourceType: "csv",
        sourceName: "",
        constValue: "",
      }))
    );
  }, [schema]);

  // Memo: deduped expected columns from server (server already includes "phone")
  const expectedColumns = useMemo(
    () => [...new Set(schema?.headers || [])],
    [schema]
  );

  // Effective audience name
  const effectiveAudienceName = useMemo(() => {
    const trimmed = String(propAudienceName || "").trim();
    if (trimmed) return trimmed;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `Audience ${yyyy}-${mm}-${dd}`;
  }, [propAudienceName]);

  // Load template details (if campaign provided)
  useEffect(() => {
    const tName =
      campaign?.templateId ||
      campaign?.TemplateId ||
      campaign?.templateName ||
      campaign?.TemplateName ||
      campaign?.messageTemplate ||
      campaign?.MessageTemplate;

    // Prefer campaign's businessId, fallback to context
    const bid = campaign?.businessId || campaign?.BusinessId || ctxBusinessId;

    if (!bid || !tName) return;

    let active = true;
    (async () => {
      try {
        const url = `/templates/${bid}/${encodeURIComponent(tName)}`;
        const res = await axiosClient.get(url, {
          params: { language: campaign.language || "en_US" },
        });
        const rawTemplate = res?.data?.template ?? res?.data ?? null;
        if (active) setTemplate(rawTemplate);
      } catch (err) {
        console.error("Failed to load template details", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [campaign, ctxBusinessId]);

  const getTemplateButtons = t => {
    const raw = t?.buttonsJson ?? t?.buttons ?? t?.urlButtons ?? null;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getDynamicButtons = t => {
    const buttons = getTemplateButtons(t);
    return buttons.filter(btn => {
      const type = String(
        btn?.SubType ?? btn?.subType ?? btn?.type ?? btn?.Type ?? ""
      ).toUpperCase();
      const paramValue = String(
        btn?.ParameterValue ?? btn?.parameterValue ?? btn?.url ?? btn?.Url ?? ""
      );

      if (type === "COPY_CODE") return true;
      if (type === "FLOW") return true;
      if (type === "URL" && paramValue.includes("{{")) return true;
      return false;
    });
  };

  const getFriendlyHeader = key => {
    const k = norm(key);
    if (k.includes("phone")) return "Phone";

    const pMatch = k.match(/^parameter(\d+)$/);
    if (pMatch) return `ParameterValue {{${pMatch[1]}}}`;

    const bMatch =
      k.match(/^buttonpara(\d+)$/) || k.match(/^button(\d+)urlparam$/);
    if (bMatch) {
      const idx = parseInt(bMatch[1]);
      const dynamicButtons = getDynamicButtons(template);
      const btn = dynamicButtons[idx - 1];

      if (btn) {
        const label = btn?.Text ?? btn?.text ?? `Button ${idx}`;
        const type = String(
          btn?.SubType ?? btn?.subType ?? btn?.type ?? btn?.Type ?? ""
        ).toUpperCase();
        const typeLabel =
          type === "URL" ? "URL" : type === "COPY_CODE" ? "Code" : "Value";
        return `${label} (${typeLabel})`;
      }

      return `Button ${idx} (URL)`;
    }

    return key;
  };

  // Load schema
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const sc = await fetchCsvSchema(campaignId);
        if (!alive) return;
        setSchema(sc);

        const keys = Array.isArray(sc?.headers) ? sc.headers : [];
        setExpectedKeys(keys);

        const N = Number(sc?.placeholderCount || 0);
        setParamMappings(
          Array.from({ length: N }, (_, i) => ({
            index: i + 1,
            sourceType: "csv",
            sourceName: "",
            constValue: "",
          }))
        );
      } catch {
        toast.error("Failed to load CSV schema.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [campaignId]);

  const csvHeaders = useMemo(
    () => sample?.headers ?? batch?.headerJson ?? expectedColumns,
    [expectedColumns, batch, sample]
  );

  const updateMapping = (idx, patch) =>
    setParamMappings(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const handleDownloadSample = async () => {
    const keys = expectedColumns?.length ? expectedColumns : ["phone"];

    const formatPhoneForCsv = value => {
      const text = String(value ?? "").trim();
      if (!text) return "";
      const looksNumeric = /^[+]?\d{10,15}$/.test(text);
      return looksNumeric ? `'${text}` : text;
    };

    const headers = [];
    const usedHeaders = new Set();
    for (const key of keys) {
      const friendly = getFriendlyHeader(key);
      let h = friendly || key;
      const k = norm(h);
      if (usedHeaders.has(k)) {
        h = `${h} (${key})`;
      }
      usedHeaders.add(norm(h));
      headers.push(h);
    }

    const row = keys.map(key => {
      const k = norm(key);
      if (k.includes("phone")) return formatPhoneForCsv("+919876543210");
      if (/^parameter\d+$/i.test(String(key))) return "Sample value";
      if (/^headerpara\d+$/i.test(k)) return "Sample header";
      if (/^buttonpara\d+$/i.test(k) || /^button\d+urlparam$/i.test(k))
        return "https://example.com";
      return "";
    });

    const escapeCsv = value => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };

    const csv = [headers, row]
      .map(r => r.map(escapeCsv).join(","))
      .join("\r\n");

    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `campaign-${campaignId}-sample.csv`
    );
    toast.success("Sample CSV downloaded.");
  };

  const handleFile = async f => {
    if (!f) return;
    setIsUploading(true);
    setUploadingFileName(String(f?.name || ""));
    setUploadPercent(0);
    const abortController = new AbortController();
    uploadAbortRef.current = abortController;
    try {
      const up = await uploadCsvBatch(f, {
        signal: abortController.signal,
        onProgress: p => {
          if (typeof p?.percent === "number") setUploadPercent(p.percent);
        },
      });

      setBatch({
        ...up,
        fileName: up?.fileName ?? up?.FileName ?? f?.name,
        __localFileName: f?.name,
      });
      toast.success("CSV uploaded.");

      const s = await getBatchSample(up?.batchId, 10);
      setSample(s);

      const hdrs = Array.isArray(s?.headers) ? s.headers : [];

      // Auto-pick phone column
      const lower = hdrs.map(h => String(h).toLowerCase());
      const guessIdx = lower.findIndex(h =>
        PHONE_ALIASES.some(k => h.includes(k))
      );
      setPhoneHeader(guessIdx >= 0 ? hdrs[guessIdx] : "");

      // Auto-map explicit keys
      const km = autoPick(hdrs, expectedKeys, getFriendlyHeader);
      setKeyToColumn(km);

      // Seed legacy body placeholders
      setParamMappings(prev =>
        prev.map(p => {
          const key = `parameter${p.index}`;
          return km[key] ? { ...p, sourceName: km[key] } : p;
        })
      );

      // Optional server suggestions
      try {
        const sugg = await suggestMappings(campaignId, up?.batchId);
        if (Array.isArray(sugg?.items)) {
          setParamMappings(prev =>
            prev.map(p => {
              const m = sugg.items.find(x => x.index === p.index);
              return m ? { ...p, ...m } : p;
            })
          );
        }
      } catch {}
      setShowMapping(false);
    } catch (e) {
      const isCanceled =
        e?.code === "ERR_CANCELED" ||
        e?.name === "CanceledError" ||
        e?.name === "AbortError";
      if (!isCanceled) toast.error(e?.message || "CSV upload failed.");
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
      setUploadingFileName("");
      uploadAbortRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    try {
      uploadAbortRef.current?.abort();
    } catch {}
  };

  const closeConfirm = (force = false) => {
    if (!force && (removing || clearingStaged)) return;
    setConfirmKind(null);
  };

  const requestClearStagedCsv = () => {
    if (!batch?.batchId) return;
    setConfirmKind("clearStaged");
  };

  const requestRemoveCsvAudience = () => {
    if (isAudienceLocked) {
      toast.error("Audience cannot be changed after sending.");
      return;
    }
    if (!activeAttachmentId) return;
    setConfirmKind("removeAudience");
  };

  const confirmAction = async () => {
    if (confirmKind === "clearStaged") {
      if (!batch?.batchId) return closeConfirm();
      setClearingStaged(true);
      try {
        await deleteCsvBatch(batch.batchId);
      } catch {}
      resetStagedCsv();
      setClearingStaged(false);
      closeConfirm();
      return;
    }

    if (confirmKind === "removeAudience") {
      if (!activeAttachmentId) return closeConfirm();
      setRemoving(true);
      try {
        await removeCampaignAudience(campaignId);
        toast.success("CSV audience removed.");

        // Reset local state related to the last uploaded batch/mapping UI
        resetStagedCsv();

        await refreshAudienceInfo();
      } catch (e) {
        const status = e?.response?.status;
        if (status === 409) {
          toast.error("Audience cannot be changed after sending.");
          await refreshAudienceInfo();
        } else {
          toast.error(e?.message || "Remove failed.");
        }
      } finally {
        setRemoving(false);
        closeConfirm(true);
      }
    }
  };

  const handleValidate = async () => {
    if (!batch?.batchId) return toast.warn("Upload a CSV first.");
    if (!phoneHeader) return toast.warn("Choose the phone column.");

    try {
      const req = {
        phoneHeader,
        requiredHeaders: [],
        normalizePhone: true,
        checkDuplicates: !!valReq.checkDuplicates,
      };
      const res = await validateBatch(batch.batchId, req);
      setValRes(res);
      if (Array.isArray(res?.problems) && res.problems.length > 0) {
        toast.warn(`Validation found ${res.problems.length} issue(s).`);
      } else {
        toast.success("Validation passed.");
      }
    } catch {
      toast.error("Validation call failed.");
    }
  };

  // Build mapping dict
  const buildMappingDict = () => {
    const dict = {};
    for (const m of paramMappings) {
      const key = `parameter${m.index}`;
      dict[key] =
        m.sourceType === "csv"
          ? m.sourceName || ""
          : `constant:${m.constValue ?? ""}`;
    }
    for (const [k, v] of Object.entries(keyToColumn || {})) {
      const value = String(v || "");
      if (!value) continue;
      if (/^parameter\d+$/i.test(k)) continue;
      if (
        value.startsWith("constant:") &&
        !value.slice("constant:".length).trim()
      )
        continue;
      dict[k] = value;
    }
    return dict;
  };

  const persistRecipients = async () => {
    if (!batch?.batchId) return toast.warn("Upload a CSV first.");
    const nameToUse = effectiveAudienceName;
    setShowProceedConfirm(false);
    setPersisting(true);
    try {
      await saveMappings(campaignId, buildMappingDict());
      const body = {
        csvBatchId: batch.batchId,
        mappings: buildMappingDict(),
        phoneField: phoneHeader || undefined,
        normalizePhones: true,
        deduplicate: !!valReq.checkDuplicates,
        persist: true,
        audienceName: nameToUse,
      };
      await materialize(campaignId, body);

      toast.success("Recipients saved successfully.");

      const target = "/app/campaigns/template-campaigns-list";
      try {
        navigate(target, { replace: true });
      } catch {
        if (typeof window !== "undefined") window.location.assign(target);
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.error("Audience cannot be changed after sending.");
        await refreshAudienceInfo();
        return;
      }
      toast.error(e?.message || "Persist failed.");
    } finally {
      setPersisting(false);
    }
  };

  const handlePersist = () => {
    if (!batch?.batchId) {
      toast.warn("Upload a CSV first.");
      return;
    }
    setShowProceedConfirm(true);
  };

  // Exclude "phone" and parameterN from non-body mapping keys
  const visibleKeys = useMemo(
    () =>
      (expectedKeys || []).filter(
        k => k.toLowerCase() !== "phone" && !/^parameter\d+$/i.test(k)
      ),
    [expectedKeys]
  );

  const mappingStatus = useMemo(() => {
    if (!visibleKeys.length)
      return { label: "No personalization fields needed", ok: true };
    const missing = visibleKeys.filter(k => {
      const v = String(keyToColumn[k] || "");
      if (!v) return true;
      if (v.startsWith("constant:")) return !v.slice("constant:".length).trim();
      return false;
    });
    return missing.length
      ? { label: `${missing.length} fields to match`, ok: false }
      : { label: "All fields matched", ok: true };
  }, [visibleKeys, keyToColumn]);
  const requiredColumnCount = (expectedColumns || []).length;
  const shouldOfferFieldMatching =
    !!batch?.batchId && requiredColumnCount > 1;
  const detectedHeaderCount = (csvHeaders ?? []).length;

  useEffect(() => {
    if (!batch?.batchId) {
      setShowMapping(false);
      return;
    }
    setShowMapping(requiredColumnCount > 1);
  }, [batch?.batchId, requiredColumnCount]);

  useEffect(() => {
    if (detectedHeaderCount > 0 && !phoneHeader) {
      setPhoneHeader((csvHeaders ?? [])[0] || "");
    }
  }, [detectedHeaderCount, csvHeaders, phoneHeader]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">
        Loading CSV schema...
      </div>
    );
  }

  return (
    <section ref={topRef} className="rounded-xl border bg-white p-4 shadow-sm">
      {hasExistingCsv && !batch?.batchId && (
        <div className="mb-3 flex items-center justify-start">
          <div className="inline-flex max-w-[320px] items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
            <span className="truncate" title={existingCsvFileName}>
              {existingCsvFileName}
            </span>
            {!isAudienceLocked && (
              <button
                type="button"
                onClick={requestRemoveCsvAudience}
                disabled={isUploading || removing}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                aria-label="Remove existing CSV"
                title="Remove existing CSV"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current attachment summary (only show when a CSV is already attached) */}
      {activeAttachmentId && (
        <div className="mb-4 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold text-gray-700">
                Current CSV audience
              </div>
              {audienceInfoLoading ? (
                <div className="mt-1 text-gray-500">Loading...</div>
              ) : (
                <div className="mt-1 space-y-0.5 text-gray-600">
                  <div>
                    <span className="font-medium">File:</span>{" "}
                    {audienceInfo?.fileName ?? audienceInfo?.FileName ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Audience:</span>{" "}
                    {audienceInfo?.audienceName ??
                      audienceInfo?.AudienceName ??
                      "-"}
                  </div>
                  <div>
                    <span className="font-medium">Contacts:</span>{" "}
                    {audienceInfo?.memberCount ??
                      audienceInfo?.MemberCount ??
                      0}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {(() => {
                      const raw =
                        audienceInfo?.createdAt ?? audienceInfo?.CreatedAt;
                      if (!raw) return "-";
                      const d = new Date(raw);
                      return Number.isNaN(d.getTime())
                        ? String(raw)
                        : d.toLocaleString();
                    })()}
                  </div>
                </div>
              )}
            </div>

            {isAudienceLocked && (
              <div className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                Audience locked after sending.
              </div>
            )}
          </div>
        </div>
      )}

      {batch?.batchId ? (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <div className="text-emerald-700 font-semibold">
            Required columns:&nbsp;
            {expectedColumns.map(col => (
              <span
                key={col}
                className="ml-1 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
              >
                {getFriendlyHeader(col)}
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex max-w-[260px] items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
              <span className="truncate" title={stagedFileName || "CSV uploaded"}>
                {stagedFileName || "CSV uploaded"}
              </span>
              <button
                type="button"
                onClick={requestClearStagedCsv}
                disabled={isUploading || removing || clearingStaged}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                aria-label="Remove staged CSV"
                title="Remove staged CSV"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      ) : hasExistingCsv ? (
        <div className="mb-4" />
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 16.5a4 4 0 0 0-1-7.9 5 5 0 0 0-9.8 1.2 3.5 3.5 0 0 0 .7 6.9h2" />
              <path d="M12 12v8" />
              <path d="m8.5 15.5 3.5-3.5 3.5 3.5" />
            </svg>
          </div>
          <div className="text-base font-semibold text-gray-900">Upload your contacts CSV</div>
          <p className="mt-1 text-sm text-gray-500">
            Start with a sample file or upload your own CSV to continue.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              disabled={removing}
              className="inline-flex items-center gap-2 rounded border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-emerald-500"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="m8 11 4 4 4-4" />
                <path d="M5 21h14" />
              </svg>
              Download sample CSV
            </button>
            <div>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={e => {
                  const f = e.target.files?.[0];
                  handleFile(f);
                  e.target.value = "";
                }}
                className="sr-only"
                disabled={isUploading || removing || isAudienceLocked}
              />
              <label
                htmlFor="csv-file-input"
                aria-disabled={isUploading || removing || isAudienceLocked}
                className={`inline-flex items-center gap-2 rounded border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isUploading || removing || isAudienceLocked
                    ? "pointer-events-none opacity-50 text-emerald-500"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 16.5a4 4 0 0 0-1-7.9 5 5 0 0 0-9.8 1.2 3.5 3.5 0 0 0 .7 6.9h2" />
                  <path d="M12 12v8" />
                  <path d="m8.5 15.5 3.5-3.5 3.5 3.5" />
                </svg>
                Upload CSV
              </label>
            </div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="mb-4 rounded-lg border bg-white p-3 text-xs text-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-gray-800">
                Uploading
              </div>
              <div className="truncate text-[11px] text-gray-500">
                {uploadingFileName || "CSV file"}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancelUpload}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              aria-label="Cancel upload"
              title="Cancel upload"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${Math.max(0, Math.min(100, uploadPercent ?? 0))}%` }}
            />
          </div>

          <div className="mt-1 text-right text-[11px] text-gray-500">
            {typeof uploadPercent === "number" ? `${uploadPercent}%` : ""}
          </div>
        </div>
      )}

      {confirmKind && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeConfirm}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {confirmKind === "removeAudience"
                    ? "Remove CSV audience?"
                    : "Remove uploaded CSV?"}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {confirmKind === "removeAudience"
                    ? "This will delete only CSV-derived recipients (manual recipients stay)."
                    : "Are you sure you want to delete the uploaded CSV?"}
                </div>
              </div>

              <button
                type="button"
                onClick={closeConfirm}
                disabled={removing || clearingStaged}
                className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close"
                title="Close"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={removing || clearingStaged}
                className="rounded border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={removing || clearingStaged}
                className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {removing || clearingStaged ? "Working..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProceedConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowProceedConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="border-b px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">
                Confirm Recipient Setup
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Do you want to save and continue with this audience setup?
              </div>
            </div>

            <div className="space-y-2 px-4 py-3 text-xs text-gray-700">
              <div>
                CSV source: <strong>{batch?.batchId ? "Included" : "Not included"}</strong>
              </div>
              <div>
                CRM contacts selected: <strong>{crmSelectedCount}</strong>
              </div>

              {batch?.batchId && crmSelectedCount > 0 && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
                  You selected recipients from both sources: uploaded CSV and CRM
                  contacts. If you continue, both will be used.
                </div>
              )}

              {batch?.batchId && crmSelectedCount === 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
                  You uploaded a CSV audience but did not select CRM contacts.
                  If you continue, the campaign will proceed with CSV recipients only.
                </div>
              )}

              {!batch?.batchId && crmSelectedCount > 0 && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-800">
                  You selected CRM contacts but no CSV is uploaded. If you continue,
                  the campaign will proceed with CRM recipients only.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                onClick={() => setShowProceedConfirm(false)}
                disabled={persisting}
                className="rounded border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={persistRecipients}
                disabled={persisting}
                className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {persisting ? "Saving..." : "Yes, Save & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {batch?.batchId && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-900">
          <span className="font-semibold">
            {stagedFileName || "CSV"} uploaded.
          </span>{" "}
          <span>
            {Array.isArray(sample?.rows) ? sample.rows.length : 0} sample rows loaded.
            {(csvHeaders ?? []).length > 0
              ? ` ${csvHeaders.length} columns detected.`
              : ""}
          </span>
        </div>
      )}

      {shouldOfferFieldMatching && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
          This template needs multiple required fields. Please review column matching before saving recipients.
        </div>
      )}

      <div className="mb-3 rounded-md border border-dashed border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-600">
        Keep media (image/video/document) in campaign setup. CSV is only for phone
        and personalization values.
      </div>

      {shouldOfferFieldMatching && showMapping && (
        <div className="mb-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">
              Column Matching
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                mappingStatus.ok
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {mappingStatus.label}
            </span>
          </div>

            <div className="mt-3 space-y-2">
              {/* Non-body keys */}
              {visibleKeys.length === 0 ? (
                <p className="text-xs text-gray-500">No extra parameters.</p>
              ) : (
                visibleKeys.map(k => {
                  const rawValue = String(keyToColumn[k] || "");
                  const isConst = rawValue.startsWith("constant:");
                  const csvValue = isConst ? "" : rawValue;
                  const constValue = isConst
                    ? rawValue.slice("constant:".length)
                    : "";

                  return (
                    <div
                      key={k}
                      className="grid grid-cols-[160px,100px,1fr] items-center gap-2"
                    >
                      <div
                        className="truncate text-[11px] text-gray-500"
                        title={getFriendlyHeader(k)}
                      >
                        {getFriendlyHeader(k)}
                      </div>

                      <select
                        className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                        value={isConst ? "const" : "csv"}
                        onChange={e => {
                          const next = e.target.value;
                          setKeyToColumn(m => ({
                            ...m,
                            [k]: next === "const" ? "constant:" : "",
                          }));
                        }}
                        disabled={isUploading || removing || isAudienceLocked}
                      >
                        <option value="csv">CSV column</option>
                        <option value="const">Constant</option>
                      </select>

                      {isConst ? (
                        <input
                          className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                          placeholder="Constant value"
                          value={constValue}
                          onChange={e =>
                            setKeyToColumn(m => ({
                              ...m,
                              [k]: `constant:${e.target.value ?? ""}`,
                            }))
                          }
                          disabled={isUploading || removing || isAudienceLocked}
                        />
                      ) : (
                        <select
                          className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                          value={csvValue}
                          onChange={e =>
                            setKeyToColumn(m => ({ ...m, [k]: e.target.value }))
                          }
                          disabled={
                            !(csvHeaders ?? []).length ||
                            isUploading ||
                            removing ||
                            isAudienceLocked
                          }
                        >
                          <option value="">
                            {(csvHeaders ?? []).length
                              ? "-- Select column --"
                              : "Upload CSV"}
                          </option>
                          {(csvHeaders ?? []).map(h => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })
              )}

              {/* Body placeholders */}
              {paramMappings.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <div className="mb-2 text-xs font-semibold text-gray-700">
                    Body values ({"{{n}}"}) → CSV
                  </div>
                  <div className="space-y-2">
                    {paramMappings.map((m, i) => (
                      <div
                        key={m.index}
                        className="grid grid-cols-[160px,100px,1fr] items-center gap-2"
                      >
                        <div
                          className="truncate text-xs text-gray-700"
                          title={getFriendlyHeader(`parameter${m.index}`)}
                        >
                          {getFriendlyHeader(`parameter${m.index}`)}
                        </div>
                        <select
                          className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                          value={m.sourceType}
                          onChange={e =>
                            updateMapping(i, { sourceType: e.target.value })
                          }
                          disabled={isUploading || removing || isAudienceLocked}
                        >
                          <option value="csv">CSV column</option>
                          <option value="const">Constant</option>
                        </select>

                        {m.sourceType === "csv" ? (
                          <select
                            className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                            value={m.sourceName || ""}
                            onChange={e =>
                              updateMapping(i, { sourceName: e.target.value })
                            }
                            disabled={
                              !(csvHeaders ?? []).length ||
                              isUploading ||
                              removing ||
                              isAudienceLocked
                            }
                          >
                            <option value="">
                              {(csvHeaders ?? []).length
                                ? "-- Select column --"
                                : "Upload CSV"}
                            </option>
                            {(csvHeaders ?? []).map(h => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                            placeholder="Constant value"
                            value={m.constValue || ""}
                            onChange={e =>
                              updateMapping(i, { constValue: e.target.value })
                            }
                            disabled={isUploading || removing || isAudienceLocked}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
      )}

      {batch?.batchId && (
        <>
          {/* Sample table */}
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {(sample?.headers ?? csvHeaders ?? []).map(h => (
                    <th key={h} className="px-3 py-2 text-left">
                      {sample?.headers ? h : getFriendlyHeader(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.isArray(sample?.rows) && sample.rows.length > 0 ? (
                  sample.rows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {(sample?.headers ?? csvHeaders ?? []).map(h => (
                        <td key={h} className="px-3 py-1.5">
                          {row?.[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-3 py-2 text-gray-400"
                      colSpan={(csvHeaders ?? []).length || 1}
                    >
                      No rows yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={valReq.checkDuplicates}
                  onChange={e =>
                    setValReq(v => ({ ...v, checkDuplicates: e.target.checked }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                  disabled={isUploading || removing || isAudienceLocked}
                />
                Skip duplicate contacts
              </label>
              <button
                type="button"
                onClick={handleValidate}
                disabled={isUploading || removing || isAudienceLocked}
                className="rounded border border-gray-700 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Check File
              </button>
            </div>
            <button
              type="button"
              onClick={handlePersist}
              disabled={persisting || isUploading || removing || isAudienceLocked}
              className="rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {persisting ? (
                "Saving..."
              ) : (
                <span className="inline-flex items-center gap-1">
                  Next
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 5 7 7-7 7" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {/* Validation result */}
      {valRes && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-semibold">Validation</div>
          {Array.isArray(valRes.problems) && valRes.problems.length > 0 ? (
            <ul className="mt-1 list-disc pl-5">
              {valRes.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-green-700">No problems found.</div>
          )}
        </div>
      )}

    </section>
  );
}
