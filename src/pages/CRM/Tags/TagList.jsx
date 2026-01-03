// 📄 src/pages/CRM/Tags/TagList.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Tag as TagIcon,
  X as CloseIcon,
  Plus,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosClient from "../../../api/axiosClient";
import TagForm from "./TagForm";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "-";
  }
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${className}`}
    >
      {children}
    </span>
  );
}

function normalizeTagsResponse(res) {
  // Supports:
  // 1) plain array
  // 2) ResponseResult { success, message, data: [...] }
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

// Soft tint for tag chip background using hex
function softBgFromHex(hex) {
  if (!hex) return "rgba(16,185,129,0.12)";
  const ok = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex);
  if (!ok) return "rgba(16,185,129,0.12)";
  return `${hex}22`; // add alpha
}

export default function TagList({
  // You can still use it as standalone (it will fetch)
  // OR embed inside Tags.jsx and pass tags directly.
  tags: tagsFromParent = null,
  loading: loadingFromParent = null,

  searchTerm = "",
  refreshKey,
  onDeleteComplete,

  // UI controls
  showHeader = true,
  noContainer = false,
  containerClassName = "max-w-4xl mx-auto",
}) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);

  const effectiveLoading =
    typeof loadingFromParent === "boolean" ? loadingFromParent : loading;

  const effectiveTags = Array.isArray(tagsFromParent) ? tagsFromParent : tags;

  const fetchTags = async () => {
    // If parent provides tags, we don’t fetch
    if (Array.isArray(tagsFromParent)) return;

    setLoading(true);
    try {
      // ✅ FIX: Your controller is [HttpGet("get-tags")]
      const res = await axiosClient.get("/tags");
      const list = normalizeTagsResponse(res);
      setTags(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tags");
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filteredTags = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return effectiveTags;

    return effectiveTags.filter(t => {
      const name = (t.name || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      return name.includes(term) || cat.includes(term);
    });
  }, [effectiveTags, searchTerm]);

  const openCreateModal = () => {
    setSelectedTag(null);
    setShowFormModal(true);
  };

  const openEditModal = tag => {
    setSelectedTag(tag);
    setShowFormModal(true);
  };

  const closeModal = () => {
    setShowFormModal(false);
    setSelectedTag(null);
  };

  const handleSaveComplete = (success = true, message = "") => {
    if (success) {
      fetchTags(); // refresh if we’re in standalone mode
      toast.success(message || (selectedTag ? "Tag updated" : "Tag created"));
    } else {
      toast.error(message || "Failed to save tag");
    }
    closeModal();
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this tag?")) return;

    try {
      await axiosClient.delete(`/tags/${id}`);
      toast.success("Tag deleted");
      fetchTags();
      onDeleteComplete?.(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete tag");
      onDeleteComplete?.(false);
    }
  };

  const CreateButton = ({ label = "Create" }) => (
    <button
      type="button"
      onClick={openCreateModal}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold
                 bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
    >
      <Plus size={16} />
      {label}
    </button>
  );

  const shouldRenderHeader = showHeader && !noContainer;

  const body = effectiveLoading ? (
    <div className="px-6 py-10 text-sm text-slate-500">Loading tags…</div>
  ) : !filteredTags.length ? (
    <div className="px-6 py-14 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
        <TagIcon size={20} />
      </div>
      <p className="text-sm font-semibold text-slate-900">
        No tags created yet
      </p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        Create your first tag to segment contacts and power Inbox CRM actions.
      </p>

      <div className="mt-4">
        <CreateButton label="Create your first tag" />
      </div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-emerald-50 text-[11px] uppercase tracking-wide text-emerald-700">
          <tr>
            <th className="px-6 py-3 text-left font-semibold w-[34%]">Tag</th>
            <th className="px-6 py-3 text-left font-semibold w-[20%]">
              Category
            </th>
            <th className="px-6 py-3 text-left font-semibold w-[16%]">Type</th>
            <th className="px-6 py-3 text-left font-semibold w-[18%]">
              Created
            </th>
            <th className="px-6 py-3 text-right font-semibold w-[12%]">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {filteredTags.map(tag => (
            <tr
              key={tag.id}
              className="hover:bg-emerald-50/30 transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold"
                    style={{
                      background: softBgFromHex(tag.colorHex),
                      color: "#0f172a",
                      border: "1px solid rgba(15,23,42,0.06)",
                    }}
                  >
                    {tag.name}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4">
                {tag.category ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {tag.category}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>

              <td className="px-6 py-4">
                {tag.isSystemTag ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    System
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Custom
                  </span>
                )}
              </td>

              <td className="px-6 py-4 text-slate-700">
                {formatDate(tag.createdAt)}
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEditModal(tag)}
                    className="p-2 rounded-md text-emerald-700 hover:bg-emerald-50"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    title="Delete"
                    onClick={() => handleDelete(tag.id)}
                    className="p-2 rounded-md text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const content = noContainer ? (
    body
  ) : (
    <div className="bg-white rounded-md border border-slate-100 shadow-sm overflow-hidden">
      {shouldRenderHeader && (
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Tag Library
                </h3>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Guide
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Keep tags short and consistent. You’ll reuse them in Contacts and
                the Inbox CRM side panel.
              </p>

              <div className="mt-3 text-xs text-slate-500">
                {effectiveLoading ? "Loading…" : `${filteredTags.length} tag(s)`}
              </div>
            </div>

            <CreateButton />
          </div>
        </div>
      )}
      {body}
    </div>
  );

  return (
    <div className={containerClassName}>
      {content}

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4 relative">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <CloseIcon size={18} />
            </button>
            <div className="p-5">
              <TagForm
                selectedTag={selectedTag}
                onSaveComplete={handleSaveComplete}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// // 📄 src/pages/CRM/Tags/TagList.jsx

// import { useEffect, useMemo, useState } from "react";
// import {
//   Eye,
//   Pencil,
//   Trash2,
//   Tag as TagIcon,
//   X as CloseIcon,
//   Plus,
// } from "lucide-react";
// import { toast } from "react-toastify";
// import axiosClient from "../../../api/axiosClient";
// import TagForm from "./TagForm";

// function formatDate(value) {
//   if (!value) return "-";
//   try {
//     return new Date(value).toLocaleDateString();
//   } catch {
//     return "-";
//   }
// }

// function Pill({ children, className = "" }) {
//   return (
//     <span
//       className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border ${className}`}
//     >
//       {children}
//     </span>
//   );
// }

