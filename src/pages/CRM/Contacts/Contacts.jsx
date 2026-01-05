// 📄 src/pages/CRM/Contacts/Contacts.jsx

import React, { useState } from "react";
import { User } from "lucide-react";

import ContactsTopBar from "./components/ContactsTopBar";
import ContactsTable from "./components/ContactsTable";
import ContactFormModal from "./components/ContactFormModal";
import BulkActionsBar from "./components/BulkActionsBar";
import CsvUploadModal from "./CsvUploadModal";
import ContactsFilterModal, {
  DEFAULT_CONTACT_FILTERS,
} from "./components/ContactsFilterModal";

export default function Contacts() {
  // 🔹 UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_CONTACT_FILTERS);

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
  const handleAddClick = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleEditContact = contact => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSelectionChange = ids => {
    setSelectedIds(ids || []);
  };

  const handleTabChange = tab => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleRefreshList = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleApplyFilters = nextFilters => {
    setFilters(nextFilters || DEFAULT_CONTACT_FILTERS);
    setCurrentPage(1);
    setSelectedIds([]);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_CONTACT_FILTERS);
    setCurrentPage(1);
    setSelectedIds([]);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleImportClick = () => {
    if (isImporting) return;
    setIsImportModalOpen(true);
  };

  const handleImportModalClose = () => {
    setIsImportModalOpen(false);
  };

    const handleDownloadSample = () => {
    const headers = ["Name", "PhoneNumber", "Email", "LeadSource", "Notes"];
    const formatPhoneForCsv = value => {
      const text = String(value ?? "").trim();
      if (!text) return "";
      const looksNumeric = /^[+]?\d{10,15}$/.test(text);
      return looksNumeric ? `'${text}` : text;
    };
    const rows = [
      [
        "Rahul Sharma",
        formatPhoneForCsv("9876543210"),
        "rahul@example.com",
        "Facebook",
        "Interested in pricing, follow up next week",
      ],
      [
        "Ananya Gupta",
        formatPhoneForCsv("+919123456789"),
        "ananya.gupta@example.com",
        "Website Form",
        "Requested onboarding details",
      ],
      [
        "Vikram Singh",
        formatPhoneForCsv("9988776655"),
        "vikram.singh@example.com",
        "Referral",
        "Met at trade show",
      ],
    ];

    const escapeCsv = value => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "xbytechat_contacts_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };



  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-6 pb-8">
        {/* Workspace header */}
        <div className="mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-emerald-200/60 shadow-sm">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-emerald-800" />
                </div>
              </div>

              <div>
                <h1 className="mt-1.5 text-xl font-semibold text-slate-900">
                  Contacts
                </h1>

                <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                  Organize leads, segment customers, and run bulk actions.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Active tab: {activeTab}
                  </span>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200">
                    Selected: {selectedIds.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main module card */}
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-white">
            <div className="border-b border-slate-100">
              <ContactsTopBar
                onAddClick={handleAddClick}
                onSearchChange={setSearchTerm}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                searchTerm={searchTerm}
                onFilterClick={() => setIsFilterModalOpen(true)}
                onImportClick={handleImportClick}
                importing={isImporting}
                onDownloadSample={handleDownloadSample}
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="border-b border-slate-100 bg-emerald-50/50">
                <BulkActionsBar
                  selectedIds={selectedIds}
                  onClearSelection={handleClearSelection}
                  onRefresh={handleRefreshList}
                />
              </div>
            )}
          </div>

          <div className="bg-white">
            <div>
              <ContactsTable
                onEdit={handleEditContact}
                refreshTrigger={refreshTrigger}
                activeTab={activeTab}
                onSelectionChange={handleSelectionChange}
                selectedIds={selectedIds}
                searchTerm={searchTerm}
                filters={filters}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </div>
          </div>
        </div>

        <ContactsFilterModal
          isOpen={isFilterModalOpen}
          initialFilters={filters}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

        <ContactFormModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          contact={editingContact}
          onSaveComplete={handleSaveComplete}
        />
        <CsvUploadModal
          isOpen={isImportModalOpen}
          onClose={handleImportModalClose}
          onRefresh={handleRefreshList}
          onImportingChange={setIsImporting}
        />
      </div>
    </div>
  );
}

// // 📄 src/pages/CRM/Contacts/Contacts.jsx

// import React, { useEffect, useMemo, useState } from "react";
// import { useLocation } from "react-router-dom";
// import {
//   User,
//   Tag,
//   Clock,
//   StickyNote,
//   Bell,
//   Activity,
//   Filter,
// } from "lucide-react";
// import { toast } from "react-toastify";

// import axiosClient from "../../../api/axiosClient";

// import ContactsTopBar from "./components/ContactsTopBar";
// import ContactsTable from "./components/ContactsTable";
// import ContactFormModal from "./components/ContactFormModal";
// import BulkActionsBar from "./components/BulkActionsBar";

// function formatDateTime(value) {
//   if (!value) return "-";
//   try {
//     return new Date(value).toLocaleString();
//   } catch {
//     return String(value);
//   }
// }

// export default function Contacts() {
//   /**
//    * ✅ Product decision (for now):
//    * Keep Contact 360 code intact, but hide it from the UI until we finalize Inbox CRM panel integration.
//    */
//   const SHOW_CONTACT_360_PANEL = false;

