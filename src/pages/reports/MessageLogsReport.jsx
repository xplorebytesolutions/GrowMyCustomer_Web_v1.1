// 📄 src/pages/reports/MessageLogsReport.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import { saveAs } from "file-saver";

// compact multiselect
import MultiSelect from "../../utils/MultiSelect";

const STATUS_OPTIONS = ["Queued", "Sent", "Delivered", "Read", "Failed"];
const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "custom", label: "Custom…" },
];

const toOptions = arr => (arr || []).map(x => ({ label: x, value: x }));

function deriveFacetOptionsFromRows(items) {
  const senders = new Set();
  const wabas = new Set();
  for (const it of items || []) {
    if (it.senderId) senders.add(String(it.senderId).trim());
    const wid =
      it.wabaId ??
      it.wabaID ??
      it.metaWabaId ??
      it.businessWabaId ??
      it.waba_id ??
      null;
    if (wid) wabas.add(String(wid).trim());
  }
  const toSortedOptions = set =>
    Array.from(set)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map(v => ({ label: v, value: v }));
  return {
    senderOptions: toSortedOptions(senders),
    wabaOptions: toSortedOptions(wabas),
  };
}

/* ---------- Message ID cell (truncate inline; multiline & Copy in HOVER POPOVER) ---------- */
function MessageIdCell({ value }) {
  const full = value || "";
  const short = full.length > 23 ? `${full.slice(0, 23)}…` : full;
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // keep silent per request (no toast); you can surface an inline error if desired
    }
  };

  return (
    <div className="relative group inline-block align-middle">
      {/* Inline: single line, truncated */}
      <span className="inline-block max-w-[220px] truncate font-mono text-gray-800">
        {short || "-"}
      </span>

      {/* Hover/focus popover: multiline + Copy + small 'Copied' badge */}
      {full && (
        <div
          className="
            pointer-events-auto
            invisible opacity-0 translate-y-1
            group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
            group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0
            transition-opacity transition-transform
            absolute left-0 mt-1 z-30
            min-w-[320px] max-w-[560px]
            bg-white border rounded shadow px-3 py-2
          "
          role="tooltip"
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={doCopy}
              className="shrink-0 text-xs px-2 py-0.5 rounded border hover:bg-gray-50"
              title="Copy Message Id"
            >
              Copy
            </button>
            <code className="text-xs font-mono leading-snug break-all text-gray-900">
              {full}
            </code>
          </div>
          {copied && (
            <div className="mt-1 text-[11px] text-emerald-600">Copied</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageLogsReport() {
  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // filters/paging/sort
  const [search, setSearch] = useState("");
  const [dateKey, setDateKey] = useState("last7");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [senderIds, setSenderIds] = useState([]);
  const [wabaIds, setWabaIds] = useState([]);

  // facet options
  const [senderOptions, setSenderOptions] = useState([]);
  const [wabaOptions, setWabaOptions] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState("SentAt");
  const [sortDir, setSortDir] = useState("desc");

  // date range
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (dateKey === "today") start.setHours(0, 0, 0, 0);
    else if (dateKey === "yesterday") {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (dateKey === "last7") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (dateKey === "last30") {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (dateKey === "custom" && from && to) {
      return { fromUtc: new Date(from), toUtc: new Date(to) };
    }
    return { fromUtc: start, toUtc: end };
  }, [dateKey, from, to]);

  const rangeKey = `${range.fromUtc?.toISOString?.() ?? ""}|${
    range.toUtc?.toISOString?.() ?? ""
  }`;

  /* ---- fetchers ---- */
  const fetchFacets = useCallback(async () => {
    try {
      const { data } = await axiosClient.get("/report/message-logs/facets");
      if (data?.senderIds) setSenderOptions(toOptions(data.senderIds));
      if (data?.wabaIds) setWabaOptions(toOptions(data.wabaIds));
    } catch {}
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const body = {
      search: search || undefined,
      statuses: statuses.length ? statuses : undefined,
      senderIds: senderIds.length ? senderIds : undefined,
      wabaIds: wabaIds.length ? wabaIds : undefined,
      fromUtc: range.fromUtc?.toISOString?.(),
      toUtc: range.toUtc?.toISOString?.(),
      sortBy,
      sortDir,
      page,
      pageSize,
    };
    try {
      const { data } = await axiosClient.post(
        "/report/message-logs/search",
        body
      );
      const items = data.items || [];
      setRows(items);

      const computedTotalPages =
        typeof data.totalPages === "number"
          ? data.totalPages
          : Math.ceil((data.totalCount ?? 0) / (data.pageSize ?? pageSize));
      setTotalPages(
        Number.isFinite(computedTotalPages) ? computedTotalPages : 0
      );
      setTotalCount(data.totalCount ?? (items ? items.length : 0));

      // fallback facet derivation from rows
      const derived = deriveFacetOptionsFromRows(items);
      if (derived.senderOptions.length) {
        setSenderOptions(prev => {
          const known = new Set(prev.map(o => o.value));
          const merged = [...prev];
          derived.senderOptions.forEach(o => {
            if (!known.has(o.value)) merged.push(o);
          });
          return merged.sort((a, b) => a.label.localeCompare(b.label));
        });
      }
      if (derived.wabaOptions.length) {
        setWabaOptions(prev => {
          const known = new Set(prev.map(o => o.value));
          const merged = [...prev];
          derived.wabaOptions.forEach(o => {
            if (!known.has(o.value)) merged.push(o);
          });
          return merged.sort((a, b) => a.label.localeCompare(b.label));
        });
      }
    } catch {
      toast.error("❌ Failed to load message logs");
      setRows([]);
      setTotalPages(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    statuses,
    senderIds,
    wabaIds,
    rangeKey,
    sortBy,
    sortDir,
    page,
    pageSize,
  ]);

  useEffect(() => {
    fetchFacets();
  }, [fetchFacets]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 250);
    return () => clearTimeout(t);
  }, [fetchRows]);

  const toggleSort = col => {
    if (sortBy === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const commonExportBody = () => ({
    search: search || undefined,
    statuses: statuses.length ? statuses : undefined,
    senderIds: senderIds.length ? senderIds : undefined,
    wabaIds: wabaIds.length ? wabaIds : undefined,
    fromUtc: range.fromUtc?.toISOString?.(),
    toUtc: range.toUtc?.toISOString?.(),
    sortBy,
    sortDir,
  });

  const exportCsv = async () => {
    try {
      const res = await axiosClient.post(
        "/report/message-logs/export/csv",
        commonExportBody(),
        { responseType: "blob" }
      );
      saveAs(res.data, `MessageLogs.csv`);
    } catch {
      const headers = [
        "S.No",
        "Contacts",
        "Sender Id",
        "Status",
        "Campaign",
        "Message",
        "MessageId",
        "SentAt",
        "Error",
      ];
      const csvRows = [
        headers,
        ...rows.map((r, i) => [
          i + 1,
          r.recipientNumber || "",
          r.senderId || "",
          r.status || "",
          r.campaignName || r.campaignId || "",
          (r.messageContent || "").replace(/\r?\n/g, " ").slice(0, 500),
          r.providerMessageId || "",
          r.sentAt
            ? new Date(r.sentAt).toLocaleString()
            : new Date(r.createdAt).toLocaleString(),
          (r.errorMessage || "").replace(/\r?\n/g, " ").slice(0, 500),
        ]),
      ];
      const blob = new Blob([csvRows.map(r => r.join(",")).join("\n")], {
        type: "text/csv",
      });
      saveAs(blob, `MessageLogs.csv`);
    }
  };
  const exportXlsx = async () => {
    try {
      const res = await axiosClient.post(
        "/report/message-logs/export/xlsx",
        commonExportBody(),
        { responseType: "blob" }
      );
      saveAs(res.data, `MessageLogs.xlsx`);
    } catch {
      toast.error("XLSX export not available");
    }
  };

  const getDisplayPhone = log => {
    const clean = v => (typeof v === "string" ? v.trim() : v);
    const p = clean(log?.contactPhone);
    if (p && p !== "-" && p.toLowerCase() !== "n/a") return p;
    const r = clean(log?.recipientNumber) || clean(log?.to);
    return r || "";
  };

  const srBase = (page - 1) * pageSize;

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-black">📊 Message Send Logs </h1>
        <div className="space-x-2">
          <button
            onClick={exportCsv}
            className="bg-emerald-600 text-white text-sm px-3 py-1 rounded hover:bg-emerald-700"
          >
            CSV
          </button>
          <button
            onClick={exportXlsx}
            className="bg-emerald-700 text-white text-sm px-3 py-1 rounded hover:bg-emerald-800"
          >
            Excel
          </button>
          <Link
            to="/app/campaigns/template-campaigns-list"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="text-lg">←</span> Back to Campaigns
          </Link>
        </div>
      </div>

      {/* Filters — order: WABA Id, Sender Id, Status, Search, Date range (LAST) */}
      <div className="grid lg:grid-cols-12 md:grid-cols-8 grid-cols-1 gap-4 mb-4">
        <div className="lg:col-span-2 md:col-span-4 col-span-1 relative">
          <MultiSelect
            label="WABA Id"
            options={wabaOptions}
            value={wabaIds}
            onChange={next => {
              setWabaIds(next);
              setPage(1);
            }}
            placeholder="All"
          />
        </div>

        <div className="lg:col-span-2 md:col-span-4 col-span-1 relative">
          <MultiSelect
            label="Sender Id"
            options={senderOptions}
            value={senderIds}
            onChange={next => {
              setSenderIds(next);
              setPage(1);
            }}
            placeholder="All"
          />
        </div>

        <div className="lg:col-span-2 md:col-span-4 col-span-1 relative">
          <MultiSelect
            label="Status"
            options={toOptions(STATUS_OPTIONS)}
            value={statuses}
            onChange={next => {
              setStatuses(next);
              setPage(1);
            }}
            placeholder="All"
          />
        </div>

        <div className="lg:col-span-3 md:col-span-4 col-span-1">
          <label className="text-sm text-gray-600 mb-1 block">Search</label>
          <div className="relative">
            <input
              className="w-full border px-3 py-2 rounded pr-8"
              placeholder="Search across all fields"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <span className="absolute right-2 top-2.5 text-gray-400">⌕</span>
          </div>
        </div>

        {/* Date range presets at the end */}
        <div className="lg:col-span-3 md:col-span-4 col-span-1">
          <label className="text-sm text-gray-600 mb-1 block">Date range</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={dateKey}
            onChange={e => {
              setDateKey(e.target.value);
              setPage(1);
            }}
          >
            {DATE_PRESETS.map(p => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {dateKey === "custom" && (
          <>
            <div className="lg:col-span-3 md:col-span-4 col-span-1">
              <label className="text-sm text-gray-600 mb-1 block">From</label>
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={from}
                onChange={e => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="lg:col-span-3 md:col-span-4 col-span-1">
              <label className="text-sm text-gray-600 mb-1 block">To</label>
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={to}
                onChange={e => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Count */}
      <div className="mb-3 text-sm text-gray-500">
        Showing {rows.length} of {totalCount} logs
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 text-left">
            <tr>
              <th className="p-2 whitespace-nowrap">S.No</th>
              {[
                ["Recipient", "Contacts"],
                ["SenderId", "Sender Id"],
                ["Status", "Status"],
                ["CampaignName", "Campaign"],
                ["Message", "Message"],
                ["MessageId", "Message Id"],
                ["SentAt", "Sent At"],
                ["Error", "Error"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  className="p-2 cursor-pointer select-none whitespace-nowrap"
                  onClick={() =>
                    toggleSort(key === "Message" ? "MessageType" : key)
                  }
                >
                  {label}{" "}
                  {sortBy === key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={11}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={11}>
                  No logs found for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((log, idx) => {
                const isFailed =
                  String(log.status || "").toLowerCase() === "failed";
                const sr = (page - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={log.id ?? sr}
                    className={`border-t hover:bg-gray-50 ${
                      isFailed ? "text-red-700" : ""
                    }`}
                  >
                    <td className="p-2 whitespace-nowrap">{sr}</td>

                    <td className="p-2 whitespace-nowrap">
                      {getDisplayPhone(log) || "-"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {log.senderId || "-"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {log.status || "-"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {log.campaignName || log.campaignId || "-"}
                    </td>

                    <td className="p-2 max-w-[460px]">
                      <div
                        className="text-gray-800 truncate"
                        title={log.messageContent || ""}
                      >
                        {log.messageContent || "-"}
                      </div>
                    </td>

                    <td className="p-2 whitespace-nowrap align-top">
                      <MessageIdCell value={log.providerMessageId} />
                    </td>

                    <td className="p-2 whitespace-nowrap">
                      {log.sentAt
                        ? new Date(log.sentAt).toLocaleString()
                        : new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="p-2 max-w-[320px]">
                      <div
                        className={`truncate ${
                          isFailed ? "text-red-700 font-medium" : ""
                        }`}
                        title={log.errorMessage || ""}
                      >
                        {log.errorMessage ? `❗ ${log.errorMessage}` : "-"}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paging */}
      {totalPages > 1 && (
        <div className="flex flex-wrap gap-2 justify-end items-center mt-4">
          <button
            className="px-2 py-1 text-sm border rounded"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            ⬅ Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-2 py-1 text-sm border rounded"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next ➡
          </button>
          <select
            className="border px-2 py-1 rounded"
            value={pageSize}
            onChange={e => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100, 200].map(n => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