// function normalizeTagsResponse(res) {
//   // Supports:
//   // 1) plain array
//   // 2) ResponseResult { success, message, data: [...] }
//   if (Array.isArray(res?.data)) return res.data;
//   if (Array.isArray(res?.data?.data)) return res.data.data;
//   return [];
// }

// export default function TagList({
//   searchTerm = "",
//   refreshKey,
//   onDeleteComplete,
//   // Optional: if parent is not centering the page, TagList will center itself
//   containerClassName = "max-w-4xl mx-auto",
// }) {
//   const [tags, setTags] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // modal state
//   const [showFormModal, setShowFormModal] = useState(false);
//   const [selectedTag, setSelectedTag] = useState(null);

//   const fetchTags = async () => {
//     setLoading(true);
//     try {
//       // ✅ Your controller: [HttpGet("get-tags")]
//       const res = await axiosClient.get("/tags");
//       const list = normalizeTagsResponse(res);
//       setTags(list);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load tags");
//       setTags([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTags();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [refreshKey]);

//   const filteredTags = useMemo(() => {
//     const term = (searchTerm || "").toLowerCase().trim();
//     if (!term) return tags;

//     return tags.filter(t => {
//       const name = (t.name || "").toLowerCase();
//       const cat = (t.category || "").toLowerCase();
//       return name.includes(term) || cat.includes(term);
//     });
//   }, [tags, searchTerm]);

