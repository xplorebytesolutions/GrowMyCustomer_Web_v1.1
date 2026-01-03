// 📄 src/pages/campaigns/AssignContactsPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import Papa from "papaparse";
import Modal from "react-modal";
import TagFilterDropdown from "./components/TagFilterDropdown";

// CSV campaign flow (schema → upload → map → validate → dry-run → commit)
import CsvAudienceSection from "./components/CsvAudienceSection";
import { fetchCsvSchema } from "./api/csvApi";
// function shortId(id = "") {
//   return id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
// }

// function CampaignHeader({ campaign }) {
//   if (!campaign) {
//     return (
//       <header className="mb-6 rounded-xl border bg-white shadow-sm">
//         <div className="px-4 py-4">
//           <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
//           <div className="mt-2 h-6 w-48 animate-pulse rounded bg-gray-200" />
//           <div className="mt-2 h-3 w-72 animate-pulse rounded bg-gray-200" />
//         </div>
//       </header>
//     );
//   }

//   const name =
//     campaign.name || campaign.campaignName || campaign.title || "(unnamed)";
//   const id = campaign.id || campaign.campaignId || "";

//   const copyId = async () => {
//     try {
//       if (!id) return;
//       await navigator.clipboard.writeText(id);
//       toast.success("Campaign ID copied");
//     } catch {
//       toast.error("Could not copy Campaign ID");
//     }
//   };

//   return (
//     <header className="mb-6 rounded-xl border bg-white shadow-sm">
//       <div className="px-4 py-4">
//         {/* Eyebrow */}
//         <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
//           Campaign
//         </div>

//         {/* Title row */}
//         <div className="mt-0.5 flex items-center justify-between gap-3">
//           <h1 className="truncate text-xl font-semibold text-gray-900">
//             {name}
//           </h1>
//           {id ? (
//             <button
//               onClick={copyId}
//               className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
//               aria-label="Copy campaign ID"
//               title="Copy Campaign ID"
//             >
//               <svg
//                 viewBox="0 0 24 24"
//                 className="h-4 w-4"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeWidth="1.8"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <rect x="9" y="9" width="13" height="13" rx="2" />
//                 <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
//               </svg>
//               <span className="hidden sm:inline">Copy ID</span>
//               <span className="sm:hidden">Copy</span>
//             </button>
//           ) : null}
//         </div>

//         {/* Subtitle */}
//         <p className="mt-1 text-xs text-gray-500">
//           Assign recipients from CSV or include people from your CRM.
//         </p>

//         {/* Optional tiny ID chip (read-only) */}
//         {id ? (
//           <div className="mt-2 text-[11px] text-gray-500">
//             <span className="rounded-md bg-gray-100 px-2 py-0.5">
//               ID: {shortId(id)}
//             </span>
//           </div>
//         ) : null}
//       </div>
//     </header>
//   );
// }

// Template Perview
if (typeof document !== "undefined" && process.env.NODE_ENV !== "test") {
  Modal.setAppElement("#root");
}

