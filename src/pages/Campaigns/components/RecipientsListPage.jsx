// ✅ File: src/pages/Campaigns/RecipientsListPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

function RecipientsListPage() {
  const { id } = useParams(); // campaignId
  const navigate = useNavigate();

  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState(new Set());

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/campaign/recipients/${id}`);
      setRecipients(res.data || []);
    } catch (err) {
      console.error("❌ Load recipients failed:", err);
      toast.error("Failed to load assigned recipients");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const filtered = useMemo(() => {
    let list = recipients;
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        r =>
          r.name?.toLowerCase().includes(needle) ||
          r.phoneNumber?.toLowerCase?.().includes(needle) ||
          r.email?.toLowerCase?.().includes(needle)
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "phone")
        return (a.phoneNumber || "").localeCompare(b.phoneNumber || "");
      if (sort === "source")
        return (a.leadSource || "").localeCompare(b.leadSource || "");
      return 0;
    });
    return list;
  }, [recipients, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q, sort]);

  const allChecked =
    pageData.length > 0 && pageData.every(r => selected.has(r.id));
  const indeterminate = !allChecked && pageData.some(r => selected.has(r.id));

  const toggleAll = checked => {
    setSelected(prev => {
      const copy = new Set(prev);
      pageData.forEach(r => (checked ? copy.add(r.id) : copy.delete(r.id)));
      return copy;
    });
  };
  const toggleOne = (checked, id) => {
    setSelected(prev => {
      const copy = new Set(prev);
      if (checked) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const handleRemove = async contactId => {
    if (!window.confirm("Remove this contact from the campaign?")) return;
    setRemovingId(contactId);
    try {
      await axiosClient.delete(`/campaigns/${id}/recipients/${contactId}`);
      setRecipients(prev => prev.filter(r => r.id !== contactId));
      setSelected(prev => {
        const copy = new Set(prev);
        copy.delete(contactId);
        return copy;
      });
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    } finally {
      setRemovingId(null);
    }
  };

  const handleBulkRemove = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Remove ${selected.size} selected contact(s)?`)) return;
    try {
      await Promise.all(
        [...selected].map(cid =>
          axiosClient.delete(`/campaigns/${id}/recipients/${cid}`)
        )
      );
      setRecipients(prev => prev.filter(r => !selected.has(r.id)));
      setSelected(new Set());
      toast.success("Selected contacts removed");
    } catch {
      toast.error("Failed to remove some contacts");
    }
  };

  const handleExport = () => {
    const rows = [
      ["Name", "Phone", "Email", "Lead Source"],
      ...filtered.map(r => [
        r.name || "",
        r.phoneNumber || "",
        r.email || "",
        r.leadSource || "",
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Campaign-${id}-Recipients.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Page Header */}
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
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-64 rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
          />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
          >
            <option value="name">Sort: Name</option>
            <option value="phone">Sort: Phone</option>
            <option value="source">Sort: Lead Source</option>
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
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Assign Contacts
          </button>
          <button
            disabled={selected.size === 0}
            onClick={handleBulkRemove}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              selected.size === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            Remove Selected
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="p-6 grid gap-3 animate-pulse">
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
            <table className="w-full text-sm table-fixed">
              {/* Fix column widths so header & rows align perfectly */}
              <colgroup>
                <col style={{ width: 44 }} /> {/* checkbox */}
                <col style={{ width: 64 }} /> {/* # */}
                <col /> {/* Name (flex) */}
                <col style={{ width: 160 }} /> {/* Phone */}
                <col style={{ width: 220 }} /> {/* Email */}
                <col style={{ width: 160 }} /> {/* Lead Source */}
                <col style={{ width: 160 }} /> {/* Actions */}
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
                  <th className="px-3 py-2 align-middle">Email</th>
                  <th className="px-3 py-2 align-middle">Lead Source</th>
                  <th className="px-3 py-2 align-middle text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pageData.map((c, idx) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={e => toggleOne(e.target.checked, c.id)}
                      />
                    </td>

                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      {(page - 1) * pageSize + idx + 1}
                    </td>

                    {/* Truncate long text so it doesn't push columns */}
                    <td className="px-3 py-2 align-middle">
                      <div className="truncate">{c.name || "—"}</div>
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      {c.phoneNumber || "—"}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="truncate">{c.email || "—"}</div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="truncate">{c.leadSource || "—"}</div>
                    </td>

                    <td className="px-3 py-2 align-middle text-right">
                      <button
                        onClick={() => handleRemove(c.id)}
                        disabled={removingId === c.id}
                        className={`rounded px-2 py-1 text-xs ${
                          removingId === c.id
                            ? "bg-red-200 text-red-700 cursor-not-allowed"
                            : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {removingId === c.id ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              ← Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default RecipientsListPage;

// // ✅ File: src/pages/Campaigns/RecipientsListPage.jsx
// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axiosClient from "../../../api/axiosClient";
// import { toast } from "react-toastify";

// function RecipientsListPage() {
//   const { id } = useParams(); // campaignId
//   const navigate = useNavigate();

//   const [recipients, setRecipients] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [removingId, setRemovingId] = useState(null);

//   // 🔁 Load recipients on mount
//   useEffect(() => {
//     const fetchRecipients = async () => {
//       try {
//         const res = await axiosClient.get(`/campaign/recipients/${id}`);
//         setRecipients(res.data || []);
//       } catch (err) {
//         console.error("❌ Failed to load recipients:", err);
//         toast.error("Failed to load assigned recipients");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchRecipients();
//   }, [id]);

//   // ❌ Handle contact removal
//   const handleRemove = async contactId => {
//     const confirm = window.confirm(
//       "Are you sure you want to remove this contact?"
//     );
//     if (!confirm) return;

//     setRemovingId(contactId);
//     try {
//       await axiosClient.delete(`/campaigns/${id}/recipients/${contactId}`);
//       setRecipients(prev => prev.filter(r => r.id !== contactId));
//       toast.success("Contact removed successfully");
//     } catch (err) {
//       console.error("❌ Remove contact failed:", err);
//       toast.error("Failed to remove contact");
//     } finally {
//       setRemovingId(null);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-xl">
//       {/* 🔙 Back button */}
//       <button
//         onClick={() => navigate("/app/campaigns/template-campaigns-list")}
//         className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-purple-100 text-purple-700 font-medium shadow-sm hover:bg-purple-50 hover:text-purple-900 transition-all group"
//       >
//         {/* Left Arrow Icon (Lucide or Heroicons, inline SVG for copy-paste) */}
//         <svg
//           className="w-5 h-5 text-purple-500 group-hover:text-purple-700 transition"
//           fill="none"
//           stroke="currentColor"
//           strokeWidth={2.5}
//           viewBox="0 0 24 24"
//           aria-hidden="true"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             d="M15.25 19l-7-7 7-7"
//           />
//         </svg>
//         <span>Back</span>
//       </button>

//       <h2 className="text-2xl font-bold text-purple-700 mb-4">
//         📋 Assigned Recipients
//       </h2>

//       {loading ? (
//         <p>Loading...</p>
//       ) : recipients.length === 0 ? (
//         <div className="text-gray-500">
//           <p>No contacts have been assigned to this campaign.</p>
//           <button
//             onClick={() =>
//               navigate(`/app/campaigns/image-campaigns/assign-contacts/${id}`)
//             }
//             className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
//           >
//             ➕ Assign Contacts
//           </button>
//         </div>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="min-w-full border border-gray-200 text-sm">
//             <thead>
//               <tr className="bg-gray-100 text-left">
//                 <th className="p-2">#</th>
//                 <th className="p-2">Name</th>
//                 <th className="p-2">Phone</th>
//                 <th className="p-2">Email</th>
//                 <th className="p-2">Lead Source</th>
//                 <th className="p-2 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {recipients.map((contact, idx) => (
//                 <tr
//                   key={contact.id}
//                   className={`border-t ${
//                     idx % 2 === 0 ? "bg-white" : "bg-gray-50"
//                   }`}
//                 >
//                   <td className="p-2">{idx + 1}</td>
//                   <td className="p-2">{contact.name}</td>
//                   <td className="p-2">{contact.phoneNumber}</td>
//                   <td className="p-2">{contact.email || "-"}</td>
//                   <td className="p-2">{contact.leadSource || "-"}</td>
//                   <td className="p-2 text-right">
//                     <button
//                       onClick={() => handleRemove(contact.id)}
//                       disabled={removingId === contact.id}
//                       className={`text-red-600 hover:underline ${
//                         removingId === contact.id
//                           ? "opacity-50 cursor-not-allowed"
//                           : ""
//                       }`}
//                     >
//                       {removingId === contact.id ? "Removing..." : "❌ Remove"}
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }

// export default RecipientsListPage;

// // ✅ File: src/pages/Campaigns/RecipientsListPage.jsx
// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axiosClient from "../../../api/axiosClient";
// import { toast } from "react-toastify";

// function RecipientsListPage() {
//   const { id } = useParams(); // campaignId
//   const navigate = useNavigate();

//   const [recipients, setRecipients] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [removingId, setRemovingId] = useState(null);

//   // 🔁 Load recipients on mount
//   useEffect(() => {
//     const fetchRecipients = async () => {
//       try {
//         const res = await axiosClient.get(`/campaign/recipients/${id}`);
//         setRecipients(res.data || []);
//       } catch (err) {
//         console.error("❌ Failed to load recipients:", err);
//         toast.error("Failed to load assigned recipients");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchRecipients();
//   }, [id]);

//   // ❌ Handle contact removal
//   const handleRemove = async contactId => {
//     const confirm = window.confirm(
//       "Are you sure you want to remove this contact?"
//     );
//     if (!confirm) return;

//     setRemovingId(contactId);
//     try {
//       await axiosClient.delete(`/campaigns/${id}/recipients/${contactId}`);
//       setRecipients(prev => prev.filter(r => r.id !== contactId));
//       toast.success("Contact removed successfully");
//     } catch (err) {
//       console.error("❌ Remove contact failed:", err);
//       toast.error("Failed to remove contact");
//     } finally {
//       setRemovingId(null);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-xl">
//       {/* 🔙 Back button */}
//       <button
//         onClick={() => navigate("/app/campaigns/image-campaign-list")}
//         className="text-sm text-purple-600 hover:underline mb-4"
//       >
//         ← Back to Campaigns
//       </button>

//       <h2 className="text-2xl font-bold text-purple-700 mb-4">
//         📋 Assigned Recipients
//       </h2>

//       {loading ? (
//         <p>Loading...</p>
//       ) : recipients.length === 0 ? (
//         <div className="text-gray-500">
//           <p>No contacts have been assigned to this campaign.</p>
//           <button
//             onClick={() =>
//               navigate(`/app/campaigns/image-campaigns/assign-contacts/${id}`)
//             }
//             className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
//           >
//             ➕ Assign Contacts
//           </button>
//         </div>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="min-w-full border border-gray-200 text-sm">
//             <thead>
//               <tr className="bg-gray-100 text-left">
//                 <th className="p-2">#</th>
//                 <th className="p-2">Name</th>
//                 <th className="p-2">Phone</th>
//                 <th className="p-2">Email</th>
//                 <th className="p-2">Lead Source</th>
//                 <th className="p-2 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {recipients.map((contact, idx) => (
//                 <tr
//                   key={contact.id}
//                   className={`border-t ${
//                     idx % 2 === 0 ? "bg-white" : "bg-gray-50"
//                   }`}
//                 >
//                   <td className="p-2">{idx + 1}</td>
//                   <td className="p-2">{contact.name}</td>
//                   <td className="p-2">{contact.phoneNumber}</td>
//                   <td className="p-2">{contact.email || "-"}</td>
//                   <td className="p-2">{contact.leadSource || "-"}</td>
//                   <td className="p-2 text-right">
//                     <button
//                       onClick={() => handleRemove(contact.id)}
//                       disabled={removingId === contact.id}
//                       className={`text-red-600 hover:underline ${
//                         removingId === contact.id
//                           ? "opacity-50 cursor-not-allowed"
//                           : ""
//                       }`}
//                     >
//                       {removingId === contact.id ? "Removing..." : "❌ Remove"}
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }

// export default RecipientsListPage;
