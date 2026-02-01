import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { 
  FileText, 
  Library, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Clock,
  Edit3,
  Image,
  Video,
  MessageSquareText,
  FileType,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ArrowRight,
  ChevronDown
} from "lucide-react";

import { listDrafts, createDraft, deleteDraft } from "./drafts";
import TemplateBuilderTabs from "./components/TemplateBuilderTabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

import TemplatePreviewModal from "./components/TemplatePreviewModal";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal";

export default function DraftsListPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  
  // Filter States
  // Filter States
  const q = sp.get("q") || "";
  const v = sp.get("v") || "";
  const categoryFilter = sp.get("category") || "ALL";
  const [previewDraftId, setPreviewDraftId] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await listDrafts();
        const next = Array.isArray(data?.items) ? data.items : [];
        if (mounted) setItems(next);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load drafts.");
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [v]);

  // Auto-create logic
  React.useEffect(() => {
    if (sp.get("create") === "1" && !creating) {
      setCreating(true);
      // Remove the query param immediately to prevent loop if user navigates back
      setSp(prev => {
        const next = new URLSearchParams(prev);
        next.delete("create");
        return next;
      }, { replace: true });

      (async () => {
        try {
          // Unique key
          const tempKey = `untitled_${Date.now()}`;
          const res = await createDraft({
            key: tempKey,
            category: "UTILITY", // Default to UTILITY
            defaultLanguage: "en_US",
          });

          const id = res?.draftId || res?.id;
          if (!id) throw new Error("Draft created but no ID returned.");

          toast.success("New template started");
          // Navigate to editor with blankName param so editor clears the "untitled_..." name
          navigate(`/app/template-builder/drafts/${id}?language=en_US&blankName=1`);
        } catch (err) {
          console.error("Auto-create failed", err);
          toast.error("Failed to create new template.");
          setCreating(false);
        }
      })();
    }
  }, [sp, setSp, creating, navigate]);



  const displayDraftKey = key => {
    const k = String(key || "");
    if (!k) return "Untitled";
    if (k.startsWith("__lib__")) return "Untitled (Library)";
    return k;
  };
  const handleDelete = (id) => {
    if (!id) return;
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    
    // The loading state is handled by DeleteConfirmationModal internally via 'deletingId' presence
    // but we can pass '!!deletingId && loading' if we had a general loading flag.
    // Here we'll use a local logic:
    const id = deletingId;
    try {
      await deleteDraft(id);
      toast.success("Draft deleted successfully");
      setItems(prev => prev.filter(x => x.id !== id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete draft.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter Logic
  const filteredItems = React.useMemo(() => {
    const term = q.toLowerCase();
    return items.filter(d => {
      const bodyComp = d.components?.find(c => c.type === "BODY");
      const bodyText = bodyComp?.text?.toLowerCase() || "";
      const name = displayDraftKey(d.key).toLowerCase();

      const matchesSearch = name.includes(term) || bodyText.includes(term);
      const matchesCategory = categoryFilter === "ALL" || (d.category || "UTILITY") === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, q, categoryFilter]);

  const getCategoryColor = (cat) => {
    switch(cat) {
      case "MARKETING": return "bg-purple-50 text-purple-700 border-purple-100";
      case "UTILITY": return "bg-blue-50 text-blue-700 border-blue-100";
      case "AUTHENTICATION": return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="font-sans pt-2">      


        {/* Content Area */}
        {loading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
             {[1,2,3].map(i => (
               <div key={i} className="h-40 bg-slate-200 rounded-xl" />
             ))}
           </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No templates found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm text-center">
              {q ? "Try adjusting your search or filters." : "Get started by creating a new draft or browsing the library."}
            </p>
            {!q && (
              <button
                onClick={() => setSp({ create: "1" })}
                className="mt-6 text-emerald-600 font-medium text-sm hover:underline"
              >
                Create your first draft &rarr;
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(d => {
              // 1. Determine Category Colors
              let bgColor = "bg-slate-50";
              let iconColor = "text-slate-400";
              let tagClass = "bg-slate-100 text-slate-700";
              let catLabel = d.category || "UTILITY";

              if (catLabel === "MARKETING") {
                bgColor = "bg-emerald-50";
                iconColor = "text-emerald-600";
                tagClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
              } else if (catLabel === "AUTHENTICATION") {
                bgColor = "bg-teal-50";
                iconColor = "text-teal-600";
                tagClass = "bg-teal-50 text-teal-700 border border-teal-100";
              } else if (catLabel === "UTILITY") {
                bgColor = "bg-slate-50";
                iconColor = "text-emerald-600";
                tagClass = "bg-white text-slate-500 border border-slate-200";
              }

              // 2. Determine Icon by Header Type
              let IconComponent = MessageSquareText; // Default (Text)
              const header = d.components?.find(c => c.type === "HEADER");
              const format = header?.format;

              if (format === "IMAGE") IconComponent = Image;
              else if (format === "VIDEO") IconComponent = Video;
              else if (format === "DOCUMENT") IconComponent = FileText;
              else IconComponent = MessageSquareText;

              // 3. Extract Body Text
              const bodyComp = d.components?.find(c => c.type === "BODY");
              const bodyText = bodyComp?.text || "No text content.";

              const lang = d.defaultLanguage || "en_US";

              return (
                <div 
                  key={d.id}
                  className="group relative bg-white rounded-lg border border-slate-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 flex flex-col items-start text-left h-full"
                >
                  {/* Delete Button (Hover) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(d.id);
                    }}
                    disabled={deletingId === d.id}
                    className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                    title="Delete Draft"
                  >
                    {deletingId === d.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>

                  <div className="flex items-center gap-3 mb-4 w-full">
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center shrink-0`}>
                      <IconComponent size={20} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mb-0.5" title={displayDraftKey(d.key)}>
                        {displayDraftKey(d.key)}
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${tagClass}`}>
                        {catLabel}
                      </span>
                    </div>
                  </div>

                  <p className="text-[14px] leading-relaxed text-slate-800 font-medium line-clamp-5 mb-3 w-full flex-1 break-words" title={bodyText}>
                     {bodyText}
                  </p>

                  {/* Last Updated */}
                  {d.updatedAt && (
                    <div className="text-[10px] text-slate-400 mb-2">
                      Updated {new Date(d.updatedAt).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-50 grid grid-cols-2 gap-3 w-full">
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         setPreviewDraftId(d.id);
                       }}
                       className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                     >
                       <Eye size={14} />
                       Preview
                     </button>
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         navigate(`/app/template-builder/drafts/${d.id}?language=${encodeURIComponent(lang)}`);
                       }}
                       className="px-3 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 transition-colors shadow-sm flex items-center justify-center gap-2"
                     >
                       <Pencil size={14} />
                       Edit
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}




      <TemplatePreviewModal 
        isOpen={!!previewDraftId} 
        draftId={previewDraftId}
        language={items.find(x => x.id === previewDraftId)?.defaultLanguage || "en_US"}
        onClose={() => setPreviewDraftId(null)}
        onEdit={(id) => {
           const d = items.find(x => x.id === id);
           const lang = d?.defaultLanguage || "en_US";
           navigate(`/app/template-builder/drafts/${id}?language=${encodeURIComponent(lang)}`);
        }}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        // We'll actually just pass loading={!!deletingId} because confirmDelete clears it on finish
        loading={!!deletingId && !items.find(x => x.id === deletingId)} 
      />
    </div>
  );
}