//   // 🔹 UI state for list side
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingContact, setEditingContact] = useState(null);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [activeTab, setActiveTab] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [density, setDensity] = useState(() => {
//     try {
//       return localStorage.getItem("crm.contacts.density") || "comfortable";
//     } catch {
//       return "comfortable";
//     }
//   });

//   // 🔹 URL -> contactId (for deep-link from Chat Inbox)
//   const location = useLocation();
//   const [focusedContactId, setFocusedContactId] = useState(null);

//   // 🔹 Contact 360 summary data (kept for later)
//   const [contactSummary, setContactSummary] = useState(null);
//   const [isSummaryLoading, setIsSummaryLoading] = useState(false);

//   // ────────────────────────────────────────────────
//   // 1) Hydrate focusedContactId from URL (?contactId=...)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const idFromUrl = params.get("contactId");

//     if (idFromUrl) {
//       setFocusedContactId(idFromUrl);

//       // Keep selection aligned so bulk actions make sense
//       setSelectedIds(prev =>
//         prev && prev.length > 0 && prev.includes(idFromUrl) ? prev : [idFromUrl]
//       );
//     }
//   }, [location.search]);

//   // ────────────────────────────────────────────────
//   // 2) Selection -> focus logic (kept for future 360 usage)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const idFromUrl = params.get("contactId");

//     if (idFromUrl) return;

//     if (!selectedIds || selectedIds.length === 0) {
//       setFocusedContactId(null);
//       setContactSummary(null);
//       return;
//     }

//     if (selectedIds.length === 1) {
//       setFocusedContactId(selectedIds[0]);
//       return;
//     }
//   }, [selectedIds, location.search]);

//   // ────────────────────────────────────────────────
//   // 3) Handlers
//   // ────────────────────────────────────────────────
//   const handleAddClick = () => {
//     setEditingContact(null);
//     setIsModalOpen(true);
//   };

//   const handleEditContact = contact => {
//     setEditingContact(contact);
//     setIsModalOpen(true);
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setEditingContact(null);
//   };

//   const handleSaveComplete = () => {
//     setRefreshTrigger(prev => prev + 1);
//   };

//   const handleSelectionChange = ids => {
//     setSelectedIds(ids || []);
//   };

//   const handleTabChange = tab => {
//     setActiveTab(tab);
//     setCurrentPage(1);
//     setSelectedIds([]);
//   };

//   const handleClearSelection = () => {
//     setSelectedIds([]);
//   };

//   const handleRefreshList = () => {
//     setRefreshTrigger(prev => prev + 1);
//   };

//   const handleDensityChange = next => {
//     setDensity(next);
//     try {
//       localStorage.setItem("crm.contacts.density", next);
//     } catch {
//       // ignore storage errors
//     }
//   };

//   // ────────────────────────────────────────────────
//   // 4) Fetch Contact 360 summary (disabled while panel hidden)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     if (!SHOW_CONTACT_360_PANEL) return;

//     const contactId = focusedContactId;
//     if (!contactId) return;

//     let cancelled = false;

//     const loadSummary = async () => {
//       try {
//         setIsSummaryLoading(true);
//         const response = await axiosClient.get(
//           `/crm/contact-summary/${contactId}`
//         );
//         if (cancelled) return;
//         setContactSummary(response.data || null);
//       } catch (error) {
//         if (cancelled) return;
//         console.error("Failed to load contact summary", error);
//         toast.error(
//           error?.response?.data?.message ||
//             "Failed to load Contact 360 summary."
//         );
//         setContactSummary(null);
//       } finally {
//         if (!cancelled) setIsSummaryLoading(false);
//       }
//     };

//     loadSummary();

//     return () => {
//       cancelled = true;
//     };
//   }, [focusedContactId, SHOW_CONTACT_360_PANEL]);

//   // ────────────────────────────────────────────────
//   // 5) Derived CRM slices (kept for later)
//   // ────────────────────────────────────────────────
//   const tagsList = useMemo(() => {
//     if (!contactSummary) return [];
//     if (Array.isArray(contactSummary.tags)) return contactSummary.tags;
//     if (Array.isArray(contactSummary.contactTags))
//       return contactSummary.contactTags;
//     if (Array.isArray(contactSummary.tagSummaries))
//       return contactSummary.tagSummaries;
//     if (Array.isArray(contactSummary.tagList)) return contactSummary.tagList;
//     return [];
//   }, [contactSummary]);

//   const recentNotes = useMemo(() => {
//     if (!contactSummary) return [];
//     const notes =
//       contactSummary.recentNotes ||
//       contactSummary.notes ||
//       contactSummary.lastNotes ||
//       [];
//     return Array.isArray(notes) ? notes.slice(0, 3) : [];
//   }, [contactSummary]);

//   const nextReminder = useMemo(() => {
//     if (!contactSummary) return null;
//     return (
//       contactSummary.nextReminder ||
//       contactSummary.upcomingReminder ||
//       contactSummary.reminder ||
//       null
//     );
//   }, [contactSummary]);

//   const recentTimeline = useMemo(() => {
//     if (!contactSummary) return [];
//     const items =
//       contactSummary.recentTimeline ||
//       contactSummary.timeline ||
//       contactSummary.events ||
//       [];
//     return Array.isArray(items) ? items.slice(0, 5) : [];
//   }, [contactSummary]);

//   const basic =
//     contactSummary?.contact ||
//     contactSummary?.contactBasic ||
//     contactSummary?.contactInfo ||
//     contactSummary ||
//     null;

//   const displayName =
//     basic?.fullName ||
//     basic?.name ||
//     basic?.contactName ||
//     "Unnamed contact";
//   const displayPhone =
//     basic?.phoneNumber || basic?.whatsappNumber || basic?.phone || "";
//   const displayEmail = basic?.email || basic?.emailAddress || "";
//   const displayStatus =
//     basic?.status || basic?.lifecycleStage || basic?.stage || null;
//   const createdAt =
//     basic?.createdAt ||
//     basic?.createdOn ||
//     basic?.firstSeenAt ||
//     basic?.createdDate;
//   const lastInbound =
//     basic?.lastInboundAt ||
//     basic?.lastInboundMessageAt ||
//     basic?.lastIncomingAt;
//   const lastOutbound =
//     basic?.lastOutboundAt ||
//     basic?.lastOutboundMessageAt ||
//     basic?.lastOutgoingAt;

//   const multipleSelected = selectedIds.length > 1;

//   // ────────────────────────────────────────────────
//   // ✅ Redesigned layout (emerald-only, premium spacing + hierarchy)
//   // ────────────────────────────────────────────────
//   return (
//     <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-50 via-white to-slate-50">
//       {/* Soft top spacing so it never feels glued to topbar */}
//       <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-6 pb-8">
//         {/* Workspace header */}
//         <div className="mb-5">
//           <div className="flex items-start justify-between gap-4">
//             <div>
//               <div className="flex flex-wrap items-center gap-2">
//                 <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
//                   CRM Workspace
//                 </span>
//                 <span className="text-slate-300">/</span>
//                 <span className="text-[11px] font-medium text-slate-500">
//                   Contacts
//                 </span>
//               </div>

//               <h1 className="mt-1.5 text-xl font-semibold text-slate-900">
//                 Contacts
//               </h1>

//               <p className="mt-1 text-sm text-slate-600 max-w-2xl">
//                 Organize leads, segment customers, and keep context ready for
//                 Inbox actions.
//               </p>

//               {/* Meta chips (subtle, premium) */}
//               <div className="mt-3 flex flex-wrap items-center gap-2">
//                 <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
//                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
//                   Active tab: {activeTab}
//                 </span>

//                 <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200">
//                   Selected: {selectedIds.length}
//                 </span>
//               </div>
//             </div>

//             {/* Brand icon tile */}
//             <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-emerald-200/60 shadow-sm">
//               <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
//                 <User className="h-5 w-5 text-emerald-800" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Main module card */}
//         <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
//           {/* Top controls zone */}
//           <div className="bg-white">
//             <div className="border-b border-slate-100">
//               <ContactsTopBar
//                 onAddClick={handleAddClick}
//                 onSearchChange={setSearchTerm}
//                 activeTab={activeTab}
//                 onTabChange={handleTabChange}
//                 searchTerm={searchTerm}
//                 density={density}
//                 onDensityChange={handleDensityChange}
//                 onFilterClick={() =>
//                   toast.info("Advanced filters will come in a later phase.")
//                 }
//               />
//             </div>

//             {/* Bulk actions bar */}
//             {selectedIds.length > 0 && (
//               <div className="border-b border-slate-100 bg-emerald-50/50">
//                 <BulkActionsBar
//                   selectedIds={selectedIds}
//                   onClearSelection={handleClearSelection}
//                   onRefresh={handleRefreshList}
//                 />
//               </div>
//             )}
//           </div>

//           {/* Table stage (gives the table a clean “canvas”) */}
//           <div className="bg-white">
//             <div className="min-h-[560px]">
//               <ContactsTable
//                 onEdit={handleEditContact}
//                 refreshTrigger={refreshTrigger}
//                 activeTab={activeTab}
//                 onSelectionChange={handleSelectionChange}
//                 searchTerm={searchTerm}
//                 currentPage={currentPage}
//                 setCurrentPage={setCurrentPage}
//                 density={density}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Contact create/edit modal */}
//         <ContactFormModal
//           isOpen={isModalOpen}
//           onClose={handleModalClose}
//           contact={editingContact}
//           onSaveComplete={handleSaveComplete}
//         />
//       </div>

//       {/* ✅ Contact 360 stays in code, but hidden */}
//       {SHOW_CONTACT_360_PANEL && (
//         <div className="hidden">
//           {/* Keeping the panel code alive for later decision */}
//           <div className="hidden lg:flex w-[360px] xl:w-[380px] flex-col bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/40">
//             <div className="border-b border-emerald-100 px-4 py-3 bg-white/90 backdrop-blur">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
//                     Contact 360
//                   </p>
//                   <p className="text-xs text-slate-500">
//                     Quick CRM snapshot for the selected contact
//                   </p>
//                 </div>
//                 <div className="h-8 w-8 rounded-2xl bg-emerald-100 flex items-center justify-center">
//                   <User className="h-4 w-4 text-emerald-700" />
//                 </div>
//               </div>
//             </div>

//             <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
//               {!focusedContactId && !isSummaryLoading && !multipleSelected && (
//                 <div className="mt-10 text-center text-slate-500 text-sm">
//                   <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
//                     <Filter className="h-4 w-4 text-emerald-600" />
//                   </div>
//                   <p className="font-medium text-slate-800">
//                     No contact selected yet
//                   </p>
//                   <p className="mt-1 text-xs text-slate-500">
//                     Select a contact from the list (or open this page from Chat
//                     Inbox) to see their full CRM profile.
//                   </p>
//                 </div>
//               )}

//               {multipleSelected && (
//                 <div className="mt-10 text-center text-slate-500 text-sm">
//                   <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
//                     <Activity className="h-4 w-4 text-emerald-600" />
//                   </div>
//                   <p className="font-medium text-slate-800">
//                     Multiple contacts selected
//                   </p>
//                   <p className="mt-1 text-xs text-slate-500">
//                     Use the bulk actions bar for mass updates. Contact 360 is
//                     available when exactly one contact is selected.
//                   </p>
//                 </div>
//               )}

//               {focusedContactId && !multipleSelected && isSummaryLoading && (
//                 <div className="mt-6 space-y-3">
//                   <div className="animate-pulse space-y-3">
//                     <div className="h-5 w-32 rounded bg-emerald-100/70" />
//                     <div className="h-16 rounded-xl bg-emerald-50/80" />
//                     <div className="h-10 rounded-xl bg-emerald-50/70" />
//                     <div className="h-24 rounded-xl bg-emerald-50/60" />
//                   </div>
//                 </div>
//               )}

//               {focusedContactId &&
//                 !multipleSelected &&
//                 !isSummaryLoading &&
//                 contactSummary && (
//                   <>
//                     <div className="rounded-2xl border border-emerald-100 bg-white px-3 py-3 shadow-sm">
//                       <div className="flex items-start justify-between gap-2">
//                         <div>
//                           <div className="text-sm font-semibold text-slate-900">
//                             {displayName}
//                           </div>
//                           {displayPhone && (
//                             <div className="mt-0.5 text-xs text-slate-600 font-mono">
//                               {displayPhone}
//                             </div>
//                           )}
//                           {displayEmail && (
//                             <div className="mt-0.5 text-xs text-slate-500">
//                               {displayEmail}
//                             </div>
//                           )}
//                         </div>
//                         {displayStatus && (
//                           <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
//                             {displayStatus}
//                           </span>
//                         )}
//                       </div>

//                       <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-600">
//                         <div>
//                           <p className="text-[10px] uppercase text-slate-400">
//                             Created
//                           </p>
//                           <p className="mt-0.5 font-medium">
//                             {formatDateTime(createdAt)}
//                           </p>
//                         </div>
//                         <div>
//                           <p className="text-[10px] uppercase text-slate-400">
//                             Last inbound
//                           </p>
//                           <p className="mt-0.5 font-medium">
//                             {formatDateTime(lastInbound)}
//                           </p>
//                         </div>
//                         <div>
//                           <p className="text-[10px] uppercase text-slate-400">
//                             Last outbound
//                           </p>
//                           <p className="mt-0.5 font-medium">
//                             {formatDateTime(lastOutbound)}
//                           </p>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Tags / Reminders / Notes / Timeline remain unchanged */}
//                     {/* (kept here intentionally for later reuse in Inbox CRM panel) */}
//                   </>
//                 )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // 📄 src/pages/CRM/Contacts/Contacts.jsx

// import React, { useEffect, useMemo, useState } from "react";
// import { useLocation } from "react-router-dom";
// import {
//   User,
//   Tag,
//   Clock,
//   StickyNote,
//   Bell,
//   Activity,
//   Filter,
// } from "lucide-react";
// import { toast } from "react-toastify";

// import axiosClient from "../../../api/axiosClient";

// import ContactsTopBar from "./components/ContactsTopBar";
// import ContactsTable from "./components/ContactsTable";
// import ContactFormModal from "./components/ContactFormModal";
// import BulkActionsBar from "./components/BulkActionsBar";

// function formatDateTime(value) {
//   if (!value) return "—";
//   try {
//     return new Date(value).toLocaleString();
//   } catch {
//     return String(value);
//   }
// }

// export default function Contacts() {
//   // 🔹 UI state for list side
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingContact, setEditingContact] = useState(null);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [activeTab, setActiveTab] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);