//   const openCreateModal = () => {
//     setSelectedTag(null);
//     setShowFormModal(true);
//   };

//   const openEditModal = tag => {
//     setSelectedTag(tag);
//     setShowFormModal(true);
//   };

//   const closeModal = () => {
//     setShowFormModal(false);
//     setSelectedTag(null);
//   };

//   const handleSaveComplete = (success = true, message = "") => {
//     if (success) {
//       fetchTags();
//       if (message) toast.success(message);
//       else toast.success(selectedTag ? "Tag updated" : "Tag created");
//     } else {
//       toast.error(message || "Failed to save tag");
//     }
//     closeModal();
//   };

//   const handleDelete = async id => {
//     if (!window.confirm("Delete this tag?")) return;

//     try {
//       await axiosClient.delete(`/tags/${id}`);
//       toast.success("Tag deleted");
//       fetchTags();
//       onDeleteComplete?.(true);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete tag");
//       onDeleteComplete?.(false);
//     }
//   };

//   const CreateButton = ({ label = "Create" }) => (
//     <button
//       type="button"
//       onClick={openCreateModal}
//       className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
//                  bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
//     >
//       <Plus size={16} />
//       {label}
//     </button>
//   );

//   return (
//     <div className={containerClassName}>
//       {/* ✅ Compact, premium card (not full-page empty ocean) */}
//       <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
//         {/* Header */}
//         <div className="px-6 py-5 border-b border-slate-100">
//           <div className="flex items-start justify-between gap-4">
//             <div>
//               <div className="flex flex-wrap items-center gap-2">
//                 <h3 className="text-sm font-semibold text-slate-900">
//                   Tag Library
//                 </h3>

//                 {/* ✅ Guide badges */}
//                 <Pill className="bg-emerald-50 text-emerald-700 border-emerald-200">
//                   Guide
//                 </Pill>
//                 <Pill className="bg-slate-50 text-slate-700 border-slate-200">
//                   Best practice
//                 </Pill>
//               </div>

//               <p className="text-xs text-slate-500 mt-1 max-w-2xl">
//                 Keep tags short and consistent. You’ll reuse them in Contacts
//                 and the Inbox CRM side panel (notes/reminders/tags).
//               </p>
//             </div>

//             <CreateButton />
//           </div>

//           {/* Meta line */}
//           <div className="mt-3 text-xs text-slate-500">
//             {loading ? "Loading…" : `${filteredTags.length} tag(s)`}
//           </div>
//         </div>

//         {/* Body */}
//         {loading ? (
//           <div className="px-6 py-10 text-sm text-slate-500">Loading tags…</div>
//         ) : !filteredTags.length ? (
//           <div className="px-6 py-14 flex flex-col items-center text-center">
//             <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
//               <TagIcon size={20} />
//             </div>
//             <p className="text-sm font-semibold text-slate-900">
//               No tags created yet
//             </p>
//             <p className="text-xs text-slate-500 mt-1 max-w-sm">
//               Create your first tag to segment contacts, track intent, and power
//               Inbox-side CRM actions.
//             </p>

//             <div className="mt-4">
//               <CreateButton label="Create your first tag" />
//             </div>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             {/* ✅ Compact table that still looks premium */}
//             <table className="w-full text-sm">
//               <thead className="bg-slate-50">
//                 <tr className="text-[11px] uppercase tracking-wide text-slate-500">
//                   <th className="px-6 py-3 text-left font-semibold">Tag</th>
//                   <th className="px-6 py-3 text-left font-semibold">
//                     Category
//                   </th>
//                   <th className="px-6 py-3 text-left font-semibold">System</th>
//                   <th className="px-6 py-3 text-left font-semibold">Created</th>
//                   <th className="px-6 py-3 text-right font-semibold">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-slate-100">
//                 {filteredTags.map(tag => (
//                   <tr
//                     key={tag.id}
//                     className="hover:bg-emerald-50/30 transition-colors"
//                   >
//                     <td className="px-6 py-4">
//                       <div className="flex items-center gap-3">
//                         <span
//                           className="w-2.5 h-2.5 rounded-full"
//                           style={{ backgroundColor: tag.colorHex || "#22C55E" }}
//                         />
//                         <span className="font-semibold text-slate-900">
//                           {tag.name}
//                         </span>
//                       </div>
//                     </td>

