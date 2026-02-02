import React, { useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { uploadHeaderMedia } from "../../../api/templateBuilder/uploads";

export default function HeaderMediaUploader({
  draftId,
  language,
  mediaType,
  handle,
  onUploaded,
  onPreview,
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }


  const onFile = async file => {
    if (!file) return;

    // Immediate local preview
    if (onPreview) {
      const url = URL.createObjectURL(file);
      onPreview(url);
    }

    setStatus(null);
    setBusy(true);
    try {
      const data = await uploadHeaderMedia({
        draftId,
        language,
        mediaType,
        file,
      });

      if (data?.handle) {
        onUploaded?.(data.handle);
        setStatus({ type: "success", message: "Media uploaded successfully." });
      } else {
        setStatus({ type: "error", message: "Upload succeeded but no handle returned." });
      }
    } catch (err) {
      console.error(err);
      setStatus({ 
        type: "error", 
        message: err?.response?.data?.message || "Upload failed. Please try again." 
      });
    } finally {
      setBusy(false);
    }
  };

  const getLimitInfo = () => {
    if (mediaType === "IMAGE") return "JPG, PNG, WEBP • Max 10MB";
    if (mediaType === "VIDEO") return "MP4, 3GP • Max 16MB";
    return "PDF • Max 16MB";
  };


  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100 transition-all shadow-sm active:scale-[0.98]">
          {busy ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Upload size={16} />
          )}
          <span className="text-sm font-semibold">
            {busy ? "Uploading..." : "Choose file"}
          </span>
          <input
            type="file"
            className="hidden"
            accept={
              mediaType === "IMAGE"
                ? "image/*"
                : mediaType === "VIDEO"
                ? "video/*"
                : ".pdf,application/pdf"
            }
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = ""; // allow re-selecting same file
              onFile(file);
            }}
          />
        </label>

        <div className="text-xs text-gray-500">
          {handle ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 animate-in fade-in duration-300">
              <CheckCircle2 size={12} />
              <span className="font-bold uppercase tracking-wider text-[10px]">Attached</span>
            </div>
          ) : (
            <span className="italic">No media selected</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Info size={12} />
          <span className="text-[10px] font-medium uppercase tracking-tight">{getLimitInfo()}</span>
        </div>

        {status && (
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] font-medium animate-in slide-in-from-top-1 duration-200 ${
              status.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                : "bg-red-50 border-red-100 text-red-600"
            }`}
          >
            {status.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>

  );
}