//   // 🔹 URL -> contactId (for when we deep-link from Chat Inbox)
//   const location = useLocation();
//   const [focusedContactId, setFocusedContactId] = useState(null);

//   // 🔹 Contact 360 summary data
//   const [contactSummary, setContactSummary] = useState(null);
//   const [isSummaryLoading, setIsSummaryLoading] = useState(false);

//   // ────────────────────────────────────────────────
//   // 1) Hydrate focusedContactId from URL (?contactId=...)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const idFromUrl = params.get("contactId");

//     if (idFromUrl) {
//       setFocusedContactId(idFromUrl);

//       // Keep selection in a reasonable state for BulkActionsBar
//       setSelectedIds(prev =>
//         prev && prev.length > 0 && prev.includes(idFromUrl) ? prev : [idFromUrl]
//       );
//     }
//   }, [location.search]);

//   // ────────────────────────────────────────────────
//   // 2) When user selects contacts via checkboxes,
//   //    decide what Contact 360 should show
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const idFromUrl = params.get("contactId");

//     // If there is a deep-link contactId in the URL, do not override it here.
//     if (idFromUrl) return;

//     if (!selectedIds || selectedIds.length === 0) {
//       // Nothing selected → clear focus & summary
//       setFocusedContactId(null);
//       setContactSummary(null);
//       return;
//     }