//                     <td className="px-6 py-4 text-slate-700">
//                       {tag.category ? (
//                         <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
//                           {tag.category}
//                         </span>
//                       ) : (
//                         <span className="text-slate-400">—</span>
//                       )}
//                     </td>

//                     <td className="px-6 py-4">
//                       {tag.isSystemTag ? (
//                         <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
//                           Yes
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
//                           No
//                         </span>
//                       )}
//                     </td>

//                     <td className="px-6 py-4 text-slate-700">
//                       {formatDate(tag.createdAt)}
//                     </td>

//                     <td className="px-6 py-4">
//                       <div className="flex justify-end gap-2">
//                         <button
//                           type="button"
//                           title="View (coming soon)"
//                           disabled
//                           className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-60"
//                         >
//                           <Eye size={16} />
//                         </button>

//                         <button
//                           type="button"
//                           title="Edit"
//                           onClick={() => openEditModal(tag)}
//                           className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50"
//                         >
//                           <Pencil size={16} />
//                         </button>

//                         <button
//                           type="button"
//                           title="Delete"
//                           onClick={() => handleDelete(tag.id)}
//                           className="p-2 rounded-xl text-red-600 hover:bg-red-50"
//                         >
//                           <Trash2 size={16} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Modal */}
//       {showFormModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
//             <button
//               type="button"
//               onClick={closeModal}
//               className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
//             >
//               <CloseIcon size={18} />
//             </button>
//             <div className="p-5">
//               <TagForm
//                 selectedTag={selectedTag}
//                 onSaveComplete={handleSaveComplete}
//                 onCancel={closeModal}
//               />
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // 📄 src/pages/CRM/Tags/TagList.jsx

// import { useEffect, useMemo, useState } from "react";
// import {
//   Eye,
//   Pencil,
//   Trash2,
//   Tag as TagIcon,
//   X as CloseIcon,
//   Plus,
// } from "lucide-react";
// import { toast } from "react-toastify";
// import axiosClient from "../../../api/axiosClient";
// import TagForm from "./TagForm";

// function formatDate(value) {
//   if (!value) return "-";
//   try {
//     return new Date(value).toLocaleDateString();
//   } catch {
//     return "-";
//   }
// }

// function Pill({ children, bg, text }) {
//   return (
//     <span
//       className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${bg} ${text}`}
//     >
//       {children}
//     </span>
//   );
// }

// export default function TagList({
//   searchTerm = "",
//   refreshKey,
//   onDeleteComplete,
// }) {
//   const [tags, setTags] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // modal state
//   const [showFormModal, setShowFormModal] = useState(false);
//   const [selectedTag, setSelectedTag] = useState(null);

//   const fetchTags = async () => {
//     setLoading(true);
//     try {
//       const res = await axiosClient.get("/tags");
//       let list = [];
//       if (Array.isArray(res.data)) list = res.data;
//       else if (Array.isArray(res.data?.data)) list = res.data.data;
//       setTags(list);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load tags");
//       setTags([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTags();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [refreshKey]);

//   const filteredTags = useMemo(() => {
//     const term = (searchTerm || "").toLowerCase().trim();
//     if (!term) return tags;
//     return tags.filter(t => {
//       const name = (t.name || "").toLowerCase();
//       const cat = (t.category || "").toLowerCase();
//       return name.includes(term) || cat.includes(term);
//     });
//   }, [tags, searchTerm]);

