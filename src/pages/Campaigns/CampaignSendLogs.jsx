import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import { saveAs } from "file-saver";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import CampaignSummaryBar from "./components/CampaignSummaryBar";
import ContactJourneyModal from "./components/ContactJourneyModal";
import {
  ArrowLeft,
  Download,
  RotateCcw,
  Route,
} from "lucide-react";

function CampaignSendLogs() {
  const { campaignId } = useParams();

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  const [journeyLog, setJourneyLog] = useState(null);

  const getDisplayPhone = log => {
    const clean = value => (typeof value === "string" ? value.trim() : value);
    const contactPhone = clean(log?.contactPhone);
    if (contactPhone && contactPhone !== "-" && contactPhone.toLowerCase() !== "n/a") {
      return contactPhone;
    }
    const fallback = clean(log?.recipientNumber) || clean(log?.to);
    return fallback || "";
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        pageSize,
        status: statusFilter,
        search,
      });
      const response = await axiosClient.get(
        `/campaign-logs/campaign/${campaignId}?${params.toString()}`
      );
      setLogs(response.data.items || []);
      setTotalLogs(response.data.totalCount || 0);
      setTotalPages(response.data.totalPages || 0);
    } catch {
      toast.error("Failed to load send logs");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, pageSize, statusFilter, search]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await axiosClient.get(
        `/campaign-logs/campaign/${campaignId}/summary`
      );
      setSummary(response.data.data || response.data);
    } catch {
      console.error("Failed to fetch summary");
    }
  }, [campaignId]);

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 500);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleStatusChange = event => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleSearchChange = event => {
    setSearch(event.target.value);
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

    const rows = [
      headers,
      ...logs.map(log => [
        getDisplayPhone(log),
        log.sendStatus || "",
        log.sourceChannel || "",
        log.sentAt ? new Date(log.sentAt).toLocaleString() : "",
        log.deliveredAt ? new Date(log.deliveredAt).toLocaleString() : "",
        log.readAt ? new Date(log.readAt).toLocaleString() : "",
        log.isClicked ? "Yes" : "No",
        log.clickType || "",
      ]),
    ];

    const blob = new Blob([rows.map(row => row.join(",")).join("\n")], {
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
              toast.success("Retry triggered");
              fetchLogs();
              fetchSummary();
            } catch {
              toast.error("Retry failed");
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
      message: "This will retry all failed messages in this campaign. Continue?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              const response = await axiosClient.post(
                `/campaign-logs/campaign/${campaignId}/retry-all`
              );
              toast.success(`Retried ${response.data.retried} messages`);
              fetchLogs();
              fetchSummary();
            } catch {
              toast.error("Retry failed");
            }
          },
        },
        { label: "Cancel" },
      ],
    });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-emerald-700">Send Logs for Campaign</h1>
        <Link
          to="/app/campaigns/template-campaigns-list"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Back to Campaigns
        </Link>
      </div>

      <CampaignSummaryBar summary={summary} />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <input
          className="rounded border px-3 py-2"
          placeholder="Search by name or phone"
          onChange={handleSearchChange}
        />
        <select
          className="rounded border px-3 py-2"
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
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={handleRetryAll}
            className="inline-flex items-center gap-1 rounded bg-emerald-700 px-3 py-1 text-sm text-white hover:bg-emerald-800"
          >
            <RotateCcw size={14} />
            Retry All Failed
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">No logs found with current filters.</p>
      ) : (
        <div className="overflow-x-auto rounded bg-white shadow">
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
                  <td className="p-2">{getDisplayPhone(log) || "-"}</td>
                  <td className="p-2">{log.sendStatus || "-"}</td>
                  <td className="p-2">{log.sourceChannel || "-"}</td>
                  <td className="p-2">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : "-"}
                  </td>
                  <td className="p-2">{log.isClicked ? "Yes" : "No"}</td>
                  <td className="p-2">{log.clickType || "-"}</td>
                  <td className="space-x-2 p-2">
                    <button
                      onClick={() => {
                        setJourneyLog(log);
                        setIsJourneyOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                    >
                      <Route size={12} />
                      Journey
                    </button>
                    {log.sendStatus === "Failed" && (
                      <button
                        onClick={() => handleRetrySingle(log.id)}
                        className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
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
        <div className="mt-4 flex items-center justify-end space-x-2">
          <button
            className="rounded border px-2 py-1 text-sm"
            disabled={page === 1}
            onClick={() => setPage(prev => prev - 1)}
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            className="rounded border px-2 py-1 text-sm"
            disabled={page === totalPages}
            onClick={() => setPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      )}

      <ContactJourneyModal
        isOpen={isJourneyOpen}
        onClose={() => setIsJourneyOpen(false)}
        log={journeyLog}
      />
      </div>
    </div>
  );
}

export default CampaignSendLogs;