//     if (selectedIds.length === 1) {
//       // Exactly one selected → that is our focused contact
//       setFocusedContactId(selectedIds[0]);
//       return;
//     }

//     // If multiple are selected, we keep the previous focusedContactId.
//     // The right panel will switch to a "multiple contacts selected" state.
//   }, [selectedIds]);

//   // ────────────────────────────────────────────────
//   // 3) Handlers for list side
//   // ────────────────────────────────────────────────
//   const handleAddClick = () => {
//     setEditingContact(null);
//     setIsModalOpen(true);
//   };

//   const handleEditContact = contact => {
//     setEditingContact(contact);
//     setIsModalOpen(true);
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setEditingContact(null);
//   };

//   const handleSaveComplete = () => {
//     // Modal will close itself via onClose; we just trigger refresh.
//     setRefreshTrigger(prev => prev + 1);
//   };

//   const handleSelectionChange = ids => {
//     setSelectedIds(ids || []);
//   };

//   const handleTabChange = tab => {
//     setActiveTab(tab);
//     setCurrentPage(1);
//     setSelectedIds([]);
//   };

//   const handleClearSelection = () => {
//     setSelectedIds([]);
//   };

//   const handleRefreshList = () => {
//     setRefreshTrigger(prev => prev + 1);
//   };

//   // ────────────────────────────────────────────────
//   // 4) Fetch Contact 360 summary when focusedContactId changes
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const contactId = focusedContactId;
//     if (!contactId) return;

//     let cancelled = false;

//     const loadSummary = async () => {
//       try {
//         setIsSummaryLoading(true);
//         const response = await axiosClient.get(
//           `/crm/contact-summary/${contactId}`
//         );
//         if (cancelled) return;
//         setContactSummary(response.data || null);
//       } catch (error) {
//         if (cancelled) return;
//         console.error("Failed to load contact summary", error);
//         toast.error(
//           error?.response?.data?.message ||
//             "Failed to load Contact 360 summary."
//         );
//         setContactSummary(null);
//       } finally {
//         if (!cancelled) {
//           setIsSummaryLoading(false);
//         }
//       }
//     };

//     loadSummary();

//     return () => {
//       cancelled = true;
//     };
//   }, [focusedContactId]);

//   // ────────────────────────────────────────────────
//   // 5) Derived CRM summary slices (tags, notes, reminder, timeline)
//   // ────────────────────────────────────────────────
//   const tagsList = useMemo(() => {
//     if (!contactSummary) return [];
//     if (Array.isArray(contactSummary.tags)) return contactSummary.tags;
//     if (Array.isArray(contactSummary.contactTags))
//       return contactSummary.contactTags;
//     if (Array.isArray(contactSummary.tagSummaries))
//       return contactSummary.tagSummaries;
//     if (Array.isArray(contactSummary.tagList)) return contactSummary.tagList;
//     return [];
//   }, [contactSummary]);

//   const recentNotes = useMemo(() => {
//     if (!contactSummary) return [];
//     const notes =
//       contactSummary.recentNotes ||
//       contactSummary.notes ||
//       contactSummary.lastNotes ||
//       [];
//     return Array.isArray(notes) ? notes.slice(0, 3) : [];
//   }, [contactSummary]);

//   const nextReminder = useMemo(() => {
//     if (!contactSummary) return null;
//     return (
//       contactSummary.nextReminder ||
//       contactSummary.upcomingReminder ||
//       contactSummary.reminder ||
//       null
//     );
//   }, [contactSummary]);

//   const recentTimeline = useMemo(() => {
//     if (!contactSummary) return [];
//     const items =
//       contactSummary.recentTimeline ||
//       contactSummary.timeline ||
//       contactSummary.events ||
//       [];
//     return Array.isArray(items) ? items.slice(0, 5) : [];
//   }, [contactSummary]);

//   const basic =
//     contactSummary?.contact ||
//     contactSummary?.contactBasic ||
//     contactSummary?.contactInfo ||
//     contactSummary ||
//     null;

//   const displayName =
//     basic?.fullName || basic?.name || basic?.contactName || "—";
//   const displayPhone =
//     basic?.phoneNumber || basic?.whatsappNumber || basic?.phone || "";
//   const displayEmail = basic?.email || basic?.emailAddress || "";
//   const displayStatus =
//     basic?.status || basic?.lifecycleStage || basic?.stage || null;
//   const createdAt =
//     basic?.createdAt ||
//     basic?.createdOn ||
//     basic?.firstSeenAt ||
//     basic?.createdDate;
//   const lastInbound =
//     basic?.lastInboundAt ||
//     basic?.lastInboundMessageAt ||
//     basic?.lastIncomingAt;
//   const lastOutbound =
//     basic?.lastOutboundAt ||
//     basic?.lastOutboundMessageAt ||
//     basic?.lastOutgoingAt;

//   const multipleSelected = selectedIds.length > 1;

//   // ────────────────────────────────────────────────
//   // 6) Render – green / XploreByte themed
//   // ────────────────────────────────────────────────
//   return (
//     <div className="flex h-full bg-gradient-to-r from-emerald-50 via-emerald-50/40 to-white">
//       {/* LEFT: Contacts list + workspace header + filters + bulk actions */}
//       <div className="flex-1 flex flex-col border-r border-slate-200 bg-white/90 backdrop-blur">
//         {/* Workspace-style header */}
//         <div className="border-b border-slate-200 bg-white/90">
//           <div className="px-5 pt-4 pb-3 flex items-center justify-between">
//             <div>
//               <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
//                 CRM Workspace
//               </p>
//               <h1 className="mt-1 text-lg font-semibold text-slate-900">
//                 Contacts
//               </h1>
//               <p className="mt-0.5 text-xs text-slate-500">
//                 Manage your leads and customers in one place.
//               </p>
//             </div>
//             <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
//               <User className="h-5 w-5 text-emerald-600" />
//             </div>
//           </div>

//           {/* Top bar: search + tabs + filters */}
//           <div className="border-t border-slate-100">
//             <ContactsTopBar
//               onAddClick={handleAddClick}
//               onSearchChange={setSearchTerm}
//               activeTab={activeTab}
//               onTabChange={handleTabChange}
//               searchTerm={searchTerm}
//               onFilterClick={() =>
//                 toast.info("Advanced filters will come in a later phase.")
//               }
//             />
//           </div>
//         </div>