//   const openCreateModal = () => {
//     setSelectedTag(null);
//     setShowFormModal(true);
//   };

//   const openEditModal = tag => {
//     setSelectedTag(tag);
//     setShowFormModal(true);
//   };

//   const closeModal = () => {
//     setShowFormModal(false);
//     setSelectedTag(null);
//   };

//   const handleSaveComplete = (success = true, message = "") => {
//     if (success) {
//       fetchTags();
//       if (message) toast.success(message);
//     } else if (message) toast.error(message);
//     closeModal();
//   };

//   const handleDelete = async id => {
//     if (!window.confirm("Delete this tag?")) return;
//     try {
//       await axiosClient.delete(`/tags/${id}`);
//       toast.success("Tag deleted");
//       fetchTags();
//       onDeleteComplete?.(true);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete tag");
//       onDeleteComplete?.(false);
//     }
//   };

//   // ✅ expose create button for Tags.jsx controls row
//   TagList.CreateButton = function CreateButton() {
//     return (
//       <button
//         type="button"
//         onClick={openCreateModal}
//         className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
//                    bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
//       >
//         <Plus size={16} />
//         Create
//       </button>
//     );
//   };

//   if (loading) {
//     return (
//       <div className="px-6 py-6 text-sm text-slate-500">Loading tags…</div>
//     );
//   }

//   // Empty state inside the table card (professional, not huge page)
//   if (!filteredTags.length) {
//     return (
//       <>
//         <div className="px-6 py-14 flex flex-col items-center text-center">
//           <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
//             <TagIcon size={20} />
//           </div>
//           <p className="text-sm font-semibold text-slate-900">No tags yet</p>
//           <p className="text-xs text-slate-500 mt-1 max-w-sm">
//             Create tags to segment contacts, track journeys, and add CRM actions
//             directly from Inbox.
//           </p>
//           <button
//             type="button"
//             onClick={openCreateModal}
//             className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
//                        bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
//           >
//             <Plus size={16} />
//             Create your first tag
//           </button>
//         </div>

//         {showFormModal && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
//             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
//               <button
//                 type="button"
//                 onClick={closeModal}
//                 className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
//               >
//                 <CloseIcon size={18} />
//               </button>
//               <div className="p-5">
//                 <TagForm
//                   selectedTag={selectedTag}
//                   onSaveComplete={handleSaveComplete}
//                   onCancel={closeModal}
//                 />
//               </div>
//             </div>
//           </div>
//         )}
//       </>
//     );
//   }

//   return (
//     <>
//       <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
//         <div>
//           <h3 className="text-sm font-semibold text-slate-900">Tag Library</h3>
//           <p className="text-xs text-slate-500 mt-0.5">
//             Manage tags for CRM segmentation and Inbox actions.
//           </p>
//         </div>
//         {/* Create action stays consistent */}
//         <TagList.CreateButton />
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead className="bg-slate-50">
//             <tr className="text-[11px] uppercase tracking-wide text-slate-500">
//               <th className="px-6 py-3 text-left font-semibold">Tag</th>
//               <th className="px-6 py-3 text-left font-semibold">Category</th>
//               <th className="px-6 py-3 text-left font-semibold">System</th>
//               <th className="px-6 py-3 text-left font-semibold">Created</th>
//               <th className="px-6 py-3 text-right font-semibold">Actions</th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-slate-100">
//             {filteredTags.map(tag => (
//               <tr
//                 key={tag.id}
//                 className="hover:bg-emerald-50/30 transition-colors"
//               >
//                 <td className="px-6 py-4">
//                   <div className="flex items-center gap-3">
//                     <span
//                       className="w-2.5 h-2.5 rounded-full"
//                       style={{ backgroundColor: tag.colorHex || "#22C55E" }}
//                     />
//                     <span className="font-semibold text-slate-900">
//                       {tag.name}
//                     </span>
//                   </div>
//                 </td>

