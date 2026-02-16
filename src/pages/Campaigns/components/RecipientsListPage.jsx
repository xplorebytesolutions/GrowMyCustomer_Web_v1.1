import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

function RecipientsListPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [recipients, setRecipients] = useState([]);
  const [campaignName, setCampaignName] = useState("");
  const [hasCsvAudience, setHasCsvAudience] = useState(false);
  const [csvAudienceMemberCount, setCsvAudienceMemberCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(null); // "single" | "bulk" | null
  const [pendingContactId, setPendingContactId] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState(new Set());

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const [recipientsRes, campaignRes, audienceRes] = await Promise.all([
        axiosClient.get(`/campaign/recipients/${id}`),
        axiosClient.get(`/campaign/${id}`),
        axiosClient.get(`/campaigns/${id}/audience`).catch(() => ({ data: null })),
      ]);

      const recipientsData = Array.isArray(recipientsRes.data)
        ? recipientsRes.data
        : recipientsRes.data?.items || recipientsRes.data?.recipients || [];

      setRecipients(recipientsData);

      const campaignRaw = campaignRes?.data || {};
      setCampaignName(
        campaignRaw?.name || campaignRaw?.campaignName || campaignRaw?.title || ""
      );
      const audienceRaw = audienceRes?.data?.data ?? audienceRes?.data ?? null;
      const hasAudienceAttachment = !!(
        audienceRaw?.attachmentId ||
        audienceRaw?.AttachmentId ||
        audienceRaw?.fileName ||
        audienceRaw?.FileName
      );
      const memberCountRaw =
        audienceRaw?.memberCount ??
        audienceRaw?.MemberCount ??
        audienceRaw?.contactsCount ??
        audienceRaw?.ContactsCount;
      const memberCountNum = Number(memberCountRaw);
      setHasCsvAudience(hasAudienceAttachment);
      setCsvAudienceMemberCount(
        Number.isFinite(memberCountNum) ? memberCountNum : null
      );
    } catch (err) {
      console.error("Load recipients failed:", err);
      toast.error("Failed to load assigned recipients");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const getAssignedVia = recipient => {
    const raw =
      recipient.assignedVia ??
      recipient.assignmentSource ??
      recipient.assignedFrom ??
      recipient.sourceType ??
      recipient.recipientSource ??
      "";

    const normalized = String(raw).toUpperCase();
    if (normalized.includes("CSV")) return "CSV";
    if (normalized.includes("CRM")) return "CRM";
    return raw || "-";
  };

  const getAssignedAt = recipient =>
    recipient.assignedAt ??
    recipient.assignmentDate ??
    recipient.assignedOn ??
    recipient.createdAt ??
    recipient.createdOn ??
    null;

  const formatDateTime = value => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
  };

  const filtered = useMemo(() => {
    let list = recipients;

    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        r =>
          r.name?.toLowerCase().includes(needle) ||
          r.phoneNumber?.toLowerCase?.().includes(needle) ||
          String(getAssignedVia(r)).toLowerCase().includes(needle)
      );
    }

    list = [...list].sort((a, b) => {
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "phone")
        return (a.phoneNumber || "").localeCompare(b.phoneNumber || "");
      if (sort === "source")
        return String(getAssignedVia(a)).localeCompare(String(getAssignedVia(b)));
      if (sort === "assignedDate") {
        return (
          new Date(getAssignedAt(b) || 0).getTime() -
          new Date(getAssignedAt(a) || 0).getTime()
        );
      }
      return 0;
    });

    return list;
  }, [recipients, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);
  const csvRecipientCount = useMemo(
    () => recipients.filter(r => getAssignedVia(r) === "CSV").length,
    [recipients]
  );

  const isProtectedCsvSingleRecipient = useCallback(
    recipient => {
      const fromCsvBySource = getAssignedVia(recipient) === "CSV";
      const singleRecipientWithCsvAudience =
        hasCsvAudience &&
        recipients.length <= 1 &&
        (csvAudienceMemberCount == null || csvAudienceMemberCount <= 1);
      if (fromCsvBySource) return csvRecipientCount <= 1;
      return singleRecipientWithCsvAudience;
    },
    [csvRecipientCount, hasCsvAudience, recipients.length, csvAudienceMemberCount]
  );

  const selectablePageData = pageData.filter(
    recipient => !isProtectedCsvSingleRecipient(recipient)
  );
  const removableSelectedCount = useMemo(
    () =>
      recipients.filter(
        recipient =>
          selected.has(recipient.id) && !isProtectedCsvSingleRecipient(recipient)
      ).length,
    [recipients, selected, isProtectedCsvSingleRecipient]
  );

  useEffect(() => {
    setPage(1);
  }, [q, sort]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setSelected(prev => {
      const next = new Set(
        [...prev].filter(id => {
          const recipient = recipients.find(r => r.id === id);
          return recipient && !isProtectedCsvSingleRecipient(recipient);
        })
      );
      return next.size === prev.size ? prev : next;
    });
  }, [recipients, csvRecipientCount, isProtectedCsvSingleRecipient]);

  const allChecked =
    selectablePageData.length > 0 &&
    selectablePageData.every(r => selected.has(r.id));
  const indeterminate =
    !allChecked && selectablePageData.some(r => selected.has(r.id));

  const toggleAll = checked => {
    setSelected(prev => {
      const copy = new Set(prev);
      selectablePageData.forEach(r =>
        checked ? copy.add(r.id) : copy.delete(r.id)
      );
      return copy;
    });
  };

  const toggleOne = (checked, recipientId) => {
    const recipient = recipients.find(r => r.id === recipientId);
    if (recipient && isProtectedCsvSingleRecipient(recipient)) return;
    setSelected(prev => {
      const copy = new Set(prev);
      if (checked) copy.add(recipientId);
      else copy.delete(recipientId);
      return copy;
    });
  };

  const handleSingleRemove = contactId => {
    setPendingContactId(contactId);
    setConfirmMode("single");
    setConfirmOpen(true);
  };

  const handleBulkRemove = () => {
    const selectedRecipients = recipients.filter(r => selected.has(r.id));
    const removableCount = selectedRecipients.filter(
      r => !isProtectedCsvSingleRecipient(r)
    ).length;
    if (removableCount === 0) {
      toast.info(
        "You can't delete this here because this CSV has only one contact. Remove the CSV audience from Assign Contacts."
      );
      return;
    }
    setPendingContactId(null);
    setConfirmMode("bulk");
    setConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    if (confirmBusy) return;
    setConfirmOpen(false);
    setConfirmMode(null);
    setPendingContactId(null);
  };

  const confirmRemove = async () => {
    if (confirmMode === "single" && !pendingContactId) return;
    if (confirmMode === "single") {
      const pendingRecipient = recipients.find(r => r.id === pendingContactId);
      if (pendingRecipient && isProtectedCsvSingleRecipient(pendingRecipient)) {
        toast.info(
          "You can't delete this here because this CSV has only one contact. Remove the CSV audience from Assign Contacts."
        );
        closeConfirmDialog();
        return;
      }
    }
    const bulkIds = [...selected].filter(contactId => {
      const recipient = recipients.find(r => r.id === contactId);
      return recipient && !isProtectedCsvSingleRecipient(recipient);
    });
    if (confirmMode === "bulk" && bulkIds.length === 0) return;

    setConfirmBusy(true);
    if (confirmMode === "single") setRemovingId(pendingContactId);
    try {
      if (confirmMode === "single") {
        await removeRecipientApi(pendingContactId);
        setRecipients(prev => prev.filter(r => r.id !== pendingContactId));
        setSelected(prev => {
          const copy = new Set(prev);
          copy.delete(pendingContactId);
          return copy;
        });
        toast.success("Contact removed");
      } else {
        await Promise.all(
          bulkIds.map(contactId => removeRecipientApi(contactId))
        );
        const bulkIdSet = new Set(bulkIds);
        setRecipients(prev => prev.filter(r => !bulkIdSet.has(r.id)));
        setSelected(new Set());
        toast.success("Selected contacts removed");
      }
      closeConfirmDialog();
    } catch {
      toast.error(
        confirmMode === "single"
          ? "Failed to remove contact"
          : "Failed to remove some contacts"
      );
    } finally {
      setConfirmBusy(false);
      setRemovingId(null);
    }
  };

  const handleExport = () => {
    const rows = [
      ["Name", "Phone", "Assigned Via", "Assigned Date", "Lead Source"],
      ...filtered.map(r => [
        r.name || "",
        r.phoneNumber || "",
        getAssignedVia(r),
        formatDateTime(getAssignedAt(r)),
        r.leadSource || "",
      ]),
    ];

    const csv = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Campaign-${id}-Recipients.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeRecipientApi = async contactId => {
    try {
      await axiosClient.delete(`/campaign/${id}/recipients/${contactId}`);
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
      await axiosClient.delete(`/campaigns/${id}/recipients/${contactId}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate("/app/campaigns/template-campaigns-list")}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Assigned Recipients
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {recipients.length}
            </span>
          </h1>

          {campaignName && (
            <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Campaign: {campaignName}
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name, phone, source..."
              className="w-64 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="name">Sort: Name</option>
              <option value="phone">Sort: Phone</option>
              <option value="source">Sort: Assigned Via</option>
              <option value="assignedDate">Sort: Assigned Date</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button
              onClick={() =>
                navigate(`/app/campaigns/image-campaigns/assign-contacts/${id}`)
              }
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Assign Contacts
            </button>
            <button
              disabled={removableSelectedCount === 0}
              onClick={handleBulkRemove}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                removableSelectedCount === 0
                  ? "cursor-not-allowed bg-gray-200 text-gray-400"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Remove Selected
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="grid gap-3 p-6 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <div className="text-lg font-medium">No recipients</div>
              <p className="mt-1">Assign contacts to start sending campaigns.</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col style={{ width: 64 }} />
                  <col />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 190 }} />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 160 }} />
                </colgroup>

                <thead className="sticky top-0 border-b bg-gray-50 text-gray-700">
                  <tr className="text-left">
                    <th className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => el && (el.indeterminate = indeterminate)}
                        onChange={e => toggleAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-2 align-middle">#</th>
                    <th className="px-3 py-2 align-middle">Name</th>
                    <th className="px-3 py-2 align-middle">Phone</th>
                    <th className="px-3 py-2 align-middle">Assigned Via</th>
                    <th className="px-3 py-2 align-middle">Assigned Date</th>
                    <th className="px-3 py-2 align-middle">Lead Source</th>
                    <th className="px-3 py-2 align-middle text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {pageData.map((recipient, idx) => (
                    <tr key={recipient.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selected.has(recipient.id)}
                          disabled={isProtectedCsvSingleRecipient(recipient)}
                          onChange={e => toggleOne(e.target.checked, recipient.id)}
                        />
                      </td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="truncate">{recipient.name || "-"}</div>
                      </td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        {recipient.phoneNumber || "-"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="truncate">{getAssignedVia(recipient)}</div>
                      </td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        {formatDateTime(getAssignedAt(recipient))}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="truncate">{recipient.leadSource || "-"}</div>
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        {isProtectedCsvSingleRecipient(recipient) ? (
                          <span
                            title="You can't delete this contact here because this CSV has only one contact. Remove the CSV audience from Assign Contacts."
                            className="inline-flex cursor-not-allowed rounded bg-gray-100 px-2 py-1 text-xs text-gray-500"
                          >
                            Remove
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSingleRemove(recipient.id)}
                            disabled={removingId === recipient.id}
                            className={`rounded px-2 py-1 text-xs ${
                              removingId === recipient.id
                                ? "cursor-not-allowed bg-red-200 text-red-700"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {removingId === recipient.id ? "Removing..." : "Remove"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filtered.length > pageSize && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <Dialog open={confirmOpen} onOpenChange={open => !open && closeConfirmDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {confirmMode === "single"
                  ? "Remove contact?"
                  : "Remove selected contacts?"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              {confirmMode === "single"
                ? "This contact will be removed from this campaign audience."
                : `This will remove ${removableSelectedCount} selected contact(s) from this campaign audience.`}
            </p>
            <DialogFooter className="mt-5 gap-2 sm:justify-end">
              <button
                type="button"
                onClick={closeConfirmDialog}
                disabled={confirmBusy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={confirmBusy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {confirmBusy ? "Removing..." : "Remove"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default RecipientsListPage;