//         {/* Bulk actions (only visible when something is selected) */}
//         {selectedIds.length > 0 && (
//           <BulkActionsBar
//             selectedIds={selectedIds}
//             onClearSelection={handleClearSelection}
//             onRefresh={handleRefreshList}
//           />
//         )}

//         {/* Contacts table */}
//         <div className="flex-1 overflow-hidden">
//           <ContactsTable
//             onEdit={handleEditContact}
//             refreshTrigger={refreshTrigger}
//             activeTab={activeTab}
//             onSelectionChange={handleSelectionChange}
//             searchTerm={searchTerm}
//             currentPage={currentPage}
//             setCurrentPage={setCurrentPage}
//           />
//         </div>

//         {/* Contact create/edit modal */}
//         <ContactFormModal
//           isOpen={isModalOpen}
//           onClose={handleModalClose}
//           contact={editingContact}
//           onSaveComplete={handleSaveComplete}
//         />
//       </div>

//       {/* RIGHT: Contact 360 mini-CRM panel */}
//       <div className="hidden lg:flex w-[360px] xl:w-[380px] flex-col bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/40">
//         {/* Header */}
//         <div className="border-b border-emerald-100 px-4 py-3 bg-white/90 backdrop-blur">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
//                 Contact 360
//               </p>
//               <p className="text-xs text-slate-500">
//                 Quick CRM snapshot for the selected contact
//               </p>
//             </div>
//             <div className="h-8 w-8 rounded-2xl bg-emerald-100 flex items-center justify-center">
//               <User className="h-4 w-4 text-emerald-700" />
//             </div>
//           </div>
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
//           {/* Empty state */}
//           {!focusedContactId && !isSummaryLoading && !multipleSelected && (
//             <div className="mt-10 text-center text-slate-500 text-sm">
//               <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
//                 <Filter className="h-4 w-4 text-emerald-600" />
//               </div>
//               <p className="font-medium text-slate-800">
//                 No contact selected yet
//               </p>
//               <p className="mt-1 text-xs text-slate-500">
//                 Select a contact from the list (or open this page from Chat
//                 Inbox) to see their full CRM profile.
//               </p>
//             </div>
//           )}

//           {/* Multiple selection state */}
//           {multipleSelected && (
//             <div className="mt-10 text-center text-slate-500 text-sm">
//               <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
//                 <Activity className="h-4 w-4 text-emerald-600" />
//               </div>
//               <p className="font-medium text-slate-800">
//                 Multiple contacts selected
//               </p>
//               <p className="mt-1 text-xs text-slate-500">
//                 Use the bulk actions bar for mass updates. Contact 360 is
//                 available when exactly one contact is selected.
//               </p>
//             </div>
//           )}

//           {/* Loading skeleton */}
//           {focusedContactId && !multipleSelected && isSummaryLoading && (
//             <div className="mt-6 space-y-3">
//               <div className="animate-pulse space-y-3">
//                 <div className="h-5 w-32 rounded bg-emerald-100/70" />
//                 <div className="h-16 rounded-xl bg-emerald-50/80" />
//                 <div className="h-10 rounded-xl bg-emerald-50/70" />
//                 <div className="h-24 rounded-xl bg-emerald-50/60" />
//               </div>
//             </div>
//           )}

//           {/* Actual summary */}
//           {focusedContactId &&
//             !multipleSelected &&
//             !isSummaryLoading &&
//             contactSummary && (
//               <>
//                 {/* Basic info card */}
//                 <div className="rounded-2xl border border-emerald-100 bg-white px-3 py-3 shadow-sm">
//                   <div className="flex items-start justify-between gap-2">
//                     <div>
//                       <div className="text-sm font-semibold text-slate-900">
//                         {displayName}
//                       </div>
//                       {displayPhone && (
//                         <div className="mt-0.5 text-xs text-slate-600 font-mono">
//                           {displayPhone}
//                         </div>
//                       )}
//                       {displayEmail && (
//                         <div className="mt-0.5 text-xs text-slate-500">
//                           {displayEmail}
//                         </div>
//                       )}
//                     </div>
//                     {displayStatus && (
//                       <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
//                         {displayStatus}
//                       </span>
//                     )}
//                   </div>

//                   <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-600">
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-400">
//                         Created
//                       </p>
//                       <p className="mt-0.5 font-medium">
//                         {formatDateTime(createdAt)}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-400">
//                         Last inbound
//                       </p>
//                       <p className="mt-0.5 font-medium">
//                         {formatDateTime(lastInbound)}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-400">
//                         Last outbound
//                       </p>
//                       <p className="mt-0.5 font-medium">
//                         {formatDateTime(lastOutbound)}
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Tags */}
//                 <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="flex items-center gap-2">
//                       <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
//                         <Tag className="h-3 w-3 text-emerald-700" />
//                       </div>
//                       <p className="text-xs font-semibold text-slate-800">
//                         Tags
//                       </p>
//                     </div>
//                   </div>
//                   {tagsList.length === 0 ? (
//                     <p className="text-xs text-slate-500">
//                       No tags yet. You can tag this contact from the main
//                       Contacts view.
//                     </p>
//                   ) : (
//                     <div className="flex flex-wrap gap-1.5">
//                       {tagsList.map(tag => (
//                         <span
//                           key={tag.id || tag.tagId || tag.name}
//                           className="inline-flex items-center rounded-full border border-slate-200 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-slate-800"
//                         >
//                           {tag.color && (
//                             <span
//                               className="mr-1 h-2 w-2 rounded-full"
//                               style={{ backgroundColor: tag.color }}
//                             />
//                           )}
//                           {tag.name || tag.label || tag.tagName}
//                         </span>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Next Reminder */}
//                 <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
//                   <div className="flex items-center gap-2 mb-2">
//                     <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
//                       <Bell className="h-3 w-3 text-emerald-700" />
//                     </div>
//                     <p className="text-xs font-semibold text-slate-800">
//                       Next reminder
//                     </p>
//                   </div>
//                   {!nextReminder ? (
//                     <p className="text-xs text-slate-500">
//                       No upcoming reminder scheduled.
//                     </p>
//                   ) : (
//                     <div className="space-y-1 text-xs text-slate-700">
//                       <p className="font-medium">
//                         {nextReminder.title ||
//                           nextReminder.subject ||
//                           "Reminder"}
//                       </p>
//                       {nextReminder.dueAt && (
//                         <p className="flex items-center gap-1 text-slate-500">
//                           <Clock className="h-3 w-3" />
//                           {formatDateTime(
//                             nextReminder.dueAt ||
//                               nextReminder.dueDate ||
//                               nextReminder.remindAt
//                           )}
//                         </p>
//                       )}
//                       {nextReminder.note && (
//                         <p className="text-[11px] text-slate-500">
//                           {nextReminder.note}
//                         </p>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 {/* Recent Notes */}
//                 <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
//                   <div className="flex items-center gap-2 mb-2">
//                     <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
//                       <StickyNote className="h-3 w-3 text-emerald-700" />
//                     </div>
//                     <p className="text-xs font-semibold text-slate-800">
//                       Recent notes
//                     </p>
//                   </div>
//                   {recentNotes.length === 0 ? (
//                     <p className="text-xs text-slate-500">
//                       No notes yet. Use the Notes module in CRM to add context
//                       for this lead.
//                     </p>
//                   ) : (
//                     <div className="space-y-2">
//                       {recentNotes.map(note => (
//                         <div
//                           key={note.id || note.noteId}
//                           className="rounded-lg border border-slate-100 bg-emerald-50/40 px-2 py-1.5"
//                         >
//                           <p className="text-[11px] font-medium text-slate-800">
//                             {note.title || "Note"}
//                           </p>
//                           {note.content && (
//                             <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">
//                               {note.content}
//                             </p>
//                           )}
//                           {note.createdAt && (
//                             <p className="mt-0.5 text-[10px] text-slate-400">
//                               {formatDateTime(note.createdAt)}
//                             </p>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Recent Timeline */}
//                 <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 mb-2 shadow-sm">
//                   <div className="flex items-center gap-2 mb-2">
//                     <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
//                       <Activity className="h-3 w-3 text-emerald-700" />
//                     </div>
//                     <p className="text-xs font-semibold text-slate-800">
//                       Recent activity
//                     </p>
//                   </div>
//                   {recentTimeline.length === 0 ? (
//                     <p className="text-xs text-slate-500">
//                       No recent timeline events captured for this contact yet.
//                     </p>
//                   ) : (
//                     <ol className="space-y-1.5 text-[11px] text-slate-700">
//                       {recentTimeline.map(item => (
//                         <li
//                           key={item.id || item.eventId || item.occurredAt}
//                           className="flex items-start gap-2"
//                         >
//                           <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
//                           <div>
//                             <p className="font-medium">
//                               {item.title || item.type || "Event"}
//                             </p>
//                             {item.description && (
//                               <p className="text-[11px] text-slate-600 line-clamp-2">
//                                 {item.description}
//                               </p>
//                             )}
//                             {item.occurredAt && (
//                               <p className="text-[10px] text-slate-400 mt-0.5">
//                                 {formatDateTime(item.occurredAt)}
//                               </p>
//                             )}
//                           </div>
//                         </li>
//                       ))}
//                     </ol>
//                   )}
//                 </div>
//               </>
//             )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // 📄 src/pages/CRM/Contacts/Contacts.jsx