//                 <td className="px-6 py-4 text-slate-700">
//                   {tag.category ? (
//                     <Pill bg="bg-slate-100" text="text-slate-700">
//                       {tag.category}
//                     </Pill>
//                   ) : (
//                     <span className="text-slate-400">—</span>
//                   )}
//                 </td>

//                 <td className="px-6 py-4">
//                   {tag.isSystemTag ? (
//                     <Pill bg="bg-emerald-50" text="text-emerald-700">
//                       Yes
//                     </Pill>
//                   ) : (
//                     <Pill bg="bg-slate-100" text="text-slate-600">
//                       No
//                     </Pill>
//                   )}
//                 </td>

//                 <td className="px-6 py-4 text-slate-700">
//                   {formatDate(tag.createdAt)}
//                 </td>

//                 <td className="px-6 py-4">
//                   <div className="flex justify-end gap-2">
//                     <button
//                       type="button"
//                       title="View (coming soon)"
//                       disabled
//                       className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
//                     >
//                       <Eye size={16} />
//                     </button>

//                     <button
//                       type="button"
//                       title="Edit"
//                       onClick={() => openEditModal(tag)}
//                       className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50"
//                     >
//                       <Pencil size={16} />
//                     </button>

//                     <button
//                       type="button"
//                       title="Delete"
//                       onClick={() => handleDelete(tag.id)}
//                       className="p-2 rounded-xl text-red-600 hover:bg-red-50"
//                     >
//                       <Trash2 size={16} />
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {showFormModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
//             <button
//               type="button"
//               onClick={closeModal}
//               className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
//             >
//               <CloseIcon size={18} />
//             </button>
//             <div className="p-5">
//               <TagForm
//                 selectedTag={selectedTag}
//                 onSaveComplete={handleSaveComplete}
//                 onCancel={closeModal}
//               />
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// // 📄 src/pages/CRM/Tags/TagList.jsx

// import { useEffect, useMemo, useState } from "react";
// import {
//   Eye,
//   Pencil,
//   Trash2,
//   Tag as TagIcon,
//   X as CloseIcon,
// } from "lucide-react";
// import { toast } from "react-toastify";
// import axiosClient from "../../../api/axiosClient";
// import TagForm from "./TagForm";

// export default function TagList({
//   searchTerm = "",
//   onEdit, // optional, for future parent use
//   refreshKey, // optional, for parent-driven refresh
//   onDeleteComplete, // optional
// }) {
//   const [tags, setTags] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // 🔹 Local state for modal + selected tag
//   const [showFormModal, setShowFormModal] = useState(false);
//   const [selectedTag, setSelectedTag] = useState(null);

//   const fetchTags = async () => {
//     setLoading(true);
//     try {
//       const res = await axiosClient.get("/tags"); // ✅ baseUrl already has /api

//       let list = [];
//       if (Array.isArray(res.data)) {
//         list = res.data;
//       } else if (Array.isArray(res.data?.data)) {
//         list = res.data.data;
//       }

//       setTags(list);
//     } catch (error) {
//       console.error("Failed to fetch tags", error);
//       toast.error("Failed to load tags");
//       setTags([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTags();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [refreshKey]);

//   const filteredTags = useMemo(() => {
//     const term = (searchTerm || "").toLowerCase().trim();
//     if (!term) return tags;

//     return tags.filter(tag => {
//       const name = (tag.name || "").toLowerCase();
//       const category = (tag.category || "").toLowerCase();
//       return name.includes(term) || category.includes(term);
//     });
//   }, [tags, searchTerm]);

//   const handleDelete = async id => {
//     if (!window.confirm("Are you sure you want to delete this tag?")) return;

//     try {
//       await axiosClient.delete(`/tags/${id}`);
//       toast.success("Tag deleted");
//       fetchTags();
//       onDeleteComplete && onDeleteComplete(true);
//     } catch (error) {
//       console.error("Failed to delete tag", error);
//       toast.error("Failed to delete tag");
//       onDeleteComplete && onDeleteComplete(false, "Failed to delete tag");
//     }
//   };

//   // 🔹 Modal open/close helpers
//   const openCreateModal = () => {
//     setSelectedTag(null);
//     setShowFormModal(true);
//   };

//   const openEditModal = tag => {
//     setSelectedTag(tag);
//     setShowFormModal(true);
//     onEdit && onEdit(tag); // optional hook
//   };

//   const closeModal = () => {
//     setShowFormModal(false);
//     setSelectedTag(null);
//   };

//   const handleSaveComplete = (success = true, message = "") => {
//     if (success) {
//       fetchTags();
//       if (message) toast.success(message);
//     } else if (message) {
//       toast.error(message);
//     }
//     closeModal();
//   };

//   if (loading) {
//     return <p className="text-sm text-gray-500 py-4">Loading tags...</p>;
//   }

//   // 🔹 Empty state (your screenshot)
//   if (!filteredTags.length) {
//     return (
//       <>
//         <div className="py-14 flex flex-col items-center justify-center text-center">
//           <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
//             <TagIcon size={22} />
//           </div>
//           <p className="text-sm font-semibold text-gray-800 mb-1">
//             No tags created yet
//           </p>
//           <p className="text-xs text-gray-500 mb-4 max-w-xs">
//             Create your first message tag to track customer journeys,
//             priorities, and segments across Contacts and Inbox.
//           </p>
//           <button
//             type="button"
//             onClick={openCreateModal}
//             className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm"
//           >
//             Create your first tag
//           </button>
//         </div>

//         {/* Modal for create */}
//         {showFormModal && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
//             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
//               <button
//                 type="button"
//                 onClick={closeModal}
//                 className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
//               >
//                 <CloseIcon size={18} />
//               </button>
//               <div className="p-5">
//                 <TagForm
//                   selectedTag={selectedTag}
//                   onSaveComplete={handleSaveComplete}
//                   onCancel={closeModal}
//                 />
//               </div>
//             </div>
//           </div>
//         )}
//       </>
//     );
//   }

//   // 🔹 Table view when tags exist
//   return (
//     <>
//       <div className="overflow-hidden rounded-xl border border-gray-100">
//         <table className="min-w-full text-sm">
//           <thead className="bg-gray-50">
//             <tr className="text-gray-500 text-xs uppercase tracking-wide">
//               <th className="px-4 py-2 text-left font-medium">Tag Name</th>
//               <th className="px-4 py-2 text-left font-medium">Category</th>
//               <th className="px-4 py-2 text-left font-medium">System</th>
//               <th className="px-4 py-2 text-left font-medium">Created At</th>
//               <th className="px-4 py-2 text-center font-medium">Action</th>
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-100">
//             {filteredTags.map(tag => (
//               <tr key={tag.id} className="hover:bg-emerald-50/40">
//                 {/* Tag chip */}
//                 <td className="px-4 py-2">
//                   <span
//                     className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
//                     style={{
//                       backgroundColor: tag.colorHex || "#E0F2FE",
//                       color: "#0F172A",
//                     }}
//                   >
//                     {tag.name}
//                   </span>
//                 </td>

//                 {/* Category */}
//                 <td className="px-4 py-2 text-gray-700 text-xs">
//                   {tag.category || "-"}
//                 </td>

//                 {/* System Tag? */}
//                 <td className="px-4 py-2 text-gray-700 text-xs">
//                   {tag.isSystemTag ? "Yes" : "No"}
//                 </td>

//                 {/* CreatedAt */}
//                 <td className="px-4 py-2 text-gray-700 text-xs">
//                   {tag.createdAt
//                     ? new Date(tag.createdAt).toLocaleDateString()
//                     : "-"}
//                 </td>

//                 {/* Actions */}
//                 <td className="px-4 py-2 text-center">
//                   <div className="inline-flex items-center gap-2">
//                     <button
//                       type="button"
//                       className="p-1 rounded hover:bg-gray-100 text-gray-400"
//                       title="View (coming soon)"
//                       disabled
//                     >
//                       <Eye size={16} />
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => openEditModal(tag)}
//                       className="p-1 rounded hover:bg-emerald-50 text-emerald-700"
//                       title="Edit"
//                     >
//                       <Pencil size={16} />
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => handleDelete(tag.id)}
//                       className="p-1 rounded hover:bg-red-50 text-red-600"
//                       title="Delete"
//                     >
//                       <Trash2 size={16} />
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Modal for create/edit in table view */}
//       {showFormModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative">
//             <button
//               type="button"
//               onClick={closeModal}
//               className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
//             >
//               <CloseIcon size={18} />
//             </button>
//             <div className="p-5">
//               <TagForm
//                 selectedTag={selectedTag}
//                 onSaveComplete={handleSaveComplete}
//                 onCancel={closeModal}
//               />
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// import { useEffect, useState } from "react";
// import { Trash2, Pencil } from "lucide-react";
// import { toast } from "react-toastify";