export default function AssignContactsPage() {
  const { id: campaignId } = useParams();

  // ── Campaign + schema
  const [campaign, setCampaign] = useState(null);
  const [placeholderCount, setPlaceholderCount] = useState(0);

  // ── CRM panel state
  const [includeCRM, setIncludeCRM] = useState(false);

  // ── CRM contacts & UI
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // ── CSV → CRM quick-import modal
  const [showFieldMapModal, setShowFieldMapModal] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({ name: "", phone: "" });
  const [parsedCSV, setParsedCSV] = useState([]);
  const [importedCount, setImportedCount] = useState(0);
  const [saveToDb, setSaveToDb] = useState(true);
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const importedRef = useRef(null);

  const getPhone = c => c.phoneNumber || c.phone || "";

  // Load campaign + CSV schema
  useEffect(() => {
    (async () => {
      if (!campaignId) {
        toast.error("No campaign ID found in URL.");
        return;
      }
      try {
        const res = await axiosClient.get(`/campaign/${campaignId}`);
        setCampaign(res.data);
      } catch (err) {
        console.error("Failed to load campaign:", err);
        toast.error("Failed to load campaign");
      }

      try {
        const sc = await fetchCsvSchema(campaignId);
        const n = Number(sc?.placeholderCount ?? 0);
        setPlaceholderCount(Number.isNaN(n) ? 0 : n);
      } catch {
        setPlaceholderCount(0);
      }
    })();
  }, [campaignId]);

  // Load tags when CRM panel is enabled
  useEffect(() => {
    if (!includeCRM) return;
    (async () => {
      try {
        const res = await axiosClient.get("/tags/get-tags");
        setAllTags(res.data?.data || res.data || []);
      } catch {
        toast.error("Failed to load tags");
      }
    })();
  }, [includeCRM]);

  // Load CRM contacts (only when panel enabled)
  useEffect(() => {
    if (!includeCRM) {
      setContacts([]);
      setFilteredContacts([]);
      setSelectedIds([]);
      return;
    }
    (async () => {
      try {
        let res;
        if (tags.length > 0) {
          res = await axiosClient.post("/contacts/filter-by-tags", tags);
          setContacts(res.data?.data || []);
        } else {
          res = await axiosClient.get("/contacts", {
            params: { tab: "all", page: 1, pageSize: 1000 },
          });
          setContacts(res.data?.data?.items || []);
        }
      } catch {
        toast.error("Failed to load contacts");
      }
    })();
  }, [includeCRM, tags]);

  // Local search filter for CRM list
  useEffect(() => {
    if (!includeCRM) return;
    const q = search.trim().toLowerCase();
    const result = contacts.filter(
      c =>
        c.name?.toLowerCase().includes(q) || getPhone(c).includes(search.trim())
    );
    setFilteredContacts(result);
  }, [includeCRM, contacts, search]);

  // CSV → quick import into CRM list
  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const headers = Object.keys(data[0] || {});
        setParsedCSV(data);
        setCsvHeaders(headers);
        setShowFieldMapModal(true);
      },
      error: () => toast.error("CSV Parsing Failed"),
    });
  };

  useEffect(() => {
    if (csvHeaders.length > 0) {
      const suggestions = {
        name: ["name", "full name", "contact name"],
        phone: ["phone", "mobile", "number", "whatsapp"],
      };
      const best = opts =>
        csvHeaders.find(h =>
          opts.some(o => h.toLowerCase().includes(o.toLowerCase()))
        ) || "";
      setFieldMapping({
        name: best(suggestions.name),
        phone: best(suggestions.phone),
      });
    }
  }, [csvHeaders]);

  const applyFieldMapping = async () => {
    const mapped = parsedCSV
      .filter(row => row[fieldMapping.name] && row[fieldMapping.phone])
      .map(row => ({
        id: crypto.randomUUID(),
        name: row[fieldMapping.name],
        phone: row[fieldMapping.phone],
        tags: selectedTagId
          ? [
              {
                tagId: selectedTagId,
                tagName: allTags.find(t => t.id === selectedTagId)?.name || "",
              },
            ]
          : [],
      }));

    setContacts(prev => [...prev, ...mapped]);
    setSelectedIds(prev => [...new Set([...prev, ...mapped.map(c => c.id)])]);
    setImportedCount(mapped.length);
    setShowFieldMapModal(false);
    toast.success(`${mapped.length} contacts imported.`);

    setTimeout(
      () => importedRef.current?.scrollIntoView({ behavior: "smooth" }),
      200
    );

    if (saveToDb) {
      try {
        setIsImporting(true);
        await axiosClient.post("/contacts/bulk-import", mapped);
        toast.success("Contacts also saved to your CRM.");
      } catch {
        toast.error("Saving to CRM failed.");
      } finally {
        setIsImporting(false);
      }
    }
  };

  // Selection helpers
  const toggleContact = id =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () => {
    const filteredIds = filteredContacts.map(c => c.id);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev =>
      allSelected
        ? prev.filter(id => !filteredIds.includes(id))
        : [...new Set([...prev, ...filteredIds])]
    );
  };

  const allVisibleSelected =
    includeCRM && filteredContacts.every(c => selectedIds.includes(c.id));

  // Assign selected CRM contacts
  const assignContacts = async () => {
    if (!campaign || !campaign.id) {
      toast.error("Campaign not ready. Please try again.");
      return;
    }
    if (!includeCRM) {
      toast.warn("Enable 'Include contacts from CRM' to select contacts here.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.warn("Please select at least one contact");
      return;
    }
    const validIds = selectedIds.filter(id =>
      contacts.find(c => c.id === id && getPhone(c).trim() !== "")
    );
    if (validIds.length === 0) {
      toast.warn("No selected contacts have valid phone numbers.");
      return;
    }
    try {
      const payload = { contactIds: validIds };
      await axiosClient.post(
        `/campaign/${campaign.id}/assign-contacts`,
        payload
      );
      toast.success("Contacts assigned to campaign");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Something went wrong during assignment.";
      toast.error(msg);
    }
  };

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Title */}
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-emerald-700">
        📇 Assign Contacts
      </h1>

      {/* Campaign meta */}
      {campaign ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            <strong className="font-semibold">Campaign:</strong>
            <span>
              {campaign.name ||
                campaign.campaignName ||
                campaign.title ||
                "(unnamed campaign)"}
            </span>
          </span>
          {/* {campaign.templateName || campaign.messageTemplate ? ( */}
          {/* <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700"> */}
          {/* <strong className="font-semibold">Template:</strong> */}
          {/* <span>{campaign.templateName || campaign.messageTemplate}</span> */}
          {/* </span> */}
          {/* ) : null} */}

        </div>
      ) : (
        <div className="mb-6 text-xs text-gray-500">Loading campaign…</div>
      )}

      {/* 1) CSV Audience (always visible, first) */}
      {campaignId && (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-800">
            Bulk Personalization via CSV
            {placeholderCount > 0 && (
              <>
                {" "}
                (Template has {placeholderCount} dynamic field
                {placeholderCount > 1 ? "s" : ""})
              </>
            )}
          </h2>
          <CsvAudienceSection campaignId={campaignId} campaign={campaign} />
        </section>
      )}

      <div className="my-6 h-px bg-gray-100" />
      {/* 2) Optional CRM Panel (collapsed by default) */}
      <section className="rounded-xl border bg-white shadow-sm">
        {/* Header / Toggle */}
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <input
              id="includeCRM"
              type="checkbox"
              className="mt-1"
              checked={includeCRM}
              onChange={e => setIncludeCRM(e.target.checked)}
              aria-controls="crm-panel"
              aria-expanded={includeCRM}
            />
            <div>
              <label
                htmlFor="includeCRM"
                className="block cursor-pointer text-sm font-semibold text-gray-800"
              >
                Include contacts from CRM
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Search, filter by tags, quick-import to CRM, and assign selected
                contacts.
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Manual assignment is additive to any CSV audience above.
          </div>
        </div>

        {/* Collapsible body */}
        <div
          id="crm-panel"
          className={`grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-in-out ${
            includeCRM ? "grid-rows-[1fr]" : ""
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t p-4">
              {/* Controls */}
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <input
                  className="w-full rounded-md border p-2 sm:w-1/3"
                  type="text"
                  placeholder="Search by name or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <TagFilterDropdown
                  selectedTags={tags}
                  onChange={setTags}
                  category="All"
                />
                <label className="text-sm text-emerald-700 hover:underline sm:ml-auto">
                  + Upload CSV to CRM
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Table */}
              <div
                className="overflow-x-auto rounded-xl border"
                ref={importedRef}
              >
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Phone</th>
                      <th className="px-4 py-2 text-left">Tags</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(c => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleContact(c.id)}
                          />
                        </td>
                        <td className="px-4 py-2">{c.name || "Unnamed"}</td>
                        <td className="px-4 py-2">{getPhone(c) || "—"}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags || c.contactTags || []).map(t => (
                              <span
                                key={t.tagId || t.id}
                                className="rounded-full px-2 py-0.5 text-xs"
                                style={{
                                  backgroundColor: t.colorHex || "#E5E7EB",
                                  color: "#000",
                                }}
                              >
                                {t.tagName || t.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {getPhone(c).trim() !== ""
                            ? "✅ Valid"
                            : "⚠️ No Phone"}
                        </td>
                      </tr>
                    ))}
                    {filteredContacts.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-xs text-gray-500"
                        >
                          {tags.length > 0
                            ? "No contacts match the selected tags."
                            : "No contacts to show."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer + Assign button (INSIDE the panel) */}
              <div className="mt-4 flex flex-col items-center justify-between text-sm text-gray-600 sm:flex-row">
                <div>
                  Selected: {selectedIds.length} / WhatsApp-ready:{" "}
                  {
                    filteredContacts.filter(
                      c =>
                        selectedIds.includes(c.id) && getPhone(c).trim() !== ""
                    ).length
                  }
                </div>
                {importedCount > 0 && (
                  <div className="text-green-600">
                    ✔ Imported: {importedCount} contact(s)
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={assignContacts}
                  className="rounded-lg bg-emerald-600 px-6 py-3 text-white transition hover:bg-emerald-700"
                >
                  Assign Selected Contacts to Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CSV → CRM mapping modal */}
      <Modal
        isOpen={showFieldMapModal}
        onRequestClose={() => setShowFieldMapModal(false)}
        className="mx-auto mt-20 max-w-xl rounded-lg bg-white p-6 shadow-lg"
        overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      >
        <h2 className="mb-4 text-lg font-bold">🧩 Map CSV Fields</h2>
        <div className="space-y-4">
          {["name", "phone"].map(field => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium capitalize">
                {field}
              </label>
              <select
                className="w-full rounded border px-3 py-2"
                value={fieldMapping[field]}
                onChange={e =>
                  setFieldMapping(prev => ({
                    ...prev,
                    [field]: e.target.value,
                  }))
                }
              >
                <option value="">-- Select CSV column --</option>
                {csvHeaders.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Apply Tag to All
            </label>
            <select
              className="w-full rounded border px-3 py-2"
              value={selectedTagId || ""}
              onChange={e => setSelectedTagId(e.target.value)}
            >
              <option value="">-- None --</option>
              {Array.isArray(allTags) &&
                allTags.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="inline-flex items-center text-sm">
            <input
              type="checkbox"
              className="mr-2"
              checked={saveToDb}
              onChange={e => setSaveToDb(e.target.checked)}
            />
            Also save these contacts to your CRM
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="text-gray-600 hover:underline"
            onClick={() => setShowFieldMapModal(false)}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-emerald-700"
            onClick={applyFieldMapping}
            disabled={isImporting}
          >
            {isImporting ? "Importing…" : "Import & Apply"}
          </button>
        </div>
      </Modal>
      </div>
    </div>
  );
}

// import React, { useEffect, useRef, useState } from "react";
// import { useParams } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import Papa from "papaparse";
// import Modal from "react-modal";
// import TagFilterDropdown from "./components/TagFilterDropdown";

// // CSV campaign flow (schema → upload → map → validate → dry-run → commit)
// import CsvAudienceSection from "./components/CsvAudienceSection";
// import { fetchCsvSchema } from "./api/csvApi";

// if (typeof document !== "undefined" && process.env.NODE_ENV !== "test") {
//   Modal.setAppElement("#root");
// }

// export default function AssignContactsPage() {
//   const { id: campaignId } = useParams();
//   const [contacts, setContacts] = useState([]);
//   const [filteredContacts, setFilteredContacts] = useState([]);
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [search, setSearch] = useState("");
//   const [tags, setTags] = useState([]);
//   const [campaign, setCampaign] = useState(null);

//   const [showFieldMapModal, setShowFieldMapModal] = useState(false);
//   const [csvHeaders, setCsvHeaders] = useState([]);
//   const [fieldMapping, setFieldMapping] = useState({ name: "", phone: "" });
//   const [parsedCSV, setParsedCSV] = useState([]);
//   const [importedCount, setImportedCount] = useState(0);
//   const [saveToDb, setSaveToDb] = useState(true);
//   const [selectedTagId, setSelectedTagId] = useState(null);
//   const [allTags, setAllTags] = useState([]);

//   // was mistakenly `[setIsImporting] = useState(false)` before
//   const [isImporting, setIsImporting] = useState(false);

//   // we still fetch placeholder count to adapt helper text, but UI shows regardless
//   const [placeholderCount, setPlaceholderCount] = useState(0);

//   const importedRef = useRef(null);

//   // Helper for consistent phone extraction
//   function getPhone(contact) {
//     return contact.phoneNumber || contact.phone || "";
//   }

//   useEffect(() => {
//     loadCampaign();
//     fetchAllTags();
//     // eslint-disable-next-line
//   }, [campaignId]);

//   useEffect(() => {
//     loadContacts();
//     // eslint-disable-next-line
//   }, [tags]);

//   useEffect(() => {
//     applySearchFilter();
//     // eslint-disable-next-line
//   }, [contacts, search]);

//   const loadCampaign = async () => {
//     if (!campaignId) {
//       toast.error("No campaign ID found in URL.");
//       return;
//     }
//     try {
//       const res = await axiosClient.get(`/campaign/${campaignId}`);
//       setCampaign(res.data);

//       // Fetch the CSV schema to know how many template params exist
//       try {
//         const sc = await fetchCsvSchema(campaignId); // { headers, placeholderCount, ... }
//         const n = Number(sc?.placeholderCount ?? 0);
//         setPlaceholderCount(isNaN(n) ? 0 : n);
//       } catch {
//         setPlaceholderCount(0);
//       }
//     } catch (err) {
//       console.error("Failed to load campaign:", err);
//       toast.error("Failed to load campaign");
//     }
//   };

//   const fetchAllTags = async () => {
//     try {
//       const res = await axiosClient.get("/tags/get-tags");
//       const tags = res.data?.data || res.data || [];
//       setAllTags(tags);
//     } catch {
//       toast.error("Failed to load tags");
//     }
//   };

//   const loadContacts = async () => {
//     try {
//       let res;
//       if (tags.length > 0) {
//         res = await axiosClient.post("/contacts/filter-by-tags", tags);
//         setContacts(res.data?.data || []);
//       } else {
//         res = await axiosClient.get("/contacts", {
//           params: { tab: "all", page: 1, pageSize: 1000 },
//         });
//         setContacts(res.data?.data?.items || []);
//       }
//     } catch {
//       toast.error("Failed to load contacts");
//     }
//   };

//   const applySearchFilter = () => {
//     const result = contacts.filter(
//       c =>
//         c.name?.toLowerCase().includes(search.toLowerCase()) ||
//         getPhone(c).includes(search)
//     );
//     setFilteredContacts(result);
//   };

//   const toggleContact = id => {
//     setSelectedIds(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   const toggleSelectAll = () => {
//     const filteredIds = filteredContacts.map(c => c.id);
//     const allSelected = filteredIds.every(id => selectedIds.includes(id));
//     setSelectedIds(prev =>
//       allSelected
//         ? prev.filter(id => !filteredIds.includes(id))
//         : [...new Set([...prev, ...filteredIds])]
//     );
//   };

//   // ===== Existing local CSV → CRM import (kept as-is) =====
//   const handleFileUpload = e => {
//     const file = e.target.files[0];
//     if (!file) return;

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: true,
//       complete: function (results) {
//         const headers = Object.keys(results.data[0] || {});
//         setParsedCSV(results.data);
//         setCsvHeaders(headers);
//         setShowFieldMapModal(true);
//       },
//       error: function () {
//         toast.error("CSV Parsing Failed");
//       },
//     });
//   };

//   useEffect(() => {
//     if (csvHeaders.length > 0) {
//       const suggestions = {
//         name: ["name", "full name", "contact name"],
//         phone: ["phone", "mobile", "number", "whatsapp"],
//       };
//       const bestMatch = fieldOptions =>
//         csvHeaders.find(h =>
//           fieldOptions.some(option =>
//             h.toLowerCase().includes(option.toLowerCase())
//           )
//         ) || "";
//       setFieldMapping({
//         name: bestMatch(suggestions.name),
//         phone: bestMatch(suggestions.phone),
//       });
//     }
//   }, [csvHeaders]);

//   const applyFieldMapping = async () => {
//     const mapped = parsedCSV
//       .filter(row => row[fieldMapping.name] && row[fieldMapping.phone])
//       .map(row => ({
//         id: crypto.randomUUID(),
//         name: row[fieldMapping.name],
//         phone: row[fieldMapping.phone],
//         tags: selectedTagId
//           ? [
//               {
//                 tagId: selectedTagId,
//                 tagName: allTags.find(t => t.id === selectedTagId)?.name || "",
//               },
//             ]
//           : [],
//       }));

//     setContacts(prev => [...prev, ...mapped]);
//     setSelectedIds(prev => [...new Set([...prev, ...mapped.map(c => c.id)])]);
//     setImportedCount(mapped.length);
//     setShowFieldMapModal(false);
//     toast.success(`${mapped.length} contacts imported.`);

//     setTimeout(() => {
//       if (importedRef.current) {
//         importedRef.current.scrollIntoView({ behavior: "smooth" });
//       }
//     }, 200);

//     if (saveToDb) {
//       try {
//         setIsImporting(true);
//         await axiosClient.post("/contacts/bulk-import", mapped);
//         toast.success("Contacts also saved to your CRM.");
//       } catch {
//         toast.error("Saving to CRM failed.");
//       } finally {
//         setIsImporting(false);
//       }
//     }
//   };

//   const assignContacts = async () => {
//     if (!campaign || !campaign.id) {
//       toast.error("Campaign not ready. Please try again.");
//       return;
//     }
//     if (selectedIds.length === 0) {
//       toast.warn("Please select at least one contact");
//       return;
//     }

//     const validIds = selectedIds.filter(id =>
//       contacts.find(c => c.id === id && getPhone(c).trim() !== "")
//     );

//     if (validIds.length === 0) {
//       toast.warn("No selected contacts have valid phone numbers.");
//       return;
//     }

//     try {
//       const payload = { contactIds: validIds };
//       await axiosClient.post(
//         `/campaign/${campaign.id}/assign-contacts`,
//         payload
//       );
//       toast.success("Contacts assigned to campaign");
//     } catch (err) {
//       const message =
//         err.response?.data?.message ||
//         "Something went wrong during assignment.";
//       toast.error(message);
//     }
//   };

//   const allVisibleSelected = filteredContacts.every(c =>
//     selectedIds.includes(c.id)
//   );

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       {/* <h1 className="text-2xl font-bold text-purple-600 mb-6 flex items-center gap-2">
//         🎯 Assign Contacts to Campaign
//       </h1> */}
//       <h1 className="text-2xl font-bold text-purple-600 mb-2 flex items-center gap-2">
//         🎯 Assign Contacts
//       </h1>

//       {/* campaign meta */}
//       {campaign ? (
//         <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
//           <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-purple-700 border border-purple-200">
//             <strong className="font-semibold">Campaign:</strong>
//             <span>
//               {campaign.name ||
//                 campaign.campaignName ||
//                 campaign.title ||
//                 "(unnamed campaign)"}
//             </span>
//           </span>
//           {campaign.templateName || campaign.messageTemplate ? (
//             <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-gray-700 border border-gray-200">
//               <strong className="font-semibold">Template:</strong>
//               <span>{campaign.templateName || campaign.messageTemplate}</span>
//             </span>
//           ) : null}
//           {typeof placeholderCount === "number" ? (
//             <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-800 border border-amber-200">
//               <strong className="font-semibold">Placeholders:</strong>
//               <span>{placeholderCount}</span>
//             </span>
//           ) : null}
//         </div>
//       ) : (
//         <div className="mb-6 text-xs text-gray-500">Loading campaign…</div>
//       )}

//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//         <input
//           className="border p-2 rounded-md w-full sm:w-1/3"
//           type="text"
//           placeholder="Search by name or phone..."
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//         />
//         <TagFilterDropdown
//           selectedTags={tags}
//           onChange={setTags}
//           category="All"
//         />
//         <label className="cursor-pointer text-purple-600 hover:underline text-sm sm:ml-auto">
//           + Upload CSV
//           <input
//             type="file"
//             accept=".csv"
//             onChange={handleFileUpload}
//             className="hidden"
//           />
//         </label>
//       </div>

//       <div
//         className="bg-white rounded-xl shadow-sm overflow-x-auto"
//         ref={importedRef}
//       >
//         <table className="min-w-full text-sm">
//           <thead className="bg-gray-100 text-gray-700">
//             <tr>
//               <th className="px-4 py-2 text-center">
//                 <input
//                   type="checkbox"
//                   checked={allVisibleSelected}
//                   onChange={toggleSelectAll}
//                 />
//               </th>
//               <th className="px-4 py-2 text-left">Name</th>
//               <th className="px-4 py-2 text-left">Phone</th>
//               <th className="px-4 py-2 text-left">Tags</th>
//               <th className="px-4 py-2 text-left">Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredContacts.map(contact => (
//               <tr key={contact.id} className="border-t hover:bg-gray-50">
//                 <td className="px-4 py-2 text-center">
//                   <input
//                     type="checkbox"
//                     checked={selectedIds.includes(contact.id)}
//                     onChange={() => toggleContact(contact.id)}
//                   />
//                 </td>
//                 <td className="px-4 py-2">{contact.name || "Unnamed"}</td>
//                 <td className="px-4 py-2">{getPhone(contact) || "—"}</td>
//                 <td className="px-4 py-2">
//                   <div className="flex flex-wrap gap-1">
//                     {(contact.tags || contact.contactTags || []).map(tag => (
//                       <span
//                         key={tag.tagId || tag.id}
//                         className="px-2 py-0.5 text-xs rounded-full"
//                         style={{
//                           backgroundColor: tag.colorHex || "#E5E7EB",
//                           color: "#000",
//                         }}
//                       >
//                         {tag.tagName || tag.name}
//                       </span>
//                     ))}
//                   </div>
//                 </td>
//                 <td className="px-4 py-2">
//                   {getPhone(contact).trim() !== "" ? "✅ Valid" : "⚠️ No Phone"}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-sm text-gray-600">
//         <div>
//           Selected: {selectedIds.length} / WhatsApp-ready:{" "}
//           {
//             filteredContacts.filter(
//               c => selectedIds.includes(c.id) && getPhone(c).trim() !== ""
//             ).length
//           }
//         </div>
//         {importedCount > 0 && (
//           <div className="text-green-600">
//             ✔ Imported: {importedCount} contact(s)
//           </div>
//         )}
//       </div>

//       {/* === Campaign CSV flow (ALWAYS visible; phones-only works when N=0) === */}
//       {campaignId && (
//         <div className="mt-8 rounded-xl border bg-white p-4 shadow-sm">
//           <h2 className="mb-2 text-sm font-semibold text-gray-800">
//             Bulk Personalization via CSV
//             {placeholderCount > 0 && (
//               <>
//                 {" "}
//                 (Template has {placeholderCount} dynamic field
//                 {placeholderCount > 1 ? "s" : ""})
//               </>
//             )}
//           </h2>
//           <p className="mb-3 text-xs text-gray-600">
//             Upload a CSV with at least a <code>phone</code> column
//             {placeholderCount > 0 && (
//               <>
//                 {" "}
//                 and values for <code>{"{{1}}"}</code>
//                 {placeholderCount > 1 && (
//                   <>
//                     …<code>{`{{${placeholderCount}}}`}</code>
//                   </>
//                 )}
//               </>
//             )}
//             , then validate, dry-run, and persist to create an Audience +
//             Recipients with idempotency. Your manual assignment flow above
//             remains available.
//           </p>
//           <CsvAudienceSection campaignId={campaignId} />
//         </div>
//       )}

//       <div className="mt-6 flex justify-end">
//         <button
//           onClick={assignContacts}
//           disabled={false}
//           className="px-6 py-3 rounded-lg transition bg-purple-600 text-white hover:bg-purple-700"
//         >
//           Assign to Campaign
//         </button>
//       </div>

//       <Modal
//         isOpen={showFieldMapModal}
//         onRequestClose={() => setShowFieldMapModal(false)}
//         className="bg-white rounded-lg shadow-lg max-w-xl mx-auto mt-20 p-6"
//         overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
//       >
//         <h2 className="text-lg font-bold mb-4">🧩 Map CSV Fields</h2>
//         <div className="space-y-4">
//           {["name", "phone"].map(field => (
//             <div key={field}>
//               <label className="block text-sm font-medium mb-1 capitalize">
//                 {field}
//               </label>
//               <select
//                 className="border px-3 py-2 rounded w-full"
//                 value={fieldMapping[field]}
//                 onChange={e =>
//                   setFieldMapping(prev => ({
//                     ...prev,
//                     [field]: e.target.value,
//                   }))
//                 }
//               >
//                 <option value="">-- Select CSV column --</option>
//                 {csvHeaders.map(header => (
//                   <option key={header} value={header}>
//                     {header}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           ))}
//           <div>
//             <label className="block text-sm font-medium mb-1">
//               Apply Tag to All
//             </label>
//             <select
//               className="border px-3 py-2 rounded w-full"
//               value={selectedTagId || ""}
//               onChange={e => setSelectedTagId(e.target.value)}
//             >
//               <option value="">-- None --</option>
//               {Array.isArray(allTags) &&
//                 allTags.map(tag => (
//                   <option key={tag.id} value={tag.id}>
//                     {tag.name}
//                   </option>
//                 ))}
//             </select>
//           </div>
//         </div>

//         <div className="mt-4">
//           <label className="inline-flex items-center">
//             <input
//               type="checkbox"
//               className="mr-2"
//               checked={saveToDb}
//               onChange={e => setSaveToDb(e.target.checked)}
//             />
//             Also save these contacts to your CRM
//           </label>
//         </div>

//         <div className="mt-6 flex justify-end gap-3">
//           <button
//             className="text-gray-600 hover:underline"
//             onClick={() => setShowFieldMapModal(false)}
//           >
//             Cancel
//           </button>
//           <button
//             className="bg-purple-600 text-white px-4 py-2 rounded-md"
//             onClick={applyFieldMapping}
//             disabled={isImporting}
//           >
//             {isImporting ? "Importing…" : "Import & Apply"}
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// import React, { useEffect, useRef, useState } from "react";
// import { useParams } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";
// import Papa from "papaparse";
// import Modal from "react-modal";
// // ❌ removed: WhatsAppBubblePreview
// import TagFilterDropdown from "./components/TagFilterDropdown";

// if (typeof document !== "undefined" && process.env.NODE_ENV !== "test") {
//   Modal.setAppElement("#root");
// }

// export default function AssignContactsPage() {
//   const { id: campaignId } = useParams();
//   const [contacts, setContacts] = useState([]);
//   const [filteredContacts, setFilteredContacts] = useState([]);
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [search, setSearch] = useState("");
//   const [tags, setTags] = useState([]);
//   const [campaign, setCampaign] = useState(null);

//   const [showFieldMapModal, setShowFieldMapModal] = useState(false);
//   const [csvHeaders, setCsvHeaders] = useState([]);
//   const [fieldMapping, setFieldMapping] = useState({ name: "", phone: "" });
//   const [parsedCSV, setParsedCSV] = useState([]);
//   const [importedCount, setImportedCount] = useState(0);
//   const [saveToDb, setSaveToDb] = useState(true);
//   const [selectedTagId, setSelectedTagId] = useState(null);
//   const [allTags, setAllTags] = useState([]);
//   const [setIsImporting] = useState(false);

//   const importedRef = useRef(null);

//   // ✅ Helper for consistent phone extraction
//   function getPhone(contact) {
//     return contact.phoneNumber || contact.phone || "";
//   }

//   useEffect(() => {
//     loadCampaign();
//     fetchAllTags();
//     // eslint-disable-next-line
//   }, [campaignId]);

//   useEffect(() => {
//     loadContacts();
//     // eslint-disable-next-line
//   }, [tags]);

//   useEffect(() => {
//     applySearchFilter();
//     // eslint-disable-next-line
//   }, [contacts, search]);

//   const loadCampaign = async () => {
//     if (!campaignId) {
//       toast.error("No campaign ID found in URL.");
//       return;
//     }
//     try {
//       const res = await axiosClient.get(`/campaign/${campaignId}`);
//       setCampaign(res.data);
//       // console.log("Loaded campaign:", res.data);
//     } catch (err) {
//       console.error("Failed to load campaign:", err);
//       toast.error("Failed to load campaign");
//     }
//   };

//   const fetchAllTags = async () => {
//     try {
//       const res = await axiosClient.get("/tags/get-tags");
//       const tags = res.data?.data || res.data || [];
//       setAllTags(tags);
//     } catch {
//       toast.error("Failed to load tags");
//     }
//   };

//   const loadContacts = async () => {
//     try {
//       let res;
//       if (tags.length > 0) {
//         res = await axiosClient.post("/contacts/filter-by-tags", tags);
//         setContacts(res.data?.data || []);
//       } else {
//         res = await axiosClient.get("/contacts", {
//           params: { tab: "all", page: 1, pageSize: 1000 },
//         });
//         setContacts(res.data?.data?.items || []);
//       }
//     } catch {
//       toast.error("Failed to load contacts");
//     }
//   };

//   const applySearchFilter = () => {
//     const result = contacts.filter(
//       c =>
//         c.name?.toLowerCase().includes(search.toLowerCase()) ||
//         getPhone(c).includes(search)
//     );
//     setFilteredContacts(result);
//   };

//   const toggleContact = id => {
//     setSelectedIds(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
//     );
//   };

//   const toggleSelectAll = () => {
//     const filteredIds = filteredContacts.map(c => c.id);
//     const allSelected = filteredIds.every(id => selectedIds.includes(id));
//     setSelectedIds(prev =>
//       allSelected
//         ? prev.filter(id => !filteredIds.includes(id))
//         : [...new Set([...prev, ...filteredIds])]
//     );
//   };

//   const handleFileUpload = e => {
//     const file = e.target.files[0];
//     if (!file) return;

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: true,
//       complete: function (results) {
//         const headers = Object.keys(results.data[0] || {});
//         setParsedCSV(results.data);
//         setCsvHeaders(headers);
//         setShowFieldMapModal(true);
//       },
//       error: function () {
//         toast.error("CSV Parsing Failed");
//       },
//     });
//   };

//   useEffect(() => {
//     if (csvHeaders.length > 0) {
//       const suggestions = {
//         name: ["name", "full name", "contact name"],
//         phone: ["phone", "mobile", "number", "whatsapp"],
//       };
//       const bestMatch = fieldOptions =>
//         csvHeaders.find(h =>
//           fieldOptions.some(option =>
//             h.toLowerCase().includes(option.toLowerCase())
//           )
//         ) || "";
//       setFieldMapping({
//         name: bestMatch(suggestions.name),
//         phone: bestMatch(suggestions.phone),
//       });
//     }
//   }, [csvHeaders]);

//   const applyFieldMapping = async () => {
//     const mapped = parsedCSV
//       .filter(row => row[fieldMapping.name] && row[fieldMapping.phone])
//       .map(row => ({
//         id: crypto.randomUUID(),
//         name: row[fieldMapping.name],
//         phone: row[fieldMapping.phone],
//         tags: selectedTagId
//           ? [
//               {
//                 tagId: selectedTagId,
//                 tagName: allTags.find(t => t.id === selectedTagId)?.name || "",
//               },
//             ]
//           : [],
//       }));

//     setContacts(prev => [...prev, ...mapped]);
//     setSelectedIds(prev => [...new Set([...prev, ...mapped.map(c => c.id)])]);
//     setImportedCount(mapped.length);
//     setShowFieldMapModal(false);
//     toast.success(`${mapped.length} contacts imported.`);

//     setTimeout(() => {
//       if (importedRef.current) {
//         importedRef.current.scrollIntoView({ behavior: "smooth" });
//       }
//     }, 200);

//     if (saveToDb) {
//       try {
//         setIsImporting(true);
//         await axiosClient.post("/contacts/bulk-import", mapped);
//         toast.success("Contacts also saved to your CRM.");
//       } catch {
//         toast.error("Saving to CRM failed.");
//       } finally {
//         setIsImporting(false);
//       }
//     }
//   };

//   const assignContacts = async () => {
//     if (!campaign || !campaign.id) {
//       toast.error("Campaign not ready. Please try again.");
//       return;
//     }
//     if (selectedIds.length === 0) {
//       toast.warn("Please select at least one contact");
//       return;
//     }

//     const validIds = selectedIds.filter(id =>
//       contacts.find(c => c.id === id && getPhone(c).trim() !== "")
//     );

//     if (validIds.length === 0) {
//       toast.warn("No selected contacts have valid phone numbers.");
//       return;
//     }

//     try {
//       const payload = { contactIds: validIds };
//       await axiosClient.post(
//         `/campaign/${campaign.id}/assign-contacts`,
//         payload
//       );
//       toast.success("Contacts assigned to campaign");
//     } catch (err) {
//       const message =
//         err.response?.data?.message ||
//         "Something went wrong during assignment.";
//       toast.error(message);
//     }
//   };

//   const allVisibleSelected = filteredContacts.every(c =>
//     selectedIds.includes(c.id)
//   );

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <h1 className="text-2xl font-bold text-purple-600 mb-6 flex items-center gap-2">
//         🎯 Assign Contacts to Campaign
//       </h1>

//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//         <input
//           className="border p-2 rounded-md w-full sm:w-1/3"
//           type="text"
//           placeholder="Search by name or phone..."
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//         />
//         <TagFilterDropdown
//           selectedTags={tags}
//           onChange={setTags}
//           category="All"
//         />
//         <label className="cursor-pointer text-purple-600 hover:underline text-sm sm:ml-auto">
//           + Upload CSV
//           <input
//             type="file"
//             accept=".csv"
//             onChange={handleFileUpload}
//             className="hidden"
//           />
//         </label>
//       </div>

//       <div
//         className="bg-white rounded-xl shadow-sm overflow-x-auto"
//         ref={importedRef}
//       >
//         <table className="min-w-full text-sm">
//           <thead className="bg-gray-100 text-gray-700">
//             <tr>
//               <th className="px-4 py-2 text-center">
//                 <input
//                   type="checkbox"
//                   checked={allVisibleSelected}
//                   onChange={toggleSelectAll}
//                 />
//               </th>
//               <th className="px-4 py-2 text-left">Name</th>
//               <th className="px-4 py-2 text-left">Phone</th>
//               <th className="px-4 py-2 text-left">Tags</th>
//               <th className="px-4 py-2 text-left">Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredContacts.map(contact => (
//               <tr key={contact.id} className="border-t hover:bg-gray-50">
//                 <td className="px-4 py-2 text-center">
//                   <input
//                     type="checkbox"
//                     checked={selectedIds.includes(contact.id)}
//                     onChange={() => toggleContact(contact.id)}
//                   />
//                 </td>
//                 <td className="px-4 py-2">{contact.name || "Unnamed"}</td>
//                 <td className="px-4 py-2">{getPhone(contact) || "—"}</td>
//                 <td className="px-4 py-2">
//                   <div className="flex flex-wrap gap-1">
//                     {(contact.tags || contact.contactTags || []).map(tag => (
//                       <span
//                         key={tag.tagId || tag.id}
//                         className="px-2 py-0.5 text-xs rounded-full"
//                         style={{
//                           backgroundColor: tag.colorHex || "#E5E7EB",
//                           color: "#000",
//                         }}
//                       >
//                         {tag.tagName || tag.name}
//                       </span>
//                     ))}
//                   </div>
//                 </td>
//                 <td className="px-4 py-2">
//                   {getPhone(contact).trim() !== "" ? "✅ Valid" : "⚠️ No Phone"}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-sm text-gray-600">
//         <div>
//           Selected: {selectedIds.length} / WhatsApp-ready:{" "}
//           {
//             filteredContacts.filter(
//               c => selectedIds.includes(c.id) && getPhone(c).trim() !== ""
//             ).length
//           }
//         </div>
//         {importedCount > 0 && (
//           <div className="text-green-600">
//             ✔ Imported: {importedCount} contact(s)
//           </div>
//         )}
//       </div>

//       {/* ❌ Preview removed */}

//       <div className="mt-6 flex justify-end">
//         <button
//           onClick={assignContacts}
//           disabled={false}
//           className="px-6 py-3 rounded-lg transition bg-purple-600 text-white hover:bg-purple-700"
//         >
//           Assign to Campaign
//         </button>
//       </div>

//       <Modal
//         isOpen={showFieldMapModal}
//         onRequestClose={() => setShowFieldMapModal(false)}
//         className="bg-white rounded-lg shadow-lg max-w-xl mx-auto mt-20 p-6"
//         overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
//       >
//         <h2 className="text-lg font-bold mb-4">🧩 Map CSV Fields</h2>
//         <div className="space-y-4">
//           {["name", "phone"].map(field => (
//             <div key={field}>
//               <label className="block text-sm font-medium mb-1 capitalize">
//                 {field}
//               </label>
//               <select
//                 className="border px-3 py-2 rounded w-full"
//                 value={fieldMapping[field]}
//                 onChange={e =>
//                   setFieldMapping(prev => ({
//                     ...prev,
//                     [field]: e.target.value,
//                   }))
//                 }
//               >
//                 <option value="">-- Select CSV column --</option>
//                 {csvHeaders.map(header => (
//                   <option key={header} value={header}>
//                     {header}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           ))}
//           <div>
//             <label className="block text-sm font-medium mb-1">
//               Apply Tag to All
//             </label>
//             <select
//               className="border px-3 py-2 rounded w-full"
//               value={selectedTagId || ""}
//               onChange={e => setSelectedTagId(e.target.value)}
//             >
//               <option value="">-- None --</option>
//               {Array.isArray(allTags) &&
//                 allTags.map(tag => (
//                   <option key={tag.id} value={tag.id}>
//                     {tag.name}
//                   </option>
//                 ))}
//             </select>
//           </div>
//         </div>

//         <div className="mt-4">
//           <label className="inline-flex items-center">
//             <input
//               type="checkbox"
//               className="mr-2"
//               checked={saveToDb}
//               onChange={e => setSaveToDb(e.target.checked)}
//             />
//             Also save these contacts to your CRM
//           </label>
//         </div>

//         <div className="mt-6 flex justify-end gap-3">
//           <button
//             className="text-gray-600 hover:underline"
//             onClick={() => setShowFieldMapModal(false)}
//           >
//             Cancel
//           </button>
//           <button
//             className="bg-purple-600 text-white px-4 py-2 rounded-md"
//             onClick={applyFieldMapping}
//           >
//             Import & Apply
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }
