import React, { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import WhatsAppTemplatePreview from "./WhatsAppTemplatePreview";
import { X, Loader2 } from "lucide-react";

export default function TemplatePreviewModal({ isOpen, onClose, draftId, language = "en_US" }) {
  const [loading, setLoading] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && draftId) {
      loadPreview();
    } else {
      setDraftData(null);
    }
  }, [isOpen, draftId, language]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosClient.get(
        `/template-builder/drafts/${draftId}/preview`,
        { params: { language } }
      );
      
      const payload = data?.preview || data;
      const comps = payload?.componentsPayload || payload?.ComponentsPayload || [];
      const mapped = mapComponentsToPreview(comps);
      setDraftData(mapped);
    } catch (err) {
      console.error("Failed to load preview", err);
      setError("Failed to load preview data.");
    } finally {
      setLoading(false);
    }
  };

  const mapComponentsToPreview = (comps) => {
    if (!Array.isArray(comps)) return {};
    const header = comps.find(c => c.type === "HEADER");
    const body = comps.find(c => c.type === "BODY");
    const footer = comps.find(c => c.type === "FOOTER");
    const btns = comps.find(c => c.type === "BUTTONS");

    return {
      headerType: header?.format || (header?.text ? "TEXT" : "NONE"),
      headerText: header?.text,
      headerMediaUrl: header?.example?.header_handle?.[0] || null,
      bodyText: body?.text,
      footerText: footer?.text,
      buttons: btns?.buttons || [],
      examples: body?.example?.body_text?.[0] || []
    };
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[320px] group transition-all duration-300"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-all focus:outline-none"
          title="Close Preview"
        >
          <X size={24} />
        </button>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 flex flex-col items-center gap-4 shadow-xl">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-slate-500 font-medium text-sm">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-xl">
            <p className="text-red-500 mb-4 text-sm">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 text-xs text-medium">Close</button>
          </div>
        ) : (
          <div className="transform scale-95 origin-center">
            <WhatsAppTemplatePreview draft={draftData} />
          </div>
        )}
      </div>
    </div>
  );
}