// export default function TagList({ onEditTag, refreshTrigger }) {
//   const [tags, setTags] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const fetchTags = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch("/api/tags");
//       const result = await res.json();

//       // ✅ Extract actual array from result.data
//       if (Array.isArray(result.data)) {
//         setTags(result.data);
//       } else {
//         setTags([]);
//         console.error(
//           "Invalid response from /api/tags. Expected result.data to be array:",
//           result
//         );
//         toast.error("❌ Invalid tag data received");
//       }
//     } catch (err) {
//       console.error("Failed to fetch tags", err);
//       toast.error("❌ Failed to load tags");
//       setTags([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTags();
//   }, [refreshTrigger]);

//   const handleDelete = async id => {
//     if (!window.confirm("Are you sure you want to delete this tag?")) return;

//     try {
//       const res = await fetch(`/api/tags/${id}`, {
//         method: "DELETE",
//       });

//       if (!res.ok) throw new Error();

//       toast.success("✅ Tag deleted");
//       fetchTags();
//     } catch (err) {
//       toast.error("❌ Failed to delete tag");
//     }
//   };

//   return (
//     <div className="mt-6 bg-white rounded-md border shadow-sm p-6 transition hover:shadow-md">
//       <h2 className="text-lg font-bold text-gray-800 mb-3">🗂️ All Tags</h2>

