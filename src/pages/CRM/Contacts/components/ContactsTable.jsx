import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MoreVertical } from "lucide-react";

import axiosClient from "../../../../api/axiosClient";
import { Checkbox } from "./checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./dropdown-menu";
import ContactTagModal from "./ContactTagModal";

function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join(" ")
    .toUpperCase();
}

function getContactTags(contact) {
  return (
    contact.tags ||
    contact.contactTags ||
    contact.tagSummaries ||
    contact.tagList ||
    []
  );
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dateRangeMatch(value, fromValue, toValue) {
  const d = parseDate(value);
  if (!d) return true;
  const from = parseDate(fromValue);
  const to = parseDate(toValue);
  if (from && d < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

function matchesSearch(contact, q) {
  const term = (q || "").trim().toLowerCase();
  if (!term) return true;
  const name = String(contact?.name || "").toLowerCase();
  const email = String(contact?.email || "").toLowerCase();
  const phone = String(contact?.phoneNumber || "").toLowerCase();
  return name.includes(term) || email.includes(term) || phone.includes(term);
}

function coerceBool(value) {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const s = value.toLowerCase();
    if (s === "true" || s === "yes") return true;
    if (s === "false" || s === "no") return false;
  }
  return null;
}

function matchesStatus(contact, filters) {
  const optedInFilter = filters?.optedIn;
  if (optedInFilter === "yes" || optedInFilter === "no") {
    const contactValue =
      contact?.optedIn ?? contact?.isOptedIn ?? contact?.isOptIn;
    const b = coerceBool(contactValue);
    if (b !== null && b !== (optedInFilter === "yes")) return false;
  }

  const blockedFilter = filters?.incomingBlocked;
  if (blockedFilter === "yes" || blockedFilter === "no") {
    const contactValue =
      contact?.incomingBlocked ??
      contact?.isIncomingBlocked ??
      contact?.isBlocked;
    const b = coerceBool(contactValue);
    if (b !== null && b !== (blockedFilter === "yes")) return false;
  }

  return true;
}

function matchesTagsClientSide(contact, filters) {
  const filterTagIds = Array.isArray(filters?.tagIds)
    ? filters.tagIds.map(String).filter(Boolean)
    : [];
  if (filterTagIds.length === 0) return true;

  const tags = getContactTags(contact);
  const contactIds = new Set(
    (Array.isArray(tags) ? tags : [])
      .map(t => String(t?.id ?? t?.tagId))
      .filter(Boolean)
  );

  if (filters?.tagMatch === "all") {
    return filterTagIds.every(id => contactIds.has(id));
  }
  return filterTagIds.some(id => contactIds.has(id));
}

function applyLocalFilters(list, { searchTerm, filters }) {
  const all = Array.isArray(list) ? list : [];

  return all.filter(contact => {
    const createdAt = contact?.createdAt ?? contact?.created_at;
    const lastSeenAt =
      contact?.lastSeenAt ?? contact?.last_seen_at ?? contact?.lastSeen;

    return (
      matchesSearch(contact, searchTerm) &&
      dateRangeMatch(createdAt, filters?.createdFrom, filters?.createdTo) &&
      dateRangeMatch(lastSeenAt, filters?.lastSeenFrom, filters?.lastSeenTo) &&
      matchesStatus(contact, filters) &&
      matchesTagsClientSide(contact, filters)
    );
  });
}

export default function ContactsTable({
  onEdit,
  refreshTrigger,
  activeTab,
  onSelectionChange,
  selectedIds = [],
  searchTerm,
  filters,
  currentPage,
  setCurrentPage,
}) {
  const [contacts, setContacts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagModalMode, setTagModalMode] = useState("add");
  const [tagModalContact, setTagModalContact] = useState(null);
  const clientSideFetchLimit = 1000;
  const navigate = useNavigate();

  const fetchContacts = useCallback(async () => {
    try {
      const effectiveFilters = filters || {};
      const filterTagIds = Array.isArray(effectiveFilters.tagIds)
        ? effectiveFilters.tagIds.map(String).filter(Boolean)
        : [];

      // When tag filtering is requested, prefer the existing POST endpoint.
      if (filterTagIds.length > 0) {
        const res = await axiosClient.post("/contacts/filter-by-tags", filterTagIds);
        const payload = res.data?.data ?? res.data;
        const filtered = applyLocalFilters(payload, {
          searchTerm,
          filters: effectiveFilters,
        });

        const total = Math.max(1, Math.ceil(filtered.length / pageSize));
        const safePage = Math.min(Math.max(1, currentPage), total);
        if (safePage !== currentPage) setCurrentPage(safePage);

        const start = (safePage - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);

        setContacts(pageItems);
        setTotalPages(total);
        setTotalCount(filtered.length);
        return;
      }

      const hasAdvancedFilters =
        !!effectiveFilters.createdFrom ||
        !!effectiveFilters.createdTo ||
        !!effectiveFilters.lastSeenFrom ||
        !!effectiveFilters.lastSeenTo ||
        (Array.isArray(effectiveFilters.attributes) &&
          effectiveFilters.attributes.length > 0) ||
        effectiveFilters.optedIn === "yes" ||
        effectiveFilters.optedIn === "no" ||
        effectiveFilters.incomingBlocked === "yes" ||
        effectiveFilters.incomingBlocked === "no";

      // If filters are active but backend may not support them yet, fetch a larger slice
      // and apply filters client-side for a predictable UX.
      if (hasAdvancedFilters) {
        const advancedParams = {};
        if (effectiveFilters.createdFrom)
          advancedParams.createdFrom = effectiveFilters.createdFrom;
        if (effectiveFilters.createdTo)
          advancedParams.createdTo = effectiveFilters.createdTo;
        if (effectiveFilters.lastSeenFrom)
          advancedParams.lastSeenFrom = effectiveFilters.lastSeenFrom;
        if (effectiveFilters.lastSeenTo)
          advancedParams.lastSeenTo = effectiveFilters.lastSeenTo;
        if (effectiveFilters.tagMatch)
          advancedParams.tagMatch = effectiveFilters.tagMatch;
        if (
          Array.isArray(effectiveFilters.attributes) &&
          effectiveFilters.attributes.length > 0
        ) {
          advancedParams.attributes = JSON.stringify(effectiveFilters.attributes);
        }
        if (effectiveFilters.optedIn === "yes") advancedParams.optedIn = true;
        if (effectiveFilters.optedIn === "no") advancedParams.optedIn = false;
        if (effectiveFilters.incomingBlocked === "yes")
          advancedParams.incomingBlocked = true;
        if (effectiveFilters.incomingBlocked === "no")
          advancedParams.incomingBlocked = false;

        const res = await axiosClient.get("/contacts/", {
          params: {
            tab: activeTab,
            search: searchTerm,
            page: 1,
            pageSize: clientSideFetchLimit,
            ...advancedParams,
          },
        });

        const result = res.data?.data ?? res.data;
        const items = Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result?.Items)
          ? result.Items
          : Array.isArray(result)
          ? result
          : [];

        const filtered = applyLocalFilters(items, {
          searchTerm,
          filters: effectiveFilters,
        });
        const total = Math.max(1, Math.ceil(filtered.length / pageSize));
        const safePage = Math.min(Math.max(1, currentPage), total);
        if (safePage !== currentPage) setCurrentPage(safePage);

        const start = (safePage - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);

        setContacts(pageItems);
        setTotalPages(total);
        setTotalCount(filtered.length);
        return;
      }

      const params = {
        tab: activeTab,
        search: searchTerm,
        page: currentPage,
        pageSize,
      };

      if (effectiveFilters.createdFrom) params.createdFrom = effectiveFilters.createdFrom;
      if (effectiveFilters.createdTo) params.createdTo = effectiveFilters.createdTo;
      if (effectiveFilters.lastSeenFrom) params.lastSeenFrom = effectiveFilters.lastSeenFrom;
      if (effectiveFilters.lastSeenTo) params.lastSeenTo = effectiveFilters.lastSeenTo;
      if (effectiveFilters.tagMatch) params.tagMatch = effectiveFilters.tagMatch;

      if (effectiveFilters.optedIn === "yes") params.optedIn = true;
      if (effectiveFilters.optedIn === "no") params.optedIn = false;
      if (effectiveFilters.incomingBlocked === "yes") params.incomingBlocked = true;
      if (effectiveFilters.incomingBlocked === "no") params.incomingBlocked = false;

      const res = await axiosClient.get("/contacts/", { params });

      const result = res.data?.data ?? res.data;
      const items = Array.isArray(result?.items)
        ? result.items
        : Array.isArray(result?.Items)
        ? result.Items
        : Array.isArray(result)
        ? result
        : [];

      setContacts(items);

      const totalCount =
        result?.totalCount ?? result?.TotalCount ?? items.length;
      const resolvedPageSize = result?.pageSize ?? result?.PageSize ?? pageSize;
      const totalFromPayload = result?.totalPages ?? result?.TotalPages;
      const total =
        typeof totalFromPayload === "number" && totalFromPayload > 0
          ? totalFromPayload
          : Math.max(1, Math.ceil(totalCount / resolvedPageSize));

      setTotalPages(total);
      setTotalCount(totalCount);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load contacts.";
      toast.error(message);
    }
  }, [
    activeTab,
    searchTerm,
    currentPage,
    pageSize,
    filters,
    setCurrentPage,
  ]);

  useEffect(() => {
    fetchContacts();
  }, [refreshTrigger, activeTab, searchTerm, currentPage, fetchContacts]);

  const handleSelectAll = checked => {
    const pageIds = contacts
      .map(c => c.id)
      .filter(id => id !== undefined && id !== null);

    if (checked) {
      const merged = Array.from(new Set([...selectedIds, ...pageIds]));
      onSelectionChange?.(merged);
      return;
    }

    const remaining = selectedIds.filter(id => !pageIds.includes(id));
    onSelectionChange?.(remaining);
  };

  const handleRowCheckbox = (checked, id) => {
    const updated = checked
      ? selectedIds.includes(id)
        ? selectedIds
        : [...selectedIds, id]
      : selectedIds.filter(i => i !== id);
    onSelectionChange?.(updated);
  };

  const handleDelete = async id => {
    if (!window.confirm("Are you sure you want to delete this contact?"))
      return;
    try {
      await axiosClient.delete(`/contacts/${id}`);
      toast.success("Contact deleted.");
      fetchContacts();
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to delete contact.";
      toast.error(message);
    }
  };

  const openTagModal = (mode, contact) => {
    setTagModalMode(mode);
    setTagModalContact(contact);
    setTagModalOpen(true);
  };

  const closeTagModal = () => {
    setTagModalOpen(false);
    setTagModalContact(null);
  };

  const rowPadding = "py-2";
  const nameGap = "gap-2";
  const avatarSize = "h-7 w-7 text-[10px]";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-slate-900">
        <thead className="bg-slate-50">
          <tr>
            <th className={`px-4 ${rowPadding} text-center w-6 border-b border-slate-200`}>
              <Checkbox
                checked={
                  contacts.length > 0 &&
                  contacts.every(c => selectedIds.includes(c.id))
                }
                onCheckedChange={handleSelectAll}
                className="w-4 h-4"
              />
            </th>
            <th className={`px-4 ${rowPadding} text-left border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-700`}>
              Name
            </th>
            <th className={`px-4 ${rowPadding} text-left border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-700`}>
              Phone
            </th>
            <th className={`px-4 ${rowPadding} text-left border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden md:table-cell`}>
              Email
            </th>
            <th className={`px-4 ${rowPadding} text-left border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden lg:table-cell`}>
              Tags
            </th>
            <th className={`px-4 ${rowPadding} text-left border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden lg:table-cell`}>
              Created
            </th>
            <th className={`px-4 ${rowPadding} text-center w-8 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-700`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {contacts.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-6 py-12 text-center text-slate-600"
              >
                <p className="text-sm font-semibold text-slate-900">
                  No contacts found
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Try a different search or add a new contact.
                </p>
              </td>
            </tr>
          ) : (
            contacts.map((contact, idx) => (
              <tr key={contact.id} className={`hover:bg-emerald-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                <td className={`px-4 ${rowPadding} text-center align-middle`}>
                  <Checkbox
                    checked={selectedIds.includes(contact.id)}
                    onCheckedChange={checked =>
                      handleRowCheckbox(checked, contact.id)
                    }
                    className="w-4 h-4"
                  />
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <span className="font-semibold truncate text-sm text-slate-900">
                    {contact.name || "Unnamed contact"}
                  </span>
                </td>

                <td className={`px-4 ${rowPadding} truncate text-sm font-medium text-slate-800`}>
                  {contact.phoneNumber || "-"}
                </td>
                <td className={`px-4 ${rowPadding} hidden md:table-cell truncate text-sm text-slate-800`}>
                  {contact.email || "-"}
                </td>
                <td className={`px-4 ${rowPadding} hidden lg:table-cell`}>
                  {getContactTags(contact).length === 0 ? (
                    <span className="text-xs text-slate-400">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {getContactTags(contact)
                        .slice(0, 2)
                        .map(tag => {
                          const key = tag.id || tag.tagId || tag.name;
                          const label = tag.name || tag.label || tag.tagName;
                          return (
                            <span
                              key={key}
                              className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                            >
                              {label}
                            </span>
                          );
                        })}
                      {getContactTags(contact).length > 2 && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                          +{getContactTags(contact).length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className={`px-4 ${rowPadding} hidden lg:table-cell truncate text-sm text-slate-800`}>
                  {contact.createdAt
                    ? new Date(contact.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className={`px-4 ${rowPadding} text-center`}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-md hover:bg-slate-100 focus:outline-none">
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48">
                      <DropdownMenuItem
                        onClick={() => onEdit(contact)}
                        className="px-3 py-2"
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openTagModal("add", contact)}
                        className="px-3 py-2"
                      >
                        Add tag
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openTagModal("remove", contact)}
                        className="px-3 py-2"
                      >
                        Remove tag
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(contact.id)}
                        className="px-3 py-2 text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(`/dashboard/contacts/${contact.id}/notes`)
                        }
                        className="px-3 py-2"
                      >
                        Notes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ContactTagModal
        isOpen={tagModalOpen}
        mode={tagModalMode}
        contact={tagModalContact}
        onClose={closeTagModal}
        onUpdated={fetchContacts}
      />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-4 text-sm text-slate-600 bg-slate-50/50 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-slate-700">
            {totalCount > 0 ? (
              <>
                Showing{' '}
                <span className="font-semibold text-emerald-700">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)}
                </span>
                {' '}of{' '}
                <span className="font-semibold text-slate-900">{totalCount}</span>
                {' '}contacts
              </>
            ) : (
              'No contacts'
            )}
          </span>
          <span className="hidden sm:inline text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs font-medium border border-slate-300 rounded-md px-2 py-1.5 bg-white hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all cursor-pointer"
            >
              <option value={10}>10/page</option>
              <option value={20}>20/page</option>
              <option value={50}>50/page</option>
              <option value={100}>100/page</option>
            </select>
          </div>
          
          {/* Pagination buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-300 transition-colors text-xs font-medium"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-300 transition-colors text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