// import React, { useEffect, useMemo, useState } from "react";
// import { useLocation } from "react-router-dom";
// import {
//   User,
//   Tag,
//   Clock,
//   StickyNote,
//   Bell,
//   Activity,
//   Filter,
// } from "lucide-react";
// import { toast } from "react-toastify";

// import axiosClient from "../../../api/axiosClient";

// import ContactsTopBar from "./components/ContactsTopBar";
// import ContactsTable from "./components/ContactsTable";
// import ContactFormModal from "./components/ContactFormModal";
// import BulkActionsBar from "./components/BulkActionsBar";

// function formatDateTime(value) {
//   if (!value) return "—";
//   try {
//     return new Date(value).toLocaleString();
//   } catch {
//     return String(value);
//   }
// }

// export default function Contacts() {
//   // 🔹 UI state for list side
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingContact, setEditingContact] = useState(null);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [activeTab, setActiveTab] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);

//   // 🔹 URL -> contactId (for when we deep-link from Chat Inbox)
//   const location = useLocation();
//   const [focusedContactId, setFocusedContactId] = useState(null);

//   // 🔹 Contact 360 summary data
//   const [contactSummary, setContactSummary] = useState(null);
//   const [isSummaryLoading, setIsSummaryLoading] = useState(false);

//   // ────────────────────────────────────────────────
//   // 1) Hydrate focusedContactId from URL (?contactId=...)
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const idFromUrl = params.get("contactId");

//     if (idFromUrl) {
//       setFocusedContactId(idFromUrl);

//       // Keep selection in a reasonable state for BulkActionsBar
//       setSelectedIds(prev =>
//         prev && prev.length > 0 && prev.includes(idFromUrl) ? prev : [idFromUrl]
//       );
//     }
//   }, [location.search]);

//   // ────────────────────────────────────────────────
//   // 2) When user selects contacts via checkboxes,
//   //    focus the first one for Contact 360
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     if (selectedIds && selectedIds.length > 0) {
//       setFocusedContactId(selectedIds[0]);
//     } else {
//       // Only clear if not coming from a URL-driven focus
//       const params = new URLSearchParams(location.search);
//       const idFromUrl = params.get("contactId");
//       if (!idFromUrl) {
//         setFocusedContactId(null);
//         setContactSummary(null);
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedIds]);

//   // ────────────────────────────────────────────────
//   // 3) Handlers for list side
//   // ────────────────────────────────────────────────
//   const handleAddClick = () => {
//     setEditingContact(null);
//     setIsModalOpen(true);
//   };

//   const handleEditContact = contact => {
//     setEditingContact(contact);
//     setIsModalOpen(true);
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setEditingContact(null);
//   };

//   const handleSaveComplete = () => {
//     // Modal will close itself via onClose; we just trigger refresh.
//     setRefreshTrigger(prev => prev + 1);
//   };

//   const handleSelectionChange = ids => {
//     setSelectedIds(ids || []);
//   };

//   const handleTabChange = tab => {
//     setActiveTab(tab);
//     setCurrentPage(1);
//     setSelectedIds([]);
//   };

//   const handleClearSelection = () => {
//     setSelectedIds([]);
//   };

//   const handleRefreshList = () => {
//     setRefreshTrigger(prev => prev + 1);
//   };

//   // ────────────────────────────────────────────────
//   // 4) Fetch Contact 360 summary when focusedContactId changes
//   // ────────────────────────────────────────────────
//   useEffect(() => {
//     const contactId = focusedContactId;
//     if (!contactId) return;

//     let cancelled = false;

//     const loadSummary = async () => {
//       try {
//         setIsSummaryLoading(true);
//         const response = await axiosClient.get(
//           `/crm/contact-summary/${contactId}`
//         );
//         if (cancelled) return;
//         setContactSummary(response.data || null);
//       } catch (error) {
//         if (cancelled) return;
//         console.error("Failed to load contact summary", error);
//         toast.error(
//           error?.response?.data?.message ||
//             "Failed to load Contact 360 summary."
//         );
//         setContactSummary(null);
//       } finally {
//         if (!cancelled) {
//           setIsSummaryLoading(false);
//         }
//       }
//     };

//     loadSummary();

//     return () => {
//       cancelled = true;
//     };
//   }, [focusedContactId]);

