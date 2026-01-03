// 📄 src/pages/CampaignReports/CampaignBucketContactsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ChevronLeft, Search } from "lucide-react";

import { Card } from "../../components/ui/card";
import { useAuth } from "../../app/providers/AuthProvider";
import { FK } from "../../capabilities/featureKeys";
import { getCampaignBucketContacts } from "../../api/campaignReportApi";

const PAGE_SIZE = 50;

function formatAxiosError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  const pickMessage = () => {
    if (!data) return "";
    if (typeof data === "string") return data;
    if (typeof data?.message === "string") return data.message;
    try {
      return JSON.stringify(data);
    } catch {
      return "";
    }
  };

  let msg = pickMessage();
  if (msg && msg.length > 220) msg = `${msg.slice(0, 220)}...`;

  return {
    status,
    message: msg || err?.message || "",
  };
}

export default function CampaignBucketContactsPage() {
  const { campaignId, bucket } = useParams();
  const navigate = useNavigate();
  const { can, isLoading } = useAuth();
  const [params] = useSearchParams();

  const repliedWindowDays = Number(params.get("windowDays") || 7);
  const returnTab = params.get("tab");

  const reportUrl = `/app/campaigns/${campaignId}/reports/logs${
    returnTab ? `?tab=${encodeURIComponent(returnTab)}` : ""
  }`;

  const allowed = useMemo(() => {
    return can?.(FK.CAMPAIGN_STATUS_VIEW) || can?.(FK.CAMPAIGN_LIST_VIEW);
  }, [can]);

  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setAppliedQ(String(q || "").trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  async function load({
    q: qOverride,
    page: pageOverride,
    repliedWindowDays: repliedWindowDaysOverride,
  } = {}) {
    if (!campaignId || !bucket) return;
    setLoading(true);
    try {
      const res = await getCampaignBucketContacts(campaignId, bucket, {
        q: qOverride ?? appliedQ,
        page: pageOverride ?? page,
        pageSize: PAGE_SIZE,
        repliedWindowDays: repliedWindowDaysOverride ?? repliedWindowDays,
      });

      const data = res?.data?.data ?? res?.data ?? {};
      const list = data.items || data.Items || data.contacts || data.rows || [];
      setItems(Array.isArray(list) ? list : []);
      setTotal(
        data.totalCount ?? data.TotalCount ?? data.total ?? data.count ?? null
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[BucketContacts] load failed", {
        status: err?.response?.status,
        data: err?.response?.data,
        err,
      });
      const { status, message } = formatAxiosError(err);
      toast.error(
        `Failed to load contacts${status ? ` (${status})` : ""}${
          message ? `: ${message}` : ""
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  const lastFiltersRef = useRef({ q: appliedQ, repliedWindowDays });
  useEffect(() => {
    if (!allowed) return;

    const nextFilters = { q: appliedQ, repliedWindowDays };
    const prev = lastFiltersRef.current;
    const filtersChanged =
      prev.q !== nextFilters.q ||
      prev.repliedWindowDays !== nextFilters.repliedWindowDays;

    // Reset pagination when filters change (q/windowDays)
    if (filtersChanged && page !== 1) {
      lastFiltersRef.current = nextFilters;
      setPage(1);
      return;
    }

    lastFiltersRef.current = nextFilters;
    load({ q: appliedQ, page, repliedWindowDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, bucket, page, allowed, appliedQ, repliedWindowDays]);

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Bucket Contacts
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            You don’t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const pageCount =
    total == null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate(reportUrl)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to report
          </button>

          <h1 className="text-2xl font-semibold text-slate-900 mt-2">
            Bucket:{" "}
            <span className="font-mono text-[14px] text-slate-700">
              {bucket}
            </span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            CampaignId:{" "}
            <span className="font-mono text-[12px] text-slate-800">
              {campaignId}
            </span>
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name/phone…"
              className="w-full outline-none text-sm text-slate-900"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setAppliedQ(String(q || "").trim());
              }}
              disabled={loading}
              className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">
                  Phone
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">
                  Last status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">
                  Last update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    {loading ? "Loading…" : "No contacts found in this bucket."}
                  </td>
                </tr>
              ) : (
                items.map((x, idx) => (
                  <tr key={x.contactId || x.id || idx} className="bg-white">
                    <td className="px-4 py-3 text-slate-900">
                      {x.contactName || x.name || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {x.phone || x.contactPhone || x.recipientNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {x.status || x.lastStatus || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {x.lastUpdatedAt ||
                        x.updatedAt ||
                        x.sentAt ||
                        x.createdAt ||
                        "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {total != null ? `Total: ${total}` : " "}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Prev
          </button>

          <span className="text-sm text-slate-600">
            Page {page}
            {pageCount ? ` / ${pageCount}` : ""}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage(p => (pageCount ? Math.min(pageCount, p + 1) : p + 1))
            }
            disabled={loading || (pageCount ? page >= pageCount : false)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