//       {loading ? (
//         <p className="text-sm text-gray-500">Loading tags...</p>
//       ) : tags.length === 0 ? (
//         <p className="text-sm text-gray-500">No tags found.</p>
//       ) : (
//         <div className="space-y-3">
//           {tags.map(tag => (
//             <div
//               key={tag.id}
//               className="flex items-center justify-between border-b pb-2"
//             >
//               <div className="flex items-center gap-3">
//                 <div
//                   className="w-4 h-4 rounded-full border"
//                   style={{ backgroundColor: tag.colorHex || "#ccc" }}
//                 ></div>
//                 <div>
//                   <p className="text-sm font-medium text-gray-800">
//                     {tag.name}
//                   </p>
//                   <p className="text-xs text-gray-500">
//                     {tag.category || "Uncategorized"}{" "}
//                     {tag.isSystemTag && "· System"}
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-3">
//                 <button
//                   onClick={() => onEditTag(tag)}
//                   className="text-gray-600 hover:text-purple-600"
//                   title="Edit"
//                 >
//                   <Pencil size={18} />
//                 </button>
//                 <button
//                   onClick={() => handleDelete(tag.id)}
//                   className="text-gray-600 hover:text-red-600"
//                   title="Delete"
//                 >
//                   <Trash2 size={18} />
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