//   // ────────────────────────────────────────────────
//   // 5) Derived CRM summary slices (tags, notes, reminder, timeline)
//   //    – mirrors the logic we’re already using in Chat Inbox
//   // ────────────────────────────────────────────────
//   const tagsList = useMemo(() => {
//     if (!contactSummary) return [];
//     if (Array.isArray(contactSummary.tags)) return contactSummary.tags;
//     if (Array.isArray(contactSummary.contactTags))
//       return contactSummary.contactTags;
//     if (Array.isArray(contactSummary.tagSummaries))
//       return contactSummary.tagSummaries;
//     if (Array.isArray(contactSummary.tagList)) return contactSummary.tagList;
//     return [];
//   }, [contactSummary]);

//   const recentNotes = useMemo(() => {
//     if (!contactSummary) return [];
//     const notes =
//       contactSummary.recentNotes ||
//       contactSummary.notes ||
//       contactSummary.lastNotes ||
//       [];
//     return Array.isArray(notes) ? notes.slice(0, 3) : [];
//   }, [contactSummary]);

//   const nextReminder = useMemo(() => {
//     if (!contactSummary) return null;
//     return (
//       contactSummary.nextReminder ||
//       contactSummary.upcomingReminder ||
//       contactSummary.reminder ||
//       null
//     );
//   }, [contactSummary]);

//   const recentTimeline = useMemo(() => {
//     if (!contactSummary) return [];
//     const items =
//       contactSummary.recentTimeline ||
//       contactSummary.timeline ||
//       contactSummary.events ||
//       [];
//     return Array.isArray(items) ? items.slice(0, 5) : [];
//   }, [contactSummary]);

//   const basic =
//     contactSummary?.contact ||
//     contactSummary?.contactBasic ||
//     contactSummary?.contactInfo ||
//     contactSummary ||
//     null;

//   const displayName =
//     basic?.fullName || basic?.name || basic?.contactName || "—";
//   const displayPhone =
//     basic?.phoneNumber || basic?.whatsappNumber || basic?.phone || "";
//   const displayEmail = basic?.email || basic?.emailAddress || "";
//   const displayStatus =
//     basic?.status || basic?.lifecycleStage || basic?.stage || null;
//   const createdAt =
//     basic?.createdAt ||
//     basic?.createdOn ||
//     basic?.firstSeenAt ||
//     basic?.createdDate;
//   const lastInbound =
//     basic?.lastInboundAt ||
//     basic?.lastInboundMessageAt ||
//     basic?.lastIncomingAt;
//   const lastOutbound =
//     basic?.lastOutboundAt ||
//     basic?.lastOutboundMessageAt ||
//     basic?.lastOutgoingAt;

//   // ────────────────────────────────────────────────
//   // 6) Render
//   // ────────────────────────────────────────────────
//   return (
//     <div className="flex h-full bg-slate-50">
//       {/* LEFT: Contacts list + filters + bulk actions */}
//       <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
//         {/* Top bar: search + tabs + filters */}
//         <div className="border-b border-slate-200">
//           <ContactsTopBar
//             onAddClick={handleAddClick}
//             onSearchChange={setSearchTerm}
//             activeTab={activeTab}
//             onTabChange={handleTabChange}
//             searchTerm={searchTerm}
//             onFilterClick={() =>
//               toast.info("Advanced filters will come in a later phase.")
//             }
//           />
//         </div>

//         {/* Bulk actions (only visible when something is selected) */}
//         {selectedIds.length > 0 && (
//           <BulkActionsBar
//             selectedIds={selectedIds}
//             onClearSelection={handleClearSelection}
//             onRefresh={handleRefreshList}
//           />
//         )}

//         {/* Contacts table */}
//         <div className="flex-1 overflow-hidden">
//           <ContactsTable
//             onEdit={handleEditContact}
//             refreshTrigger={refreshTrigger}
//             activeTab={activeTab}
//             onSelectionChange={handleSelectionChange}
//             searchTerm={searchTerm}
//             currentPage={currentPage}
//             setCurrentPage={setCurrentPage}
//           />
//         </div>

//         {/* Contact create/edit modal */}
//         <ContactFormModal
//           isOpen={isModalOpen}
//           onClose={handleModalClose}
//           contact={editingContact}
//           onSaveComplete={handleSaveComplete}
//         />
//       </div>

//       {/* RIGHT: Contact 360 mini-CRM panel */}
//       <div className="hidden lg:flex w-[360px] xl:w-[380px] flex-col bg-slate-25">
//         {/* Header */}
//         <div className="border-b border-slate-200 px-4 py-3 bg-white">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
//                 Contact 360
//               </p>
//               <p className="text-xs text-slate-500">
//                 Quick CRM snapshot for the selected contact
//               </p>
//             </div>
//             <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
//               <User className="h-4 w-4 text-purple-600" />
//             </div>
//           </div>
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
//           {/* Empty state */}
//           {!focusedContactId && !isSummaryLoading && (
//             <div className="mt-8 text-center text-slate-500 text-sm">
//               <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
//                 <Filter className="h-4 w-4 text-slate-500" />
//               </div>
//               <p className="font-medium">No contact selected</p>
//               <p className="mt-1 text-xs text-slate-500">
//                 Select a contact from the list (or open this page from Chat
//                 Inbox) to see their CRM profile.
//               </p>
//             </div>
//           )}

//           {/* Loading */}
//           {focusedContactId && isSummaryLoading && (
//             <div className="mt-6 space-y-3">
//               <div className="animate-pulse space-y-3">
//                 <div className="h-5 w-32 rounded bg-slate-200" />
//                 <div className="h-16 rounded-xl bg-slate-100" />
//                 <div className="h-10 rounded-xl bg-slate-100" />
//                 <div className="h-24 rounded-xl bg-slate-100" />
//               </div>
//             </div>
//           )}

//           {/* Actual summary */}
//           {focusedContactId && !isSummaryLoading && contactSummary && (
//             <>
//               {/* Basic info card */}
//               <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
//                 <div className="flex items-start justify-between gap-2">
//                   <div>
//                     <div className="text-sm font-semibold text-slate-900">
//                       {displayName}
//                     </div>
//                     {displayPhone && (
//                       <div className="mt-0.5 text-xs text-slate-600 font-mono">
//                         {displayPhone}
//                       </div>
//                     )}
//                     {displayEmail && (
//                       <div className="mt-0.5 text-xs text-slate-500">
//                         {displayEmail}
//                       </div>
//                     )}
//                   </div>
//                   {displayStatus && (
//                     <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
//                       {displayStatus}
//                     </span>
//                   )}
//                 </div>

