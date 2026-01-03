// 📄 src/api/campaignReportApi.js
import axiosClient from "./axiosClient";

/**
 * IMPORTANT:
 * I don’t hardcode ONE endpoint because your backend naming evolved.
 * So we try a couple of likely routes (same pattern you already use in teamStaffApi). :contentReference[oaicite:9]{index=9}
 */

async function tryGet(paths, params, config = {}) {
  let lastErr;
  for (const p of paths) {
    const cleanPath = p.startsWith("/") ? p.slice(1) : p;
    try {
      return await axiosClient.get(cleanPath, {
        __silent: config.__silent ?? true,
        ...config,
        params,
      });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("No campaign report endpoint responded.");
}

export async function getCampaignReportSummary(campaignId, opts = {}) {
  const { repliedWindowDays = 7, windowDays } = opts;
  const days = Number.isFinite(Number(windowDays))
    ? Number(windowDays)
    : Number(repliedWindowDays);

  return tryGet(
    [
      // Most stable legacy endpoint (used across the app)
      `campaign-logs/campaign/${campaignId}/summary`,
      `CampaignTracking/campaign/${campaignId}/summary`,
      `CampaignReports/campaign/${campaignId}/summary`,
      `CampaignReport/campaign/${campaignId}/summary`,
      `campaign-tracking/campaign/${campaignId}/summary`,
      `campaign-reports/campaign/${campaignId}/summary`,
      `campaign-report/campaign/${campaignId}/summary`,
    ],
    // Some backends expect `windowDays` while others expect `repliedWindowDays`.
    { repliedWindowDays: days, windowDays: days },
    { __silent: true }
  );
}

function normalizeBucket(bucket) {
  const b = String(bucket || "").trim().toLowerCase();
  if (!b) return b;
  // frontend uses "SENT"/"DELIVERED"/...; backend expects lowercase query values
  if (b === "sent") return "sent";
  if (b === "delivered") return "delivered";
  if (b === "read") return "read";
  if (b === "clicked") return "clicked";
  if (b === "replied") return "replied";
  if (b === "failed") return "failed";
  return b;
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

function normalizePagedContacts(raw, { page, pageSize } = {}) {
  const items = extractItems(raw);
  const totalCount = extractTotalCount(raw);
  const normalizedPage = Number.isFinite(Number(raw?.page ?? raw?.Page))
    ? Number(raw?.page ?? raw?.Page)
    : Number(page || 1);
  const normalizedPageSize = Number.isFinite(
    Number(raw?.pageSize ?? raw?.PageSize)
  )
    ? Number(raw?.pageSize ?? raw?.PageSize)
    : Number(pageSize || 50);

  return {
    items,
    totalCount,
    page: normalizedPage,
    pageSize: normalizedPageSize,
  };
}

function sendLogsStatusForBucket(bucket) {
  const b = normalizeBucket(bucket);
  if (!b) return "";
  return b.charAt(0).toUpperCase() + b.slice(1);
}

function pickField(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null) return v;
  }
  return null;
}

function matchesBucketFromSendLog(log, bucketValue, repliedWindowDays) {
  const b = String(bucketValue || "").toLowerCase();
  if (!b) return true;

  const sendStatus = String(
    pickField(log, ["sendStatus", "SendStatus", "status", "Status"]) || ""
  ).toUpperCase();

  const deliveredAt = pickField(log, ["deliveredAt", "DeliveredAt"]);
  const readAt = pickField(log, ["readAt", "ReadAt"]);
  const clickedAt = pickField(log, ["clickedAt", "ClickedAt"]);
  const isClicked = pickField(log, ["isClicked", "IsClicked"]);
  const clickType = pickField(log, ["clickType", "ClickType"]);
  const repliedAt = pickField(log, ["repliedAt", "RepliedAt"]);
  const errorMessage = pickField(log, ["errorMessage", "ErrorMessage"]);

  if (b === "failed") {
    return sendStatus.includes("FAILED") || !!errorMessage;
  }

  if (b === "delivered_not_read") {
    return !!deliveredAt && !readAt;
  }

  if (b === "read_not_replied") {
    // Best-effort: we don't always have reply metadata in send-logs, so treat "replied" status as exclusion.
    return !!readAt && !sendStatus.includes("REPLIED");
  }

  if (b === "clicked_not_replied") {
    const clicked = isClicked === true || !!clickedAt || !!clickType;
    return clicked && !sendStatus.includes("REPLIED");
  }

  if (b === "replied") {
    if (sendStatus.includes("REPLIED") || !!repliedAt) {
      const days = Number(repliedWindowDays);
      if (!Number.isFinite(days) || days <= 0) return true;

      const sentAtRaw = pickField(log, ["sentAt", "SentAt", "createdAt", "CreatedAt"]);
      const replyAtRaw = repliedAt || pickField(log, ["lastUpdatedAt", "LastUpdatedAt"]);
      const sentAt = sentAtRaw ? new Date(sentAtRaw) : null;
      const replyAt = replyAtRaw ? new Date(replyAtRaw) : null;
      if (!sentAt || Number.isNaN(sentAt.getTime()) || !replyAt || Number.isNaN(replyAt.getTime())) {
        return true;
      }
      const ms = days * 24 * 60 * 60 * 1000;
      return replyAt.getTime() - sentAt.getTime() <= ms;
    }
    return false;
  }

  // Unknown buckets: do not filter everything out.
  return true;
}

function pickContactKey(log) {
  return (
    log?.contactId ||
    log?.contact?.id ||
    log?.recipientId ||
    log?.contactPhone ||
    log?.recipientNumber ||
    log?.to ||
    log?.id ||
    null
  );
}

function mapSendLogToContactRow(log) {
  const contactId =
    log?.contactId || log?.contact?.id || log?.contact?.contactId || null;

  const contactName =
    log?.contactName ||
    log?.contact?.name ||
    log?.name ||
    [log?.firstName, log?.lastName].filter(Boolean).join(" ") ||
    "-";

  const phone =
    log?.contactPhone ||
    log?.phone ||
    log?.recipientNumber ||
    log?.to ||
    log?.recipient ||
    "-";

  const status = log?.sendStatus || log?.status || log?.lastStatus || "-";

  const updatedAt =
    log?.lastUpdatedAt ||
    log?.updatedAt ||
    log?.readAt ||
    log?.deliveredAt ||
    log?.clickedAt ||
    log?.sentAt ||
    log?.createdAt ||
    null;

  return {
    id: contactId || phone,
    contactId,
    contactName,
    contactPhone: phone,
    phone,
    status,
    lastUpdatedAt: updatedAt,
    updatedAt,
    _source: "campaign-logs",
  };
}

function dedupeByLatest(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = item?.contactId || item?.phone || item?.contactPhone || null;
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const prevTime = prev?.lastUpdatedAt
      ? new Date(prev.lastUpdatedAt).getTime()
      : 0;
    const nextTime = item?.lastUpdatedAt
      ? new Date(item.lastUpdatedAt).getTime()
      : 0;
    if (nextTime >= prevTime) byKey.set(key, item);
  }
  return Array.from(byKey.values());
}

/**
 * bucket:
 *  - "DELIVERED_NOT_REPLIED"
 *  - "READ_NOT_REPLIED"
 *  - "FAILED"
 *  - "REPLIED"
 */
export async function getCampaignBucketContacts(campaignId, bucket, opts = {}) {
  const {
    q = "",
    page = 1,
    pageSize = 50,
    repliedWindowDays = 7,
    fromUtc,
    toUtc,
    runId,
  } = opts;

  const bucketValue = normalizeBucket(bucket);
  const params = {
    bucket: bucketValue,
    search: q,
    fromUtc,
    toUtc,
    repliedWindowDays,
    runId,
    page,
    pageSize,
  };

  // Keep only backend-supported query params.
  Object.keys(params).forEach(k => {
    if (params[k] == null || params[k] === "") delete params[k];
  });

  // NOTE: The /campaign-logs/.../contacts endpoint is currently erroring (500) on some backends due to SQL syntax issues.
  // To keep the UI functional, we use the stable send-logs endpoint and bucket client-side.
  const fetchSize = Math.min(5000, Math.max(Number(pageSize) * 10, 500));

  const res = await axiosClient.get(`campaign-logs/campaign/${campaignId}`, {
    __silent: true,
    params: {
      page: 1,
      pageSize: fetchSize,
      search: q,
    },
  });

  const data = res?.data ?? {};
  const rawItems = Array.isArray(data.items) ? data.items : extractItems(data);
  const filtered = rawItems.filter((x) =>
    matchesBucketFromSendLog(x, bucketValue, repliedWindowDays)
  );
  const mapped = filtered.filter((x) => !!pickContactKey(x)).map(mapSendLogToContactRow);
  const deduped = dedupeByLatest(mapped);
  const start = (Math.max(1, page) - 1) * Math.max(1, pageSize);
  const pageItems = deduped.slice(start, start + Math.max(1, pageSize));

  return {
    ...res,
    data: {
      items: pageItems,
      totalCount: deduped.length,
      page,
      pageSize,
      total: deduped.length,
      _fallback: true,
    },
  };
}

/**
 * Wizard action (MVP):
 * backend can implement as:
 * - create a "retarget draft campaign"
 * - or return "contactIds" so frontend can feed campaign builder
 */
export async function runCampaignRetargetWizard(campaignId, payload) {
  const body =
    payload && typeof payload === "object"
      ? { ...payload }
      : {};

  // Ensure campaignId is available even for endpoints that don't include it in the URL path.
  if (body.campaignId == null) body.campaignId = campaignId;
  if (body.sourceCampaignId == null) body.sourceCampaignId = campaignId;

  // Prefer the most common REST-style route first to avoid noisy 404 probes.
  const paths = [
    `campaigns/retarget`,
    `campaign/retarget`,

    `CampaignTracking/campaign/${campaignId}/retarget`,
    `CampaignReports/campaign/${campaignId}/retarget`,
    `CampaignReport/campaign/${campaignId}/retarget`,
    `campaign-tracking/campaign/${campaignId}/retarget`,
    `campaign-reports/campaign/${campaignId}/retarget`,
    `campaign-report/campaign/${campaignId}/retarget`,
    `campaigns/campaign/${campaignId}/retarget`,
    `campaigns/${campaignId}/retarget`,
    `campaign/${campaignId}/retarget`,
    `campaign/campaign/${campaignId}/retarget`,
  ];

  let lastErr;
  for (const p of paths) {
    const cleanPath = p.startsWith("/") ? p.slice(1) : p;
    try {
      return await axiosClient.post(cleanPath, body, { __silent: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr ?? new Error("Retarget wizard failed (all endpoints returned 404/405).");
}
