// 📄 src/pages/campaigns/CampaignSendLogs.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import { saveAs } from "file-saver";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import MessagePreviewModal from "./components/MessagePreviewModal";
import CampaignSummaryBar from "./components/CampaignSummaryBar";
import ContactJourneyModal from "./components/ContactJourneyModal";

function CampaignSendLogs() {
  const { campaignId } = useParams();

  // data
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // filters/paging
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  // modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  const [journeyLog, setJourneyLog] = useState(null);

  // --- helpers ---
  // Prefer contactPhone when it's a real value; otherwise fall back to recipientNumber / to.
  const getDisplayPhone = log => {
    const clean = v => (typeof v === "string" ? v.trim() : v);
    const p = clean(log?.contactPhone);
    if (p && p !== "-" && p.toLowerCase() !== "n/a") return p;
    const r = clean(log?.recipientNumber) || clean(log?.to);
    return r || ""; // empty if truly unavailable
  };

  // --- fetching ---
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        pageSize,
        status: statusFilter,
        search,
      });
      const res = await axiosClient.get(
        `/campaign-logs/campaign/${campaignId}?${params.toString()}`
      );
      setLogs(res.data.items || []);
      setTotalLogs(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 0);
    } catch {
      toast.error("❌ Failed to load send logs");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, pageSize, statusFilter, search]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axiosClient.get(
        `/campaign-logs/campaign/${campaignId}/summary`
      );
      setSummary(res.data.data || res.data);
    } catch {
      console.error("❌ Failed to fetch summary");
    }
  }, [campaignId]);

  useEffect(() => {
    const t = setTimeout(fetchLogs, 500);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // --- handlers ---
  const handleStatusChange = e => {
    setStatusFilter(e.target.value);
    setPage(1);
  };
  const handleSearchChange = e => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleExport = () => {
    const headers = [
      "Contact Phone",
      "Status",
      "Channel",
      "Sent At",
      "Delivered",
      "Read",
      "Clicked",
      "Click Type",
    ];
    const csvRows = [
      headers,
      ...logs.map(log => [
        getDisplayPhone(log), // ✅ phone only
        log.sendStatus,
        log.sourceChannel,
        log.sentAt ? new Date(log.sentAt).toLocaleString() : "",
        log.deliveredAt ? new Date(log.deliveredAt).toLocaleString() : "",
        log.readAt ? new Date(log.readAt).toLocaleString() : "",
        log.isClicked ? "Yes" : "No",
        log.clickType || "",
      ]),
    ];
    const blob = new Blob([csvRows.map(r => r.join(",")).join("\n")], {
      type: "text/csv",
    });
    saveAs(blob, `CampaignLogs-${campaignId}.csv`);
  };

  const handleRetrySingle = logId => {
    confirmAlert({
      title: "Retry This Message?",
      message: "Are you sure you want to retry this failed message?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              await axiosClient.post(`/campaign-logs/${logId}/retry`);
              toast.success("✅ Retry triggered");
              fetchLogs();
              fetchSummary();
            } catch {
              toast.error("❌ Retry failed");
            }
          },
        },
        { label: "Cancel" },
      ],
    });
  };

  const handleRetryAll = () => {
    confirmAlert({
      title: "Retry All Failed Messages?",
      message:
        "This will retry all failed messages in this campaign. Continue?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              const res = await axiosClient.post(
                `/campaign-logs/campaign/${campaignId}/retry-all`
              );
              toast.success(`✅ Retried ${res.data.retried} messages`);
              fetchLogs();
              fetchSummary();
            } catch {
              toast.error("❌ Retry failed");
            }
          },
        },
        { label: "Cancel" },
      ],
    });
  };

  const openPreview = log => {
    setSelectedLog(log);
    setPreviewOpen(true);
  };
  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedLog(null);
  };

  // --- render ---
  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-purple-700">
          📨 Send Logs for Campaign
        </h1>
        <Link
          to="/app/campaigns/template-campaigns-list"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <span className="text-lg">←</span> Back to Campaigns
        </Link>
      </div>

      <CampaignSummaryBar summary={summary} />

      <div className="grid md:grid-cols-4 gap-4 mb-4">
        <input
          className="border px-3 py-2 rounded"
          placeholder="🔍 Search by name or phone"
          onChange={handleSearchChange}
        />
        <select
          className="border px-3 py-2 rounded"
          value={statusFilter}
          onChange={handleStatusChange}
        >
          <option value="">All Statuses</option>
          <option value="Sent">Sent</option>
          <option value="Delivered">Delivered</option>
          <option value="Read">Read</option>
          <option value="Queued">Queued</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      <div className="mb-4 flex justify-between">
        <p className="text-sm text-gray-500">
          Showing {logs.length} of {totalLogs} logs
        </p>
        <div className="space-x-2">
          <button
            onClick={handleExport}
            className="bg-emerald-600 text-white text-sm px-3 py-1 rounded hover:bg-emerald-700"
          >
            ⬇ Export CSV
          </button>
          <button
            onClick={handleRetryAll}
            className="bg-purple-600 text-white text-sm px-3 py-1 rounded hover:bg-purple-700"
          >
            🔁 Retry All Failed
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">No logs found with current filters.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2">Contact</th>
                <th className="p-2">Status</th>
                <th className="p-2">Channel</th>
                <th className="p-2">Sent</th>
                <th className="p-2">Clicked</th>
                <th className="p-2">Click Type</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">
                    {/* ✅ phone only – no N/A, no parentheses */}
                    {getDisplayPhone(log) || "-"}
                  </td>
                  <td className="p-2">{log.sendStatus || "-"}</td>
                  <td className="p-2">{log.sourceChannel || "-"}</td>
                  <td className="p-2">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : "-"}
                  </td>
                  <td className="p-2">{log.isClicked ? "✅ Yes" : "❌ No"}</td>
                  <td className="p-2">{log.clickType || "-"}</td>
                  <td className="p-2 space-x-2">
                    <button
                      onClick={() => openPreview(log)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setJourneyLog(log);
                        setIsJourneyOpen(true);
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      🧭 Journey
                    </button>
                    {log.sendStatus === "Failed" && (
                      <button
                        onClick={() => handleRetrySingle(log.id)}
                        className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end items-center mt-4 space-x-2">
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
        </div>
      )}

      <MessagePreviewModal
        isOpen={previewOpen}
        onClose={closePreview}
        messageLog={selectedLog}
      />
      <ContactJourneyModal
        isOpen={isJourneyOpen}
        onClose={() => setIsJourneyOpen(false)}
        log={journeyLog}
      />
    </div>
  );
}

export default CampaignSendLogs;