//                 <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-600">
//                   <div>
//                     <p className="text-[10px] uppercase text-slate-400">
//                       Created
//                     </p>
//                     <p className="mt-0.5 font-medium">
//                       {formatDateTime(createdAt)}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-[10px] uppercase text-slate-400">
//                       Last inbound
//                     </p>
//                     <p className="mt-0.5 font-medium">
//                       {formatDateTime(lastInbound)}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-[10px] uppercase text-slate-400">
//                       Last outbound
//                     </p>
//                     <p className="mt-0.5 font-medium">
//                       {formatDateTime(lastOutbound)}
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {/* Tags */}
//               <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
//                 <div className="flex items-center justify-between mb-2">
//                   <div className="flex items-center gap-2">
//                     <div className="h-6 w-6 rounded-full bg-purple-50 flex items-center justify-center">
//                       <Tag className="h-3 w-3 text-purple-600" />
//                     </div>
//                     <p className="text-xs font-semibold text-slate-800">Tags</p>
//                   </div>
//                 </div>
//                 {tagsList.length === 0 ? (
//                   <p className="text-xs text-slate-500">
//                     No tags yet. You can tag this contact from the main Contacts
//                     view.
//                   </p>
//                 ) : (
//                   <div className="flex flex-wrap gap-1.5">
//                     {tagsList.map(tag => (
//                       <span
//                         key={tag.id || tag.tagId || tag.name}
//                         className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-800"
//                       >
//                         {tag.color && (
//                           <span
//                             className="mr-1 h-2 w-2 rounded-full"
//                             style={{ backgroundColor: tag.color }}
//                           />
//                         )}
//                         {tag.name || tag.label || tag.tagName}
//                       </span>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Next Reminder */}
//               <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
//                 <div className="flex items-center gap-2 mb-2">
//                   <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
//                     <Bell className="h-3 w-3 text-emerald-700" />
//                   </div>
//                   <p className="text-xs font-semibold text-slate-800">
//                     Next reminder
//                   </p>
//                 </div>
//                 {!nextReminder ? (
//                   <p className="text-xs text-slate-500">
//                     No upcoming reminder scheduled.
//                   </p>
//                 ) : (
//                   <div className="space-y-1 text-xs text-slate-700">
//                     <p className="font-medium">
//                       {nextReminder.title || nextReminder.subject || "Reminder"}
//                     </p>
//                     {nextReminder.dueAt && (
//                       <p className="flex items-center gap-1 text-slate-500">
//                         <Clock className="h-3 w-3" />
//                         {formatDateTime(
//                           nextReminder.dueAt ||
//                             nextReminder.dueDate ||
//                             nextReminder.remindAt
//                         )}
//                       </p>
//                     )}
//                     {nextReminder.note && (
//                       <p className="text-[11px] text-slate-500">
//                         {nextReminder.note}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Recent Notes */}
//               <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
//                 <div className="flex items-center gap-2 mb-2">
//                   <div className="h-6 w-6 rounded-full bg-sky-50 flex items-center justify-center">
//                     <StickyNote className="h-3 w-3 text-sky-700" />
//                   </div>
//                   <p className="text-xs font-semibold text-slate-800">
//                     Recent notes
//                   </p>
//                 </div>
//                 {recentNotes.length === 0 ? (
//                   <p className="text-xs text-slate-500">
//                     No notes yet. Use the Notes module in CRM to add context for
//                     this lead.
//                   </p>
//                 ) : (
//                   <div className="space-y-2">
//                     {recentNotes.map(note => (
//                       <div
//                         key={note.id || note.noteId}
//                         className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
//                       >
//                         <p className="text-[11px] font-medium text-slate-800">
//                           {note.title || "Note"}
//                         </p>
//                         {note.content && (
//                           <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">
//                             {note.content}
//                           </p>
//                         )}
//                         {note.createdAt && (
//                           <p className="mt-0.5 text-[10px] text-slate-400">
//                             {formatDateTime(note.createdAt)}
//                           </p>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Recent Timeline */}
//               <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 mb-2">
//                 <div className="flex items-center gap-2 mb-2">
//                   <div className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center">
//                     <Activity className="h-3 w-3 text-indigo-700" />
//                   </div>
//                   <p className="text-xs font-semibold text-slate-800">
//                     Recent activity
//                   </p>
//                 </div>
//                 {recentTimeline.length === 0 ? (
//                   <p className="text-xs text-slate-500">
//                     No recent timeline events captured for this contact yet.
//                   </p>
//                 ) : (
//                   <ol className="space-y-1.5 text-[11px] text-slate-700">
//                     {recentTimeline.map(item => (
//                       <li
//                         key={item.id || item.eventId || item.occurredAt}
//                         className="flex items-start gap-2"
//                       >
//                         <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
//                         <div>
//                           <p className="font-medium">
//                             {item.title || item.type || "Event"}
//                           </p>
//                           {item.description && (
//                             <p className="text-[11px] text-slate-600 line-clamp-2">
//                               {item.description}
//                             </p>
//                           )}
//                           {item.occurredAt && (
//                             <p className="text-[10px] text-slate-400 mt-0.5">
//                               {formatDateTime(item.occurredAt)}
//                             </p>
//                           )}
//                         </div>
//                       </li>
//                     ))}
//                   </ol>
//                 )}
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useState } from "react";
// import TopBar from "./components/ContactsTopBar";
// import ContactsTable from "./components/ContactsTable";
// import ContactFormModal from "./components/ContactFormModal";
// import BulkActionsBar from "./components/BulkActionsBar";

// function Contacts() {
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedContact, setSelectedContact] = useState(null);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [currentPage, setCurrentPage] = useState(1); // ✅ Added here
//   const [activeTab, setActiveTab] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedIds, setSelectedIds] = useState([]);

//   const handleAddNew = () => {
//     setSelectedContact(null);
//     setIsModalOpen(true);
//   };

//   const handleEdit = contact => {
//     setSelectedContact(contact);
//     setIsModalOpen(true);
//   };

//   const handleSaveComplete = () => {
//     setIsModalOpen(false);
//     setSelectedContact(null);
//     setCurrentPage(1); // ✅ Reset to page 1 on save
//     setRefreshTrigger(prev => prev + 1);
//   };

//   const handleSelectionChange = ids => {
//     setSelectedIds(ids);
//   };

//   const clearSelection = () => {
//     setSelectedIds([]);
//   };

//   return (
//     <div className="p-4 space-y-4">
//       <TopBar
//         onAddClick={handleAddNew}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         onSearchChange={setSearchTerm}
//       />

//       {selectedIds.length > 0 && (
//         <BulkActionsBar
//           selectedIds={selectedIds}
//           onClearSelection={clearSelection}
//           onRefresh={() => setRefreshTrigger(prev => prev + 1)}
//         />
//       )}

//       <ContactsTable
//         onEdit={handleEdit}
//         activeTab={activeTab}
//         refreshTrigger={refreshTrigger}
//         searchTerm={searchTerm}
//         onSelectionChange={handleSelectionChange}
//         selectedIds={selectedIds}
//         currentPage={currentPage}
//         setCurrentPage={setCurrentPage} // ✅ Pass down
//       />

//       <ContactFormModal
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         contact={selectedContact}
//         onSaveComplete={handleSaveComplete}
//       />
//     </div>
//   );
// }

// export default Contacts;
